using Microsoft.IdentityModel.Tokens;
using splitzy_dotnet.Services.Interfaces;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace splitzy_dotnet.Services
{
    public class JWTService(IConfiguration configuration) : IJWTService
    {
        private readonly string _key = configuration["Jwt:Key"];
        private readonly string _issuer = configuration["Jwt:Issuer"];
        private readonly string _audience = configuration["Jwt:Audience"];
        private readonly int _expiryInMinutes = int.Parse(configuration["Jwt:ExpiryInMinutes"]);

        public string GenerateToken(int id)
        {
            var claims = new[]
            {
                new Claim("id", id.ToString()),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_key));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: _issuer,
                audience: _audience,
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(_expiryInMinutes),
                signingCredentials: creds);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        public bool ValidateToken(string token)
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_key));
            var createToken = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = _issuer,
                ValidAudience = _audience,
                IssuerSigningKey = key
            };

            var output = new JwtSecurityTokenHandler().ValidateToken(token, createToken, out var validatedToken);

            if (output.Identity.IsAuthenticated)
            {
                return true;
            }

            return false;
        }
    }
}
