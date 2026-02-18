using NewsPortal.Core.Enums;

namespace NewsPortal.Core.Entities;

public class SourceFetchJob : BaseEntity
{
    public Guid ExternalId { get; set; } = Guid.NewGuid();
    public int SourceId { get; set; }
    public string TriggerType { get; set; } = "Manual";
    public FetchJobStatus Status { get; set; } = FetchJobStatus.Queued;
    public int Attempts { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? FinishedAt { get; set; }
    public int ArticlesFetched { get; set; }
    public int NewArticles { get; set; }
    public int UpdatedArticles { get; set; }
    public string? ErrorCode { get; set; }
    public string? ErrorSummary { get; set; }
    public string? HangfireJobId { get; set; }
    public int? RequestedByUserId { get; set; }

    // Navigation
    public virtual NewsSource Source { get; set; } = null!;
}

