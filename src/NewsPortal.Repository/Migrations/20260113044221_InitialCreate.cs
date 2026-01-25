using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace NewsPortal.Repository.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "categories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    NameBn = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Slug = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Icon = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Color = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_categories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "news_sources",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Slug = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    BaseUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    LogoUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    FetchMethod = table.Column<int>(type: "integer", nullable: false),
                    RssFeedUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ApiEndpoint = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ApiKey = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    FetchIntervalMinutes = table.Column<int>(type: "integer", nullable: false),
                    LastFetchedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_news_sources", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "news_articles",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Title = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Slug = table.Column<string>(type: "character varying(550)", maxLength: 550, nullable: false),
                    Summary = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Content = table.Column<string>(type: "text", nullable: true),
                    PlainText = table.Column<string>(type: "text", nullable: true),
                    SourceUrl = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    OriginalImageUrl = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    MongoImageId = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    MongoThumbId = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Author = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    PublishedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    FetchedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ViewCount = table.Column<int>(type: "integer", nullable: false),
                    IsFeatured = table.Column<bool>(type: "boolean", nullable: false),
                    SourceId = table.Column<int>(type: "integer", nullable: false),
                    CategoryId = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_news_articles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_news_articles_categories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_news_articles_news_sources_SourceId",
                        column: x => x.SourceId,
                        principalTable: "news_sources",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "scraping_configs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SourceId = table.Column<int>(type: "integer", nullable: false),
                    ListPageUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ArticleLinkSelector = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    TitleSelector = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    ContentSelector = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    SummarySelector = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    ImageSelector = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    DateSelector = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    AuthorSelector = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_scraping_configs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_scraping_configs_news_sources_SourceId",
                        column: x => x.SourceId,
                        principalTable: "news_sources",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_categories_IsActive",
                table: "categories",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_categories_Slug",
                table: "categories",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_categories_SortOrder",
                table: "categories",
                column: "SortOrder");

            migrationBuilder.CreateIndex(
                name: "IX_news_articles_CategoryId",
                table: "news_articles",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_news_articles_FetchedAt",
                table: "news_articles",
                column: "FetchedAt");

            migrationBuilder.CreateIndex(
                name: "IX_news_articles_IsActive",
                table: "news_articles",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_news_articles_IsFeatured",
                table: "news_articles",
                column: "IsFeatured");

            migrationBuilder.CreateIndex(
                name: "IX_news_articles_PublishedAt",
                table: "news_articles",
                column: "PublishedAt");

            migrationBuilder.CreateIndex(
                name: "IX_news_articles_Slug",
                table: "news_articles",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_news_articles_SourceId",
                table: "news_articles",
                column: "SourceId");

            migrationBuilder.CreateIndex(
                name: "IX_news_articles_SourceUrl",
                table: "news_articles",
                column: "SourceUrl",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_news_sources_IsActive",
                table: "news_sources",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_news_sources_Slug",
                table: "news_sources",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_scraping_configs_SourceId",
                table: "scraping_configs",
                column: "SourceId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "news_articles");

            migrationBuilder.DropTable(
                name: "scraping_configs");

            migrationBuilder.DropTable(
                name: "categories");

            migrationBuilder.DropTable(
                name: "news_sources");
        }
    }
}
