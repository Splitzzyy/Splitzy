using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using splitzy_dotnet.Extensions;
using splitzy_dotnet.Models;
using splitzy_dotnet.Services.Interfaces;
using splitzy_dotnet.Templates;
using System.Text;
using System.Text.Json;

namespace splitzy_dotnet.Services.BackgroundServices
{
    public class EmailConsumer : BackgroundService
    {
        private readonly ILogger<EmailConsumer> _logger;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ISplitzyConfig _config;

        private IConnection? _connection;
        private IChannel? _channel;

        private readonly JsonSerializerOptions _jsonOptions = new()
        {
            PropertyNameCaseInsensitive = true
        };

        public EmailConsumer(
            ILogger<EmailConsumer> logger,
            IServiceScopeFactory scopeFactory,
            ISplitzyConfig config)
        {
            _logger = logger;
            _scopeFactory = scopeFactory;
            _config = config;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("EmailConsumer starting...");

            var factory = new ConnectionFactory
            {
                HostName = _config.Messaging.HostName,
                Port = _config.Messaging.Port,
                UserName = _config.Messaging.UserName,
                Password = _config.Messaging.Password,
                AutomaticRecoveryEnabled = true
            };

            _connection = await factory.CreateConnectionAsync(stoppingToken);
            _channel = await _connection.CreateChannelAsync(cancellationToken: stoppingToken);

            // QoS: max 5 unacked messages for backpressure 
            await _channel.BasicQosAsync(0, 5, false);

            // Main queue
            await _channel.QueueDeclareAsync(
                queue: _config.Messaging.MainQueue,
                durable: true,
                exclusive: false,
                autoDelete: false,
                arguments: null,
                cancellationToken: stoppingToken
            );

            // Dead letter queue
            await _channel.QueueDeclareAsync(
                queue: _config.Messaging.DeadLetterQueue,
                durable: true,
                exclusive: false,
                autoDelete: false,
                arguments: null,
                cancellationToken: stoppingToken
            );

            // Retry queue (TTL → main queue)
            await _channel.QueueDeclareAsync(
                queue: _config.Messaging.RetryQueue,
                durable: true,
                exclusive: false,
                autoDelete: false,
                arguments: new Dictionary<string, object?>
                {
                { "x-message-ttl", _config.Messaging.RetryDelayTimeoutSeconds },
                { "x-dead-letter-exchange", string.Empty },
                { "x-dead-letter-routing-key", _config.Messaging.MainQueue }
                },
                cancellationToken: stoppingToken
            );

            var consumer = new AsyncEventingBasicConsumer(_channel);
            consumer.ReceivedAsync += OnMessageReceived;

            await _channel.BasicConsumeAsync(
                queue: _config.Messaging.MainQueue,
                autoAck: false,
                consumer: consumer
            );

            _logger.LogInformation("EmailConsumer started. Listening to {Queue}", _config.Messaging.MainQueue);

            await Task.Delay(Timeout.Infinite, stoppingToken);
        }

        private async Task OnMessageReceived(object sender, BasicDeliverEventArgs ea)
        {
            var messageJson = Encoding.UTF8.GetString(ea.Body.ToArray());

            EmailMessage? emailEvent = null;

            try
            {
                emailEvent = JsonSerializer.Deserialize<EmailMessage>(
                    messageJson,
                    _jsonOptions
                );

                if (emailEvent is null)
                    throw new InvalidOperationException("EmailMessage deserialization failed");

                await HandleEmailProcessing(emailEvent);

                await _channel!.BasicAckAsync(ea.DeliveryTag, false);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Email processing failed");

                await HandleRetryOrDeadQueue(emailEvent, ea.Body);

                await _channel!.BasicAckAsync(ea.DeliveryTag, false);
            }
        }

        private async Task HandleRetryOrDeadQueue(
            EmailMessage? emailEvent,
            ReadOnlyMemory<byte> originalBody)
        {
            if (emailEvent is null || emailEvent.RetryCount >= _config.Messaging.MaxRetryCount)
            {
                _logger.LogWarning("Email moved to DEAD queue");

                await _channel!.BasicPublishAsync(
                    exchange: "",
                    routingKey: _config.Messaging.DeadLetterQueue,
                    body: originalBody
                );

                return;
            }

            emailEvent.RetryCount++;

            _logger.LogWarning(
                "Retrying email (Attempt {Retry}/{Max})",
                emailEvent.RetryCount,
                _config.Messaging.MaxRetryCount
            );

            var retryBody = Encoding.UTF8.GetBytes(
                JsonSerializer.Serialize(emailEvent)
            );

            await _channel!.BasicPublishAsync(
                exchange: "",
                routingKey: _config.Messaging.MainQueue,
                body: retryBody
            );
        }

        private async Task HandleEmailProcessing(EmailMessage msg)
        {
            string htmlContent = string.Empty;
            string subject = string.Empty;

            var jsonPayload = JsonSerializer.Serialize(msg.Payload);
            using var doc = JsonDocument.Parse(jsonPayload);
            var root = doc.RootElement;

            switch (msg.TemplateType)
            {
                case "Welcome":
                    if (TryGetProp(root, "UserName", out var name))
                    {
                        htmlContent = new WelcomeEmailTemplate().Build(name);
                        subject = "Welcome to Splitzy! 👋";
                    }
                    break;

                case "Reminder":
                    if (TryGetProp(root, "UserName", out var user) &&
                        TryGetProp(root, "GroupName", out var group) &&
                        TryGetProp(root, "OwedTo", out var owedTo) &&
                        root.TryGetProperty("Amount", out var amountElem))
                    {
                        var amount = amountElem.GetDecimal();
                        htmlContent = new ReminderTemplate().Build(user, amount, group, owedTo);
                        subject = "⏰ Payment Reminder";
                    }
                    break;

                case "GroupAdded":
                    if (TryGetProp(root, "UserName", out var gaUser) &&
                        TryGetProp(root, "GroupName", out var gaGroup) &&
                        TryGetProp(root, "AddedBy", out var addedBy))
                    {
                        htmlContent = new GroupAddedTemplate().Build(gaUser, gaGroup, addedBy);
                        subject = "You've been added to a group";
                    }
                    break;

                case "ForgotPassword":
                    if (TryGetProp(root, "ResetLink", out var resetLink))
                    {
                        htmlContent = new ForgotPasswordTemplate().Build(resetLink);
                        subject = "🔒 Reset Your Password";
                    }
                    break;

                case "GroupInvitation":
                    if (TryGetProp(root, "InviterName", out var inviter) &&
                        TryGetProp(root, "GroupName", out var giGroup))
                    {
                        htmlContent = new GroupInvitationTemplate().Build(inviter, giGroup);
                        subject = $"Invite to join {giGroup}";
                    }
                    break;

                default:
                    throw new InvalidOperationException(
                        $"Unknown email template: {msg.TemplateType}"
                    );
            }

            if (string.IsNullOrWhiteSpace(htmlContent))
                throw new InvalidOperationException("Email HTML generation failed");

            using var scope = _scopeFactory.CreateScope();
            var emailService = scope.ServiceProvider
                .GetRequiredService<IEmailService>();

            await emailService.SendAsync(msg.ToEmail, subject, htmlContent);

            _logger.LogInformation(
                "Email sent | Type: {Type} | To: {Email}",
                msg.TemplateType,
                msg.ToEmail
            );
        }

        private bool TryGetProp(JsonElement root, string propName, out string? value)
        {
            if (root.TryGetProperty(propName, out var elem) ||
                root.TryGetProperty(propName.ToLower(), out elem) ||
                root.TryGetProperty(char.ToLower(propName[0]) + propName[1..], out elem))
            {
                value = elem.ToString();
                return true;
            }

            value = null;
            return false;
        }

        public override async Task StopAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("EmailConsumer stopping...");

            if (_channel is not null)
                await _channel.CloseAsync();

            if (_connection is not null)
                await _connection.CloseAsync();

            await base.StopAsync(cancellationToken);
        }
    }
}