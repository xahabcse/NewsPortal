namespace NewsPortal.Core.DTOs;

public class BookmarkResponseDto
{
    public int Id { get; set; }
    public int ArticleId { get; set; }
    public int UserId { get; set; }
    public DateTime CreatedAt { get; set; }
    public BookmarkArticleDto Article { get; set; } = default!;
}

public class BookmarkArticleDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Summary { get; set; }
    public string? ThumbnailUrl { get; set; }
    public DateTime? PublishedAt { get; set; }
    public string SourceName { get; set; } = string.Empty;
    public string? CategoryName { get; set; }
}

public class PagedBookmarkResultDto
{
    public List<BookmarkResponseDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
    public bool HasNextPage => Page < TotalPages;
    public bool HasPreviousPage => Page > 1;
}
