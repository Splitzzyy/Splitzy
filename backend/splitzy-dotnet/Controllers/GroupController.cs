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

        /// <summary>
        /// Creates a new group and adds users as members.
        /// </summary>
        [HttpPost("CreateGroup")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(string), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(string), StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult> CreateGroup([FromBody] CreateGroupRequest request)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var creatorUserId = HttpContext.GetCurrentUserId();

                var creator = await _context.Users
                    .FirstOrDefaultAsync(u => u.UserId == creatorUserId);

                if (creator == null)
                    return Unauthorized("Creator not found");

                // Fetch users from emails
                List<User> users = await FetchUsersByEmails(request);

                // Validate missing emails
                var foundEmails = users.Select(u => u.Email)
                    .ToHashSet(StringComparer.OrdinalIgnoreCase);

                var missingEmails = request.UserEmails
                    .Where(email => !foundEmails.Contains(email))
                    .ToList();

                if (missingEmails.Any())
                    return NotFound($"User(s) not found: {string.Join(", ", missingEmails)}");

                // Ensure creator is added
                if (!users.Any(u => u.UserId == creator.UserId))
                    users.Add(creator);

                var group = new Group
                {
                    Name = request.GroupName,
                    CreatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified)
                };

                _context.Groups.Add(group);
                await _context.SaveChangesAsync();

                var groupMembers = users
                    .DistinctBy(u => u.UserId)
                    .Select(u => new GroupMember
                    {
                        GroupId = group.GroupId,
                        UserId = u.UserId,
                        JoinedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified)
                    });

                _context.GroupMembers.AddRange(groupMembers);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                /* 🔔 SEND EMAILS HERE */
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
                    _logger.LogError($"Group created, but emails failed: {ex.Message}");
                }

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
                await transaction.RollbackAsync();
                _logger.LogError($"Exception from CreateGroup : {ex.Message}");
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
                var group = await _context.Groups.FirstOrDefaultAsync(g => g.GroupId == groupId);
                if (group == null)
                    return NotFound("Group not found.");

                // Ensure the current user is a member of the group before returning overview data
                var isMember = await _context.GroupMembers
                    .AnyAsync(gm => gm.GroupId == groupId && gm.UserId == userId);
                if (!isMember)
                    return Forbid();

                List<int> members = await GetUserIdsByGroup(groupId);

                var userNameMap = await _context.Users
                    .Where(u => members.Contains(u.UserId))
                    .ToDictionaryAsync(u => u.UserId, u => u.Name);

                var allExpenses = await _context.Expenses
                    .Where(e => e.GroupId == groupId)
                    .Include(e => e.ExpenseSplits)
                    .ToListAsync();

                var netBalances = members.ToDictionary(id => id, id => 0.0m);

                foreach (var exp in allExpenses)
                {
                    foreach (var split in exp.ExpenseSplits)
                    {
                        if (netBalances.ContainsKey(split.UserId))
                            netBalances[split.UserId] -= split.OwedAmount;
                    }

                    if (netBalances.ContainsKey(exp.PaidByUserId))
                        netBalances[exp.PaidByUserId] += exp.Amount;
                }

                decimal groupBalance = netBalances.Sum(x => x.Value);
                decimal youOwe = netBalances[userId] < 0 ? Math.Abs(netBalances[userId]) : 0;
                decimal youAreOwed = netBalances[userId] > 0 ? netBalances[userId] : 0;

                var expenses = allExpenses.Select(e => new
                {
                    e.ExpenseId,
                    e.Name,
                    e.Amount,
                    PaidBy = userNameMap[e.PaidByUserId],
                    CreatedAt = e.CreatedAt?.ToString("MMM dd") ?? string.Empty,
                    YouOwe = e.ExpenseSplits.FirstOrDefault(s => s.UserId == userId)?.OwedAmount ?? 0
                });

                var allUserSummaries = netBalances.Select(kvp => new
                {
                    UserId = kvp.Key,
                    Name = userNameMap[kvp.Key],
                    Balance = Math.Round(kvp.Value, 2),
                });

                var userDetailsMap = await _context.Users
                    .Where(u => members.Contains(u.UserId))
                    .ToDictionaryAsync(u => u.UserId, u => new { u.Name, u.Email });

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
                        TotalBalance = Math.Round(netBalances[userId], 2),
                        YouOwe = Math.Round(youOwe, 2),
                        YouAreOwed = Math.Round(youAreOwed, 2)
                    },
                    Members = userDetailsMap.Select(kvp => new
                    {
                        MemberId = kvp.Key,
                        MemberName = kvp.Value.Name,
                        MemberEmail = kvp.Value.Email
                    }),
                    UserSummaries = allUserSummaries
                });
            }
            catch (Exception ex)
            {
                _logger.LogError($"Exception from GetGroupOverview : {ex.Message}");
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
