namespace splitzy_dotnet.Models
{
    public class GroupInvite
    {
        public int Id { get; set; }

        public int GroupId { get; set; }

        public string Email { get; set; } = null!;

        public DateTime InvitedAt { get; set; }

        public bool Accepted { get; set; }

        public virtual Group Group { get; set; } = null!;
    }
}
