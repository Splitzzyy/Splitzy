using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using splitzy_dotnet.Controllers;
using splitzy_dotnet.DTO;
using splitzy_dotnet.Extensions;
using splitzy_dotnet.Models;
using splitzy_dotnet.Services.Interfaces;

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
    }
}
