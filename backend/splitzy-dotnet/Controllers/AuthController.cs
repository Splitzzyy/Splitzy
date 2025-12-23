using Google.Apis.Auth;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using splitzy_dotnet.DTO;
using splitzy_dotnet.Models;
using splitzy_dotnet.Services;
using splitzy_dotnet.Services.Interfaces;

namespace splitzy_dotnet.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Produces("application/json")]
    public class AuthController : ControllerBase
    {
        private readonly SplitzyContext _context;
        private readonly IJWTService _jWTService;
        private readonly IConfiguration _configuration;

        public AuthController(
            SplitzyContext context,
            IJWTService jWTService,
            IConfiguration configuration)
        {
            _context = context;
            _jWTService = jWTService;
            _configuration = configuration;
        }

        /// <summary>
        /// Health check endpoint for Auth API.
        /// </summary>
        [HttpGet("index")]
        [ProducesResponseType(typeof(string), StatusCodes.Status200OK)]
        public IActionResult Index()
        {
            return Ok("Welcome to Splitzy Auth API!");
        }

        /// <summary>
        /// Authenticates a user using email and password.
        /// </summary>
        /// <remarks>
        /// Validates credentials and returns a JWT token if authentication succeeds.
        /// </remarks>
        [HttpPost("login")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status401Unauthorized)]
        public IActionResult Login([FromBody] LoginRequestDTO user)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new ApiResponse<string>
                {
                    Success = false,
                    Message = "Invalid request"
                });
            }

            var loginUser = _context.Users.FirstOrDefault(u => u.Email == user.Email);
            if (loginUser == null)
            {
                return Unauthorized(new ApiResponse<string>
                {
                    Success = false,
                    Message = "Invalid Email"
                });
            }

            var hashedInputPassword = HashingService.HashPassword(user.Password);

            if (loginUser.PasswordHash != hashedInputPassword)
            {
                return Unauthorized(new ApiResponse<string>
                {
                    Success = false,
                    Message = "Worng Password"
                });
            }

            var token = _jWTService.GenerateToken(loginUser.UserId);

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = "Login successful",
                Data = new { Id = loginUser.UserId, Token = token }
            });
        }

        /// <summary>
        /// Registers a new user using email and password.
        /// </summary>
        /// <remarks>
        /// Creates a new user account and returns the created user ID.
        /// </remarks>
        [HttpPost("signup")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status400BadRequest)]
        public IActionResult Signup([FromBody] SignupRequestDTO request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new ApiResponse<string>
                {
                    Success = false,
                    Message = "Invalid input"
                });
            }

            if (_context.Users.Any(u => u.Email == request.Email))
            {
                return BadRequest(new ApiResponse<string>
                {
                    Success = false,
                    Message = "Email already exists"
                });
            }

            var hashedPassword = HashingService.HashPassword(request.Password);

            var user = new User
            {
                Name = request.Name,
                Email = request.Email,
                PasswordHash = hashedPassword,
                CreatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified)
            };

            _context.Users.Add(user);
            _context.SaveChanges();

            return CreatedAtAction(nameof(Signup), new ApiResponse<object>
            {
                Success = true,
                Message = "Signup successful",
                Data = new { Id = user.UserId }
            });
        }

        /// <summary>
        /// Logs out the current user.
        /// </summary>
        /// <remarks>
        /// For JWT-based authentication, logout is handled entirely on the client
        /// by removing the stored token.
        /// </remarks>
        [HttpGet("logout")]
        [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status200OK)]
        public IActionResult Logout()
        {
            return Ok(new ApiResponse<string>
            {
                Success = true,
                Message = "Logout successful"
            });
        }

        /// <summary>
        /// Authenticates a user using a ID token value.
        /// </summary>
        /// <remarks>
        /// UI sends the ID token.
        /// Backend validates the token using public keys and client ID.
        /// If the user does not exist, a new account is created.
        /// Returns a JWT token for API access.
        /// </remarks>
        [HttpPost("google-login")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginRequestDTO request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.IdToken))
            {
                return BadRequest(new ApiResponse<string>
                {
                    Success = false,
                    Message = "IdToken is required"
                });
            }

            // Prefer environment variable, fallback to configuration
            var googleClientId = Environment.GetEnvironmentVariable("GOOGLE_CLIENT_ID")
                                 ?? _configuration["Google:ClientId"];

            if (string.IsNullOrWhiteSpace(googleClientId))
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse<string>
                {
                    Success = false,
                    Message = "Google ClientId not configured. Set GOOGLE_CLIENT_ID environment variable or Google:ClientId configuration."
                });
            }

            GoogleJsonWebSignature.Payload payload;

            try
            {
                payload = await GoogleJsonWebSignature.ValidateAsync(
                    request.IdToken,
                    new GoogleJsonWebSignature.ValidationSettings
                    {
                        Audience = new[]
                        {
                                googleClientId
                        }
                    });
            }
            catch
            {
                return Unauthorized(new ApiResponse<string>
                {
                    Success = false,
                    Message = "Invalid Google token"
                });
            }

            if (!payload.EmailVerified)
            {
                return Unauthorized(new ApiResponse<string>
                {
                    Success = false,
                    Message = "Google email not verified"
                });
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == payload.Email);

            if (user == null)
            {
                user = new User
                {
                    Email = payload.Email,
                    Name = payload.Name,
                    PasswordHash = Guid.NewGuid().ToString(),
                    CreatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified)
                };

                _context.Users.Add(user);
                await _context.SaveChangesAsync();
            }

            var token = _jWTService.GenerateToken(user.UserId);

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = "Login successful",
                Data = new { Id = user.UserId, Token = token }
            });
        }
    }
}
