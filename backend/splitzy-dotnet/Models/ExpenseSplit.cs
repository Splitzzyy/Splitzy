namespace splitzy_dotnet.Models;

public partial class ExpenseSplit
{
    public int Id { get; set; }

    public int ExpenseId { get; set; }

    public int UserId { get; set; }

    public decimal OwedAmount { get; set; }

    public virtual Expense Expense { get; set; } = null!;

    public virtual User User { get; set; } = null!;
}
