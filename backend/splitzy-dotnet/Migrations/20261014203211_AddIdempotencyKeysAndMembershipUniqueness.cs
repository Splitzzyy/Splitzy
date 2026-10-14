using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace splitzy_dotnet.Migrations
{
    /// <inheritdoc />
    public partial class AddIdempotencyKeysAndMembershipUniqueness : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_group_members_group_id",
                table: "group_members");

            migrationBuilder.CreateTable(
                name: "idempotency_keys",
                columns: table => new
                {
                    user_id = table.Column<int>(type: "integer", nullable: false),
                    key = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    request_hash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    status_code = table.Column<int>(type: "integer", nullable: true),
                    response_body = table.Column<string>(type: "text", nullable: true),
                    response_content_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("idempotency_keys_pkey", x => new { x.user_id, x.key });
                    table.ForeignKey(
                        name: "idempotency_keys_user_id_fkey",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.Cascade);
                });

            // Older code could insert the same membership twice; keep the earliest row of each pair
            // so the unique index can be created. Nothing references group_members rows by id.
            migrationBuilder.Sql(@"
DELETE FROM group_members dup
USING group_members keep
WHERE dup.group_id = keep.group_id
  AND dup.user_id = keep.user_id
  AND dup.id > keep.id;");

            migrationBuilder.CreateIndex(
                name: "group_members_group_id_user_id_key",
                table: "group_members",
                columns: new[] { "group_id", "user_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_idempotency_keys_created_at",
                table: "idempotency_keys",
                column: "created_at");

            // Defense in depth for case-insensitive emails: the app stores emails lowercased
            // (NormalizeEmails migration + Helper.NormalizeEmail); this stops any other writer
            // from adding a case variant of an existing email. Not part of the EF model.
            migrationBuilder.Sql("CREATE UNIQUE INDEX users_email_lower_key ON users (lower(email));");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP INDEX IF EXISTS users_email_lower_key;");

            migrationBuilder.DropTable(
                name: "idempotency_keys");

            migrationBuilder.DropIndex(
                name: "group_members_group_id_user_id_key",
                table: "group_members");

            migrationBuilder.CreateIndex(
                name: "IX_group_members_group_id",
                table: "group_members",
                column: "group_id");
        }
    }
}
