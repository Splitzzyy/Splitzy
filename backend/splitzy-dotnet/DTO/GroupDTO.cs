using static splitzy_dotnet.Controllers.GroupController;

namespace splitzy_dotnet.DTO
{
    public class GroupDTO
    {
        public class CreateGroupRequest
        {
            public required string GroupName { get; set; }
            public List<string> UserEmails { get; set; } = new();
        }
        public class GroupSummaryDTO
        {
            public int GroupId { get; set; }
            public string GroupName { get; set; } = string.Empty;
            public int TotalMembers { get; set; }
            public List<string> Usernames { get; set; } = new();
            public List<GroupExpenseDTO> Expenses { get; set; } = new();
        }
        public class GroupExpenseDTO
        {
            public string PaidBy { get; set; } = string.Empty;
            public string Name { get; set; } = string.Empty;
            public decimal Amount { get; set; }
        }
    }
}
