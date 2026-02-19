namespace NewsPortal.Core.DTOs;

public class NewsImportResultDto
{
    public int TotalReceived { get; set; }
    public int ImportedCount { get; set; }
    public int DuplicateCount { get; set; }
    public int InvalidCount { get; set; }
    public List<NewsImportIssueDto> Issues { get; set; } = new();
}

public class NewsImportIssueDto
{
    public string Code { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? SourceUrl { get; set; }
    public string? Title { get; set; }
}
