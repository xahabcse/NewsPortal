namespace NewsPortal.Core.Entities;

public class Comment : BaseEntity
{
    public string Content { get; set; } = string.Empty;
    
    // Foreign Keys
    public int UserId { get; set; }
    public int ArticleId { get; set; }
    public int? ParentId { get; set; } // For threaded replies
    
    // Moderation
    public bool IsApproved { get; set; } = true;
    public bool IsDeleted { get; set; } = false;
    
    // Navigation
    public virtual User User { get; set; } = default!;
    public virtual NewsArticle Article { get; set; } = default!;
    public virtual Comment? Parent { get; set; }
    public virtual ICollection<Comment> Replies { get; set; } = new List<Comment>();
}
