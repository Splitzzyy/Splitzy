using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using splitzy_dotnet.DTO;
using splitzy_dotnet.Models;

namespace splitzy_dotnet.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class DashboardController : ControllerBase
    {
        private readonly SplitzyContext _context;

        public DashboardController(SplitzyContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Retrieves dashboard data for a specific user.
        /// </summary>
        /// <param name="userId">User ID</param>
        /// <returns>User dashboard summary</returns>
        [HttpGet("dashboard/{userId}")]
        [ProducesResponseType(typeof(UserDTO), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(string), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(string), StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<UserDTO>> GetDashboard(int userId)
        {
            try
            {
                var user = await _context.Users.FindAsync(userId);
                if (user == null) return NotFound("User not found");

                var groupMemberships = await _context.GroupMembers
                    .Where(gm => gm.UserId == userId)
                    .Include(gm => gm.Group)
                    .ToListAsync();

                var totalPaid = await _context.Expenses
                    .Where(e => e.PaidByUserId == userId)
                    .SumAsync(e => (decimal?)e.Amount) ?? 0;

                var youOwe = await _context.ExpenseSplits
                    .Where(s => s.UserId == userId)
                    .SumAsync(s => (decimal?)s.OwedAmount) ?? 0;

                var youAreOwed = await _context.Expenses
                    .Where(e => e.PaidByUserId == userId)
                    .Join(_context.ExpenseSplits, e => e.ExpenseId, s => s.ExpenseId, (e, s) => new { s.UserId, s.OwedAmount })
                    .Where(x => x.UserId != userId)
                    .SumAsync(x => (decimal?)x.OwedAmount) ?? 0;

                var oweTo = await _context.ExpenseSplits
                    .Where(s => s.UserId == userId)
                    .Join(_context.Expenses, s => s.ExpenseId, e => e.ExpenseId, (s, e) => new { s, e })
                    .Where(x => x.e.PaidByUserId != userId)
                    .GroupBy(x => x.e.PaidByUserId)
                    .Select(g => new PersonAmount
                    {
                        Name = _context.Users.Where(u => u.UserId == g.Key).Select(u => u.Name).FirstOrDefault() ?? "",
                        Amount = g.Sum(x => x.s.OwedAmount)
                    }).ToListAsync();

                var owedFrom = await _context.Expenses
                    .Where(e => e.PaidByUserId == userId)
                    .Join(_context.ExpenseSplits, e => e.ExpenseId, s => s.ExpenseId, (e, s) => new { s.UserId, s.OwedAmount })
                    .Where(x => x.UserId != userId)
                    .GroupBy(x => x.UserId)
                    .Select(g => new PersonAmount
                    {
                        Name = _context.Users.Where(u => u.UserId == g.Key).Select(u => u.Name).FirstOrDefault() ?? "",
                        Amount = g.Sum(x => x.OwedAmount)
                    }).ToListAsync();

                var groupWiseSummary = await _context.Groups
                    .Where(g => groupMemberships.Select(m => m.GroupId).Contains(g.GroupId))
                    .Select(g => new GroupSummary
                    {
                        GroupId = g.GroupId,
                        GroupName = g.Name,
                        NetBalance =
                            (_context.Expenses.Where(e => e.GroupId == g.GroupId && e.PaidByUserId == userId)
                            .Join(_context.ExpenseSplits, e => e.ExpenseId, s => s.ExpenseId, (e, s) => s)
                            .Where(s => s.UserId != userId).Sum(s => (decimal?)s.OwedAmount) ?? 0)
                            -
                            (_context.ExpenseSplits.Where(s => s.UserId == userId)
                            .Join(_context.Expenses, s => s.ExpenseId, e => e.ExpenseId, (s, e) => new { s, e })
                            .Where(x => x.e.GroupId == g.GroupId).Sum(x => (decimal?)x.s.OwedAmount) ?? 0)
                    }).ToListAsync();

                var result = new UserDTO
                {
                    UserId = user.UserId,
                    UserName = user.Name,
                    TotalBalance = youAreOwed - youOwe,
                    YouOwe = youOwe,
                    YouAreOwed = youAreOwed,
                    OweTo = oweTo,
                    OwedFrom = owedFrom,
                    GroupWiseSummary = groupWiseSummary
                };

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"An error occurred while retrieving dashboard: {ex.Message}");
            }
        }

        /// <summary>
        /// Gets recent activity (expenses and logs) for a specific user.
        /// </summary>
        /// <param name="userId">User ID</param>
        /// <returns>List of recent activities</returns>
        [HttpGet("recent/{userId}")]
        [ProducesResponseType(typeof(List<RecentActivityDTO>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(string), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> GetRecentActivity(int userId)
        {
            try
            {
                var groupIds = await _context.GroupMembers
                    .Where(gm => gm.UserId == userId)
                    .Select(gm => gm.GroupId)
                    .ToListAsync();

                var expenses = await _context.Expenses
                    .Include(e => e.ExpenseSplits)
                    .Include(e => e.Group)
                    .Where(e => groupIds.Contains(e.GroupId))
                    .OrderByDescending(e => e.CreatedAt)
                    .Take(20)
                    .ToListAsync();

                var activities = new List<RecentActivityDTO>();

                foreach (var expense in expenses)
                {
                    var payerName = await _context.Users
                        .Where(u => u.UserId == expense.PaidByUserId)
                        .Select(u => u.Name)
                        .FirstOrDefaultAsync() ?? "Someone";

                    var userSplit = expense.ExpenseSplits
                        .FirstOrDefault(s => s.UserId == userId)?.OwedAmount ?? 0;

                    var impactAmount = expense.PaidByUserId == userId
                        ? expense.Amount - userSplit
                        : -userSplit;

                    activities.Add(new RecentActivityDTO
                    {
                        Actor = expense.PaidByUserId == userId ? "You" : payerName,
                        Action = "added",
                        ExpenseName = expense.Name,
                        GroupName = expense.Group?.Name ?? "",
                        CreatedAt = expense.CreatedAt ?? DateTime.MinValue,
                        Impact = new ActivityImpact
                        {
                            Type = impactAmount >= 0 ? "get_back" : "owe",
                            Amount = Math.Abs(impactAmount)
                        }
                    });
                }

                var logs = await _context.ActivityLogs
                    .Where(a => groupIds.Contains(a.GroupId))
                    .OrderByDescending(a => a.CreatedAt)
                    .Take(20)
                    .ToListAsync();

                foreach (var log in logs)
                {
                    var groupName = await _context.Groups
                        .Where(g => g.GroupId == log.GroupId)
                        .Select(g => g.Name)
                        .FirstOrDefaultAsync() ?? "";

                    bool isAlreadyAdded = activities.Any(a =>
                        a.Action == "added" &&
                        a.ExpenseName == log.Description &&
                        a.GroupName == groupName
                    );

                    if (log.ActionType == "AddExpense" && isAlreadyAdded)
                        continue;

                    string actorName = log.UserId == userId
                        ? "You"
                        : await _context.Users
                            .Where(u => u.UserId == log.UserId)
                            .Select(u => u.Name)
                            .FirstOrDefaultAsync() ?? "Someone";

                    activities.Add(new RecentActivityDTO
                    {
                        Actor = actorName,
                        Action = log.ActionType switch
                        {
                            "AddExpense" => "added",
                            "UpdateExpense" => "updated",
                            "DeleteExpense" => "deleted",
                            _ => log.ActionType.ToLower()
                        },
                        ExpenseName = log.Description ?? "",
                        GroupName = groupName,
                        CreatedAt = log.CreatedAt,
                        Impact = new ActivityImpact
                        {
                            Type = "info",
                            Amount = log.Amount ?? 0
                        }
                    });
                }

                var sortedActivities = activities
                    .OrderByDescending(a => a.CreatedAt)
                    .Take(10)
                    .ToList();

                return Ok(sortedActivities);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"An error occurred while fetching recent activity: {ex.Message}");
            }
        }
    }
}
