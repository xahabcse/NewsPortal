using System.ComponentModel.DataAnnotations;
using NewsPortal.Core.Enums;

namespace NewsPortal.Core.DTOs;

public class NewsSourceDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = string.Empty;
    public string? LogoUrl { get; set; }
    public FetchMethod FetchMethod { get; set; }
    public string? RssFeedUrl { get; set; }
    public string? ApiEndpoint { get; set; }
    public string? ApiKey { get; set; }
    public int FetchIntervalMinutes { get; set; }
    public bool IsActive { get; set; }
    public DateTime? LastFetchedAt { get; set; }
    public SourceHealthStatus HealthStatus { get; set; }
    public int ConsecutiveFailures { get; set; }
    public DateTime? LastSuccessAt { get; set; }
    public DateTime? LastFailureAt { get; set; }
    public string? LastErrorCode { get; set; }
    public DateTime? NextRetryAt { get; set; }
    public int RequestTimeoutSeconds { get; set; }
    public int MaxRetryAttempts { get; set; }
    public int CircuitBreakerThreshold { get; set; }
    public int ArticleCount { get; set; }
}

public class CreateNewsSourceDto
{
    [Required(ErrorMessage = "Name is required")]
    [StringLength(200, MinimumLength = 3, ErrorMessage = "Name must be between 3 and 200 characters")]
    public string Name { get; set; } = string.Empty;

    [Required(ErrorMessage = "Base URL is required")]
    [Url(ErrorMessage = "Must be a valid URL")]
    [StringLength(500, ErrorMessage = "Base URL cannot exceed 500 characters")]
    public string BaseUrl { get; set; } = string.Empty;

    [Url(ErrorMessage = "Must be a valid URL")]
    [StringLength(500, ErrorMessage = "Logo URL cannot exceed 500 characters")]
    public string? LogoUrl { get; set; }

    [Required(ErrorMessage = "Fetch method is required")]
    public FetchMethod FetchMethod { get; set; }

    [Url(ErrorMessage = "Must be a valid URL")]
    [StringLength(500, ErrorMessage = "RSS feed URL cannot exceed 500 characters")]
    public string? RssFeedUrl { get; set; }

    [Url(ErrorMessage = "Must be a valid URL")]
    [StringLength(500, ErrorMessage = "API endpoint cannot exceed 500 characters")]
    public string? ApiEndpoint { get; set; }

    [StringLength(200, ErrorMessage = "API key cannot exceed 200 characters")]
    public string? ApiKey { get; set; }

    [Range(5, 1440, ErrorMessage = "Fetch interval must be between 5 and 1440 minutes")]
    public int FetchIntervalMinutes { get; set; } = 30;
}
