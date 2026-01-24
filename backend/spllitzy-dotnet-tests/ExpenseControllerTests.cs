using Microsoft.AspNetCore.Mvc;
using splitzy_dotnet.Controllers;
using splitzy_dotnet.DTO;
using splitzy_dotnet.Models;

namespace spllitzy_dotnet_tests
{
    [TestFixture]
    public class ExpenseControllerTests
    {
        private SplitzyContext _context;
        private ExpenseController _controller;

        [SetUp]
        public void Setup()
        {
            _context = TestHelper.CreateTestContext();
            _controller = new ExpenseController(_context);
        }

        [TearDown]
        public void TearDown()
        {
            _context?.Dispose();
        }

        [Test]
        public async Task AddExpense_WithValidData_ShouldReturn200Ok()
        {
            await TestHelper.SeedTestDataAsync(_context);
            var group = _context.Groups.First();
            var payer = _context.Users.First();

            var splitDetails = new List<SplitDetailDto>
            {
                new SplitDetailDto { UserId = payer.UserId, Amount = 100 }
            };

            var dto = new CreateExpenseDto
            {
                GroupId = group.GroupId,
                PaidByUserId = payer.UserId,
                Name = "Test Expense",
                Amount = 100,
                SplitDetails = splitDetails
            };

            var result = await _controller.AddExpense(dto);
            Assert.That(result, Is.TypeOf<OkObjectResult>());
        }

        [Test]
        public async Task AddExpense_WithNullDto_ShouldReturn400BadRequest()
        {
            var result = await _controller.AddExpense(null);
            Assert.That(result, Is.TypeOf<BadRequestObjectResult>());
        }

        [Test]
        public async Task DeleteExpense_WithValidId_ShouldReturn200Ok()
        {
            await TestHelper.SeedTestDataAsync(_context);
            var group = _context.Groups.First();
            var payer = _context.Users.First();

            var expense = TestHelper.CreateTestExpense(group.GroupId, payer.UserId, 100);
            _context.Expenses.Add(expense);
            await _context.SaveChangesAsync();

            var result = await _controller.DeleteExpense(expense.ExpenseId);
            Assert.That(result, Is.TypeOf<OkObjectResult>());
        }

        [Test]
        public async Task DeleteExpense_WithInvalidId_ShouldReturn404NotFound()
        {
            var result = await _controller.DeleteExpense(99999);
            Assert.That(result, Is.TypeOf<NotFoundObjectResult>());
        }
    }
}
