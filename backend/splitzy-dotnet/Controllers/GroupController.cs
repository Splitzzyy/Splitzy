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

                var userMap = group.GroupMembers.ToDictionary(
                                    gm => gm.UserId,
                                    gm => gm.User.Name
                                );

                var usernames = group.GroupMembers.Select(gm => gm.User.Name).ToList();

                var expenses = group.Expenses.Select(e => new GroupExpenseDTO
                {
                    PaidBy = e.PaidByUser.Name,
                    Name = e.Name,
                    Amount = e.Amount
                }).ToList();

                var settlements = group.Settlements.Select(s => new GroupSettlementDTO
                {
                    PaidBy = userMap.ContainsKey(s.PaidBy) ? userMap[s.PaidBy] : "Unknown",
                    PaidTo = userMap.ContainsKey(s.PaidTo) ? userMap[s.PaidTo] : "Unknown",
                    Amount = s.Amount,
                    CreatedAt = s.CreatedAt
                }).ToList();

                var summary = new GroupSummaryDTO
                {
                    GroupId = group.GroupId,
                    GroupName = group.Name,
                    TotalMembers = usernames.Count,
                    Usernames = usernames,
                    Expenses = expenses,
                    Settlements = settlements
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
                                .Include(g => g.Settlements)
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

            using var tx = await _context.Database.BeginTransactionAsync();

            try
            {
                var group = new Group
                {
                    Name = request.GroupName,
                    CreatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified)
                };

                _context.Groups.Add(group);

                // Existing users → GroupMembers
                var groupMembers = users
                    .DistinctBy(u => u.UserId)
                    .Select(u => new GroupMember
                    {
                        Group = group,
                        UserId = u.UserId,
                        JoinedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified)
                    });

                _context.GroupMembers.AddRange(groupMembers);

                // Persist missing emails
                var invites = missingEmails.Select(email => new GroupInvite
                {
                    Group = group,
                    Email = email,
                    Accepted = false,
                    InvitedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified)
                });

                _context.GroupInvites.AddRange(invites);


                await _context.SaveChangesAsync();
                await tx.CommitAsync();

                _ = Task.Run(() =>
                {
                    try
                    {
                        // Existing users
                        foreach (var u in users.Where(u => u.UserId != creator.UserId))
                        {
                            var html = new GroupAddedTemplate()
                                .Build(u.Name, request.GroupName, creator.Name);

                            _emailService.SendAsync(
                                u.Email,
                                $"You were added to {request.GroupName}",
                                html
                            );
                        }

                        // Non-existing users (invite)
                        foreach (var email in missingEmails)
                        {
                            var html = new GroupInvitationTemplate()
                                .Build(creator.Name, request.GroupName);

                            _emailService.SendAsync(
                                email,
                                $"Invitation to join {request.GroupName}",
                                html
                            );
                        }
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

        /// <summary>
        /// Adds users to an existing group.
        /// </summary>
        /// <param name="groupId">Group ID</param>
        /// <param name="request">Request containing emails to add</param>
        /// <returns>Updated group with members</returns>
        [HttpPost("AddUsersToGroup/{groupId}")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(string), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(string), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(string), StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult> AddUsersToGroup(int groupId, [FromBody] AddUsersToGroupRequest request)
        {
            int userId = HttpContext.GetCurrentUserId();

            try
            {
                // Validate group exists
                var group = await _context.Groups.FirstOrDefaultAsync(g => g.GroupId == groupId);
                if (group == null)
                    return NotFound("Group not found.");

                // Verify current user is a member (authorization)
                var isCurrentUserMember = await _context.GroupMembers
                    .AnyAsync(gm => gm.GroupId == groupId && gm.UserId == userId);
                if (!isCurrentUserMember)
                    return Forbid();

                // Get current user details for email notification
                var currentUser = await _context.Users.FirstOrDefaultAsync(u => u.UserId == userId);
                if (currentUser == null)
                    return Unauthorized("Current user not found");

                // Normalize and validate emails
                var requestedEmails = request.UserEmails?
                    .Where(e => !string.IsNullOrWhiteSpace(e))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList() ?? new List<string>();

                if (!requestedEmails.Any())
                    return BadRequest("At least one email is required.");

                // Fetch users by email
                var usersToAdd = await _context.Users
                    .Where(u => requestedEmails.Contains(u.Email))
                    .ToListAsync();

                //Check for missing emails
                var foundEmails = usersToAdd
                    .Where(u => u.Email != null)
                    .Select(u => u.Email)
                    .ToHashSet(StringComparer.OrdinalIgnoreCase);

                var missingEmails = requestedEmails
                    .Where(e => !foundEmails.Contains(e))
                    .ToList();

                if (missingEmails.Any())
                    return NotFound($"User(s) not found: {string.Join(", ", missingEmails)}");

                // Get existing members to avoid duplicates
                var existingMembers = await _context.GroupMembers
                    .Where(gm => gm.GroupId == groupId)
                    .Select(gm => gm.UserId)
                    .ToListAsync();

                // Filter out users already in the group
                var newUsers = usersToAdd
                    .Where(u => !existingMembers.Contains(u.UserId))
                    .ToList();

                if (!newUsers.Any())
                    return BadRequest("All provided users are already members of this group.");

                using var tx = await _context.Database.BeginTransactionAsync();

                try
                {
                    var newGroupMembers = newUsers.Select(u => new GroupMember
                    {
                        GroupId = groupId,
                        UserId = u.UserId,
                        JoinedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified)
                    });

                    _context.GroupMembers.AddRange(newGroupMembers);
                    await _context.SaveChangesAsync();

                    var newBalances = newUsers.Select(u => new GroupBalance
                    {
                        GroupId = groupId,
                        UserId = u.UserId,
                        NetBalance = 0
                    });

                    _context.GroupBalances.AddRange(newBalances);
                    await _context.SaveChangesAsync();

                    await tx.CommitAsync();

                    _logger.LogInformation("Users added to group {GroupId}: {UserIds}", groupId, string.Join(", ", newUsers.Select(u => u.UserId)));

                    _ = Task.Run(async () =>
                    {
                        try
                        {
                            var emailTasks = newUsers.Select(u =>
                            {
                                var html = new GroupAddedTemplate()
                                    .Build(u.Name, group.Name, currentUser.Name);

                                return _emailService.SendAsync(
                                    u.Email,
                                    $"You were added to {group.Name}",
                                    html
                                );
                            });

                            await Task.WhenAll(emailTasks);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Failed to send group invitation emails for group {GroupId}", groupId);
                        }
                    });

                    return Ok(new
                    {
                        group.GroupId,
                        group.Name,
                        Message = $"Successfully added {newUsers.Count} user(s) to the group.",
                        AddedUsers = newUsers.Select(u => new
                        {
                            u.UserId,
                            u.Name,
                            u.Email
                        }),
                        TotalMembers = existingMembers.Count + newUsers.Count
                    });
                }
                catch (Exception ex)
                {
                    await tx.RollbackAsync();
                    _logger.LogError(ex, "Exception while adding users to group {GroupId}", groupId);
                    return StatusCode(500, "An unexpected error occurred while adding users.");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Exception from AddUsersToGroup");
                return StatusCode(500, "An unexpected error occurred. Please try again later.");
            }
        }
    }
}
