using System.ComponentModel.DataAnnotations.Schema;

namespace splitzy_dotnet.Models;

public partial class Expense
{
    public int ExpenseId { get; set; }

    public string Name { get; set; } = null!;

    public decimal Amount { get; set; }

    public int GroupId { get; set; }

    public int PaidByUserId { get; set; }

    public string SplitPer { get; set; } = null!;

    public DateTime? CreatedAt { get; set; }

    public virtual ICollection<ActivityLog> ActivityLogs { get; set; } = new List<ActivityLog>();

    public virtual ICollection<ExpenseSplit> ExpenseSplits { get; set; } = new List<ExpenseSplit>();

    public virtual Group Group { get; set; } = null!;

    public virtual User PaidByUser { get; set; } = null!;

    [Column("expense_category")]
    public ExpenseCategory Category { get; set; } = ExpenseCategory.Uncategorized;
}
public enum ExpenseCategory
{
    Uncategorized = 0,
    Food = 1,
    Travel = 2,
    Utilities = 3,
    Entertainment = 4,
    Housing = 5,
    Healthcare = 6,
    Shopping = 7,
    Transportation = 8,
    Education = 9,
    Personal = 10,
    Other = 11,
}

