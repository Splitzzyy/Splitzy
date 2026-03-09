using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using splitzy_dotnet.DTO;
using splitzy_dotnet.Extensions;
using splitzy_dotnet.Models;
using splitzy_dotnet.Repository.Interfaces;

namespace splitzy_dotnet.Controllers
{
    [Authorize]
    [EnableRateLimiting("per-user")]
    [ApiController]
    [Route("api/[controller]")]
    public class UserController : ControllerBase
    {
        private readonly SplitzyContext _context;
        private readonly ILogger<UserController> _logger;
        private readonly IUserRepository _userRepo;

        public UserController(SplitzyContext context, ILogger<UserController> logger, IUserRepository userRepo)
        {
            _context = context;
            _logger = logger;
            _userRepo = userRepo;
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
        public async Task<ActionResult<UserGroupExpenseDTO>> GetUserExpenseSummary()
        {
            int currentUserId = HttpContext.GetCurrentUserId();

            try
            {
                var user = await _context.Users
                    .AsNoTracking()
                    .FirstOrDefaultAsync(u => u.UserId == currentUserId);

                if (user == null)
                    return NotFound("User not found.");

                var groups = await _context.GroupMembers.Where(gm => gm.UserId == currentUserId).Include(gm => gm.Group).Select(gm => new UserGroupInfo { GroupId = gm.GroupId, GroupName = gm.Group.Name, JoinedAt = gm.JoinedAt }).ToListAsync();

                var expenses = await _context.Expenses
                    .AsNoTracking()
                    .Where(e =>
                        e.PaidByUserId == currentUserId ||
                        e.ExpenseSplits.Any(es => es.UserId == currentUserId)
                    )
                    .Select(e => new UserExpenseInfo
                    {
                        ExpenseId = e.ExpenseId,
                        GroupId = e.GroupId,
                        Description = e.Name,
                        TotalAmount = e.Amount,
                        PaidByUserId = e.PaidByUserId,
                        CreatedAt = e.CreatedAt,
                        Category = e.Category,

                        // Is user payer?
                        IsPaidByCurrentUser = e.PaidByUserId == currentUserId,

                        // How much user owes in this expense
                        UserOwes = e.ExpenseSplits
                                    .Where(es => es.UserId == currentUserId)
                                    .Select(es => es.OwedAmount)
                                    .FirstOrDefault()
                    })
                    .ToListAsync();

                // Total paid
                var totalPaid = expenses
                    .Where(e => e.IsPaidByCurrentUser)
                    .Sum(e => e.TotalAmount);

                // Total owes
                var totalOwes = expenses.Sum(e => (decimal)e.UserOwes);

                var result = new UserGroupExpenseDTO
                {
                    UserId = user.UserId,
                    UserName = user.Name,
                    Groups = groups,
                    Expenses = expenses,
                    TotalPaid = totalPaid,
                    TotalOwes = totalOwes,
                    NetBalance = totalPaid - totalOwes
                };

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching user expenses");
                return StatusCode(500, "Internal server error.");
            }
        }
    }
}
