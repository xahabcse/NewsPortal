namespace NewsPortal.Core.DTOs;

public class NewsArticleDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Summary { get; set; }
    public string? Content { get; set; }
    public string SourceUrl { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public string? ThumbnailUrl { get; set; }
    public string? Author { get; set; }
    public DateTime? PublishedAt { get; set; }
    public int ViewCount { get; set; }
    public bool IsFeatured { get; set; }
    public string SourceName { get; set; } = string.Empty;
    public string? CategoryName { get; set; }
    public string? CategorySlug { get; set; }
}

public class NewsArticleListDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Summary { get; set; }
    public string? ThumbnailUrl { get; set; }
    public string? SourceUrl { get; set; }
    public DateTime? PublishedAt { get; set; }
    public string SourceName { get; set; } = string.Empty;
    public string? CategoryName { get; set; }
}

public class CreateNewsArticleDto
{
    public string Title { get; set; } = string.Empty;
    public string? Summary { get; set; }
    public string? Content { get; set; }
    public string SourceUrl { get; set; } = string.Empty;
    public string? OriginalImageUrl { get; set; }
    public string? Author { get; set; }
    public DateTime? PublishedAt { get; set; }
    public int SourceId { get; set; }
    public int? CategoryId { get; set; }
}

public class DailyHighlightDto
{
    public DateTime Date { get; set; }
    public List<CategoryHighlightDto> Highlights { get; set; } = new();
}

public class CategoryHighlightDto
{
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public string CategoryNameBn { get; set; } = string.Empty;
    public string CategorySlug { get; set; } = string.Empty;
    public string? CategoryIcon { get; set; }
    public string? CategoryColor { get; set; }
    public int ArticleId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Summary { get; set; }
    public int SourceId { get; set; }
    public string SourceName { get; set; } = string.Empty;
    public DateTime? PublishedAt { get; set; }
    public int ViewCount { get; set; }
}
