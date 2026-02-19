namespace NewsPortal.Core.Entities;

public class UserBookmark : BaseEntity
{
    // Foreign Keys
    public int UserId { get; set; }
    public int ArticleId { get; set; }

    // Navigation
    public virtual User User { get; set; } = default!;
    public virtual NewsArticle Article { get; set; } = default!;

    // Timestamp
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
