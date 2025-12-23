using System;
using System.Collections.Generic;

namespace splitzy_dotnet.Models;

public partial class Settlement
{
    public int Id { get; set; }

    public int GroupId { get; set; }

    public int PaidBy { get; set; }

    public int PaidTo { get; set; }

    public decimal Amount { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual Group Group { get; set; } = null!;

    public virtual User PaidByNavigation { get; set; } = null!;

    public virtual User PaidToNavigation { get; set; } = null!;
}
