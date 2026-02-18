using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace NewsPortal.Repository.Migrations
{
    /// <inheritdoc />
    public partial class PhaseAHealthAndFetchJobs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CircuitBreakerThreshold",
                table: "news_sources",
                type: "integer",
                nullable: false,
                defaultValue: 5);

            migrationBuilder.AddColumn<int>(
                name: "ConsecutiveFailures",
                table: "news_sources",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "HealthStatus",
                table: "news_sources",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "LastErrorCode",
                table: "news_sources",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LastErrorMessage",
                table: "news_sources",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastFailureAt",
                table: "news_sources",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastSuccessAt",
                table: "news_sources",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MaxRetryAttempts",
                table: "news_sources",
                type: "integer",
                nullable: false,
                defaultValue: 3);

            migrationBuilder.AddColumn<DateTime>(
                name: "NextRetryAt",
                table: "news_sources",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RequestTimeoutSeconds",
                table: "news_sources",
                type: "integer",
                nullable: false,
                defaultValue: 90);

            migrationBuilder.CreateTable(
                name: "source_fetch_jobs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ExternalId = table.Column<Guid>(type: "uuid", nullable: false),
                    SourceId = table.Column<int>(type: "integer", nullable: false),
                    TriggerType = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    Attempts = table.Column<int>(type: "integer", nullable: false),
                    StartedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    FinishedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ArticlesFetched = table.Column<int>(type: "integer", nullable: false),
                    NewArticles = table.Column<int>(type: "integer", nullable: false),
                    UpdatedArticles = table.Column<int>(type: "integer", nullable: false),
                    ErrorCode = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    ErrorSummary = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    HangfireJobId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    RequestedByUserId = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_source_fetch_jobs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_source_fetch_jobs_news_sources_SourceId",
                        column: x => x.SourceId,
                        principalTable: "news_sources",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_news_sources_HealthStatus",
                table: "news_sources",
                column: "HealthStatus");

            migrationBuilder.CreateIndex(
                name: "IX_news_sources_NextRetryAt",
                table: "news_sources",
                column: "NextRetryAt");

            migrationBuilder.CreateIndex(
                name: "IX_source_fetch_jobs_CreatedAt",
                table: "source_fetch_jobs",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_source_fetch_jobs_ExternalId",
                table: "source_fetch_jobs",
                column: "ExternalId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_source_fetch_jobs_SourceId",
                table: "source_fetch_jobs",
                column: "SourceId");

            migrationBuilder.CreateIndex(
                name: "IX_source_fetch_jobs_Status",
                table: "source_fetch_jobs",
                column: "Status");

            migrationBuilder.Sql(@"
                UPDATE news_sources
                SET ""FetchIntervalMinutes"" = 30
                WHERE ""FetchIntervalMinutes"" <= 0;

                UPDATE news_sources
                SET ""RequestTimeoutSeconds"" = 90
                WHERE ""RequestTimeoutSeconds"" <= 0;

                UPDATE news_sources
                SET ""MaxRetryAttempts"" = 3
                WHERE ""MaxRetryAttempts"" <= 0;

                UPDATE news_sources
                SET ""CircuitBreakerThreshold"" = 5
                WHERE ""CircuitBreakerThreshold"" <= 0;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "source_fetch_jobs");

            migrationBuilder.DropIndex(
                name: "IX_news_sources_HealthStatus",
                table: "news_sources");

            migrationBuilder.DropIndex(
                name: "IX_news_sources_NextRetryAt",
                table: "news_sources");

            migrationBuilder.DropColumn(
                name: "CircuitBreakerThreshold",
                table: "news_sources");

            migrationBuilder.DropColumn(
                name: "ConsecutiveFailures",
                table: "news_sources");

            migrationBuilder.DropColumn(
                name: "HealthStatus",
                table: "news_sources");

            migrationBuilder.DropColumn(
                name: "LastErrorCode",
                table: "news_sources");

            migrationBuilder.DropColumn(
                name: "LastErrorMessage",
                table: "news_sources");

            migrationBuilder.DropColumn(
                name: "LastFailureAt",
                table: "news_sources");

            migrationBuilder.DropColumn(
                name: "LastSuccessAt",
                table: "news_sources");

            migrationBuilder.DropColumn(
                name: "MaxRetryAttempts",
                table: "news_sources");

            migrationBuilder.DropColumn(
                name: "NextRetryAt",
                table: "news_sources");

            migrationBuilder.DropColumn(
                name: "RequestTimeoutSeconds",
                table: "news_sources");
        }
    }
}
