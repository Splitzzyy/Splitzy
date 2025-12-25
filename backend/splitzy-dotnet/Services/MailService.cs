using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using Microsoft.Extensions.Options;
using splitzy_dotnet.Services.Interfaces;

namespace splitzy_dotnet.Services
{
    public class MailService : IEmailService
    {
        private readonly ILogger<MailService> _logger;
        public const string HOST = "smtp.gmail.com";
        public const int PORT = 587;
        public const string EMAIL = "info.splitzy@gmail.com";
        public static readonly string Email_Token =
            Environment.GetEnvironmentVariable("EMAIL_TOKEN")
                            ?? "";
        public const string Name = "Splitzy";


        public MailService(ILogger<MailService> logger)
        {
            _logger = logger;

        }

        public async Task SendAsync(string to, string subject, string html)
        {
            var message = new MimeMessage();

            message.From.Add(new MailboxAddress(Name, EMAIL));
            message.To.Add(MailboxAddress.Parse(to));
            message.Subject = subject;

            message.Body = new BodyBuilder { HtmlBody = html }.ToMessageBody();

            using var smtp = new SmtpClient();

            try
            {
                await smtp.ConnectAsync(HOST, PORT, SecureSocketOptions.StartTls);

                await smtp.AuthenticateAsync(EMAIL, Email_Token);

                await smtp.SendAsync(message);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error sending email: {ex.Message}");
            }
            finally
            {
                await smtp.DisconnectAsync(true);
            }
        }
    }
}