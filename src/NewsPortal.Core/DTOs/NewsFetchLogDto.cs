namespace NewsPortal.Core.DTOs;

public class NewsFetchLogDto
{
    public string Id { get; set; } = string.Empty;
    public string SourceName { get; set; } = string.Empty;
    public int SourceId { get; set; }
    public DateTime FetchedAt { get; set; }
    public int ArticlesFetched { get; set; }
    public int NewArticles { get; set; }
    public int UpdatedArticles { get; set; }
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }
    public string Duration { get; set; } = string.Empty;
    public string? Details { get; set; }
}

public class NewsFetchLogListDto
{
    public List<NewsFetchLogDto> Logs { get; set; } = new();
    public long TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
}
