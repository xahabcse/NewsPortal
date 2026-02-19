namespace NewsPortal.Core.Entities;

public class UserReadHistory : BaseEntity
{
    // Foreign Keys
    public int UserId { get; set; }
    public int ArticleId { get; set; }

    // Navigation
    public virtual User User { get; set; } = default!;
    public virtual NewsArticle Article { get; set; } = default!;

    // Timestamp
    public DateTime ReadAt { get; set; } = DateTime.UtcNow;
}
