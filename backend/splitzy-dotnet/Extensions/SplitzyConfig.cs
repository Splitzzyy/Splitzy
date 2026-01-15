
using Microsoft.Extensions.Options;

namespace splitzy_dotnet.Extensions
{
    public class GoogleSettings
    {
        public string ClientId { get; set; } = null!;
    }

    public class JwtSettings
    {
        public string Key { get; set; } = null!;
        public string Issuer { get; set; } = null!;
        public string Audience { get; set; } = null!;
        public int ExpiryMinutes { get; set; }
    }

    public class OtpJwtSettings
    {
        public string Key { get; set; } = null!;
        public int ExpiryMinutes { get; set; }
    }

    public class EmailSettings
    {
        public string Address { get; set; } = null!;
        public string Token { get; set; } = null!;
        public string Host { get; set; } = "smtp.gmail.com";
        public int Port { get; set; } = 587;
        public string Name { get; set; } = "Splitzy";
    }

    public class MessagingSettings
    {
        public string MainQueue { get; set; } = null!;
        public string RetryQueue { get; set; } = null!;
        public string DeadLetterQueue { get; set; } = null!;
        public int RetryDelayTimeoutSeconds { get; set; }
        public int MaxRetryCount { get; set; }
        public string HostName { get; set; } = null!;
    }

    public interface ISplitzyConfig
    {
        GoogleSettings Google { get; }
        JwtSettings Jwt { get; }
        OtpJwtSettings OtpJwt { get; }
        EmailSettings Email { get; }
        MessagingSettings Messaging { get; }
    }

    public class SplitzyConfig : ISplitzyConfig
    {
        public GoogleSettings Google { get; }
        public JwtSettings Jwt { get; }
        public OtpJwtSettings OtpJwt { get; }
        public EmailSettings Email { get; }
        public MessagingSettings Messaging { get; }

        public SplitzyConfig(
            IOptionsMonitor<GoogleSettings> google,
            IOptionsMonitor<JwtSettings> jwt,
            IOptionsMonitor<OtpJwtSettings> otpJwt,
            IOptionsMonitor<EmailSettings> email,
            IOptionsMonitor<MessagingSettings> messaging)
        {
            Google = google.CurrentValue;
            Jwt = jwt.CurrentValue;
            OtpJwt = otpJwt.CurrentValue;
            Email = email.CurrentValue;
            Messaging = messaging.CurrentValue;
        }
    }
}
