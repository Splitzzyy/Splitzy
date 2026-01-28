using splitzy_dotnet.Services.Interfaces;

namespace splitzy_dotnet.Services.BackgroundServices
{
    /// <summary>
    /// This background service is cleanup for refresh tokens that are expired or no longer valid.
    /// </summary>
    public class RefreshTokenBackgroundCleanupService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<RefreshTokenBackgroundCleanupService> _logger;

        private static readonly TimeSpan CleanupInterval = TimeSpan.FromHours(1);

        public RefreshTokenBackgroundCleanupService(
            IServiceScopeFactory scopeFactory,
            ILogger<RefreshTokenBackgroundCleanupService> logger
            )
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("RefreshTokenCleanupService is starting.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await CleanupAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "An error occurred during refresh token cleanup.");
                }

                await Task.Delay(CleanupInterval, stoppingToken);
            }

        }

        private async Task CleanupAsync(CancellationToken stoppingToken)
        {
            using var scope = _scopeFactory.CreateScope();
            var cleanup = scope.ServiceProvider
                .GetRequiredService<IRefreshTokenCleanupService>();

            await cleanup.CleanupAsync(stoppingToken);
        }
    }
}
