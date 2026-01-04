using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using splitzy_dotnet.DTO;
using splitzy_dotnet.Extensions;
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
        [HttpGet("dashboard")]
        [ProducesResponseType(typeof(UserDTO), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(string), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(string), StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<UserDTO>> GetDashboard()
        {
            try
            {
                int userId = HttpContext.GetCurrentUserId();

                var user = await _context.Users
                    .AsNoTracking()
                    .FirstOrDefaultAsync(u => u.UserId == userId);

                if (user == null)
                    return NotFound("User not found");

                var groupMemberships = await _context.GroupMembers
                    .AsNoTracking()
                    .Include(gm => gm.Group)
                    .Where(gm => gm.UserId == userId)
                    .ToListAsync();

                var groupIds = groupMemberships.Select(gm => gm.GroupId).ToList();

                var expenses = await _context.Expenses
                    .AsNoTracking()
                    .Where(e =>
                        e.PaidByUserId == userId ||
                        _context.ExpenseSplits.Any(s => s.ExpenseId == e.ExpenseId && s.UserId == userId))
                    .ToListAsync();

                var expenseIds = expenses.Select(e => e.ExpenseId).ToList();

                var splits = await _context.ExpenseSplits
                    .AsNoTracking()
                    .Where(s => expenseIds.Contains(s.ExpenseId))
                    .ToListAsync();

                var users = await _context.Users
                    .AsNoTracking()
                    .ToDictionaryAsync(u => u.UserId, u => u.Name);

                decimal youOwe = splits
                    .Where(s => s.UserId == userId)
                    .Sum(s => s.OwedAmount);

                decimal youAreOwed = expenses
                    .Where(e => e.PaidByUserId == userId)
                    .SelectMany(e => splits.Where(s => s.ExpenseId == e.ExpenseId && s.UserId != userId))
                    .Sum(s => s.OwedAmount);

                var oweTo = splits
                    .Where(s => s.UserId == userId)
                    .Join(expenses,
                        s => s.ExpenseId,
                        e => e.ExpenseId,
                        (s, e) => new { s, e })
                    .Where(x => x.e.PaidByUserId != userId)
                    .GroupBy(x => x.e.PaidByUserId)
                    .Select(g => new PersonAmount
                    {
                        Name = users[g.Key],
                        Amount = g.Sum(x => x.s.OwedAmount)
                    })
                    .ToList();

                var owedFrom = expenses
                    .Where(e => e.PaidByUserId == userId)
                    .SelectMany(e => splits.Where(s => s.ExpenseId == e.ExpenseId && s.UserId != userId))
                    .GroupBy(s => s.UserId)
                    .Select(g => new PersonAmount
                    {
                        Name = users[g.Key],
                        Amount = g.Sum(x => x.OwedAmount)
                    })
                    .ToList();

                var groupWiseSummary = groupMemberships.Select(gm =>
                {
                    var groupExpenses = expenses.Where(e => e.GroupId == gm.GroupId);

                    var owedInGroup = groupExpenses
                        .Where(e => e.PaidByUserId == userId)
                        .SelectMany(e => splits.Where(s => s.ExpenseId == e.ExpenseId && s.UserId != userId))
                        .Sum(s => s.OwedAmount);

                    var oweInGroup = splits
                        .Where(s => s.UserId == userId)
                        .Join(groupExpenses,
                            s => s.ExpenseId,
                            e => e.ExpenseId,
                            (s, e) => s.OwedAmount)
                        .Sum();

                    return new GroupSummary
                    {
                        GroupId = gm.GroupId,
                        GroupName = gm.Group.Name,
                        NetBalance = owedInGroup - oweInGroup
                    };
                }).ToList();

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
                return StatusCode(500, $"Dashboard error: {ex.Message}");
            }
        }

        /// <summary>
        /// Gets recent activity (expenses and logs) for a specific user.
        /// </summary>
        /// <returns>List of recent activities</returns>
        [HttpGet("recent")]
        [ProducesResponseType(typeof(List<RecentActivityDTO>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(string), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> GetRecentActivity()
        {
            int userId = HttpContext.GetCurrentUserId();
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
