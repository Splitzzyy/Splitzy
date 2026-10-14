using Microsoft.AspNetCore.Http;
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
    public class AuthControllerTests
    {
        private SplitzyContext _context;
        private AuthController _controller;
        private Mock<IMessageProducer> _mockMessageProducer;

        [SetUp]
        public void Setup()
        {
            _context = TestHelper.CreateTestContext();
            _mockMessageProducer = new Mock<IMessageProducer>();
            _mockMessageProducer.Setup(x => x.SendMessageAsync(It.IsAny<EmailMessage>())).Returns(Task.CompletedTask);

            _controller = new AuthController(
                _context,
                new Mock<IJWTService>().Object,
                new Mock<ILogger<AuthController>>().Object,
                _mockMessageProducer.Object,
                new Mock<ISplitzyConfig>().Object)
            {
                ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
            };
        }

        [TearDown]
        public void TearDown()
        {
            _context?.Dispose();
        }

        private async Task<User> AddPlaceholderAsync(string email = "pending@example.com")
        {
            var placeholder = TestHelper.CreatePlaceholderUser(email);
            _context.Users.Add(placeholder);
            await _context.SaveChangesAsync();
            return placeholder;
        }

        private static string? MessageOf(IActionResult result) =>
            ((result as ObjectResult)?.Value as ApiResponse<string>)?.Message;

        [Test]
        public async Task Login_PlaceholderUser_Returns401InvalidCredentials()
        {
            await AddPlaceholderAsync();

            var placeholderResult = await _controller.Login(new LoginRequestDTO { Email = "pending@example.com", Password = "anything" });
            var unknownResult = await _controller.Login(new LoginRequestDTO { Email = "nobody@example.com", Password = "anything" });

            Assert.That(placeholderResult, Is.TypeOf<UnauthorizedObjectResult>());
            Assert.That(MessageOf(placeholderResult), Is.EqualTo(MessageOf(unknownResult)));
        }

        [Test]
        public async Task ForgetPassword_PlaceholderUser_SendsNoEmail()
        {
            await AddPlaceholderAsync();

            var result = await _controller.ForgetPassword(new ForgetPasswordRequestUser { Email = "pending@example.com" });

            Assert.That(result, Is.TypeOf<BadRequestObjectResult>());
            _mockMessageProducer.Verify(x => x.SendMessageAsync(It.IsAny<EmailMessage>()), Times.Never);
        }

        private Task<IActionResult> SignupAsync(string email, string name = "Real Name") =>
            _controller.Signup(new SignupRequestDTO { Name = name, Email = email, Password = "secret123" });

        private string LatestTokenFor(int userId) =>
            _context.EmailVerifications.Where(v => v.UserId == userId && !v.IsUsed).Single().Token;

        [Test]
        public async Task Signup_PlaceholderEmail_ClaimsExistingRow_Returns201()
        {
            var placeholder = await AddPlaceholderAsync();

            var result = await SignupAsync("Pending@Example.com");

            Assert.That(result, Is.TypeOf<CreatedAtActionResult>());
            Assert.That(_context.Users.Count(), Is.EqualTo(1));
            var user = _context.Users.Single();
            Assert.That(user.UserId, Is.EqualTo(placeholder.UserId));
            Assert.That(user.Name, Is.EqualTo("Real Name"));
            Assert.That(user.PasswordHash, Is.Not.Null);
            Assert.That(user.IsRegistered, Is.False);
            Assert.That(user.IsEmailVerified, Is.False);
            Assert.That(_context.EmailVerifications.Count(v => v.UserId == user.UserId), Is.EqualTo(1));
        }

        [Test]
        public async Task Signup_RegisteredEmail_Returns400()
        {
            _context.Users.Add(TestHelper.CreateTestUser("taken@example.com"));
            await _context.SaveChangesAsync();

            var result = await SignupAsync("taken@example.com");

            Assert.That(result, Is.TypeOf<BadRequestObjectResult>());
        }

        [Test]
        public async Task Signup_ClaimedTwice_OnlyLatestTokenRemains()
        {
            var placeholder = await AddPlaceholderAsync();

            await SignupAsync("pending@example.com", "First");
            await SignupAsync("pending@example.com", "Second");

            Assert.That(_context.EmailVerifications.Count(v => v.UserId == placeholder.UserId), Is.EqualTo(1));
            Assert.That(_context.Users.Single().Name, Is.EqualTo("Second"));
        }

        [Test]
        public async Task VerifyEmail_ClaimedPlaceholder_SetsIsRegisteredTrue()
        {
            var placeholder = await AddPlaceholderAsync();
            await SignupAsync("pending@example.com");

            var result = await _controller.VerifyEmail(LatestTokenFor(placeholder.UserId));

            Assert.That(result, Is.TypeOf<OkObjectResult>());
            var user = _context.Users.Single();
            Assert.That(user.IsRegistered, Is.True);
            Assert.That(user.IsEmailVerified, Is.True);
        }

        [Test]
        public async Task Signup_WithLegacyInvite_NoMembershipUntilVerified()
        {
            var group = TestHelper.CreateTestGroup();
            _context.Groups.Add(group);
            await _context.SaveChangesAsync();
            _context.GroupInvites.Add(new GroupInvite { GroupId = group.GroupId, Email = "legacy@example.com", InvitedAt = DateTime.UtcNow });
            await _context.SaveChangesAsync();

            await SignupAsync("legacy@example.com");
            var user = _context.Users.Single();
            Assert.That(_context.GroupMembers.Any(), Is.False);

            await _controller.VerifyEmail(LatestTokenFor(user.UserId));
            Assert.That(_context.GroupMembers.Count(gm => gm.GroupId == group.GroupId && gm.UserId == user.UserId), Is.EqualTo(1));
            Assert.That(_context.GroupInvites.Single().Accepted, Is.True);
        }

        [Test]
        public async Task PlaceholderLifecycle_ExpenseBeforeSignup_VisibleAfterVerify()
        {
            var owner = TestHelper.CreateTestUser("owner@example.com", "Owner");
            _context.Users.Add(owner);
            await _context.SaveChangesAsync();

            var groupController = new GroupController(_context, new Mock<ILogger<GroupController>>().Object, _mockMessageProducer.Object);
            TestHelper.SetCaller(groupController, owner.UserId);
            await groupController.CreateGroup(new GroupDTO.CreateGroupRequest { GroupName = "Trip", UserEmails = ["friend@example.com"] });
            var group = _context.Groups.Single();
            var placeholder = _context.Users.Single(u => u.Email == "friend@example.com");

            var expenseController = new ExpenseController(_context);
            TestHelper.SetCaller(expenseController, owner.UserId);
            var added = await expenseController.AddExpense(new CreateExpenseDto
            {
                GroupId = group.GroupId,
                PaidByUserId = owner.UserId,
                Name = "Hotel",
                Amount = 200,
                SplitDetails =
                [
                    new SplitDetailDto { UserId = owner.UserId, Amount = 100 },
                    new SplitDetailDto { UserId = placeholder.UserId, Amount = 100 }
                ]
            });
            Assert.That(added, Is.TypeOf<OkObjectResult>());

            await SignupAsync("friend@example.com", "Friend");
            await _controller.VerifyEmail(LatestTokenFor(placeholder.UserId));

            TestHelper.SetCaller(groupController, placeholder.UserId);
            var overview = await groupController.GetGroupOverview(group.GroupId) as OkObjectResult;
            var json = System.Text.Json.JsonSerializer.SerializeToElement(overview!.Value);
            Assert.That(json.GetProperty("Expenses").GetArrayLength(), Is.EqualTo(1));
            Assert.That(json.GetProperty("Balances").GetProperty("YouOwe").GetDecimal(), Is.EqualTo(100));
            Assert.That(_context.Users.Single(u => u.UserId == placeholder.UserId).IsRegistered, Is.True);
        }

        [Test]
        public async Task ResendVerification_PlaceholderUser_SendsNoEmail()
        {
            await AddPlaceholderAsync();

            var result = await _controller.ResendVerification("pending@example.com");

            Assert.That(result, Is.TypeOf<OkResult>());
            _mockMessageProducer.Verify(x => x.SendMessageAsync(It.IsAny<EmailMessage>()), Times.Never);
        }
    }
}
