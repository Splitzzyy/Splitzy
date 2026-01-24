using Google.Apis.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using splitzy_dotnet.DTO;
using splitzy_dotnet.Extensions;
using splitzy_dotnet.Models;
using splitzy_dotnet.Services;
using splitzy_dotnet.Services.Interfaces;

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
        private readonly ILogger<AuthController> _logger;
        private readonly IMessageProducer _messageProducer;
        private readonly ISplitzyConfig _config;

        public AuthController(
            SplitzyContext context,
            IJWTService jWTService,
            ILogger<AuthController> logger,
            IMessageProducer messageProducer,
            ISplitzyConfig config)
        {
            _context = context;
            _jWTService = jWTService;
            _logger = logger;
            _messageProducer = messageProducer;
            _config = config;
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
        public async Task<IActionResult> Login([FromBody] LoginRequestDTO user)
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

            var loginUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == user.Email);
            if (loginUser == null)
            {
                _logger.LogWarning("Login failed: Email not found. Email={Email}", user.Email);
                return Unauthorized(new ApiResponse<string>
                {
                    Success = false,
                    Message = "Invalid Email"
                });
            }

            if (!loginUser.IsEmailVerified)
            {
                return Unauthorized(new ApiResponse<string>
                {
                    Success = false,
                    Message = "Please verify your email before logging in"
                });
            }

            if (!HashingService.VerifyPassword(user.Password, loginUser.PasswordHash))
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

            var accessToken = _jWTService.GenerateAccessToken(loginUser.UserId);
            var refreshToken = _jWTService.GenerateRefreshToken();

            _context.RefreshTokens.Add(new RefreshToken
            {
                Id = Guid.NewGuid(),
                UserId = loginUser.UserId,
                TokenHash = JWTService.HashToken(refreshToken),
                ExpiresAt = DateTime.UtcNow.AddDays(30),
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            Response.Cookies.Append("refresh_token", refreshToken,
            new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.None,
                Expires = DateTime.UtcNow.AddDays(30)
            });

            _logger.LogInformation(
                "Login successful. UserId={UserId}, Email={Email}",
                loginUser.UserId,
                loginUser.Email);

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = "Login successful",
                Data = new { Id = loginUser.UserId, Token = accessToken }
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
        public async Task<IActionResult> Signup([FromBody] SignupRequestDTO request)
        {
            if (!ModelState.IsValid)
            {
                _logger.LogWarning("Invalid signup request payload");
                return BadRequest(new ApiResponse<string>
                {
                    Success = false,
                    Message = "Invalid input"
                });
            }

            if (await _context.Users.AnyAsync(u => u.Email == request.Email))
            {
                _logger.LogWarning("Signup failed: Email already exists. Email={Email}", request.Email);
                return BadRequest(new ApiResponse<string>
                {
                    Success = false,
                    Message = "Email already exists"
                });
            }

            var hashedPassword = HashingService.HashPassword(request.Password);

            await using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var user = new User
                {
                    Name = request.Name,
                    Email = request.Email,
                    PasswordHash = hashedPassword,
                    IsEmailVerified = false,
                    CreatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified)
                };

                _context.Users.Add(user);

                await _context.SaveChangesAsync();

                var verification = new EmailVerification
                {
                    UserId = user.UserId,
                    Token = Guid.NewGuid().ToString("N"),
                    ExpiresAt = DateTime.UtcNow.AddHours(24),
                    IsUsed = false,
                    CreatedAt = DateTime.UtcNow
                };

                _context.EmailVerifications.Add(verification);

                await _context.SaveChangesAsync();

                await HandleGroupInvitesAsync(user);

                await transaction.CommitAsync();

                _logger.LogInformation(
                   "Signup successful. UserId={UserId}, Email={Email}",
                   user.UserId,
                   user.Email);

                var emailEvent = new EmailMessage
                {
                    ToEmail = user.Email,
                    TemplateType = "Welcome",
                    Payload = new
                    {
                        UserName = user.Name,
                        VerificationLink =
                            $"https://splitzy.aarshiv.xyz/verify-email?token={verification.Token}"
                    }
                };

                await _messageProducer.SendMessageAsync(emailEvent);

                return CreatedAtAction(nameof(Signup), new ApiResponse<object>
                {
                    Success = true,
                    Message = "Signup successful",
                    Data = new { Id = user.UserId }
                });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();

                _logger.LogError(ex, "Signup failed for Email={Email}", request.Email);

                return StatusCode(
                    StatusCodes.Status500InternalServerError,
                    new ApiResponse<string> { Success = false, Message = "Signup failed. Please try again." });
            }
        }

        /// <summary>
        /// Logs out the current user.
        /// </summary>
        /// <remarks>
        /// For JWT-based authentication, logout is handled entirely on the client
        /// by removing the stored token.
        /// </remarks>
        [HttpPost("logout")]
        [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status200OK)]
        public async Task<IActionResult> Logout()
        {
            var refreshToken = Request.Cookies["refresh_token"];
            if (string.IsNullOrEmpty(refreshToken))
                return Ok(new { Message = "Already logged out" });

            var tokenHash = JWTService.HashToken(refreshToken);

            var storedToken = await _context.RefreshTokens
                .FirstOrDefaultAsync(t =>
                    t.TokenHash == tokenHash &&
                    !t.IsRevoked
                );

            if (storedToken != null)
            {
                storedToken.IsRevoked = true;
                await _context.SaveChangesAsync();
            }

            // Clearing the refresh token cookie for the particular device
            Response.Cookies.Delete(
                "refresh_token",
                new CookieOptions
                {
                    HttpOnly = true,
                    Secure = true,
                    SameSite = SameSiteMode.None
                }
            );

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

            var googleClientId = _config.Google.ClientId;

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
                    IsEmailVerified = true,
                    PasswordHash = Guid.NewGuid().ToString(),
                    CreatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified)
                };

                _context.Users.Add(user);
                await _context.SaveChangesAsync();

                await HandleGroupInvitesAsync(user);

                // Send welcome email
                try
                {
                    var emailEvent = new EmailMessage
                    {
                        ToEmail = user.Email,
                        TemplateType = "Welcome",
                        Payload = new { UserName = payload.Name },
                    };

                    await _messageProducer.SendMessageAsync(emailEvent);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to send welcome email to {Email}", user.Email);
                }
            }

            var accessToken = _jWTService.GenerateAccessToken(user.UserId);
            var refreshToken = _jWTService.GenerateRefreshToken();

            _context.RefreshTokens.Add(new RefreshToken
            {
                Id = Guid.NewGuid(),
                UserId = user.UserId,
                TokenHash = JWTService.HashToken(refreshToken),
                ExpiresAt = DateTime.UtcNow.AddDays(30),
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            Response.Cookies.Append(
            "refresh_token",
            refreshToken,
            new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.None,
                Expires = DateTime.UtcNow.AddDays(30)
            });


            _logger.LogInformation(
                "Google login successful. UserId={UserId}, Email={Email}",
                user.UserId,
                user.Email);

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = "Login successful",
                Data = new { Id = user.UserId, Token = accessToken }
            });
        }

        /// <summary>
        /// Initiates the password reset process for a user by sending a password reset link to the specified email
        /// address.
        /// </summary>
        /// <remarks>This endpoint does not require authentication. If the provided email address is
        /// associated with a user account, a password reset link is sent to that email. For security reasons, the
        /// response does not reveal whether the email is registered beyond the success or failure message.</remarks>
        /// <param name="request">The request containing the user's email address for which the password reset link should be generated.
        /// Cannot be null.</param>
        /// <returns>An IActionResult indicating the outcome of the operation. Returns a success response if the password reset
        /// link is sent; otherwise, returns a bad request if the email does not exist.</returns>
        [AllowAnonymous]
        [HttpPost("forget-password")]
        public async Task<IActionResult> ForgetPassword([FromBody] ForgetPasswordRequestUser request)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(x => x.Email == request.Email);

            if (user == null)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Email does not exist"
                });
            }

            // Generate reset token
            var token = _jWTService.GeneratePasswordResetToken(user.UserId);

            var resetLink =
                $"https://splitzy.aarshiv.xyz/setup-password?token={token}";

            var emailEvent = new EmailMessage
            {
                ToEmail = request.Email,
                TemplateType = "ForgotPassword",
                Payload = new { ResetLink = resetLink }
            };

            await _messageProducer.SendMessageAsync(emailEvent);
            return Ok(new
            {
                success = true,
                message = "Password reset link sent to your email"
            });
        }

        /// <summary>
        /// Resets a user's password using a password reset token and a new password provided in the request.
        /// </summary>
        /// <remarks>This endpoint does not require authentication. The reset token is validated before
        /// updating the user's password. Ensure that the new password meets any required password policies.</remarks>
        /// <param name="request">The password reset request containing the reset token and the new password to set for the user. Cannot be
        /// null.</param>
        /// <returns>An <see cref="IActionResult"/> indicating the result of the password reset operation. Returns 200 OK if the
        /// password is successfully updated; otherwise, returns 401 Unauthorized if the token is invalid or the user is
        /// not found.</returns>
        [AllowAnonymous]
        [HttpPost("verify")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            int userId;

            try
            {
                userId = _jWTService.ValidatePasswordResetToken(request.Token);
            }
            catch (SecurityTokenException ex)
            {
                return Unauthorized(new
                {
                    success = false,
                    message = ex.Message
                });
            }

            var user = await _context.Users.FindAsync(userId);
            if (user == null)
                return Unauthorized(new
                {
                    success = false,
                    message = "User not found"
                });

            user.PasswordHash = HashingService.HashPassword(request.NewPassword);

            var tokens = await _context.RefreshTokens
                               .Where(t => t.UserId == userId && !t.IsRevoked)
                               .ToListAsync();
            foreach (var token in tokens)
                token.IsRevoked = true;

            await _context.SaveChangesAsync();

            // Clear the refresh token cookie
            Response.Cookies.Delete(
                "refresh_token",
                new CookieOptions
                {
                    HttpOnly = true,
                    Secure = true,
                    SameSite = SameSiteMode.None
                }
            );


            return Ok(new
            {
                success = true,
                message = "Password updated successfully"
            });
        }

        private async Task HandleGroupInvitesAsync(User user)
        {
            var invites = await _context.GroupInvites
                .Where(i => i.Email == user.Email && !i.Accepted)
                .ToListAsync();

            if (!invites.Any())
                return;

            foreach (var invite in invites)
            {
                _context.GroupMembers.Add(new GroupMember
                {
                    GroupId = invite.GroupId,
                    UserId = user.UserId,
                    JoinedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified)
                });

                invite.Accepted = true;
            }

            await _context.SaveChangesAsync();
        }

        /// <summary>
        /// Exchanges a valid refresh token for a new access token and refresh token pair.
        /// </summary>
        /// <remarks>This endpoint allows clients to obtain a new access token when the current one
        /// expires, using a valid, unexpired, and non-revoked refresh token. The provided refresh token is invalidated
        /// after use, and a new refresh token is issued. This endpoint does not require authentication.</remarks>
        /// <param name="request">The refresh token request containing the refresh token to validate and exchange. Cannot be null.</param>
        /// <returns>An <see cref="IActionResult"/> containing the new access token and refresh token if the provided refresh
        /// token is valid; otherwise, an unauthorized response.</returns>
        [AllowAnonymous]
        [HttpPost("refresh")]
        public async Task<IActionResult> Refresh()
        {
            var refreshToken = Request.Cookies["refresh_token"];
            if (string.IsNullOrEmpty(refreshToken))
                return Unauthorized();

            var tokenHash = JWTService.HashToken(refreshToken);

            var storedToken = await _context.RefreshTokens
                .FirstOrDefaultAsync(t => t.TokenHash == tokenHash);

            if (storedToken == null || storedToken.IsRevoked)
                return Unauthorized("Invalid refresh token");

            if (storedToken.ExpiresAt < DateTime.UtcNow)
                return Unauthorized("Refresh token expired");

            storedToken.IsRevoked = true;

            var newAccessToken =
                _jWTService.GenerateAccessToken(storedToken.UserId);

            var newRefreshToken =
                _jWTService.GenerateRefreshToken();

            _context.RefreshTokens.Add(new RefreshToken
            {
                Id = Guid.NewGuid(),
                UserId = storedToken.UserId,
                TokenHash = JWTService.HashToken(newRefreshToken),
                ExpiresAt = DateTime.UtcNow.AddDays(30),
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            Response.Cookies.Append(
            "refresh_token",
            newRefreshToken,
            new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.None,
                Expires = DateTime.UtcNow.AddDays(30)
            });

            return Ok(new
            {
                AccessToken = newAccessToken
            });
        }

        /// <summary>
        /// Verifies a user's email address using the specified verification token.
        /// </summary>
        /// <remarks>This endpoint can be accessed without authentication. Once a token is used or
        /// expired, it cannot be reused for verification.</remarks>
        /// <param name="token">The email verification token to validate. This value is typically provided to the user via email and must be
        /// valid, unused, and unexpired.</param>
        /// <returns>An <see cref="IActionResult"/> indicating the result of the verification. Returns a success response if the
        /// token is valid and the email is verified; otherwise, returns a bad request response if the token is invalid
        /// or expired.</returns>
        [AllowAnonymous]
        [HttpGet("verify-email")]
        public async Task<IActionResult> VerifyEmail(string token)
        {
            var record = await _context.EmailVerifications
                .Include(x => x.User)
                .FirstOrDefaultAsync(x => x.Token == token);

            if (record == null)
                return BadRequest(new
                {
                    code = "TOKEN_INVALID",
                    message = "Invalid verification link"
                });

            if (record.IsUsed)
                return Ok(new
                {
                    code = "ALREADY_VERIFIED",
                    message = "Email already verified"
                });

            if (record.ExpiresAt < DateTime.UtcNow)
                return BadRequest(new
                {
                    code = "TOKEN_EXPIRED",
                    message = "Verification link expired"
                });

            record.IsUsed = true;
            record.User.IsEmailVerified = true;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                code = "VERIFIED",
                message = "Email verified successfully"
            });
        }

        /// <summary>
        /// Initiates the process to resend an email verification link to the specified email address if the user exists
        /// and has not yet verified their email.
        /// </summary>
        /// <remarks>This method does not reveal whether the provided email address is associated with a
        /// user account or whether the email is already verified, in order to prevent email enumeration attacks. If the
        /// user exists and their email is unverified, a new verification token is generated and a verification email is
        /// sent.</remarks>
        /// <param name="email">The email address of the user to whom the verification link should be sent. Cannot be null or empty.</param>
        /// <returns>An HTTP 200 OK response regardless of whether the email exists or is already verified. No information is
        /// disclosed about the existence or verification status of the email address.</returns>
        [AllowAnonymous]
        [HttpPost("resend-verification")]
        public async Task<IActionResult> ResendVerification(string email)
        {
            var user = await _context.Users.FirstOrDefaultAsync(x => x.Email == email);

            if (user == null || user.IsEmailVerified)
                return Ok(); // avoid email enumeration

            var token = Guid.NewGuid().ToString("N");

            _context.EmailVerifications.Add(new EmailVerification
            {
                UserId = user.UserId,
                Token = token,
                ExpiresAt = DateTime.UtcNow.AddHours(24),
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            var emailEvent = new EmailMessage
            {
                ToEmail = user.Email,
                TemplateType = "Welcome",
                Payload = new
                {
                    UserName = user.Name,
                    VerificationLink =
                            $"https://splitzy.aarshiv.xyz/verify-email?token={token}"
                }
            };

            await _messageProducer.SendMessageAsync(emailEvent);

            return Ok();
        }

    }
}
