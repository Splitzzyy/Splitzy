
namespace splitzy_dotnet.Extensions
{
    public static class HttpContextExtensions
    {
        public static int GetCurrentUserId(this HttpContext context)
        {
            var userId = context.User.FindFirst("id")?.Value;

            if (string.IsNullOrWhiteSpace(userId))
                throw new UnauthorizedAccessException("UserId claim missing");

            return int.Parse(userId);
        }
    }
}
