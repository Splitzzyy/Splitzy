using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using splitzy_dotnet.DTO;
using splitzy_dotnet.Models;
using splitzy_dotnet.Services.Interfaces;

namespace splitzy_dotnet.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UserController : ControllerBase
    {
        private readonly SplitzyContext _context;
        private readonly IJWTService _jWTService;

        public UserController(SplitzyContext context, IJWTService jWTService)
        {
            _context = context;
            _jWTService = jWTService;
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
                return StatusCode(500, $"An error occurred while retrieving users: {ex.Message}");
            }
        }

        /// <summary>
        /// Retrieves group and expense summary for a specific user.
        /// </summary>
        /// <param name="userId">The user's ID.</param>
        /// <returns>User's group and expense summary.</returns>
        [HttpGet("{userId}")]
        [ProducesResponseType(typeof(UserGroupExpenseDTO), 200)]
        [ProducesResponseType(404)]
        [ProducesResponseType(500)]
        public async Task<ActionResult<UserGroupExpenseDTO>> GetUserGroupSummary(int userId)
        {
            try
            {
                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                {
                    return NotFound($"User with ID {userId} not found.");
                }

                var groups = await _context.GroupMembers
                    .Where(gm => gm.UserId == userId)
                    .Include(gm => gm.Group)
                    .Select(gm => new UserGroupInfo
                    {
                        GroupId = gm.GroupId,
                        GroupName = gm.Group.Name,
                        JoinedAt = gm.JoinedAt
                    }).ToListAsync();

                var totalPaid = await _context.Expenses
                    .Where(e => e.PaidByUserId == userId)
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
