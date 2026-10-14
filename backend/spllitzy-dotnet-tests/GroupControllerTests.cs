using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using splitzy_dotnet.Controllers;
using splitzy_dotnet.DTO;
using splitzy_dotnet.Extensions;
using splitzy_dotnet.Models;
using splitzy_dotnet.Services.Interfaces;
using System.Text.Json;

namespace spllitzy_dotnet_tests
{
    [TestFixture]
    public class GroupControllerTests
    {
        private SplitzyContext _context;
        private GroupController _controller;
        private Mock<ILogger<GroupController>> _mockLogger;
        private Mock<IMessageProducer> _mockMessageProducer;

        [SetUp]
        public void Setup()
        {
            _context = TestHelper.CreateTestContext();
            _mockLogger = new Mock<ILogger<GroupController>>();
            _mockMessageProducer = new Mock<IMessageProducer>();
            _mockMessageProducer.Setup(x => x.SendMessageAsync(It.IsAny<EmailMessage>())).Returns(Task.CompletedTask);

            _controller = new GroupController(_context, _mockLogger.Object, _mockMessageProducer.Object);
        }

        [TearDown]
        public void TearDown()
        {
            _context?.Dispose();
        }

        [Test]
        public async Task GetGroupSummary_WithValidGroupId_ShouldReturn200Ok()
        {
            await TestHelper.SeedTestDataAsync(_context);
            var group = _context.Groups.First();
            TestHelper.SetCaller(_controller, _context.Users.First().UserId);

            var result = await _controller.GetGroupSummary(group.GroupId);
            Assert.That(result.Result, Is.TypeOf<OkObjectResult>());
        }

        [Test]
        public async Task GetGroupSummary_WithInvalidGroupId_ShouldReturn404()
        {
            TestHelper.SetCaller(_controller, 1);

            var result = await _controller.GetGroupSummary(99999);
            Assert.That(result.Result, Is.TypeOf<NotFoundObjectResult>());
        }

        [Test]
        public async Task CreateGroup_EmailDifferentCase_AddsExistingUserAsMember()
        {
            await TestHelper.SeedTestDataAsync(_context);
            var creator = _context.Users.First(u => u.Email == "user1@example.com");
            var invited = _context.Users.First(u => u.Email == "user2@example.com");
            TestHelper.SetCaller(_controller, creator.UserId);

            var result = await _controller.CreateGroup(new GroupDTO.CreateGroupRequest
            {
                GroupName = "Trip",
                UserEmails = [" User2@Example.COM "]
            });

            Assert.That(result, Is.TypeOf<OkObjectResult>());
            var group = _context.Groups.Single(g => g.Name == "Trip");
            Assert.That(_context.GroupMembers.Any(gm => gm.GroupId == group.GroupId && gm.UserId == invited.UserId), Is.True);
            Assert.That(_context.Users.Count(u => u.Email == "user2@example.com"), Is.EqualTo(1));
        }

        [Test]
        public async Task AddUsersToGroup_EmailDifferentCase_AddsMember()
        {
            var creator = TestHelper.CreateTestUser("owner@example.com", "Owner");
            var friend = TestHelper.CreateTestUser("friend@example.com", "Friend");
            var group = TestHelper.CreateTestGroup();
            _context.AddRange(creator, friend, group);
            await _context.SaveChangesAsync();
            _context.GroupMembers.Add(TestHelper.CreateTestGroupMember(group.GroupId, creator.UserId));
            await _context.SaveChangesAsync();
            TestHelper.SetCaller(_controller, creator.UserId);

            var result = await _controller.AddUsersToGroup(group.GroupId, new AddUsersToGroupRequest
            {
                UserEmails = ["FRIEND@example.com"]
            });

            Assert.That(result, Is.TypeOf<OkObjectResult>());
            Assert.That(_context.GroupMembers.Any(gm => gm.GroupId == group.GroupId && gm.UserId == friend.UserId), Is.True);
        }

        [Test]
        public async Task CreateGroup_UnknownEmail_CreatesPlaceholderMember()
        {
            await TestHelper.SeedTestDataAsync(_context);
            var creator = _context.Users.First();
            TestHelper.SetCaller(_controller, creator.UserId);

            var result = await _controller.CreateGroup(new GroupDTO.CreateGroupRequest
            {
                GroupName = "Trip",
                UserEmails = ["Newbie@Example.com"]
            });

            Assert.That(result, Is.TypeOf<OkObjectResult>());
            var placeholder = _context.Users.Single(u => u.Email == "newbie@example.com");
            Assert.That(placeholder.IsRegistered, Is.False);
            Assert.That(placeholder.IsEmailVerified, Is.False);
            Assert.That(placeholder.PasswordHash, Is.Null);
            Assert.That(placeholder.Name, Is.EqualTo("newbie"));
            var group = _context.Groups.Single(g => g.Name == "Trip");
            Assert.That(_context.GroupMembers.Count(gm => gm.GroupId == group.GroupId), Is.EqualTo(2));
            Assert.That(_context.GroupInvites.Count(), Is.EqualTo(0));
            _mockMessageProducer.Verify(x => x.SendMessageAsync(It.Is<EmailMessage>(m =>
                m.ToEmail == "newbie@example.com" && m.TemplateType == "GroupInvitation")), Times.Once);
        }

        [Test]
        public async Task CreateGroup_LongLocalPart_TruncatesPlaceholderNameTo100()
        {
            await TestHelper.SeedTestDataAsync(_context);
            TestHelper.SetCaller(_controller, _context.Users.First().UserId);
            var email = new string('a', 120) + "@example.com";

            var result = await _controller.CreateGroup(new GroupDTO.CreateGroupRequest
            {
                GroupName = "Trip",
                UserEmails = [email]
            });

            Assert.That(result, Is.TypeOf<OkObjectResult>());
            Assert.That(_context.Users.Single(u => u.Email == email).Name, Is.EqualTo(new string('a', 100)));
        }

        [Test]
        public async Task CreateGroup_InvalidEmail_Returns400()
        {
            await TestHelper.SeedTestDataAsync(_context);
            TestHelper.SetCaller(_controller, _context.Users.First().UserId);

            var result = await _controller.CreateGroup(new GroupDTO.CreateGroupRequest
            {
                GroupName = "Trip",
                UserEmails = ["not-an-email"]
            });

            Assert.That(result, Is.TypeOf<BadRequestObjectResult>());
            Assert.That(_context.Groups.Any(g => g.Name == "Trip"), Is.False);
        }

        [Test]
        public async Task GetGroupOverview_PlaceholderMember_HasIsRegisteredFalse()
        {
            await TestHelper.SeedTestDataAsync(_context);
            var group = _context.Groups.First();
            var placeholder = TestHelper.CreatePlaceholderUser("pending@example.com");
            _context.Users.Add(placeholder);
            await _context.SaveChangesAsync();
            _context.GroupMembers.Add(TestHelper.CreateTestGroupMember(group.GroupId, placeholder.UserId));
            await _context.SaveChangesAsync();
            TestHelper.SetCaller(_controller, _context.Users.First().UserId);

            var result = await _controller.GetGroupOverview(group.GroupId) as OkObjectResult;

            var members = JsonSerializer.SerializeToElement(result!.Value).GetProperty("Members").EnumerateArray().ToList();
            Assert.That(members.Single(m => m.GetProperty("MemberEmail").GetString() == "pending@example.com")
                .GetProperty("IsRegistered").GetBoolean(), Is.False);
            Assert.That(members.Count(m => m.GetProperty("IsRegistered").GetBoolean()), Is.EqualTo(3));
        }

        private async Task<(Group group, User owner)> SeedOwnedGroupAsync()
        {
            var owner = TestHelper.CreateTestUser("owner@example.com", "Owner");
            var group = TestHelper.CreateTestGroup();
            _context.AddRange(owner, group);
            await _context.SaveChangesAsync();
            _context.GroupMembers.Add(TestHelper.CreateTestGroupMember(group.GroupId, owner.UserId));
            await _context.SaveChangesAsync();
            TestHelper.SetCaller(_controller, owner.UserId);
            return (group, owner);
        }

        [Test]
        public async Task AddUsersToGroup_UnknownEmail_CreatesPlaceholderMember_Returns200()
        {
            var (group, _) = await SeedOwnedGroupAsync();

            var result = await _controller.AddUsersToGroup(group.GroupId, new AddUsersToGroupRequest
            {
                UserEmails = ["newbie@example.com"]
            }) as OkObjectResult;

            Assert.That(result, Is.Not.Null);
            var placeholder = _context.Users.Single(u => u.Email == "newbie@example.com");
            Assert.That(placeholder.IsRegistered, Is.False);
            Assert.That(_context.GroupMembers.Any(gm => gm.GroupId == group.GroupId && gm.UserId == placeholder.UserId), Is.True);
            Assert.That(_context.GroupBalances.Any(b => b.GroupId == group.GroupId && b.UserId == placeholder.UserId), Is.True);
            var invited = JsonSerializer.SerializeToElement(result!.Value).GetProperty("InvitedEmails")
                .EnumerateArray().Select(e => e.GetString()).ToList();
            Assert.That(invited, Is.EqualTo(new[] { "newbie@example.com" }));
            _mockMessageProducer.Verify(x => x.SendMessageAsync(It.Is<EmailMessage>(m => m.TemplateType == "GroupInvitation")), Times.Once);
        }

        [Test]
        public async Task AddUsersToGroup_ExistingPlaceholderFromOtherGroup_ReusesUser()
        {
            var (group, _) = await SeedOwnedGroupAsync();
            _context.Users.Add(TestHelper.CreatePlaceholderUser("pending@example.com"));
            await _context.SaveChangesAsync();

            var result = await _controller.AddUsersToGroup(group.GroupId, new AddUsersToGroupRequest
            {
                UserEmails = ["pending@example.com"]
            });

            Assert.That(result, Is.TypeOf<OkObjectResult>());
            Assert.That(_context.Users.Count(u => u.Email == "pending@example.com"), Is.EqualTo(1));
        }

        [Test]
        public async Task AddUsersToGroup_PlaceholderAlreadyMember_Returns400()
        {
            var (group, _) = await SeedOwnedGroupAsync();
            var placeholder = TestHelper.CreatePlaceholderUser("pending@example.com");
            _context.Users.Add(placeholder);
            await _context.SaveChangesAsync();
            _context.GroupMembers.Add(TestHelper.CreateTestGroupMember(group.GroupId, placeholder.UserId));
            await _context.SaveChangesAsync();

            var result = await _controller.AddUsersToGroup(group.GroupId, new AddUsersToGroupRequest
            {
                UserEmails = ["pending@example.com"]
            });

            Assert.That(result, Is.TypeOf<BadRequestObjectResult>());
        }

        [Test]
        public void NormalizeEmail_TrimsAndLowercases()
        {
            Assert.That(Helper.NormalizeEmail("  Foo@X.Com "), Is.EqualTo("foo@x.com"));
        }

        [Test]
        public async Task GetGroupSummary_CallerNotMember_Returns403()
        {
            await TestHelper.SeedTestDataAsync(_context);
            var outsider = TestHelper.CreateTestUser("outsider@example.com", "Outsider");
            _context.Users.Add(outsider);
            await _context.SaveChangesAsync();
            TestHelper.SetCaller(_controller, outsider.UserId);

            var result = await _controller.GetGroupSummary(_context.Groups.First().GroupId);
            Assert.That(result.Result, Is.TypeOf<ForbidResult>());
        }

        [Test]
        public async Task DeleteGroup_CallerNotMember_Returns403()
        {
            await TestHelper.SeedTestDataAsync(_context);
            var outsider = TestHelper.CreateTestUser("outsider@example.com", "Outsider");
            _context.Users.Add(outsider);
            await _context.SaveChangesAsync();
            TestHelper.SetCaller(_controller, outsider.UserId);

            var result = await _controller.DeleteGroup(_context.Groups.First().GroupId);

            Assert.That(result, Is.TypeOf<ForbidResult>());
            Assert.That(_context.Groups.Count(), Is.EqualTo(1));
        }
    }
}
