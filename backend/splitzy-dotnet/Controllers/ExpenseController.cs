using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using splitzy_dotnet.DTO;
using splitzy_dotnet.Models;
using System.Text.Json;

namespace splitzy_dotnet.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class ExpenseController : ControllerBase
    {
        private readonly SplitzyContext _context;

        public ExpenseController(SplitzyContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Add Expense API
        /// </summary>
        /// <param name="dto"></param>
        /// <returns></returns>
        [HttpPost("AddExpense")]
        public async Task<IActionResult> AddExpense([FromBody] CreateExpenseDto dto)
        {
            if (dto == null)
                return BadRequest("Invalid input");

            if (!await _context.Groups.AnyAsync(g => g.GroupId == dto.GroupId))
                return BadRequest("Invalid group");

            if (!await _context.GroupMembers.AnyAsync(gm =>
                gm.GroupId == dto.GroupId && gm.UserId == dto.PaidByUserId))
                return BadRequest("Payer must be a member");

            if (dto.SplitDetails == null || dto.SplitDetails.Count == 0)
                return BadRequest("Split details required");

            if (Math.Abs(dto.SplitDetails.Sum(s => s.Amount) - dto.Amount) > 0.01m)
                return BadRequest("Split total mismatch");

            using var tx = await _context.Database.BeginTransactionAsync();

            var expense = new Expense
            {
                Name = dto.Name,
                Amount = dto.Amount,
                GroupId = dto.GroupId,
                PaidByUserId = dto.PaidByUserId,
                SplitPer = JsonSerializer.Serialize(dto.SplitDetails),
                CreatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified)
            };

            _context.Expenses.Add(expense);
            await _context.SaveChangesAsync();

            _context.ExpenseSplits.AddRange(
                dto.SplitDetails.Select(s => new ExpenseSplit
                {
                    ExpenseId = expense.ExpenseId,
                    UserId = s.UserId,
                    OwedAmount = s.Amount
                })
            );

            var affectedUserIds = dto.SplitDetails
                .Select(s => s.UserId)
                .Append(dto.PaidByUserId)
                .Distinct()
                .ToList();

            var balances = await EnsureBalances(dto.GroupId, affectedUserIds);

            foreach (var split in dto.SplitDetails)
            {
                balances.Single(b => b.UserId == split.UserId)
                        .NetBalance -= split.Amount;
            }

            // Payer always gets credited with full amount paid
            balances.Single(b => b.UserId == dto.PaidByUserId)
                    .NetBalance += dto.Amount;

            _context.ActivityLogs.Add(new ActivityLog
            {
                GroupId = dto.GroupId,
                UserId = dto.PaidByUserId,
                ActionType = "AddExpense",
                Description = dto.Name,
                ExpenseId = expense.ExpenseId,
                Amount = dto.Amount,
                CreatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified)
            });

            await _context.SaveChangesAsync();
            await tx.CommitAsync();

            return Ok(new
            {
                message = "Expense added successfully",
                expenseId = expense.ExpenseId
            });
        }


        /// <summary>
        /// Delete Expense
        /// </summary>
        /// <param name="expenseId"></param>
        /// <returns></returns>
        [HttpDelete("DeleteExpense/{expenseId}")]
        public async Task<IActionResult> DeleteExpense(int expenseId)
        {
            using var tx = await _context.Database.BeginTransactionAsync();

            var expense = await _context.Expenses
                .Include(e => e.ExpenseSplits)
                .FirstOrDefaultAsync(e => e.ExpenseId == expenseId);

            if (expense == null)
                return NotFound("Expense not found");

            var affectedUserIds = expense.ExpenseSplits
                .Select(s => s.UserId)
                .Append(expense.PaidByUserId)
                .Distinct()
                .ToList();

            var balances = await EnsureBalances(expense.GroupId, affectedUserIds);

            // reverse balances
            balances.Single(b => b.UserId == expense.PaidByUserId)
                    .NetBalance -= expense.Amount;

            foreach (var split in expense.ExpenseSplits)
            {
                balances.Single(b => b.UserId == split.UserId)
                        .NetBalance += split.OwedAmount;
            }

            _context.ExpenseSplits.RemoveRange(expense.ExpenseSplits);
            _context.Expenses.Remove(expense);

            _context.ActivityLogs.Add(new ActivityLog
            {
                GroupId = expense.GroupId,
                UserId = expense.PaidByUserId,
                ActionType = "DeleteExpense",
                Description = expense.Name,
                ExpenseId = expenseId,
                Amount = expense.Amount,
                CreatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified)
            });

            await _context.SaveChangesAsync();
            await tx.CommitAsync();

            return Ok(new { message = "Expense deleted successfully" });
        }

        /// <summary>
        /// Updates an existing expense and its associated splits based on the provided details.
        /// </summary>
        /// <remarks>This operation updates both the expense record and the balances of affected users.
        /// The request must provide consistent split details and amounts. The update is performed within a transaction
        /// to ensure data integrity.</remarks>
        /// <param name="dto">An object containing the updated expense information, including the expense ID, group ID, payer, amount, and
        /// split details. Must not be null. The sum of split amounts must match the total amount.</param>
        /// <returns>An IActionResult indicating the result of the update operation. Returns 200 OK if the update is successful,
        /// 404 Not Found if the expense does not exist, or 400 Bad Request if the split amounts do not match the total
        /// amount.</returns>
        [HttpPut("UpdateExpense")]
        public async Task<IActionResult> UpdateExpense([FromBody] UpdateExpenseDto dto)
        {
            using var tx = await _context.Database.BeginTransactionAsync();

            var expense = await _context.Expenses
                .Include(e => e.ExpenseSplits)
                .FirstOrDefaultAsync(e => e.ExpenseId == dto.ExpenseId);

            if (expense == null)
                return NotFound("Expense not found");

            if (Math.Abs(dto.SplitDetails.Sum(s => s.Amount) - dto.Amount) > 0.01m)
                return BadRequest("Split mismatch");

            var affectedUserIds =
                expense.ExpenseSplits.Select(s => s.UserId)
                .Append(expense.PaidByUserId)
                .Concat(dto.SplitDetails.Select(s => s.UserId))
                .Append(dto.PaidByUserId)
                .Distinct()
                .ToList();

            var balances = await EnsureBalances(dto.GroupId, affectedUserIds);

            // reverse old
            balances.Single(b => b.UserId == expense.PaidByUserId)
                    .NetBalance -= expense.Amount;

            foreach (var split in expense.ExpenseSplits)
            {
                balances.Single(b => b.UserId == split.UserId)
                        .NetBalance += split.OwedAmount;
            }

            // apply new
            balances.Single(b => b.UserId == dto.PaidByUserId)
                    .NetBalance += dto.Amount;

            foreach (var split in dto.SplitDetails.Where(s => s.UserId != dto.PaidByUserId))
            {
                balances.Single(b => b.UserId == split.UserId)
                        .NetBalance -= split.Amount;
            }

            expense.Name = dto.Name;
            expense.Amount = dto.Amount;
            expense.PaidByUserId = dto.PaidByUserId;
            expense.SplitPer = JsonSerializer.Serialize(dto.SplitDetails);

            _context.ExpenseSplits.RemoveRange(expense.ExpenseSplits);
            _context.ExpenseSplits.AddRange(
                dto.SplitDetails
                    .Where(s => s.UserId != dto.PaidByUserId)
                    .Select(s => new ExpenseSplit
                    {
                        ExpenseId = expense.ExpenseId,
                        UserId = s.UserId,
                        OwedAmount = s.Amount
                    })
            );

            _context.ActivityLogs.Add(new ActivityLog
            {
                GroupId = dto.GroupId,
                UserId = dto.PaidByUserId,
                ActionType = "UpdateExpense",
                Description = dto.Name,
                ExpenseId = expense.ExpenseId,
                Amount = dto.Amount,
                CreatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified)
            });

            await _context.SaveChangesAsync();
            await tx.CommitAsync();

            return Ok(new { message = "Expense updated successfully" });
        }

        /// <summary>
        /// Helper Method to check Balance
        /// </summary>
        /// <param name="groupId"></param>
        /// <param name="userIds"></param>
        /// <returns></returns>
        private async Task<List<GroupBalance>> EnsureBalances(
            int groupId,
            List<int> userIds)
        {
            var balances = await _context.GroupBalances
                .Where(b => b.GroupId == groupId && userIds.Contains(b.UserId))
                .ToListAsync();

            foreach (var userId in userIds)
            {
                if (!balances.Any(b => b.UserId == userId))
                {
                    var balance = new GroupBalance
                    {
                        GroupId = groupId,
                        UserId = userId,
                        NetBalance = 0
                    };

                    balances.Add(balance);
                    _context.GroupBalances.Add(balance);
                }
            }

            return balances;
        }
    }
}
