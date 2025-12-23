namespace splitzy_dotnet.DTO
{
    public class RecentActivityDTO
    {
        public string Actor { get; set; } = string.Empty;
        public string Action { get; set; } = "added"; // or "updated"
        public string ExpenseName { get; set; } = string.Empty;
        public string GroupName { get; set; } = string.Empty;
        public DateTime? CreatedAt { get; set; }
        public ActivityImpact Impact { get; set; }
    }
    public class ActivityImpact
    {
        public string Type { get; set; } = "get_back"; // or "owe"
        public decimal Amount { get; set; }
    }
}
