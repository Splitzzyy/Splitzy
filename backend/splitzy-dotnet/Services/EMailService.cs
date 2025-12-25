using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using splitzy_dotnet.Extensions;
using splitzy_dotnet.Services.Interfaces;

namespace splitzy_dotnet.Services
{
    public class EMailService : IEmailService
    {
        private readonly ILogger<EMailService> _logger;
        public EMailService(ILogger<EMailService> logger)
        {
            _logger = logger;

        }

        public async Task SendAsync(string to, string subject, string html)
        {
            var message = new MimeMessage();

            message.From.Add(new MailboxAddress(Constants.NAME, Constants.Email));
            message.To.Add(MailboxAddress.Parse(to));
            message.Subject = subject;

            message.Body = new BodyBuilder { HtmlBody = html }.ToMessageBody();

            using var smtp = new SmtpClient();

            try
            {
                await smtp.ConnectAsync(Constants.HOST, Constants.PORT, SecureSocketOptions.StartTls);

                await smtp.AuthenticateAsync(Constants.Email, Constants.EmailToken);

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