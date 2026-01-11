using Microsoft.EntityFrameworkCore;

namespace splitzy_dotnet.Models;

public partial class SplitzyContext : DbContext
{
    public SplitzyContext()
    {
    }

    public SplitzyContext(DbContextOptions<SplitzyContext> options)
        : base(options)
    {
    }

    public virtual DbSet<ActivityLog> ActivityLogs { get; set; }

    public virtual DbSet<Expense> Expenses { get; set; }

    public virtual DbSet<ExpenseSplit> ExpenseSplits { get; set; }

    public virtual DbSet<Group> Groups { get; set; }

    public virtual DbSet<GroupMember> GroupMembers { get; set; }

    public virtual DbSet<Settlement> Settlements { get; set; }

    public virtual DbSet<User> Users { get; set; }

    public DbSet<GroupBalance> GroupBalances { get; set; }

    public virtual DbSet<GroupInvite> GroupInvites { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<GroupInvite>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("group_invites_pkey");

            entity.ToTable("group_invites");

            entity.Property(e => e.Id).HasColumnName("id");

            entity.Property(e => e.GroupId).HasColumnName("group_id");

            entity.Property(e => e.Email)
                .HasMaxLength(150)
                .HasColumnName("email");

            entity.Property(e => e.InvitedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("invited_at");

            entity.Property(e => e.Accepted)
                .HasDefaultValue(false)
                .HasColumnName("accepted");

            entity.HasOne(d => d.Group)
                .WithMany(p => p.GroupInvites)
                .HasForeignKey(d => d.GroupId)
                .HasConstraintName("group_invites_group_id_fkey");
        });

        modelBuilder.Entity<GroupBalance>(entity =>
        {
            entity.ToTable("group_balances");

            entity.HasKey(e => new { e.GroupId, e.UserId })
                  .HasName("group_balances_pkey");

            entity.Property(e => e.GroupId)
                  .HasColumnName("group_id");

            entity.Property(e => e.UserId)
                  .HasColumnName("user_id");

            entity.Property(e => e.NetBalance)
                  .HasPrecision(10, 2)
                  .HasColumnName("net_balance");

            entity.HasOne(e => e.Group)
                  .WithMany()
                  .HasForeignKey(e => e.GroupId)
                  .HasConstraintName("group_balances_group_id_fkey");

            entity.HasOne(e => e.User)
                  .WithMany()
                  .HasForeignKey(e => e.UserId)
                  .HasConstraintName("group_balances_user_id_fkey");
        });

        modelBuilder.Entity<ActivityLog>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("activity_log_pkey");

            entity.ToTable("activity_log");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ActionType)
                .HasMaxLength(50)
                .HasColumnName("action_type");
            entity.Property(e => e.Amount)
                .HasPrecision(10, 2)
                .HasColumnName("amount");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.ExpenseId).HasColumnName("expense_id");
            entity.Property(e => e.GroupId).HasColumnName("group_id");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.Expense).WithMany(p => p.ActivityLogs)
                .HasForeignKey(d => d.ExpenseId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("activity_log_expense_id_fkey");

            entity.HasOne(d => d.Group).WithMany(p => p.ActivityLogs)
                .HasForeignKey(d => d.GroupId)
                .HasConstraintName("activity_log_group_id_fkey");

            entity.HasOne(d => d.User).WithMany(p => p.ActivityLogs)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("activity_log_user_id_fkey");
        });

        modelBuilder.Entity<Expense>(entity =>
        {
            entity.HasKey(e => e.ExpenseId).HasName("expenses_pkey");

            entity.ToTable("expenses");

            entity.Property(e => e.ExpenseId).HasColumnName("expense_id");
            entity.Property(e => e.Amount)
                .HasPrecision(10, 2)
                .HasColumnName("amount");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.GroupId).HasColumnName("group_id");
            entity.Property(e => e.Name)
                .HasMaxLength(255)
                .HasColumnName("name");
            entity.Property(e => e.PaidByUserId).HasColumnName("paid_by_user_id");
            entity.Property(e => e.SplitPer)
                .HasColumnType("jsonb")
                .HasColumnName("split_per");

            entity.HasOne(d => d.Group).WithMany(p => p.Expenses)
                .HasForeignKey(d => d.GroupId)
                .HasConstraintName("expenses_group_id_fkey");

            entity.HasOne(d => d.PaidByUser).WithMany(p => p.Expenses)
                .HasForeignKey(d => d.PaidByUserId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("expenses_paid_by_user_id_fkey");
        });

        modelBuilder.Entity<ExpenseSplit>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("expense_splits_pkey");

            entity.ToTable("expense_splits");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ExpenseId).HasColumnName("expense_id");
            entity.Property(e => e.OwedAmount)
                .HasPrecision(10, 2)
                .HasColumnName("owed_amount");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.Expense).WithMany(p => p.ExpenseSplits)
                .HasForeignKey(d => d.ExpenseId)
                .HasConstraintName("expense_splits_expense_id_fkey");

            entity.HasOne(d => d.User).WithMany(p => p.ExpenseSplits)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("expense_splits_user_id_fkey");
        });

        modelBuilder.Entity<Group>(entity =>
        {
            entity.HasKey(e => e.GroupId).HasName("groups_pkey");

            entity.ToTable("groups");

            entity.Property(e => e.GroupId).HasColumnName("group_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.Name)
                .HasMaxLength(100)
                .HasColumnName("name");
        });

        modelBuilder.Entity<GroupMember>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("group_members_pkey");

            entity.ToTable("group_members");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.GroupId).HasColumnName("group_id");
            entity.Property(e => e.JoinedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("joined_at");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.Group).WithMany(p => p.GroupMembers)
                .HasForeignKey(d => d.GroupId)
                .HasConstraintName("group_members_group_id_fkey");

            entity.HasOne(d => d.User).WithMany(p => p.GroupMembers)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("group_members_user_id_fkey");
        });

        modelBuilder.Entity<Settlement>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("settlements_pkey");

            entity.ToTable("settlements");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Amount)
                .HasPrecision(10, 2)
                .HasColumnName("amount");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.GroupId).HasColumnName("group_id");
            entity.Property(e => e.PaidBy).HasColumnName("paid_by");
            entity.Property(e => e.PaidTo).HasColumnName("paid_to");

            entity.HasOne(d => d.Group).WithMany(p => p.Settlements)
                .HasForeignKey(d => d.GroupId)
                .HasConstraintName("settlements_group_id_fkey");

            entity.HasOne(d => d.PaidByNavigation)
                .WithMany(p => p.SettlementPaidByNavigations)
                .HasForeignKey(d => d.PaidBy)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("settlements_paid_by_fkey");

            entity.HasOne(d => d.PaidToNavigation)
                .WithMany(p => p.SettlementPaidToNavigations)
                .HasForeignKey(d => d.PaidTo)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("settlements_paid_to_fkey");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.UserId).HasName("users_pkey");

            entity.ToTable("users");

            entity.HasIndex(e => e.Email, "users_email_key").IsUnique();

            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.Email)
                .HasMaxLength(150)
                .HasColumnName("email");
            entity.Property(e => e.Name)
                .HasMaxLength(100)
                .HasColumnName("name");
            entity.Property(e => e.PasswordHash).HasColumnName("password_hash");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
