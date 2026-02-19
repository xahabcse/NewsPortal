namespace NewsPortal.Core.Entities;

public class NewsArticle : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string CanonicalUrl { get; set; } = string.Empty;
    public string? Summary { get; set; }
    public string? Content { get; set; }
    public string? PlainText { get; set; }
    public string SourceUrl { get; set; } = string.Empty;
    public string? OriginalImageUrl { get; set; }
    public string? MongoImageId { get; set; }
    public string? MongoThumbId { get; set; }
    public string? Author { get; set; }
    public DateTime? PublishedAt { get; set; }
    public DateTime FetchedAt { get; set; } = DateTime.UtcNow;
    public int ViewCount { get; set; }
    public bool IsFeatured { get; set; }

    // Foreign Keys
    public int SourceId { get; set; }
    public int? CategoryId { get; set; }

    // Navigation
    public virtual NewsSource Source { get; set; } = default!;
    public virtual Category? Category { get; set; }
}
