namespace NewsPortal.Core.Entities;

public class CommentVote : BaseEntity
{
    public int UserId { get; set; }
    public int CommentId { get; set; }
    public bool IsUpvote { get; set; } = true;

    public virtual User User { get; set; } = default!;
    public virtual Comment Comment { get; set; } = default!;
}
