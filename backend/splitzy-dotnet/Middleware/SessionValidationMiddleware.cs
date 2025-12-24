using splitzy_dotnet.Models;
using splitzy_dotnet.Services.Interfaces;

namespace splitzy_dotnet.Middleware
{
    public class SessionValidationMiddleware
    {
        private readonly RequestDelegate _next;

        public SessionValidationMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            if (context.Request.Path.StartsWithSegments("/api") && !context.Request.Path.Equals("/api/Auth/login", StringComparison.OrdinalIgnoreCase) && !context.Request.Path.Equals("/api/Auth/signup", StringComparison.OrdinalIgnoreCase))
            {
                using (var scope = context.RequestServices.CreateScope())
                {
                    var _splitzyContext = scope.ServiceProvider.GetRequiredService<SplitzyContext>();
                    var _jwtService = scope.ServiceProvider.GetRequiredService<IJWTService>();

                    var token = context.Request.Headers["Authorization"].ToString().Replace("Bearer ", "");

                    if (string.IsNullOrEmpty(token))
                    {
                        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                        await context.Response.WriteAsync("Authorization token is missing.");
                        return;
                    }

                    var authIdClaim = _jwtService.GetUserIdFromToken(token);

                    if (authIdClaim == null || !int.TryParse(authIdClaim, out int authId))
                    {
                        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                        await context.Response.WriteAsync("Invalid token.");
                        return;
                    }

                    // Validate the token
                    if (!_jwtService.ValidateToken(token))
                    {
                        var newToken = _jwtService.GenerateToken(authId);
                        context.Response.Headers.Append("New-Token", newToken);
                    }
                }
            }

            await _next(context);
        }
    }
}
