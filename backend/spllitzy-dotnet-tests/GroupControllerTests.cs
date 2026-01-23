using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using splitzy_dotnet.Controllers;
using splitzy_dotnet.DTO;
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

            var result = await _controller.GetGroupSummary(group.GroupId);
            Assert.That(result.Result, Is.TypeOf<OkObjectResult>());
        }

        [Test]
        public async Task GetGroupSummary_WithInvalidGroupId_ShouldReturn404()
        {
            var result = await _controller.GetGroupSummary(99999);
            Assert.That(result.Result, Is.TypeOf<NotFoundObjectResult>());
        }
    }
}
