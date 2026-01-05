using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using splitzy_dotnet.DTO;
using splitzy_dotnet.Extensions;
using splitzy_dotnet.Models;
using splitzy_dotnet.Services.Interfaces;
using splitzy_dotnet.Templates;

namespace splitzy_dotnet.Controllers
{
    [Authorize]
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

            var groupWiseSummary = groupMemberships
                                        .Select(gm =>
                                        {
                                            var balance = balances
                                                .FirstOrDefault(b => b.GroupId == gm.GroupId);

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
            int currentUserId = HttpContext.GetCurrentUserId();

            // fetch group balances
            var balances = await _context.GroupBalances
                .Where(b => b.GroupId == request.GroupId &&
                       (b.UserId == request.OwedUserId ||
                        b.UserId == request.OwedToUserId))
                .ToListAsync();

            if (balances.Count != 2)
                return Ok(new { success = false, message = "Invalid users" });

            var debtor = balances.Single(b => b.UserId == request.OwedUserId);
            var creditor = balances.Single(b => b.UserId == request.OwedToUserId);

            if (debtor.NetBalance >= 0)
                return Ok(new { success = false, message = "User does not owe money" });

            var amount = Math.Min(
                Math.Abs(debtor.NetBalance),
                creditor.NetBalance
            );

            if (amount <= 0)
                return Ok(new { success = false, message = "Nothing to remind" });

            var owedUser = await _context.Users.FindAsync(request.OwedUserId);
            var owedToUser = await _context.Users.FindAsync(request.OwedToUserId);
            var group = await _context.Groups.FindAsync(request.GroupId);

            if (owedUser == null || owedToUser == null || group == null)
                return Ok(new { success = false, message = "Invalid data" });

            var html = new ReminderTemplate().Build(
                owedUser.Name,
                amount,
                group.Name,
                owedToUser.Name
            );

            var subject = $"Reminder: You owe ₹{amount:N2} to {owedToUser.Name}";

            await _emailService.SendAsync(
                owedUser.Email,
                subject,
                html
            );

            return Ok(new
            {
                success = true,
                message = "Reminder email sent.",
                amount = amount
            });
        }

    }
}
