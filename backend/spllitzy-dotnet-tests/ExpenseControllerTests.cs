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

        private async Task<(Group group, User member, User outsider)> SeedWithOutsiderAsync()
        {
            await TestHelper.SeedTestDataAsync(_context);
            var outsider = TestHelper.CreateTestUser("outsider@example.com", "Outsider");
            _context.Users.Add(outsider);
            await _context.SaveChangesAsync();
            return (_context.Groups.First(), _context.Users.First(), outsider);
        }

        private static CreateExpenseDto Expense(int groupId, int payerId, params int[] splitUserIds) => new()
        {
            GroupId = groupId,
            PaidByUserId = payerId,
            Name = "Test Expense",
            Amount = 100,
            SplitDetails = splitUserIds
                .Select(id => new SplitDetailDto { UserId = id, Amount = 100m / splitUserIds.Length })
                .ToList()
        };

        private async Task<Expense> AddStoredExpenseAsync(int groupId, int payerId)
        {
            var expense = TestHelper.CreateTestExpense(groupId, payerId, 100);
            _context.Expenses.Add(expense);
            await _context.SaveChangesAsync();
            return expense;
        }

        [Test]
        public async Task AddExpense_WithValidData_ShouldReturn200Ok()
        {
            var (group, member, _) = await SeedWithOutsiderAsync();
            TestHelper.SetCaller(_controller, member.UserId);

            var result = await _controller.AddExpense(Expense(group.GroupId, member.UserId, member.UserId));
            Assert.That(result, Is.TypeOf<OkObjectResult>());
        }

        [Test]
        public async Task AddExpense_SplitWithPlaceholder_Succeeds()
        {
            var (group, member, _) = await SeedWithOutsiderAsync();
            var placeholder = TestHelper.CreatePlaceholderUser("pending@example.com");
            _context.Users.Add(placeholder);
            await _context.SaveChangesAsync();
            _context.GroupMembers.Add(TestHelper.CreateTestGroupMember(group.GroupId, placeholder.UserId));
            await _context.SaveChangesAsync();
            TestHelper.SetCaller(_controller, member.UserId);

            var result = await _controller.AddExpense(Expense(group.GroupId, member.UserId, member.UserId, placeholder.UserId));

            Assert.That(result, Is.TypeOf<OkObjectResult>());
            var balance = _context.GroupBalances.Single(b => b.GroupId == group.GroupId && b.UserId == placeholder.UserId);
            Assert.That(balance.NetBalance, Is.EqualTo(-50));
        }

        [Test]
        public async Task AddExpense_WithNullDto_ShouldReturn400BadRequest()
        {
            var result = await _controller.AddExpense(null);
            Assert.That(result, Is.TypeOf<BadRequestObjectResult>());
        }

        [Test]
        public async Task AddExpense_CallerNotMember_Returns403()
        {
            var (group, member, outsider) = await SeedWithOutsiderAsync();
            TestHelper.SetCaller(_controller, outsider.UserId);

            var result = await _controller.AddExpense(Expense(group.GroupId, member.UserId, member.UserId));

            Assert.That(result, Is.TypeOf<ForbidResult>());
            Assert.That(_context.Expenses.Count(), Is.EqualTo(0));
        }

        [Test]
        public async Task AddExpense_SplitUserNotMember_Returns400()
        {
            var (group, member, outsider) = await SeedWithOutsiderAsync();
            TestHelper.SetCaller(_controller, member.UserId);

            var result = await _controller.AddExpense(Expense(group.GroupId, member.UserId, member.UserId, outsider.UserId));

            Assert.That(result, Is.TypeOf<BadRequestObjectResult>());
            Assert.That(_context.Expenses.Count(), Is.EqualTo(0));
            Assert.That(_context.ExpenseSplits.Count(), Is.EqualTo(0));
        }

        [Test]
        public async Task UpdateExpense_CallerNotMember_Returns403()
        {
            var (group, member, outsider) = await SeedWithOutsiderAsync();
            var expense = await AddStoredExpenseAsync(group.GroupId, member.UserId);
            TestHelper.SetCaller(_controller, outsider.UserId);

            var result = await _controller.UpdateExpense(new UpdateExpenseDto
            {
                ExpenseId = expense.ExpenseId,
                GroupId = group.GroupId,
                PaidByUserId = member.UserId,
                Name = "Hijack",
                Amount = 10,
                SplitDetails = [new SplitDetailDto { UserId = member.UserId, Amount = 10 }]
            });

            Assert.That(result, Is.TypeOf<ForbidResult>());
            Assert.That(_context.Expenses.Single().Name, Is.EqualTo("Test Expense"));
        }

        [Test]
        public async Task UpdateExpense_SplitUserNotMember_Returns400()
        {
            var (group, member, outsider) = await SeedWithOutsiderAsync();
            var expense = await AddStoredExpenseAsync(group.GroupId, member.UserId);
            TestHelper.SetCaller(_controller, member.UserId);

            var result = await _controller.UpdateExpense(new UpdateExpenseDto
            {
                ExpenseId = expense.ExpenseId,
                GroupId = group.GroupId,
                PaidByUserId = member.UserId,
                Name = "Updated",
                Amount = 10,
                SplitDetails = [new SplitDetailDto { UserId = outsider.UserId, Amount = 10 }]
            });

            Assert.That(result, Is.TypeOf<BadRequestObjectResult>());
            Assert.That(_context.Expenses.Single().Name, Is.EqualTo("Test Expense"));
        }

        [Test]
        public async Task UpdateExpense_GroupIdMismatch_Returns400()
        {
            var (group, member, _) = await SeedWithOutsiderAsync();
            var expense = await AddStoredExpenseAsync(group.GroupId, member.UserId);
            TestHelper.SetCaller(_controller, member.UserId);

            var result = await _controller.UpdateExpense(new UpdateExpenseDto
            {
                ExpenseId = expense.ExpenseId,
                GroupId = group.GroupId + 1,
                PaidByUserId = member.UserId,
                Name = "Updated",
                Amount = 10,
                SplitDetails = [new SplitDetailDto { UserId = member.UserId, Amount = 10 }]
            });

            Assert.That(result, Is.TypeOf<BadRequestObjectResult>());
        }

        [Test]
        public async Task DeleteExpense_WithValidId_ShouldReturn200Ok()
        {
            var (group, member, _) = await SeedWithOutsiderAsync();
            var expense = await AddStoredExpenseAsync(group.GroupId, member.UserId);
            TestHelper.SetCaller(_controller, member.UserId);

            var result = await _controller.DeleteExpense(expense.ExpenseId);
            Assert.That(result, Is.TypeOf<OkObjectResult>());
        }

        [Test]
        public async Task DeleteExpense_WithInvalidId_ShouldReturn404NotFound()
        {
            TestHelper.SetCaller(_controller, 1);

            var result = await _controller.DeleteExpense(99999);
            Assert.That(result, Is.TypeOf<NotFoundObjectResult>());
        }

        [Test]
        public async Task DeleteExpense_CallerNotMember_Returns403()
        {
            var (group, member, outsider) = await SeedWithOutsiderAsync();
            var expense = await AddStoredExpenseAsync(group.GroupId, member.UserId);
            TestHelper.SetCaller(_controller, outsider.UserId);

            var result = await _controller.DeleteExpense(expense.ExpenseId);

            Assert.That(result, Is.TypeOf<ForbidResult>());
            Assert.That(_context.Expenses.Count(), Is.EqualTo(1));
        }

        [Test]
        public async Task GetExpenseDetails_CallerNotMember_Returns403()
        {
            var (group, member, outsider) = await SeedWithOutsiderAsync();
            var expense = await AddStoredExpenseAsync(group.GroupId, member.UserId);
            TestHelper.SetCaller(_controller, outsider.UserId);

            var result = await _controller.GetExpenseDetails(expense.ExpenseId);
            Assert.That(result, Is.TypeOf<ForbidResult>());
        }

        [Test]
        public async Task GetExpenseDetails_Member_Returns200()
        {
            var (group, member, _) = await SeedWithOutsiderAsync();
            var expense = await AddStoredExpenseAsync(group.GroupId, member.UserId);
            TestHelper.SetCaller(_controller, member.UserId);

            var result = await _controller.GetExpenseDetails(expense.ExpenseId);
            Assert.That(result, Is.TypeOf<OkObjectResult>());
        }
    }
}
