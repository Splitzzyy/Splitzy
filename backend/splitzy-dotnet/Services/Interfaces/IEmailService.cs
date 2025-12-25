namespace splitzy_dotnet.Services.Interfaces
{
    public interface IEmailService
    {
        Task SendAsync(string to, string subject, string html);
    }
}
