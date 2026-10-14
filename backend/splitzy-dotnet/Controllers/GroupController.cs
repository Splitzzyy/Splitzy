using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using splitzy_dotnet.DTO;
using splitzy_dotnet.Extensions;
using splitzy_dotnet.Models;
using splitzy_dotnet.Services.Interfaces;
using System.ComponentModel.DataAnnotations;
using static splitzy_dotnet.DTO.GroupDTO;

namespace splitzy_dotnet.Controllers
{
    [Authorize]
    [EnableRateLimiting("per-user")]
    [ApiController]
    [Route("api/[controller]")]
    public class GroupController : ControllerBase
    {
        private readonly SplitzyContext _context;
        private readonly ILogger<GroupController> _logger;
        private readonly IMessageProducer _messageProducer;

        public GroupController(SplitzyContext context, ILogger<GroupController> logger, IMessageProducer messageProducer)
        {
            _context = context;
            _logger = logger;
            _messageProducer = messageProducer;
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

                if (!group.GroupMembers.Any(gm => gm.UserId == HttpContext.GetCurrentUserId()))
                    return Forbid();

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
                    PaidBy = userMap.TryGetValue(s.PaidBy, out var paidByName) ? paidByName : "Unknown",
                    PaidTo = userMap.TryGetValue(s.PaidTo, out var paidToName) ? paidToName : "Unknown",
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

        private static List<string> InvalidEmails(IEnumerable<string> emails)
        {
            var validator = new EmailAddressAttribute();
            return emails.Where(e => !validator.IsValid(e)).ToList();
        }

        /// <summary>
        /// Returns users for the given normalized emails, adding (unsaved) placeholder users for unknown ones.
        /// </summary>
        private async Task<List<User>> ResolveOrCreateUsersAsync(List<string> normalizedEmails)
        {
            var users = await _context.Users
                .Where(u => normalizedEmails.Contains(u.Email))
                .ToListAsync();

            foreach (var email in normalizedEmails.Except(users.Select(u => u.Email)))
            {
                var placeholder = new User
                {
                    Email = email,
                    Name = email.Split('@')[0],
                    PasswordHash = null,
                    IsRegistered = false,
                    IsEmailVerified = false,
                    CreatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified)
                };

                _context.Users.Add(placeholder);
                users.Add(placeholder);
            }

            return users;
        }

        private static EmailMessage GroupNotification(User user, string groupName, string addedBy) =>
            user.IsRegistered
                ? new EmailMessage
                {
                    ToEmail = user.Email,
                    TemplateType = "GroupAdded",
                    Payload = new { UserName = user.Name, GroupName = groupName, AddedBy = addedBy }
                }
                : new EmailMessage
                {
                    ToEmail = user.Email,
                    TemplateType = "GroupInvitation",
                    Payload = new { InviterName = addedBy, GroupName = groupName }
                };

        [HttpPost("CreateGroup")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(string), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(string), StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult> CreateGroup([FromBody] CreateGroupRequest request)
        {
            var creatorUserId = HttpContext.GetCurrentUserId();

            var requestedEmails = request.UserEmails?
                .Where(e => !string.IsNullOrWhiteSpace(e))
                .Select(Helper.NormalizeEmail)
                .Distinct()
                .ToList() ?? new List<string>();

            var invalidEmails = InvalidEmails(requestedEmails);
            if (invalidEmails.Any())
                return BadRequest($"Invalid email(s): {string.Join(", ", invalidEmails)}");

            var creator = await _context.Users.FindAsync(creatorUserId);
            if (creator == null)
                return Unauthorized("Creator not found");

            using var tx = await _context.Database.BeginTransactionAsync();

            try
            {
                var group = new Group
                {
                    Name = request.GroupName,
                    CreatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified)
                };

                _context.Groups.Add(group);

                // Unknown emails become placeholder users so they can be part of expenses right away
                var members = (await ResolveOrCreateUsersAsync(requestedEmails))
                    .Where(u => u != creator)
                    .Prepend(creator)
                    .ToList();

                _context.GroupMembers.AddRange(members.Select(u => new GroupMember
                {
                    Group = group,
                    User = u,
                    JoinedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified)
                }));

                await _context.SaveChangesAsync();
                await tx.CommitAsync();

                foreach (var u in members.Where(u => u != creator))
                    await _messageProducer.SendMessageAsync(GroupNotification(u, group.Name, creator.Name));

                return Ok(new
                {
                    group.GroupId,
                    group.Name,
                    Members = members.Select(u => new
                    {
                        u.UserId,
                        u.Name,
                        u.Email,
                        u.IsRegistered
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
                //Group validation
                var group = await _context.Groups
                    .AsNoTracking()
                    .FirstOrDefaultAsync(g => g.GroupId == groupId);

                if (group == null)
                    return NotFound("Group not found.");

                var isMember = await _context.GroupMembers
                    .AsNoTracking()
                    .AnyAsync(gm => gm.GroupId == groupId && gm.UserId == userId);

                if (!isMember)
                    return Forbid();

                // Members
                var members = await _context.GroupMembers
                    .AsNoTracking()
                    .Where(gm => gm.GroupId == groupId)
                    .Select(gm => gm.UserId)
                    .ToListAsync();

                // User maps
                var userNameMap = await _context.Users
                    .AsNoTracking()
                    .Where(u => members.Contains(u.UserId))
                    .ToDictionaryAsync(u => u.UserId, u => u.Name);

                var userDetailsMap = await _context.Users
                    .AsNoTracking()
                    .Where(u => members.Contains(u.UserId))
                    .ToDictionaryAsync(
                        u => u.UserId,
                        u => new { u.Name, u.Email, u.IsRegistered });

                // Balances
                var balances = await _context.GroupBalances
                    .AsNoTracking()
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

                // Expenses
                var expenses = await _context.Expenses
                    .AsNoTracking()
                    .Where(e => e.GroupId == groupId)
                    .OrderByDescending(e => e.CreatedAt)
                    .Select(e => new
                    {
                        e.ExpenseId,
                        e.Name,
                        e.Amount,
                        PaidByUserId = e.PaidByUserId,
                        e.CreatedAt,
                        YourSplit = e.ExpenseSplits
                            .Where(s => s.UserId == userId)
                            .Select(s => s.OwedAmount)
                            .FirstOrDefault()
                    })
                    .ToListAsync();

                var expenseList = expenses.Select(e => new
                {
                    e.ExpenseId,
                    e.Name,
                    Amount = Math.Round(e.Amount, 2),
                    PaidBy = userNameMap[e.PaidByUserId],
                    e.CreatedAt,
                    YouOwe = e.PaidByUserId != userId ? Math.Round(e.YourSplit, 2) : 0,
                    YouLent = e.PaidByUserId == userId ? Math.Round(e.Amount - e.YourSplit, 2) : 0
                }).ToList();

                // User summaries
                var userSummaries = balances.Select(b => new
                {
                    UserId = b.Key,
                    Name = userNameMap[b.Key],
                    Balance = Math.Round(b.Value, 2)
                });

                // Group balance
                var groupBalance = balances.Values
                    .Where(v => v > 0)
                    .Sum(v => v);

                // Settlement Details
                var settlements = await _context.Settlements
                    .AsNoTracking()
                    .Where(s => s.GroupId == groupId)
                    .OrderByDescending(s => s.CreatedAt)
                    .Select(s => new
                    {
                        SettlementId = s.Id,
                        PaidByUserId = s.PaidBy,
                        PaidToUserId = s.PaidTo,
                        Amount = Math.Round(s.Amount, 2),
                        s.CreatedAt
                    })
                    .ToListAsync();

                var settlementList = settlements.Select(s => new
                {
                    s.SettlementId,
                    s.PaidByUserId,
                    PaidByName = userNameMap[s.PaidByUserId],
                    s.PaidToUserId,
                    PaidToName = userNameMap[s.PaidToUserId],
                    s.Amount,
                    s.CreatedAt
                }).ToList();

                return Ok(new
                {
                    group.GroupId,
                    group.Name,
                    group.CreatedAt,
                    GroupBalance = Math.Round(groupBalance, 2),
                    MembersCount = members.Count,
                    Expenses = expenseList,
                    Settlements = settlementList,
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
                        MemberEmail = m.Value.Email,
                        m.Value.IsRegistered
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
                    .Select(Helper.NormalizeEmail)
                    .Distinct()
                    .ToList() ?? new List<string>();

                if (!requestedEmails.Any())
                    return BadRequest("At least one email is required.");

                var invalidEmails = InvalidEmails(requestedEmails);
                if (invalidEmails.Any())
                    return BadRequest($"Invalid email(s): {string.Join(", ", invalidEmails)}");

                // Get existing members to avoid duplicates
                var existingMembers = await _context.GroupMembers
                    .Where(gm => gm.GroupId == groupId)
                    .Select(gm => gm.UserId)
                    .ToListAsync();

                using var tx = await _context.Database.BeginTransactionAsync();

                try
                {
                    // Unknown emails become placeholder users (UserId 0 until saved, so never "existing")
                    var newUsers = (await ResolveOrCreateUsersAsync(requestedEmails))
                        .Where(u => !existingMembers.Contains(u.UserId))
                        .ToList();

                    if (!newUsers.Any())
                        return BadRequest("All provided users are already members of this group.");

                    _context.GroupMembers.AddRange(newUsers.Select(u => new GroupMember
                    {
                        GroupId = groupId,
                        User = u,
                        JoinedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified)
                    }));

                    _context.GroupBalances.AddRange(newUsers.Select(u => new GroupBalance
                    {
                        GroupId = groupId,
                        User = u,
                        NetBalance = 0
                    }));

                    await _context.SaveChangesAsync();
                    await tx.CommitAsync();

                    _logger.LogInformation("Users added to group {GroupId}: {UserIds}", groupId, string.Join(", ", newUsers.Select(u => u.UserId)));

                    foreach (var user in newUsers)
                        await _messageProducer.SendMessageAsync(GroupNotification(user, group.Name, currentUser.Name));

                    return Ok(new
                    {
                        group.GroupId,
                        group.Name,
                        Message = $"Successfully added {newUsers.Count} user(s) to the group.",
                        AddedUsers = newUsers.Select(u => new
                        {
                            u.UserId,
                            u.Name,
                            u.Email,
                            u.IsRegistered
                        }),
                        InvitedEmails = newUsers.Where(u => !u.IsRegistered).Select(u => u.Email),
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

        /// <summary>
        /// Deletes the specified group if the current user is a member of that group.
        /// </summary>
        /// <remarks>Only users who are members of the specified group are authorized to delete it. If the
        /// group does not exist, the method returns a 404 response. If the user is not a member, a 403 response is
        /// returned. Any unexpected errors result in a 500 (Internal Server Error) response.</remarks>
        /// <param name="groupId">The unique identifier of the group to delete.</param>
        /// <returns>An <see cref="ActionResult"/> indicating the result of the operation. Returns status code 200 (OK) with a
        /// success message if the group is deleted; 404 (Not Found) if the group does not exist; or 403 (Forbidden) if
        /// the user is not a member of the group.</returns>
        [HttpDelete("DeleteGroup/{groupId:int}")]
        [ProducesResponseType(typeof(string), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(string), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(string), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> DeleteGroup(int groupId)
        {
            int userId = HttpContext.GetCurrentUserId();

            try
            {
                var group = await _context.Groups
                    .FirstOrDefaultAsync(g => g.GroupId == groupId);

                if (group == null)
                {
                    return NotFound(new ApiResponse<object>
                    {
                        Success = false,
                        Message = "Group not found."
                    });
                }

                var hasPendingBalance = await _context.GroupBalances
                    .AnyAsync(b => b.GroupId == groupId && b.NetBalance != 0);

                if (hasPendingBalance)
                {
                    return BadRequest(new ApiResponse<object>
                    {
                        Success = false,
                        Message = "Group cannot be deleted until all balances are settled."
                    });
                }
                // DELETE (cascade will handle everything else)
                _context.Groups.Remove(group);
                await _context.SaveChangesAsync();

                return Ok(new ApiResponse<object>
                {
                    Success = true,
                    Message = "Group deleted successfully."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "DeleteGroup failed for GroupId {GroupId}", groupId);

                return StatusCode(StatusCodes.Status500InternalServerError,
                    new ApiResponse<object>
                    {
                        Success = false,
                        Message = "An unexpected error occurred. Please try again later."
                    });
            }
        }

    }
}
