namespace NewsPortal.Core.DTOs;

public class CommentDto
{
    public int Id { get; set; }
    public int ArticleId { get; set; }
    public int UserId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public int? ParentId { get; set; }
    public List<CommentDto> Replies { get; set; } = new();
}

public class CreateCommentDto
{
    public int ArticleId { get; set; }
    public string Content { get; set; } = string.Empty;
    public int? ParentId { get; set; }
}
