using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NewsPortal.Repository.Migrations
{
    /// <inheritdoc />
    public partial class PhaseBIngestionQuality : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_news_articles_SourceUrl",
                table: "news_articles");

            migrationBuilder.AddColumn<string>(
                name: "CanonicalUrl",
                table: "news_articles",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: false,
                defaultValue: "");

            migrationBuilder.Sql(@"
                UPDATE news_articles
                SET ""CanonicalUrl"" = ""SourceUrl""
                WHERE ""CanonicalUrl"" = '';
            ");

            migrationBuilder.CreateIndex(
                name: "IX_news_articles_CanonicalUrl",
                table: "news_articles",
                column: "CanonicalUrl");

            migrationBuilder.CreateIndex(
                name: "IX_news_articles_SourceId_CanonicalUrl",
                table: "news_articles",
                columns: new[] { "SourceId", "CanonicalUrl" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_news_articles_SourceUrl",
                table: "news_articles",
                column: "SourceUrl");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_news_articles_CanonicalUrl",
                table: "news_articles");

            migrationBuilder.DropIndex(
                name: "IX_news_articles_SourceId_CanonicalUrl",
                table: "news_articles");

            migrationBuilder.DropIndex(
                name: "IX_news_articles_SourceUrl",
                table: "news_articles");

            migrationBuilder.DropColumn(
                name: "CanonicalUrl",
                table: "news_articles");

            migrationBuilder.CreateIndex(
                name: "IX_news_articles_SourceUrl",
                table: "news_articles",
                column: "SourceUrl",
                unique: true);
        }
    }
}
