using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using splitzy_dotnet.Models;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace splitzy_dotnet.Extensions
{
    /// <summary>
    /// Makes a write endpoint safe to retry. When the client sends an <c>Idempotency-Key</c> header,
    /// the first request with that key runs and its successful response is stored; repeats with the
    /// same key and payload get the stored response (header <c>Idempotent-Replayed: true</c>) instead
    /// of running again. Requests without the header behave exactly as before.
    /// </summary>
    /// <remarks>
    /// - Keys are scoped per user and kept for <see cref="Retention"/>.
    /// - Same key with a different endpoint or payload: 422.
    /// - A repeat that arrives while the first is still running waits briefly for it, then gets 409.
    /// - Only 2xx responses are stored. Failed or rejected requests release the key, so the client
    ///   can retry them (these endpoints write nothing when they reject a request).
    /// </remarks>
    [AttributeUsage(AttributeTargets.Method)]
    public sealed class IdempotentAttribute : Attribute, IAsyncActionFilter
    {
        public const string HeaderName = "Idempotency-Key";
        public const string ReplayedHeaderName = "Idempotent-Replayed";
        public const int MaxKeyLength = 100;
        public static readonly TimeSpan Retention = TimeSpan.FromHours(24);

        private static readonly TimeSpan InFlightWait = TimeSpan.FromSeconds(10);
        private static readonly TimeSpan PollInterval = TimeSpan.FromMilliseconds(250);

        public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
        {
            var http = context.HttpContext;
            var key = http.Request.Headers[HeaderName].ToString().Trim();

            if (key.Length == 0)
            {
                await next();
                return;
            }

            if (key.Length > MaxKeyLength)
            {
                context.Result = new BadRequestObjectResult($"{HeaderName} must be at most {MaxKeyLength} characters.");
                return;
            }

            var services = http.RequestServices;
            var jsonOptions = services.GetRequiredService<IOptions<JsonOptions>>().Value.JsonSerializerOptions;
            var userId = http.GetCurrentUserId();
            var requestHash = Hash($"{http.Request.Method} {http.Request.Path}\n{JsonSerializer.Serialize(context.ActionArguments, jsonOptions)}");

            // Own scope and context: the key row is committed independently of the action's transaction
            using var scope = services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<SplitzyContext>();

            var existing = await ClaimAsync(db, userId, key, requestHash);
            if (existing != null)
            {
                var repeatResult = await ResultForRepeatAsync(db, existing, requestHash, http);
                if (repeatResult != null)
                {
                    context.Result = repeatResult;
                    return;
                }

                // The earlier request with this key failed and released it: run this one instead
                var claimedByOther = await ClaimAsync(db, userId, key, requestHash);
                if (claimedByOther != null)
                {
                    context.Result = claimedByOther.RequestHash == requestHash ? InFlightResult() : KeyReusedResult();
                    return;
                }
            }

            var executed = await next();

            await CompleteAsync(db, userId, key, executed, jsonOptions, services);
        }

        /// <summary>Claims the key for this request; returns the existing row if another request already holds it.</summary>
        private static async Task<IdempotencyKey?> ClaimAsync(SplitzyContext db, int userId, string key, string requestHash)
        {
            var existing = await FindAsync(db, userId, key);
            if (existing != null)
                return existing;

            db.IdempotencyKeys.Add(new IdempotencyKey
            {
                UserId = userId,
                Key = key,
                RequestHash = requestHash,
                CreatedAt = DateTime.UtcNow
            });

            try
            {
                await db.SaveChangesAsync();
                return null;
            }
            catch (DbUpdateException)
            {
                // A concurrent request with the same key claimed it first (primary key conflict)
                db.ChangeTracker.Clear();
                return await FindAsync(db, userId, key)
                    ?? throw new InvalidOperationException("Idempotency key conflict but no existing row.");
            }
        }

        /// <summary>The response for a repeated key, or null if the earlier request released the key.</summary>
        private static async Task<IActionResult?> ResultForRepeatAsync(
            SplitzyContext db, IdempotencyKey existing, string requestHash, HttpContext http)
        {
            var deadline = DateTime.UtcNow + InFlightWait;
            IdempotencyKey? row = existing;

            // While the first request is still running (e.g. a double tap), wait for its result.
            // Recheck the hash on every reload: if that request failed and released the key, a request
            // with a different payload may have claimed it in the meantime.
            while (true)
            {
                if (row == null)
                    return null;

                if (row.RequestHash != requestHash)
                    return KeyReusedResult();

                if (row.StatusCode != null)
                    break;

                if (DateTime.UtcNow >= deadline)
                    return InFlightResult();

                await Task.Delay(PollInterval, http.RequestAborted);
                row = await FindAsync(db, existing.UserId, existing.Key);
            }

            http.Response.Headers[ReplayedHeaderName] = "true";
            return new ContentResult
            {
                StatusCode = row.StatusCode,
                Content = row.ResponseBody,
                ContentType = row.ResponseContentType
            };
        }

        /// <summary>Stores a successful response for replay, or releases the key so the request can be retried.</summary>
        private static async Task CompleteAsync(
            SplitzyContext db, int userId, string key, ActionExecutedContext executed,
            JsonSerializerOptions jsonOptions, IServiceProvider services)
        {
            try
            {
                var row = await db.IdempotencyKeys.SingleAsync(k => k.UserId == userId && k.Key == key);

                int? status = executed.Exception == null && !executed.ExceptionHandled
                    ? executed.Result switch
                    {
                        ObjectResult o => o.StatusCode ?? StatusCodes.Status200OK,
                        StatusCodeResult s => s.StatusCode,
                        _ => null
                    }
                    : null;

                if (status is >= 200 and < 300)
                {
                    row.StatusCode = status;
                    // Mirror the output formatters: strings are sent as plain text, everything else as JSON
                    (row.ResponseBody, row.ResponseContentType) = executed.Result switch
                    {
                        ObjectResult { Value: string text } => (text, "text/plain; charset=utf-8"),
                        ObjectResult { Value: not null } obj => (JsonSerializer.Serialize(obj.Value, jsonOptions), "application/json; charset=utf-8"),
                        _ => ((string?)null, (string?)null)
                    };
                }
                else
                {
                    db.IdempotencyKeys.Remove(row);
                }

                await db.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                // The action's own result stands; at worst a retry with this key gets 409 until the key expires
                services.GetRequiredService<ILogger<IdempotentAttribute>>()
                    .LogError(ex, "Failed to record idempotency result. UserId={UserId}", userId);
            }
        }

        private static ConflictObjectResult InFlightResult() =>
            new("A request with this Idempotency-Key is still being processed.");

        private static UnprocessableEntityObjectResult KeyReusedResult() =>
            new($"{HeaderName} was already used for a different request. Use a new key for a new request.");

        private static Task<IdempotencyKey?> FindAsync(SplitzyContext db, int userId, string key) =>
            db.IdempotencyKeys.AsNoTracking().SingleOrDefaultAsync(k => k.UserId == userId && k.Key == key);

        private static string Hash(string value) =>
            Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
    }
}
