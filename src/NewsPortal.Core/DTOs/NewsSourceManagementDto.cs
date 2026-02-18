using NewsPortal.Core.Enums;

namespace NewsPortal.Core.DTOs;

public class NewsSourceTestResultDto
{
    public bool IsSuccess { get; set; }
    public string Message { get; set; } = string.Empty;
    public FetchMethod PrimaryMethod { get; set; }
    public FetchMethod? SuccessfulMethod { get; set; }
    public bool UsedFallback { get; set; }
    public int ArticlesFetched { get; set; }
    public int ValidArticles { get; set; }
    public int InvalidArticles { get; set; }
    public List<string> SampleTitles { get; set; } = new();
    public List<NewsSourceTestIssueDto> Issues { get; set; } = new();
    public long DurationMs { get; set; }
}

public class NewsSourceTestIssueDto
{
    public string Code { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? Method { get; set; }
}

public class BulkNewsSourceActionDto
{
    public List<int> SourceIds { get; set; } = new();
    public string Action { get; set; } = string.Empty;
}

public class BulkNewsSourceActionResultDto
{
    public string Action { get; set; } = string.Empty;
    public int TotalRequested { get; set; }
    public int AffectedCount { get; set; }
    public int QueuedJobs { get; set; }
    public List<int> SkippedSourceIds { get; set; } = new();
    public string Message { get; set; } = string.Empty;
}
