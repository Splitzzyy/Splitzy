namespace splitzy_dotnet.Models
{
    public class EmailVerification
    {
        public Guid Id { get; set; }
        public int UserId { get; set; }

        public string Token { get; set; } = null!;
        public DateTime ExpiresAt { get; set; }
        public bool IsUsed { get; set; }

        public DateTime CreatedAt { get; set; }

        public User User { get; set; } = null!;
    }
}
