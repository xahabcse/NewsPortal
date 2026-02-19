using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NewsPortal.Core.Interfaces;

namespace NewsPortal.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/[controller]")]
[Authorize(Roles = "Admin,Editor")]
public class FetchJobsController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;

    public FetchJobsController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
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

