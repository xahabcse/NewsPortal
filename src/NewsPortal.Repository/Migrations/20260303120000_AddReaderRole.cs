using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NewsPortal.Repository.Migrations
{
    /// <inheritdoc />
    public partial class AddReaderRole : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Rename existing "Viewer" role users to "Reader"
            migrationBuilder.Sql("UPDATE users SET \"Role\" = 'Reader' WHERE \"Role\" = 'Viewer'");

            // Change column default from "Viewer" to "Reader"
            migrationBuilder.AlterColumn<string>(
                name: "Role",
                table: "users",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Reader",
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20,
                oldNullable: false,
                oldDefaultValue: "Viewer");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Role",
                table: "users",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Viewer",
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20,
                oldNullable: false,
                oldDefaultValue: "Reader");

            // Revert "Reader" role back to "Viewer" (best-effort)
            migrationBuilder.Sql("UPDATE users SET \"Role\" = 'Viewer' WHERE \"Role\" = 'Reader'");
        }
    }
}
