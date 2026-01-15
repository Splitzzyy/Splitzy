using RabbitMQ.Client;
using splitzy_dotnet.Services.Interfaces;
using System.Text;
using System.Text.Json;

public class RabbitMqProducer : IMessageProducer
{
    private readonly ILogger<RabbitMqProducer> _logger;

    public RabbitMqProducer(ILogger<RabbitMqProducer> logger)
    {
        _logger = logger;
    }

    public async Task SendMessageAsync<T>(T message)
    {
        var factory = new ConnectionFactory { HostName = "localhost" };

        try
        {
            using var connection = await factory.CreateConnectionAsync();
            using var channel = await connection.CreateChannelAsync();

            await channel.QueueDeclareAsync(queue: "email_queue",
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
                                            routingKey: "email_queue",
                                            mandatory: false,
                                            basicProperties: properties,
                                            body: body);

            _logger.LogInformation("Message published to email_queue");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Could not publish message");
            throw;
        }
    }
}