
using System.Security.Claims;

namespace splitzy_dotnet.Extensions
{
    public static class HttpContextExtensions
    {
        public static int GetCurrentUserId(this HttpContext context)
        {
            var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? throw new UnauthorizedAccessException("UserId claim missing");
            return int.Parse(userId);
        }
    }
}
