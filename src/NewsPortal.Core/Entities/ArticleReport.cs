namespace NewsPortal.Core.Entities;

public class ArticleReport : BaseEntity
{
    public int UserId { get; set; }
    public int ArticleId { get; set; }
    public string Reason { get; set; } = "incorrect"; // incorrect, misleading, duplicate, inappropriate
    public string? Details { get; set; }
    public string Status { get; set; } = "pending"; // pending, reviewed, dismissed

    public virtual User User { get; set; } = default!;
    public virtual NewsArticle Article { get; set; } = default!;
}

public static class ReportReasons
{
    public const string Incorrect = "incorrect";
    public const string Misleading = "misleading";
    public const string Duplicate = "duplicate";
    public const string Inappropriate = "inappropriate";

    public static readonly string[] All = { Incorrect, Misleading, Duplicate, Inappropriate };
}

public static class ReportStatus
{
    public const string Pending = "pending";
    public const string Reviewed = "reviewed";
    public const string Dismissed = "dismissed";
}
