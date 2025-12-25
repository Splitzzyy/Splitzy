namespace splitzy_dotnet.Extensions
{
    public static class Constants
    {
        public static string GoogleClientId { get; private set; } = null!;

        public static string JwtKey { get; private set; } = null!;
        public static string JwtIssuer { get; private set; } = null!;
        public static string JwtAudience { get; private set; } = null!;
        public static int JwtExpiryMinutes { get; private set; }

        public static string OtpJwtKey { get; private set; } = null!;
        public static int OtpJwtExpiryMinutes { get; private set; }

        public static string Email { get; private set; } = null!;
        public static string EmailToken { get; private set; } = null!;

        public static string HOST { get; private set; } = "smtp.gmail.com";
        public static int PORT { get; private set; } = 587;
        public static string NAME { get; private set; } = "Splitzy";

        public static void Init(IConfiguration config)
        {
            GoogleClientId = GetRequired(config, "GoogleClientId");

            JwtKey = GetRequired(config, "Jwt:Key");
            JwtIssuer = GetRequired(config, "Jwt:Issuer");
            JwtAudience = GetRequired(config, "Jwt:Audience");
            JwtExpiryMinutes = GetRequiredInt(config, "Jwt:ExpiryMinutes");

            OtpJwtKey = GetRequired(config, "OtpJwt:Key");
            OtpJwtExpiryMinutes = GetRequiredInt(config, "OtpJwt:ExpiryMinutes");

            Email = GetRequired(config, "Email:Address");
            EmailToken = GetRequired(config, "Email:Token");
        }

        private static string GetRequired(IConfiguration config, string key)
        {
            var value = config[key];

            if (string.IsNullOrWhiteSpace(value))
                throw new InvalidOperationException(
                    $"Configuration key '{key}' is missing.");

            return value;
        }

        private static int GetRequiredInt(IConfiguration config, string key)
        {
            var value = config[key];

            if (!int.TryParse(value, out var result))
                throw new InvalidOperationException(
                    $"Configuration key '{key}' must be a valid integer.");

            return result;
        }
    }
}
