using Prometheus;

namespace NewsPortal.Core.Monitoring;

/// <summary>
/// Global application metrics for Prometheus scraping.
/// </summary>
public static class AppMetrics
{
    public static readonly Gauge TotalNewsArticles = Metrics.CreateGauge(
        "newsportal_total_news_articles", 
        "Total number of news articles in the system"
    );

    public static readonly Gauge TotalImagesSaved = Metrics.CreateGauge(
        "newsportal_total_images_saved", 
        "Total number of images stored in GridFS"
    );

    public static readonly Counter AppErrorsTotal = Metrics.CreateCounter(
        "newsportal_app_errors_total", 
        "Total number of application errors and exceptions"
    );

    public static readonly Counter McpFetchesTotal = Metrics.CreateCounter(
        "newsportal_mcp_fetches_total", 
        "Total number of background MCP news fetch operations completed"
    );
}
