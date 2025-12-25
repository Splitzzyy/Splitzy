namespace splitzy_dotnet.Extensions
{
    public static class Constants
    {
        public static readonly string GoogleClientId = GetRequired("GOOGLE_CLIENT_ID");

        public static readonly string JwtKey = GetRequired("JWT_KEY");

        public static readonly string JwtIssuer = GetRequired("JWT_ISSUE");

        public static readonly string JwtAudience = GetRequired("JWT_AUDIENCE");

        public static readonly int JwtExpiryMinutes = GetRequiredInt("JWT_EXPINMIN");

        public static readonly string OtpJwtKey = GetRequired("OTPJWT_KEY");

        public static readonly int OtpJwtExpiryMinutes = GetRequiredInt("OTPJWT_EXPINMIN");

        private static string GetRequired(string key)
        {
            var value = Environment.GetEnvironmentVariable(key);

            if (string.IsNullOrWhiteSpace(value))
                throw new InvalidOperationException(
                    $"Environment variable '{key}' is missing.");

            return value;
        }

        private static int GetRequiredInt(string key)
        {
            var value = Environment.GetEnvironmentVariable(key);

            if (!int.TryParse(value, out var result))
                throw new InvalidOperationException(
                    $"Environment variable '{key}' must be a valid integer.");

            return result;
        }
    }

}
