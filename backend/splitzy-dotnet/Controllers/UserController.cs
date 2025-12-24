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
    public class UserController : ControllerBase
    {
        private readonly SplitzyContext _context;
        private readonly ILogger<UserController> _logger;

        public UserController(SplitzyContext context, ILogger<UserController> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Retrieves all users with basic information.
        /// </summary>
        /// <returns>A list of users.</returns>
        [HttpGet("GetAllUsers")]
        [ProducesResponseType(typeof(List<LoginUserDTO>), 200)]
        [ProducesResponseType(500)]
        public async Task<ActionResult<List<LoginUserDTO>>> GetAll()
        {
            try
            {
                var usersFromDB = await _context.Users.ToListAsync();

                var users = usersFromDB.Select(u => new LoginUserDTO
                {
                    Name = u.Name,
                    Email = u.Email,
                    CreatedAt = u.CreatedAt
                }).ToList();

                return Ok(users);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while retrieving all users");
                return StatusCode(500, $"An error occurred while retrieving users: {ex.Message}");
            }
        }

        /// <summary>
        /// Retrieves group and expense summary for a specific user.
        /// </summary>
        /// <returns>User's group and expense summary.</returns>
        [HttpGet("summary")]
        [ProducesResponseType(typeof(UserGroupExpenseDTO), 200)]
        [ProducesResponseType(404)]
        [ProducesResponseType(500)]
        public async Task<ActionResult<UserGroupExpenseDTO>> GetUserGroupSummary()
        {
            int currentUserId = HttpContext.GetCurrentUserId();
            try
            {
                var user = await _context.Users.FindAsync(currentUserId);
                if (user == null)
                {
                    _logger.LogError(
                       "User not found while fetching group summary. UserId={UserId}",
                       currentUserId);
                    return NotFound($"User with ID {currentUserId} not found.");
                }

                var groups = await _context.GroupMembers
                    .Where(gm => gm.UserId == currentUserId)
                    .Include(gm => gm.Group)
                    .Select(gm => new UserGroupInfo
                    {
                        GroupId = gm.GroupId,
                        GroupName = gm.Group.Name,
                        JoinedAt = gm.JoinedAt
                    }).ToListAsync();

                var totalPaid = await _context.Expenses
                    .Where(e => e.PaidByUserId == currentUserId)
                    .SumAsync(e => (decimal?)e.Amount) ?? 0;

                var result = new UserGroupExpenseDTO
                {
                    UserId = user.UserId,
                    UserName = user.Name,
                    Groups = groups,
                    TotalPaid = totalPaid
                };

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"An error occurred while retrieving the summary: {ex.Message}");
            }
        }
    }
}
