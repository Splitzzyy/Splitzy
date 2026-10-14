using Microsoft.AspNetCore.Mvc;
using Moq;
using splitzy_dotnet.Controllers;
using splitzy_dotnet.Models;
using splitzy_dotnet.Services.Interfaces;

namespace spllitzy_dotnet_tests
{
    [TestFixture]
    public class DashboardControllerTests
    {
        private SplitzyContext _context;
        private DashboardController _controller;
        private Mock<IEmailService> _mockEmailService;

        [SetUp]
        public void Setup()
        {
            _context = TestHelper.CreateTestContext();
            _mockEmailService = new Mock<IEmailService>();
            _controller = new DashboardController(_context, _mockEmailService.Object);
        }

        [TearDown]
        public void TearDown()
        {
            _context?.Dispose();
        }

        [Test]
        public async Task GetDashboard_WithValidUser_ShouldReturn200Ok()
        {
            await TestHelper.SeedTestDataAsync(_context);
            var user = _context.Users.First();
            TestHelper.SetCaller(_controller, user.UserId);

            var result = await _controller.GetDashboard();
            Assert.That(result.Result, Is.TypeOf<OkObjectResult>());
        }

        [Test]
        public async Task GetDashboard_WithNonExistentUser_ShouldReturn404NotFound()
        {
            TestHelper.SetCaller(_controller, 99999);

            var result = await _controller.GetDashboard();
            Assert.That(result.Result, Is.TypeOf<NotFoundObjectResult>());
        }
    }
}
