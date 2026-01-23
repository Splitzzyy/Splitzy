using Microsoft.AspNetCore.Mvc;
using Moq;
using splitzy_dotnet.Controllers;
using splitzy_dotnet.DTO;
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

            // Create mock HttpContext with User claims
            var mockHttpContext = new Moq.Mock<Microsoft.AspNetCore.Http.HttpContext>();
            var mockUser = new Moq.Mock<System.Security.Principal.IPrincipal>();
            var mockClaimsIdentity = new System.Security.Claims.ClaimsIdentity(new[]
            {
                new System.Security.Claims.Claim("id", user.UserId.ToString())
            });
            var mockClaimsPrincipal = new System.Security.Claims.ClaimsPrincipal(mockClaimsIdentity);

            mockHttpContext.Setup(x => x.User).Returns(mockClaimsPrincipal);

            _controller.ControllerContext = new Microsoft.AspNetCore.Mvc.ControllerContext
            {
                HttpContext = mockHttpContext.Object
            };

            var result = await _controller.GetDashboard();
            Assert.That(result.Result, Is.TypeOf<OkObjectResult>());
        }

        [Test]
        public async Task GetDashboard_WithNonExistentUser_ShouldReturn404NotFound()
        {
            var mockHttpContext = new Moq.Mock<Microsoft.AspNetCore.Http.HttpContext>();
            var mockClaimsIdentity = new System.Security.Claims.ClaimsIdentity(new[]
            {
                new System.Security.Claims.Claim("id", "99999")
            });
            var mockClaimsPrincipal = new System.Security.Claims.ClaimsPrincipal(mockClaimsIdentity);

            mockHttpContext.Setup(x => x.User).Returns(mockClaimsPrincipal);

            _controller.ControllerContext = new Microsoft.AspNetCore.Mvc.ControllerContext
            {
                HttpContext = mockHttpContext.Object
            };

            var result = await _controller.GetDashboard();
            Assert.That(result.Result, Is.TypeOf<NotFoundObjectResult>());
        }
    }
}
