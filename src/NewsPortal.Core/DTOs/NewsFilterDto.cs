namespace NewsPortal.Core.DTOs;

public class NewsFilterQuery
{
    public int[] SourceIds { get; set; } = [];
    public int[] CategoryIds { get; set; } = [];
    /// <summary>YYYY-MM-DD</summary>
    public string? DateFrom { get; set; }

    /// <summary>YYYY-MM-DD</summary>
    public string? DateTo { get; set; }

    /// <summary>newest | oldest | mostviewed</summary>
    public string SortBy { get; set; } = "newest";

    public bool HasThumbnail { get; set; } = false;

    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 9;
}
