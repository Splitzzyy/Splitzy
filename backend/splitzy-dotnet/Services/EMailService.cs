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
            using var message = new MimeMessage();

            message.From.Add(new MailboxAddress(SplitzyConstants.NAME, SplitzyConstants.Email));
            message.To.Add(MailboxAddress.Parse(to));
            message.Subject = subject;

            message.Body = new BodyBuilder { HtmlBody = html }.ToMessageBody();

            using var smtp = new SmtpClient();

            try
            {
                await smtp.ConnectAsync(SplitzyConstants.HOST, SplitzyConstants.PORT, SecureSocketOptions.StartTls);

                await smtp.AuthenticateAsync(SplitzyConstants.Email, SplitzyConstants.EmailToken);

                await smtp.SendAsync(message);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error sending email: {ex.Message}");
                throw;
            }
            finally
            {
                await smtp.DisconnectAsync(true);
            }
        }
    }
}