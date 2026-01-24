using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using splitzy_dotnet.Controllers;
using splitzy_dotnet.DTO;
using splitzy_dotnet.Models;

namespace spllitzy_dotnet_tests
{
    [TestFixture]
    public class UserControllerTests
    {
        private SplitzyContext _context;
        private UserController _controller;
        private Mock<ILogger<UserController>> _mockLogger;

        [SetUp]
        public void Setup()
        {
            _context = TestHelper.CreateTestContext();
            _mockLogger = new Mock<ILogger<UserController>>();
            _controller = new UserController(_context, _mockLogger.Object);
        }

        [TearDown]
        public void TearDown()
        {
            _context?.Dispose();
        }

        [Test]
        public async Task GetAllUsers_WithMultipleUsers_ShouldReturn200Ok()
        {
            var user1 = TestHelper.CreateTestUser("user1@example.com", "User One");
            var user2 = TestHelper.CreateTestUser("user2@example.com", "User Two");
            _context.Users.AddRange(user1, user2);
            await _context.SaveChangesAsync();

            var result = await _controller.GetAll();
            Assert.That(result.Result, Is.TypeOf<OkObjectResult>());
            var okResult = (OkObjectResult)result.Result;
            var users = (List<LoginUserDTO>)okResult.Value;
            Assert.That(users.Count, Is.EqualTo(2));
        }

        [Test]
        public async Task GetAllUsers_WithNoUsers_ShouldReturnEmptyList()
        {
            var result = await _controller.GetAll();
            Assert.That(result.Result, Is.TypeOf<OkObjectResult>());
            var okResult = (OkObjectResult)result.Result;
            var users = (List<LoginUserDTO>)okResult.Value;
            Assert.That(users, Is.Empty);
        }
    }
}
