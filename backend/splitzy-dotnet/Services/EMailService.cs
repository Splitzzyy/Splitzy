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
        private readonly ISplitzyConfig _config;
        public EMailService(ILogger<EMailService> logger, ISplitzyConfig config)
        {
            _logger = logger;
            _config = config;
        }

        public async Task SendAsync(string to, string subject, string html)
        {
            using var message = new MimeMessage();

            message.From.Add(new MailboxAddress(_config.Email.Name, _config.Email.Address));
            message.To.Add(MailboxAddress.Parse(to));
            message.Subject = subject;

            message.Body = new BodyBuilder { HtmlBody = html }.ToMessageBody();

            using var smtp = new SmtpClient();

            try
            {
                await smtp.ConnectAsync(_config.Email.Host, _config.Email.Port, SecureSocketOptions.StartTls);

                await smtp.AuthenticateAsync(_config.Email.Address, _config.Email.Token);

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