using NewsPortal.Core.Enums;

namespace NewsPortal.Core.DTOs;

public class FetchExecutionResultDto
{
    public List<CreateNewsArticleDto> Articles { get; set; } = new();
    public FetchMethod PrimaryMethod { get; set; }
    public FetchMethod SuccessfulMethod { get; set; }
    public bool UsedFallback { get; set; }
    public List<FetchAttemptIssueDto> Issues { get; set; } = new();
}

public class FetchAttemptIssueDto
{
    public FetchMethod Method { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}
