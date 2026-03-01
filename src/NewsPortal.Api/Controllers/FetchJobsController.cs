using System.ComponentModel.DataAnnotations;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NewsPortal.Core.Interfaces;

namespace NewsPortal.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/[controller]")]
[Authorize(Roles = "Admin,Editor,SuperAdmin")]
public class FetchJobsController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;

    public FetchJobsController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    [HttpGet("logs")]
    public async Task<IActionResult> GetLogs(
        [FromQuery][Range(1, int.MaxValue)] int page = 1,
        [FromQuery][Range(1, 100)] int pageSize = 20,
        [FromQuery] string status = "all")
    {
        var (items, totalCount) = await _unitOfWork.SourceFetchJobs.GetPagedLogsAsync(page, pageSize, status);
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        return Ok(new
        {
            items = items.Select(job =>
            {
                string duration = "—";
                if (job.StartedAt.HasValue && job.FinishedAt.HasValue)
                {
                    var span = job.FinishedAt.Value - job.StartedAt.Value;
                    duration = span.TotalSeconds < 60
                        ? $"{span.TotalSeconds:F1}s"
                        : $"{span.TotalMinutes:F1}m";
                }

                return new
                {
                    id = job.ExternalId.ToString(),
                    sourceId = job.SourceId,
                    sourceName = job.Source?.Name ?? "Unknown",
                    status = job.Status.ToString(),
                    articlesFetched = job.ArticlesFetched,
                    newArticles = job.NewArticles,
                    updatedArticles = job.UpdatedArticles,
                    duration,
                    errorMessage = job.ErrorSummary,
                    startedAt = job.StartedAt ?? job.CreatedAt
                };
            }),
            totalCount,
            page,
            pageSize,
            totalPages
        });
    }

    [HttpGet("{externalId:guid}")]
    public async Task<IActionResult> GetByExternalId(Guid externalId)
    {
        var job = await _unitOfWork.SourceFetchJobs.GetByExternalIdAsync(externalId);
        if (job == null)
        {
            return NotFound(new { message = "Fetch job not found" });
        }

        return Ok(new
        {
            jobId = job.ExternalId,
            sourceId = job.SourceId,
            sourceName = job.Source.Name,
            status = job.Status.ToString(),
            triggerType = job.TriggerType,
            attempts = job.Attempts,
            startedAt = job.StartedAt,
            finishedAt = job.FinishedAt,
            articlesFetched = job.ArticlesFetched,
            newArticles = job.NewArticles,
            updatedArticles = job.UpdatedArticles,
            errorCode = job.ErrorCode,
            errorSummary = job.ErrorSummary
        });
    }
}

