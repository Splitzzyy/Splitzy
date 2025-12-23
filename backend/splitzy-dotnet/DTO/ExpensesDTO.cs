namespace splitzy_dotnet.DTO
{
    public class ExpensesDTO
    {
        public int FromUser { get; set; }
        public int ToUser { get; set; }
        public decimal Amount { get; set; }
    }

    public class CreateExpenseDto
    {
        public int GroupId { get; set; }
        public int PaidByUserId { get; set; }
        public decimal Amount { get; set; }
        public string Name { get; set; } = string.Empty;
        public List<SplitDetailDto> SplitDetails { get; set; } = new(); // UserId → Amount
    }
    public class SplitDetailDto
    {
        public int UserId { get; set; }
        public decimal Amount { get; set; }
    }
    public class UpdateExpenseDto
    {
        public int ExpenseId { get; set; }
        public int GroupId { get; set; }
        public int PaidByUserId { get; set; }
        public decimal Amount { get; set; }
        public string Name { get; set; } = string.Empty;
        public List<SplitDetailDto> SplitDetails { get; set; } = new();
    }
}
