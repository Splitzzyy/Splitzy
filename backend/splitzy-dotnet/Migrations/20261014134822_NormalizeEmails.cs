using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace splitzy_dotnet.Migrations
{
    /// <inheritdoc />
    public partial class NormalizeEmails : Migration
    {
        // Snapshot drift note: expenses.updated_by_userid already exists with that name
        // (see AddUpdateByUserId_Col); only the snapshot was stale, so no DDL here.

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("UPDATE users SET email = lower(trim(email)) WHERE email <> lower(trim(email));");
            migrationBuilder.Sql("UPDATE group_invites SET email = lower(trim(email)) WHERE email <> lower(trim(email));");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Irreversible: original casing is not recoverable, and lowercase emails are valid for older code.
        }
    }
}
