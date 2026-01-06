using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace splitzy_dotnet.Migrations
{
    /// <inheritdoc />
    public partial class FixSettlementDeleteBehavior : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "settlements_paid_by_fkey",
                table: "settlements");

            migrationBuilder.DropForeignKey(
                name: "settlements_paid_to_fkey",
                table: "settlements");

            migrationBuilder.AddForeignKey(
                name: "settlements_paid_by_fkey",
                table: "settlements",
                column: "paid_by",
                principalTable: "users",
                principalColumn: "user_id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "settlements_paid_to_fkey",
                table: "settlements",
                column: "paid_to",
                principalTable: "users",
                principalColumn: "user_id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "settlements_paid_by_fkey",
                table: "settlements");

            migrationBuilder.DropForeignKey(
                name: "settlements_paid_to_fkey",
                table: "settlements");

            migrationBuilder.AddForeignKey(
                name: "settlements_paid_by_fkey",
                table: "settlements",
                column: "paid_by",
                principalTable: "users",
                principalColumn: "user_id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "settlements_paid_to_fkey",
                table: "settlements",
                column: "paid_to",
                principalTable: "users",
                principalColumn: "user_id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
