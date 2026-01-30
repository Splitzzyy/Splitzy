using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using splitzy_dotnet.DTO;
using splitzy_dotnet.Extensions;
using splitzy_dotnet.Models;
using System.Text.Json;

namespace splitzy_dotnet.Controllers
{
    [Authorize]
    [EnableRateLimiting("per-user")]
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
                Amount = Helper.Normalize(dto.Amount),
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
                    OwedAmount = Helper.Normalize(s.Amount)
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
                var balance = balances.Single(b => b.UserId == split.UserId);
                balance.NetBalance = Helper.Normalize(balance.NetBalance - split.Amount);
            }

            var payer = balances.Single(b => b.UserId == dto.PaidByUserId);
            payer.NetBalance = Helper.Normalize(payer.NetBalance + dto.Amount);

            _context.ActivityLogs.Add(new ActivityLog
            {
                GroupId = dto.GroupId,
                UserId = dto.PaidByUserId,
                ActionType = "AddExpense",
                Description = dto.Name,
                ExpenseId = expense.ExpenseId,
                Amount = expense.Amount,
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

            var payer = balances.Single(b => b.UserId == expense.PaidByUserId);
            payer.NetBalance = Helper.Normalize(payer.NetBalance - expense.Amount);

            foreach (var split in expense.ExpenseSplits)
            {
                var balance = balances.Single(b => b.UserId == split.UserId);
                balance.NetBalance = Helper.Normalize(balance.NetBalance + split.OwedAmount);
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

            var oldPayer = balances.Single(b => b.UserId == expense.PaidByUserId);
            oldPayer.NetBalance = Helper.Normalize(oldPayer.NetBalance - expense.Amount);

            foreach (var split in expense.ExpenseSplits)
            {
                var balance = balances.Single(b => b.UserId == split.UserId);
                balance.NetBalance = Helper.Normalize(balance.NetBalance + split.OwedAmount);
            }

            var newPayer = balances.Single(b => b.UserId == dto.PaidByUserId);
            newPayer.NetBalance = Helper.Normalize(newPayer.NetBalance + dto.Amount);

            foreach (var split in dto.SplitDetails)
            {
                var balance = balances.Single(b => b.UserId == split.UserId);
                balance.NetBalance = Helper.Normalize(balance.NetBalance - split.Amount);
            }

            expense.Name = dto.Name;
            expense.Amount = Helper.Normalize(dto.Amount);
            expense.PaidByUserId = dto.PaidByUserId;
            expense.SplitPer = JsonSerializer.Serialize(dto.SplitDetails);

            _context.ExpenseSplits.RemoveRange(expense.ExpenseSplits);
            _context.ExpenseSplits.AddRange(
                dto.SplitDetails.Select(s => new ExpenseSplit
                {
                    ExpenseId = expense.ExpenseId,
                    UserId = s.UserId,
                    OwedAmount = Helper.Normalize(s.Amount)
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
        /// Retrieves the details of a specific expense, including payer and split information.
        /// </summary>
        /// <remarks>The response includes the expense's basic information, the user who paid, and a list
        /// of users with their respective split amounts. Returns a 404 response if the specified expense does not
        /// exist.</remarks>
        /// <param name="expenseId">The unique identifier of the expense to retrieve.</param>
        /// <returns>An <see cref="IActionResult"/> containing the expense details if found; otherwise, a response indicating
        /// that the expense was not found.</returns>
        [HttpGet("{expenseId:int}")]
        public async Task<IActionResult> GetExpenseDetails(int expenseId)
        {
            var expense = await _context.Expenses
                .Include(e => e.ExpenseSplits)
                .FirstOrDefaultAsync(e => e.ExpenseId == expenseId);

            if (expense == null)
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Expense not found"
                });
            }

            var userIds = expense.ExpenseSplits
                                .Select(s => s.UserId)
                                .Append(expense.PaidByUserId)
                                .Distinct()
                                .ToList();

            var users = await _context.Users
                                    .Where(u => userIds.Contains(u.UserId))
                                    .ToDictionaryAsync(u => u.UserId, u => u.Name);

            var response = new ExpenseDetailsResponseDto
            {
                ExpenseId = expense.ExpenseId,
                Name = expense.Name,
                Amount = expense.Amount,

                PaidBy = new PaidByDto
                {
                    UserId = expense.PaidByUserId,
                    UserName = users.GetValueOrDefault(expense.PaidByUserId)
                },

                Splits = expense.ExpenseSplits.Select(s => new ExpenseSplitDto
                {
                    UserId = s.UserId,
                    UserName = users.GetValueOrDefault(s.UserId),
                    Amount = s.OwedAmount
                }).ToList()
            };

            return Ok(new
            {
                Success = true,
                Message = "Expense details fetched successfully",
                Data = response
            });
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
