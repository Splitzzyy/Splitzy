namespace splitzy_dotnet.Services.Interfaces
{
    public interface IMessageProducer
    {
        Task SendMessageAsync<T>(T message);
    }
}
