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
        public async Task<ActionResult<UserDTO>> GetDashboard()
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

            var balances = await _context.GroupBalances
                .AsNoTracking()
                .Where(b => b.UserId == userId)
                .ToListAsync();

            var users = await _context.Users
                .AsNoTracking()
                .ToDictionaryAsync(u => u.UserId, u => u.Name);

            decimal totalBalance = balances.Sum(b => b.NetBalance);

            decimal youAreOwed = balances
                .Where(b => b.NetBalance > 0)
                .Sum(b => b.NetBalance);

            decimal youOwe = balances
                .Where(b => b.NetBalance < 0)
                .Sum(b => Math.Abs(b.NetBalance));

            var oweTo = new List<PersonAmount>();
            var owedFrom = new List<PersonAmount>();

            var allGroupBalances = await _context.GroupBalances
                .AsNoTracking()
                .ToListAsync();

            foreach (var group in allGroupBalances.GroupBy(b => b.GroupId))
            {
                var netMap = group.ToDictionary(b => b.UserId, b => b.NetBalance);
                var settlements = ExpenseSimplifier.Simplify(netMap);

                foreach (var s in settlements)
                {
                    if (s.FromUser == userId)
                        oweTo.Add(new PersonAmount { Name = users[s.ToUser], Amount = s.Amount });
                    else if (s.ToUser == userId)
                        owedFrom.Add(new PersonAmount { Name = users[s.FromUser], Amount = s.Amount });
                }
            }

            var groupWiseSummary = balances
                .Join(groupMemberships,
                    b => b.GroupId,
                    gm => gm.GroupId,
                    (b, gm) => new GroupSummary
                    {
                        GroupId = gm.GroupId,
                        GroupName = gm.Group.Name,
                        NetBalance = b.NetBalance
                    })
                .ToList();

            return Ok(new UserDTO
            {
                UserId = user.UserId,
                UserName = user.Name,
                TotalBalance = totalBalance,
                YouOwe = youOwe,
                YouAreOwed = youAreOwed,
                OweTo = oweTo,
                OwedFrom = owedFrom,
                GroupWiseSummary = groupWiseSummary
            });
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
