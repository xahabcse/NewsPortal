using NewsPortal.Core.Enums;

namespace NewsPortal.Core.Entities;

public class NewsSource : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = string.Empty;
    public string? LogoUrl { get; set; }
    public FetchMethod FetchMethod { get; set; } = FetchMethod.Rss;
    public string? RssFeedUrl { get; set; }
    public string? ApiEndpoint { get; set; }
    public string? ApiKey { get; set; }
    public int FetchIntervalMinutes { get; set; } = 30;
    public DateTime? LastFetchedAt { get; set; }
    public SourceHealthStatus HealthStatus { get; set; } = SourceHealthStatus.Active;
    public int ConsecutiveFailures { get; set; }
    public DateTime? LastSuccessAt { get; set; }
    public DateTime? LastFailureAt { get; set; }
    public string? LastErrorCode { get; set; }
    public string? LastErrorMessage { get; set; }
    public DateTime? NextRetryAt { get; set; }
    public int RequestTimeoutSeconds { get; set; } = 90;
    public int MaxRetryAttempts { get; set; } = 3;
    public int CircuitBreakerThreshold { get; set; } = 5;

    // Navigation
    public virtual ScrapingConfig? ScrapingConfig { get; set; }
    public virtual ICollection<NewsArticle> Articles { get; set; } = new List<NewsArticle>();
    public virtual ICollection<SourceFetchJob> FetchJobs { get; set; } = new List<SourceFetchJob>();
}
