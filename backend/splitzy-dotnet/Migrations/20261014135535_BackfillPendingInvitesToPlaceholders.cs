using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace splitzy_dotnet.Migrations
{
    /// <inheritdoc />
    public partial class BackfillPendingInvitesToPlaceholders : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Legacy pending invites (email only) become real memberships:
            // unknown emails get a placeholder user, known emails (e.g. missed due to the old
            // case-sensitive match) are added directly. Idempotent; emails are already lowercase.
            migrationBuilder.Sql(@"
INSERT INTO users (name, email, password_hash, is_registered, is_email_verified, created_at)
SELECT DISTINCT ON (gi.email) left(split_part(gi.email, '@', 1), 100), gi.email, NULL, false, false, now()
FROM group_invites gi
WHERE gi.accepted = false
  AND NOT EXISTS (SELECT 1 FROM users u WHERE u.email = gi.email);

INSERT INTO group_members (group_id, user_id, joined_at)
SELECT DISTINCT gi.group_id, u.user_id, now()
FROM group_invites gi
JOIN users u ON u.email = gi.email
WHERE gi.accepted = false
  AND NOT EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = gi.group_id AND gm.user_id = u.user_id);

INSERT INTO group_balances (group_id, user_id, net_balance)
SELECT DISTINCT gi.group_id, u.user_id, 0
FROM group_invites gi
JOIN users u ON u.email = gi.email
WHERE gi.accepted = false
ON CONFLICT (group_id, user_id) DO NOTHING;

UPDATE group_invites SET accepted = true WHERE accepted = false;
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Data-only and irreversible: backfilled placeholders are indistinguishable from
            // placeholders created later, and keeping them is harmless for older code.
        }
    }
}
