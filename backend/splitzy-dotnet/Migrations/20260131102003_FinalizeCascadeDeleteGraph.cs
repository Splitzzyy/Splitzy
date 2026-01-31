using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace splitzy_dotnet.Migrations
{
    /// <inheritdoc />
    public partial class FinalizeCascadeDeleteGraph : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "activity_log_group_id_fkey",
                table: "activity_log");

            migrationBuilder.AddForeignKey(
                name: "activity_log_group_id_fkey",
                table: "activity_log",
                column: "group_id",
                principalTable: "groups",
                principalColumn: "group_id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "activity_log_group_id_fkey",
                table: "activity_log");

            migrationBuilder.AddForeignKey(
                name: "activity_log_group_id_fkey",
                table: "activity_log",
                column: "group_id",
                principalTable: "groups",
                principalColumn: "group_id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
