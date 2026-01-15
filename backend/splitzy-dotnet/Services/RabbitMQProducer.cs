using RabbitMQ.Client;
using splitzy_dotnet.Extensions;
using splitzy_dotnet.Services.Interfaces;
using System.Text;
using System.Text.Json;

public class RabbitMqProducer : IMessageProducer
{
    private readonly ILogger<RabbitMqProducer> _logger;
    private readonly ISplitzyConfig _config;

    public RabbitMqProducer(ILogger<RabbitMqProducer> logger, ISplitzyConfig config)
    {
        _logger = logger;
        _config = config;
    }

    public async Task SendMessageAsync<T>(T message)
    {
        var factory = new ConnectionFactory { HostName = "localhost" };

        try
        {
            using var connection = await factory.CreateConnectionAsync();
            using var channel = await connection.CreateChannelAsync();

            await channel.QueueDeclareAsync(queue: _config.Messaging.MainQueue,
                                            durable: true,
                                            exclusive: false,
                                            autoDelete: false,
                                            arguments: null);

            var json = JsonSerializer.Serialize(message);
            var body = Encoding.UTF8.GetBytes(json);

            var properties = new BasicProperties
            {
                Persistent = true
            };

            await channel.BasicPublishAsync(exchange: "",
                                            routingKey: _config.Messaging.MainQueue,
                                            mandatory: false,
                                            basicProperties: properties,
                                            body: body);

            _logger.LogInformation("Message published to " + _config.Messaging.MainQueue);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Could not publish message");
            throw;
        }
    }
}