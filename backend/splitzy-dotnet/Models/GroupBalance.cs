namespace splitzy_dotnet.Models
{
    public class GroupBalance
    {
        public int GroupId { get; set; }
        public int UserId { get; set; }
        public decimal NetBalance { get; set; }
        public Group Group { get; set; }
        public User User { get; set; }
    }

}
