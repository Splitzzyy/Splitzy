namespace splitzy_dotnet.Models;

/// <summary>
/// One row per (user, Idempotency-Key header). Claimed before the request runs; holds the stored
/// response once it succeeds. See <see cref="Extensions.IdempotentAttribute"/>.
/// </summary>
public class IdempotencyKey
{
    public int UserId { get; set; }

    public string Key { get; set; } = null!;

    // SHA-256 of method, path and request arguments: the same key must not be reused for another request
    public string RequestHash { get; set; } = null!;

    // null while the first request is still running
    public int? StatusCode { get; set; }

    public string? ResponseBody { get; set; }

    public string? ResponseContentType { get; set; }

    public DateTime CreatedAt { get; set; }
}
