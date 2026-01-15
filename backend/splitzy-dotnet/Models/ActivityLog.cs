namespace splitzy_dotnet.Models;

public partial class ActivityLog
{
    public int Id { get; set; }

    public int GroupId { get; set; }

    public int UserId { get; set; }

    public int? ExpenseId { get; set; }

    public string ActionType { get; set; } = null!;

    public string? Description { get; set; }

    public DateTime? CreatedAt { get; set; }

    public decimal? Amount { get; set; }

    public virtual Expense? Expense { get; set; }

    public virtual Group Group { get; set; } = null!;

    public virtual User User { get; set; } = null!;
}
