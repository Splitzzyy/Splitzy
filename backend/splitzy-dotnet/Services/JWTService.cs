using Microsoft.IdentityModel.Tokens;
using splitzy_dotnet.Extensions;
using splitzy_dotnet.Services.Interfaces;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace splitzy_dotnet.Services
{
    public class JWTService : IJWTService
    {
        private readonly ILogger<JWTService> _logger;
        private readonly ISplitzyConfig _config;

        public JWTService(ILogger<JWTService> logger, ISplitzyConfig splitzyConfig)
        {
            _logger = logger;
            _config = splitzyConfig;
        }

        public string GenerateToken(int id)
        {
            var claims = new[]
            {
                new Claim("id", id.ToString()),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config.Jwt.Key));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: _config.Jwt.Issuer,
                audience: _config.Jwt.Audience,
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(_config.Jwt.ExpiryMinutes),
                signingCredentials: creds);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        public bool ValidateToken(string token)
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config.Jwt.Key));
            var createToken = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = _config.Jwt.Issuer,
                ValidAudience = _config.Jwt.Audience,
                IssuerSigningKey = key
            };

            var output = new JwtSecurityTokenHandler().ValidateToken(token, createToken, out var validatedToken);

            if (output.Identity.IsAuthenticated)
            {
                return true;
            }

            return false;
        }
        public string GetUserIdFromToken(string token)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var securityToken = tokenHandler.ReadJwtToken(token);
            var userId = securityToken.Claims.First(claim => claim.Type == "id").Value;
            return userId;
        }

        public string GeneratePasswordResetToken(int userId)
        {
            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
                new Claim("typ", "password_reset")
            };

            var key = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(_config.OtpJwt.Key)
            );

            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: _config.Jwt.Issuer,
                audience: _config.Jwt.Audience,
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(_config.OtpJwt.ExpiryMinutes),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        public int ValidatePasswordResetToken(string token)
        {
            var tokenHandler = new JwtSecurityTokenHandler();

            var parameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,

                ValidIssuer = _config.Jwt.Issuer,
                ValidAudience = _config.Jwt.Audience,

                IssuerSigningKey = new SymmetricSecurityKey(
                    Encoding.UTF8.GetBytes(_config.OtpJwt.Key)
                ),

                ClockSkew = TimeSpan.Zero
            };

            var principal = tokenHandler.ValidateToken(token, parameters, out _);

            // 1️⃣ Validate token purpose
            var typeClaim = principal.FindFirst("typ");
            if (typeClaim == null || typeClaim.Value != "password_reset")
                throw new SecurityTokenException("Invalid token type");

            // 2️⃣ Extract userId correctly
            var userIdClaim = principal.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null)
                throw new SecurityTokenException("UserId missing");

            return int.Parse(userIdClaim.Value);
        }

    }
}
