using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using splitzy_dotnet.DTO;
using splitzy_dotnet.Extensions;
using splitzy_dotnet.Models;
using splitzy_dotnet.Services.Interfaces;
using splitzy_dotnet.Templates;
using static splitzy_dotnet.DTO.GroupDTO;

namespace splitzy_dotnet.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class GroupController : ControllerBase
    {
        private readonly SplitzyContext _context;
        private readonly ILogger<GroupController> _logger;
        private readonly IEmailService _emailService;

        public GroupController(SplitzyContext context, ILogger<GroupController> logger, IEmailService emailService)
        {
            _context = context;
            _logger = logger;
            _emailService = emailService;
        }

        /// <summary>
        /// Gets all groups a user is part of.
        /// </summary>
        /// <returns>List of groups</returns>
        [HttpGet("GetAllGroupByUser")]
        [ProducesResponseType(typeof(IEnumerable<UserGroupInfo>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(string), StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<IEnumerable<UserGroupInfo>>> GetAllGroupByUser()
        {
            int userId = HttpContext.GetCurrentUserId();
            try
            {
                List<GroupMember> groupMemberships = await GetUserGroupMembers(userId);

                var result = groupMemberships.Select(gm => new UserGroupInfo
                {
                    GroupId = gm.GroupId,
                    GroupName = gm.Group.Name,
                    JoinedAt = gm.JoinedAt
                });

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Exception from GetAllGroupByUser : {ex.Message}");
                return StatusCode(500, "An error occurred while retrieving groups.");
            }
        }

        private async Task<List<GroupMember>> GetUserGroupMembers(int userId)
        {
            return await _context.GroupMembers
                                .Where(gm => gm.UserId == userId)
                                .Include(gm => gm.Group)
                                .ToListAsync();
        }

        /// <summary>
        /// Get group summary including members and expenses.
        /// </summary>
        [HttpGet("GetGroupSummary/{groupId}")]
        [ProducesResponseType(typeof(GroupSummaryDTO), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(string), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(string), StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<GroupSummaryDTO>> GetGroupSummary(int groupId)
        {
            try
            {
                Group? group = await GetGroupWithMembersAndExpenses(groupId);

                if (group == null)
                    return NotFound("Group not found.");

                var usernames = group.GroupMembers.Select(gm => gm.User.Name).ToList();

                var expenses = group.Expenses.Select(e => new GroupExpenseDTO
                {
                    PaidBy = e.PaidByUser.Name,
                    Name = e.Name,
                    Amount = e.Amount
                }).ToList();

                var summary = new GroupSummaryDTO
                {
                    GroupId = group.GroupId,
                    GroupName = group.Name,
                    TotalMembers = usernames.Count,
                    Usernames = usernames,
                    Expenses = expenses
                };

                return Ok(summary);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Exception from GetGroupSummary : {ex.Message}");
                return StatusCode(500, "An unexpected error occurred while getting the group summary.");
            }
        }

        private async Task<Group?> GetGroupWithMembersAndExpenses(int groupId)
        {
            return await _context.Groups
                                .Include(g => g.GroupMembers).ThenInclude(gm => gm.User)
                                .Include(g => g.Expenses).ThenInclude(e => e.PaidByUser)
                                .FirstOrDefaultAsync(g => g.GroupId == groupId);
        }

        [HttpPost("CreateGroup")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(string), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(string), StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult> CreateGroup([FromBody] CreateGroupRequest request)
        {
            var creatorUserId = HttpContext.GetCurrentUserId();

            var requestedEmails = request.UserEmails?
                .Where(e => !string.IsNullOrWhiteSpace(e))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList() ?? new List<string>();

            var users = await _context.Users
                .Where(u => u.UserId == creatorUserId || requestedEmails.Contains(u.Email))
                .ToListAsync();

            var creator = users.FirstOrDefault(u => u.UserId == creatorUserId);
            if (creator == null)
                return Unauthorized("Creator not found");

            var foundEmails = users
                .Where(u => u.Email != null)
                .Select(u => u.Email)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            var missingEmails = requestedEmails
                .Where(e => !foundEmails.Contains(e))
                .ToList();

            if (missingEmails.Any())
                return NotFound($"User(s) not found: {string.Join(", ", missingEmails)}");

            using var tx = await _context.Database.BeginTransactionAsync();

            try
            {
                var group = new Group
                {
                    Name = request.GroupName,
                    CreatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified)
                };

                _context.Groups.Add(group);

                var groupMembers = users
                    .DistinctBy(u => u.UserId)
                    .Select(u => new GroupMember
                    {
                        Group = group,
                        UserId = u.UserId,
                        JoinedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified)
                    });

                _context.GroupMembers.AddRange(groupMembers);

                await _context.SaveChangesAsync();
                await tx.CommitAsync();

                _ = Task.Run(async () =>
                {
                    try
                    {
                        var emailTasks = users
                            .Where(u => u.UserId != creator.UserId)
                            .Select(u =>
                            {
                                var html = new GroupAddedTemplate()
                                    .Build(u.Name, request.GroupName, creator.Name);

                                return _emailService.SendAsync(
                                    u.Email,
                                    $"You were added to {request.GroupName}",
                                    html
                                );
                            });

                        await Task.WhenAll(emailTasks);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to send group emails");
                    }
                });

                return Ok(new
                {
                    group.GroupId,
                    group.Name,
                    Members = users.Select(u => new
                    {
                        u.UserId,
                        u.Name,
                        u.Email
                    })
                });
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync();
                _logger.LogError(ex, "Exception from CreateGroup");
                return StatusCode(500, "An unexpected error occurred. Please try again later.");
            }
        }


        private async Task<List<User>> FetchUsersByEmails(CreateGroupRequest request)
        {
            return await _context.Users
                                .Where(u => request.UserEmails.Contains(u.Email))
                                .ToListAsync();
        }

        /// <summary>
        /// Gets group overview for a user including balances and expenses.
        /// </summary>
        [HttpGet("GetGroupOverview/{groupId}")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(string), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(string), StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult> GetGroupOverview(int groupId)
        {
            int userId = HttpContext.GetCurrentUserId();

            try
            {
                // 1️⃣ Group validation
                var group = await _context.Groups.FirstOrDefaultAsync(g => g.GroupId == groupId);
                if (group == null)
                    return NotFound("Group not found.");

                var isMember = await _context.GroupMembers
                    .AnyAsync(gm => gm.GroupId == groupId && gm.UserId == userId);
                if (!isMember)
                    return Forbid();

                // 2️⃣ Members
                var members = await _context.GroupMembers
                    .Where(gm => gm.GroupId == groupId)
                    .Select(gm => gm.UserId)
                    .ToListAsync();

                // 3️⃣ User maps
                var userNameMap = await _context.Users
                    .Where(u => members.Contains(u.UserId))
                    .ToDictionaryAsync(u => u.UserId, u => u.Name);

                var userDetailsMap = await _context.Users
                    .Where(u => members.Contains(u.UserId))
                    .ToDictionaryAsync(
                        u => u.UserId,
                        u => new { u.Name, u.Email });

                // 4️⃣ 🔥 SINGLE SOURCE OF TRUTH — BALANCES
                var balances = await _context.GroupBalances
                    .Where(b => b.GroupId == groupId)
                    .ToDictionaryAsync(b => b.UserId, b => b.NetBalance);

                // Ensure all members exist
                foreach (var memberId in members)
                {
                    if (!balances.ContainsKey(memberId))
                        balances[memberId] = 0;
                }

                var userBalance = balances[userId];
                decimal youOwe = userBalance < 0 ? Math.Abs(userBalance) : 0;
                decimal youAreOwed = userBalance > 0 ? userBalance : 0;

                // 5️⃣ Expenses (history only)
                var allExpenses = await _context.Expenses
                    .Where(e => e.GroupId == groupId)
                    .Include(e => e.ExpenseSplits)
                    .ToListAsync();

                var expenses = allExpenses.Select(e => new
                {
                    e.ExpenseId,
                    e.Name,
                    e.Amount,
                    PaidBy = userNameMap[e.PaidByUserId],
                    CreatedAt = e.CreatedAt?.ToString("MMM dd") ?? string.Empty,
                    YouOwe = e.ExpenseSplits
                        .FirstOrDefault(s => s.UserId == userId)?.OwedAmount ?? 0
                });

                // 6️⃣ User summaries (UPDATED after settlement)
                var userSummaries = balances.Select(b => new
                {
                    UserId = b.Key,
                    Name = userNameMap[b.Key],
                    Balance = Math.Round(b.Value, 2)
                });

                // 7️⃣ Group balance (sum of positives == sum of abs negatives)
                var groupBalance = balances.Values
                    .Where(v => v > 0)
                    .Sum(v => v);

                return Ok(new
                {
                    group.GroupId,
                    group.Name,
                    Created = group.CreatedAt?.ToString("MMM dd") ?? string.Empty,
                    GroupBalance = Math.Round(groupBalance, 2),
                    MembersCount = members.Count,
                    Expenses = expenses,
                    Balances = new
                    {
                        TotalBalance = Math.Round(userBalance, 2),
                        YouOwe = Math.Round(youOwe, 2),
                        YouAreOwed = Math.Round(youAreOwed, 2)
                    },
                    Members = userDetailsMap.Select(m => new
                    {
                        MemberId = m.Key,
                        MemberName = m.Value.Name,
                        MemberEmail = m.Value.Email
                    }),
                    UserSummaries = userSummaries
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Exception from GetGroupOverview");
                return StatusCode(500, "An unexpected error occurred. Please try again later.");
            }
        }


        private async Task<List<int>> GetUserIdsByGroup(int groupId)
        {
            return await _context.GroupMembers
                                .Where(gm => gm.GroupId == groupId)
                                .Select(gm => gm.UserId)
                                .ToListAsync();
        }
    }
}
