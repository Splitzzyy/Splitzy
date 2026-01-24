namespace splitzy_dotnet.Models
{
    public class RefreshToken
    {
        public Guid Id { get; set; }
        public int UserId { get; set; }

        public string TokenHash { get; set; } = null!;
        public DateTime ExpiresAt { get; set; }

        public bool IsRevoked { get; set; }
        public DateTime CreatedAt { get; set; }

        public User User { get; set; } = null!;
    }
}
