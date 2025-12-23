namespace splitzy_dotnet.DTO
{
    public class UserGroupExpenseDTO
    {
        public int UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public List<UserGroupInfo> Groups { get; set; } = new();
        public decimal TotalPaid { get; set; }
    }
    public class UserGroupInfo
    {
        public int GroupId { get; set; }
        public string GroupName { get; set; } = string.Empty;
        public DateTime? JoinedAt { get; set; }
    }
}
