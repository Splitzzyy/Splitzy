using splitzy_dotnet.Models;

namespace splitzy_dotnet.DTO
{
    public class UserGroupExpenseDTO
    {
        public int UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public List<UserGroupInfo> Groups { get; set; } = new();
        public List<UserExpenseInfo> Expenses { get; set; } = new();
        public decimal TotalPaid { get; set; }
        public decimal TotalOwes { get; internal set; }
        public decimal NetBalance { get; internal set; }
    }
    public class UserGroupInfo
    {
        public int GroupId { get; set; }
        public string GroupName { get; set; } = string.Empty;
        public DateTime? JoinedAt { get; set; }
    }
    public class UserExpenseInfo
    {
        public ExpenseCategory ExpenseCategory { get; set; }
        public int ExpenseId { get; internal set; }
        public int GroupId { get; internal set; }
        public int PaidByUserId { get; internal set; }
        public DateTime? CreatedAt { get; internal set; }
        public string Description { get; internal set; }
        public ExpenseCategory Category { get; internal set; }
        public bool IsPaidByCurrentUser { get; internal set; }
        public object UserOwes { get; internal set; }
        public decimal TotalAmount { get; internal set; }
    }
}
