namespace splitzy_dotnet.Services.Interfaces
{
    public interface IRefreshTokenCleanupService
    {
        Task CleanupAsync(CancellationToken cancellationToken = default);
    }
}
