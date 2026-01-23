using Microsoft.AspNetCore.Mvc;
using splitzy_dotnet.Controllers;
using splitzy_dotnet.DTO;
using splitzy_dotnet.Models;

namespace spllitzy_dotnet_tests
{
    [TestFixture]
    public class SettleupControllerTests
    {
        private SplitzyContext _context;
        private SettleupController _controller;

        [SetUp]
        public void Setup()
        {
            _context = TestHelper.CreateTestContext();
            _controller = new SettleupController(_context);
        }

        [TearDown]
        public void TearDown()
        {
            _context?.Dispose();
        }

        [Test]
        public async Task SettleUp_WithValidData_ShouldReturn200Ok()
        {
            await TestHelper.SeedTestDataAsync(_context);
            var group = _context.Groups.First();
            var users = _context.Users.Take(2).ToList();

            var payerBalance = _context.GroupBalances.FirstOrDefault(gb => gb.GroupId == group.GroupId && gb.UserId == users[0].UserId);
            var receiverBalance = _context.GroupBalances.FirstOrDefault(gb => gb.GroupId == group.GroupId && gb.UserId == users[1].UserId);

            if (payerBalance != null) payerBalance.NetBalance = -100;
            if (receiverBalance != null) receiverBalance.NetBalance = 100;
            _context.SaveChanges();

            var settleUpDto = new SettleUpDTO
            {
                GroupId = group.GroupId,
                PaidByUserId = users[0].UserId,
                PaidToUserId = users[1].UserId,
                Amount = 50
            };

            var result = await _controller.SettleUp(settleUpDto);
            Assert.That(result, Is.TypeOf<OkObjectResult>());
        }

        [Test]
        public async Task SettleUp_WithZeroAmount_ShouldReturn400BadRequest()
        {
            var settleUpDto = new SettleUpDTO
            {
                GroupId = 1,
                PaidByUserId = 1,
                PaidToUserId = 2,
                Amount = 0
            };

            var result = await _controller.SettleUp(settleUpDto);
            Assert.That(result, Is.TypeOf<BadRequestObjectResult>());
        }

        [Test]
        public async Task SettleUp_WithSamePayerAndReceiver_ShouldReturn400BadRequest()
        {
            var settleUpDto = new SettleUpDTO
            {
                GroupId = 1,
                PaidByUserId = 1,
                PaidToUserId = 1,
                Amount = 50
            };

            var result = await _controller.SettleUp(settleUpDto);
            Assert.That(result, Is.TypeOf<BadRequestObjectResult>());
        }
    }
}
