using Microsoft.EntityFrameworkCore;
using splitzy_dotnet.Extensions;
using splitzy_dotnet.Models;
using splitzy_dotnet.Services.Interfaces;

namespace splitzy_dotnet.Services
{
    public class RefreshTokenCleanupService : IRefreshTokenCleanupService
    {
        private readonly SplitzyContext _db;
        private readonly ILogger<RefreshTokenCleanupService> _logger;

        public RefreshTokenCleanupService(
            SplitzyContext db,
            ILogger<RefreshTokenCleanupService> logger)
        {
            _db = db;
            _logger = logger;
        }

        public async Task CleanupAsync(CancellationToken cancellationToken = default)
        {
            var now = DateTime.UtcNow;

            var deleted = await _db.RefreshTokens
                .Where(t =>
                    t.ExpiresAt < now ||
                    (t.IsRevoked)
                )
                .ExecuteDeleteAsync(cancellationToken);

            _logger.LogInformation(
                "Refresh-token cleanup deleted {Count} rows",
                deleted
            );

            // Idempotency keys only need to outlive client retries
            var keyCutoff = now - IdempotentAttribute.Retention;
            var deletedKeys = await _db.IdempotencyKeys
                .Where(k => k.CreatedAt < keyCutoff)
                .ExecuteDeleteAsync(cancellationToken);

            _logger.LogInformation("Idempotency-key cleanup deleted {Count} rows", deletedKeys);
        }
    }
}
