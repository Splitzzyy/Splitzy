using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using splitzy_dotnet.DTO;
using splitzy_dotnet.Extensions;
using splitzy_dotnet.Models;
using splitzy_dotnet.Services.Interfaces;
using splitzy_dotnet.Templates;

namespace splitzy_dotnet.Controllers
{
    [Authorize]
    [EnableRateLimiting("per-user")]
    [ApiController]
    [Route("api/[controller]")]
    public class DashboardController : ControllerBase
    {
        private readonly SplitzyContext _context;
        private readonly IEmailService _emailService;

        public DashboardController(SplitzyContext context, IEmailService emailService)
        {
            _context = context;
            _emailService = emailService;
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

            // Get user's group memberships
            var groupMemberships = await _context.GroupMembers
                .AsNoTracking()
                .Include(gm => gm.Group)
                .Where(gm => gm.UserId == userId)
                .ToListAsync();

            var userGroupIds = groupMemberships.Select(gm => gm.GroupId).ToList();

            // Only load balances for groups this user is in
            var allGroupBalances = await _context.GroupBalances
                .AsNoTracking()
                .Where(b => userGroupIds.Contains(b.GroupId))
                .ToListAsync();

            // Current user's balances per group
            var myBalances = allGroupBalances.Where(b => b.UserId == userId).ToList();

            decimal totalBalance = myBalances.Sum(b => b.NetBalance);
            decimal youAreOwed = myBalances.Where(b => b.NetBalance > 0).Sum(b => b.NetBalance);
            decimal youOwe = myBalances.Where(b => b.NetBalance < 0).Sum(b => Math.Abs(b.NetBalance));

            // Only load users relevant to these groups
            var relevantUserIds = allGroupBalances.Select(b => b.UserId).Distinct().ToList();
            var users = await _context.Users
                .AsNoTracking()
                .Where(u => relevantUserIds.Contains(u.UserId))
                .ToDictionaryAsync(u => u.UserId, u => u.Name);

            // Run simplifier per group and aggregate globally
            var oweToMap = new Dictionary<int, decimal>();
            var owedFromMap = new Dictionary<int, decimal>();

            foreach (var group in allGroupBalances.GroupBy(b => b.GroupId))
            {
                var netMap = group.ToDictionary(b => b.UserId, b => b.NetBalance);
                var settlements = ExpenseSimplifier.Simplify(netMap);

                foreach (var s in settlements)
                {
                    if (s.FromUser == userId)
                    {
                        if (!oweToMap.ContainsKey(s.ToUser)) oweToMap[s.ToUser] = 0;
                        oweToMap[s.ToUser] += s.Amount;
                    }
                    else if (s.ToUser == userId)
                    {
                        if (!owedFromMap.ContainsKey(s.FromUser)) owedFromMap[s.FromUser] = 0;
                        owedFromMap[s.FromUser] += s.Amount;
                    }
                }
            }

            // Net out people who appear in both maps (owe each other across different groups)
            var allPeople = oweToMap.Keys.Union(owedFromMap.Keys).ToList();

            var oweTo = new List<PersonAmount>();
            var owedFrom = new List<PersonAmount>();

            foreach (var personId in allPeople)
            {
                decimal fromThem = owedFromMap.GetValueOrDefault(personId, 0);
                decimal toThem = oweToMap.GetValueOrDefault(personId, 0);
                decimal net = fromThem - toThem;

                if (net > 0)
                    owedFrom.Add(new PersonAmount { Id = personId, Name = users[personId], Amount = net });
                else if (net < 0)
                    oweTo.Add(new PersonAmount { Id = personId, Name = users[personId], Amount = Math.Abs(net) });
            }

            var groupWiseSummary = groupMemberships
                .Select(gm =>
                {
                    var balance = myBalances.FirstOrDefault(b => b.GroupId == gm.GroupId);
                    return new GroupSummary
                    {
                        GroupId = gm.GroupId,
                        GroupName = gm.Group.Name,
                        NetBalance = balance?.NetBalance ?? 0
                    };
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

        /// <summary>
        /// Sends a reminder email to a user who owes a payment within a group.
        /// </summary>
        /// <remarks>This endpoint validates that the specified users and group exist and that a payment
        /// is actually owed before sending a reminder email. No email is sent if the debt does not exist or the data is
        /// invalid.</remarks>
        /// <param name="request">The reminder request containing the group and user information for the payment reminder. Cannot be null.</param>
        /// <returns>An IActionResult indicating the outcome of the reminder operation. Returns a success message if the reminder
        /// is sent; otherwise, returns a message describing why the reminder was not sent.</returns>
        [HttpPost("reminder")]
        public async Task<IActionResult> SendReminder([FromBody] ReminderRequestForPayment request)
        {
            if (request.OwedUserId <= 0 || request.OwedToUserId <= 0 || request.Amount <= 0)
            {
                return BadRequest(new { success = false, message = "Invalid request data" });
            }

            var users = await _context.Users
                .Where(u => u.UserId == request.OwedUserId || u.UserId == request.OwedToUserId)
                .Select(u => new { u.UserId, u.Name, u.Email })
                .ToListAsync();

            var owedUser = users.FirstOrDefault(u => u.UserId == request.OwedUserId);
            var owedToUser = users.FirstOrDefault(u => u.UserId == request.OwedToUserId);

            if (owedUser == null || owedToUser == null)
                return NotFound(new { success = false, message = "User not found" });

            if (string.IsNullOrWhiteSpace(owedUser.Email))
                return BadRequest(new { success = false, message = "No email address found" });

            try
            {
                var html = new ReminderTemplate().Build(owedUser.Name, request.Amount, owedToUser.Name);
                var subject = $"Reminder: You owe ₹{request.Amount:N2} to {owedToUser.Name}";

                await _emailService.SendAsync(owedUser.Email, subject, html);

                return Ok(new { success = true, message = "Reminder sent", amount = request.Amount });
            }
            catch
            {
                return StatusCode(500, new { success = false, message = "Failed to send reminder" });
            }
        }
    }
}
