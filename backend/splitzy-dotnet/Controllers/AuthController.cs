using Google.Apis.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using splitzy_dotnet.DTO;
using splitzy_dotnet.Models;
using splitzy_dotnet.Services;
using splitzy_dotnet.Services.Interfaces;
using splitzy_dotnet.Templates;

namespace splitzy_dotnet.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    [Produces("application/json")]
    public class AuthController : ControllerBase
    {
        private readonly SplitzyContext _context;
        private readonly IJWTService _jWTService;
        private readonly IConfiguration _configuration;
        private readonly ILogger<AuthController> _logger;
        private readonly IEmailService _emailService;

        public AuthController(
            SplitzyContext context,
            IJWTService jWTService,
            IConfiguration configuration,
            ILogger<AuthController> logger,
            IEmailService emailService)
        {
            _context = context;
            _jWTService = jWTService;
            _configuration = configuration;
            _logger = logger;
            _emailService = emailService;

        }

        /// <summary>
        /// Health check endpoint for Auth API.
        /// </summary>
        [HttpGet("index")]
        [ProducesResponseType(typeof(string), StatusCodes.Status200OK)]
        public IActionResult Index()
        {
            _logger.LogInformation("Auth health check endpoint hit");
            return Ok("Welcome to Splitzy Auth API!");
        }

        /// <summary>
        /// Authenticates a user using email and password.
        /// </summary>
        /// <remarks>
        /// Validates credentials and returns a JWT token if authentication succeeds.
        /// </remarks>
        [AllowAnonymous]
        [HttpPost("login")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status401Unauthorized)]
        public IActionResult Login([FromBody] LoginRequestDTO user)
        {
            if (!ModelState.IsValid)
            {
                _logger.LogWarning("Invalid login request payload");
                return BadRequest(new ApiResponse<string>
                {
                    Success = false,
                    Message = "Invalid request"
                });
            }

            if (user == null)
            {
                _logger.LogWarning("Login failed: request body is null");
                return BadRequest(new ApiResponse<string>
                {
                    Success = false,
                    Message = "Invalid request"
                });
            }


            var loginUser = _context.Users.FirstOrDefault(u => u.Email == user.Email);
            if (loginUser == null)
            {
                _logger.LogWarning("Login failed: Email not found. Email={Email}", user.Email);
                return Unauthorized(new ApiResponse<string>
                {
                    Success = false,
                    Message = "Invalid Email"
                });
            }

            var hashedInputPassword = HashingService.HashPassword(user.Password);

            if (loginUser.PasswordHash != hashedInputPassword)
            {
                _logger.LogWarning(
                    "Login failed: Incorrect password. UserId={UserId}, Email={Email}",
                    loginUser.UserId,
                    loginUser.Email);

                return Unauthorized(new ApiResponse<string>
                {
                    Success = false,
                    Message = "Wrong Password"
                });
            }

            var token = _jWTService.GenerateToken(loginUser.UserId);

            _logger.LogInformation(
                "Login successful. UserId={UserId}, Email={Email}",
                loginUser.UserId,
                loginUser.Email);

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
        [AllowAnonymous]
        [HttpPost("signup")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status400BadRequest)]
        public IActionResult Signup([FromBody] SignupRequestDTO request)
        {
            if (request == null)
            {
                _logger.LogWarning("Signup failed: request body is null");
                return BadRequest(new ApiResponse<string>
                {
                    Success = false,
                    Message = "Invalid input"
                });
            }

            if (!ModelState.IsValid)
            {
                _logger.LogWarning("Invalid signup request payload");
                return BadRequest(new ApiResponse<string>
                {
                    Success = false,
                    Message = "Invalid input"
                });
            }

            if (_context.Users.Any(u => u.Email == request.Email))
            {
                _logger.LogWarning("Signup failed: Email already exists. Email={Email}", request.Email);
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

            _logger.LogInformation(
                "Signup successful. UserId={UserId}, Email={Email}",
                user.UserId,
                user.Email);
            // Send welcome email
            try
            {
                var html = new WelcomeEmailTemplate().Build(request.Name);
                _emailService.SendAsync(user.Email, "Welcome to Splitzy! 👋", html);
                _logger.LogInformation("Welcome email sent to {Email}", user.Email);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send welcome email to {Email}", user.Email);
            }
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
            _logger.LogInformation("Logout requested");
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
        [AllowAnonymous]
        [HttpPost("google-login")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginRequestDTO request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.IdToken))
            {
                _logger.LogWarning("Google login failed: Missing IdToken");
                return BadRequest(new ApiResponse<string>
                {
                    Success = false,
                    Message = "IdToken is required"
                });
            }

            var googleClientId =
                Environment.GetEnvironmentVariable("GOOGLE_CLIENT_ID")
                ?? _configuration["Google:ClientId"];

            if (string.IsNullOrWhiteSpace(googleClientId))
            {
                _logger.LogError("Google ClientId not configured");
                return StatusCode(500, new ApiResponse<string>
                {
                    Success = false,
                    Message = "Google ClientId not configured"
                });
            }

            GoogleJsonWebSignature.Payload payload;

            try
            {
                payload = await GoogleJsonWebSignature.ValidateAsync(
                    request.IdToken,
                    new GoogleJsonWebSignature.ValidationSettings
                    {
                        Audience = new[] { googleClientId }
                    });

                _logger.LogInformation(
                    "Google token validated successfully. Email={Email}",
                    payload.Email);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Invalid Google token received");
                return Unauthorized(new ApiResponse<string>
                {
                    Success = false,
                    Message = "Invalid Google token"
                });
            }

            if (!payload.EmailVerified)
            {
                _logger.LogWarning(
                    "Google login failed: Email not verified. Email={Email}",
                    payload.Email);

                return Unauthorized(new ApiResponse<string>
                {
                    Success = false,
                    Message = "Google email not verified"
                });
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == payload.Email);

            if (user == null)
            {
                _logger.LogInformation(
                    "New user created via Google login. Email={Email}",
                    payload.Email);

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
            // Send welcome email
            try
            {
                var html = new WelcomeEmailTemplate().Build(user.Name);
                await _emailService.SendAsync(user.Email, "Welcome to Splitzy! 👋", html);
                _logger.LogInformation("Welcome email sent to {Email}", user.Email);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send welcome email to {Email}", user.Email);
            }
            var token = _jWTService.GenerateToken(user.UserId);

            _logger.LogInformation(
                "Google login successful. UserId={UserId}, Email={Email}",
                user.UserId,
                user.Email);

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = "Login successful",
                Data = new { Id = user.UserId, Token = token }
            });
        }
    }
}
