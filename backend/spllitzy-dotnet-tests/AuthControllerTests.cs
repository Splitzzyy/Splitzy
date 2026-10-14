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
