using Asp.Versioning;
using Hangfire;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NewsPortal.Service.Services;
using NewsPortal.Service.Helpers;
using NewsPortal.Core.DTOs;
using NewsPortal.Core.Entities;
using NewsPortal.Core.Enums;
using NewsPortal.Core.Interfaces;
using NewsPortal.Scheduler.Jobs;
using System.Security.Claims;
using System.Diagnostics;
using NewsPortal.Core.Constants;

namespace NewsPortal.API.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/[controller]")]
public class NewsSourcesController : ControllerBase
{
    private readonly INewsSourceService _sourceService;
    private readonly INewsFetchJob _fetchJob;
    private readonly INewsFetcherService _newsFetcherService;
    private readonly IBackgroundJobClient _backgroundJobClient;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICacheService _cache;

    public NewsSourcesController(
        INewsSourceService sourceService,
        INewsFetchJob fetchJob,
        INewsFetcherService newsFetcherService,
        IBackgroundJobClient backgroundJobClient,
        IUnitOfWork unitOfWork,
        ICacheService cache)
    {
        _sourceService = sourceService;
        _fetchJob = fetchJob;
        _newsFetcherService = newsFetcherService;
        _backgroundJobClient = backgroundJobClient;
        _unitOfWork = unitOfWork;
        _cache = cache;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var sources = await _sourceService.GetAllSourcesAsync();
        return Ok(sources);
    }

    [Authorize(Roles = "Admin,Editor,SuperAdmin")]
    [HttpGet("all")]
    public async Task<IActionResult> GetAllIncludingDisabled()
    {
        var sources = await _sourceService.GetAllSourcesIncludingDisabledAsync();
        return Ok(sources);
    }

    [HttpGet("{slug}")]
    public async Task<IActionResult> GetBySlug(string slug)
    {
        var source = await _sourceService.GetSourceBySlugAsync(slug);
        if (source == null) return NotFound();
        return Ok(source);
    }

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateNewsSourceDto dto)
    {
        try
        {
            var source = await _sourceService.CreateSourceAsync(dto);
            return CreatedAtAction(nameof(GetBySlug), new { slug = source.Slug }, source);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize(Roles = "Admin,Editor,SuperAdmin")]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] CreateNewsSourceDto dto)
    {
        try
        {
            await _sourceService.UpdateSourceAsync(id, dto);
            return NoContent();
        }
        catch (InvalidOperationException)
        {
            return NotFound();
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            await _sourceService.DeleteSourceAsync(id);
            return NoContent();
        }
        catch (InvalidOperationException)
        {
            return NotFound();
        }
    }

    [Authorize(Roles = "Admin,Editor,SuperAdmin")]
    [HttpPost("test")]
    public async Task<IActionResult> TestSource([FromBody] CreateNewsSourceDto dto)
    {
        var issues = ValidateSourceConfig(dto);
        if (issues.Any())
        {
            return Ok(new NewsSourceTestResultDto
            {
                IsSuccess = false,
                Message = "Source configuration has validation issues.",
                PrimaryMethod = NormalizeFetchMethod(dto.FetchMethod),
                Issues = issues
            });
        }

        var tempSource = new NewsSource
        {
            Id = 0,
            Name = dto.Name,
            Slug = dto.Name.ToLowerInvariant().Replace(" ", "-"),
            BaseUrl = dto.BaseUrl,
            FetchMethod = NormalizeFetchMethod(dto.FetchMethod),
            RssFeedUrl = dto.RssFeedUrl,
            ApiEndpoint = dto.ApiEndpoint,
            ApiKey = dto.ApiKey,
            FetchIntervalMinutes = Math.Clamp(dto.FetchIntervalMinutes, 5, 1440),
            RequestTimeoutSeconds = 30,
            MaxRetryAttempts = 1,
            CircuitBreakerThreshold = 5
        };

        var stopwatch = Stopwatch.StartNew();

        try
        {
            var fetchResult = await _newsFetcherService.FetchWithFallbackAsync(tempSource).WaitAsync(TimeSpan.FromSeconds(30));
            var articles = fetchResult.Articles.ToList();
            var sampleTitles = articles
                .Where(x => !string.IsNullOrWhiteSpace(x.Title))
                .Select(x => x.Title)
                .Take(5)
                .ToList();

            var invalidArticleCount = 0;
            foreach (var article in articles)
            {
                var normalized = NewsArticleIngestionHelper.Normalize(article);
                var canonicalUrl = CanonicalUrlHelper.Normalize(normalized.SourceUrl);
                var articleIssues = NewsArticleIngestionHelper.Validate(normalized, canonicalUrl);
                if (articleIssues.Any())
                {
                    invalidArticleCount += 1;
                }
            }

            stopwatch.Stop();

            return Ok(new NewsSourceTestResultDto
            {
                IsSuccess = articles.Count > 0,
                Message = articles.Count > 0
                    ? $"Dry-run succeeded. {articles.Count} articles fetched."
                    : "Dry-run completed with no articles fetched.",
                PrimaryMethod = fetchResult.PrimaryMethod,
                SuccessfulMethod = fetchResult.SuccessfulMethod,
                UsedFallback = fetchResult.UsedFallback,
                ArticlesFetched = articles.Count,
                ValidArticles = Math.Max(0, articles.Count - invalidArticleCount),
                InvalidArticles = invalidArticleCount,
                SampleTitles = sampleTitles,
                Issues = fetchResult.Issues.Select(x => new NewsSourceTestIssueDto
                {
                    Code = x.Code,
                    Message = x.Message,
                    Method = x.Method.ToString()
                }).ToList(),
                DurationMs = stopwatch.ElapsedMilliseconds
            });
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            return Ok(new NewsSourceTestResultDto
            {
                IsSuccess = false,
                Message = $"Dry-run failed: {ex.Message}",
                PrimaryMethod = tempSource.FetchMethod,
                Issues = new List<NewsSourceTestIssueDto>
                {
                    new()
                    {
                        Code = "TEST_FAILED",
                        Message = ex.Message
                    }
                },
                DurationMs = stopwatch.ElapsedMilliseconds
            });
        }
    }

    [Authorize(Roles = "Admin,Editor,SuperAdmin")]
    [HttpPost("bulk-action")]
    public async Task<IActionResult> BulkAction([FromBody] BulkNewsSourceActionDto dto)
    {
        var sourceIds = dto.SourceIds.Distinct().ToList();
        if (!sourceIds.Any())
        {
            return BadRequest(new { message = "At least one sourceId is required." });
        }

        var action = dto.Action.Trim().ToLowerInvariant();
        if (action != "pause" && action != "resume" && action != "fetch")
        {
            return BadRequest(new { message = "Action must be one of: pause, resume, fetch." });
        }

        var sources = (await _unitOfWork.NewsSources.FindAsync(x => sourceIds.Contains(x.Id))).ToList();
        var availableIds = sources.Select(x => x.Id).ToHashSet();
        var skipped = sourceIds.Where(id => !availableIds.Contains(id)).ToList();

        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var requestedByUserId = int.TryParse(userIdClaim, out var userId) ? userId : (int?)null;

        var queuedJobs = 0;
        if (action == "fetch")
        {
            var jobs = new List<SourceFetchJob>();
            foreach (var source in sources.Where(x => x.IsActive))
            {
                var job = new SourceFetchJob
                {
                    SourceId = source.Id,
                    TriggerType = "Manual-Bulk",
                    Status = FetchJobStatus.Queued,
                    RequestedByUserId = requestedByUserId
                };
                jobs.Add(job);
                await _unitOfWork.SourceFetchJobs.AddAsync(job);
            }

            if (jobs.Any())
            {
                await _unitOfWork.SaveChangesAsync();

                foreach (var job in jobs)
                {
                    var hangfireJobId = _backgroundJobClient.Enqueue<INewsFetchJob>(
                        x => x.FetchSourceWithTrackingAsync(job.SourceId, job.Id));
                    job.HangfireJobId = hangfireJobId;
                    await _unitOfWork.SourceFetchJobs.UpdateAsync(job);
                }

                await _unitOfWork.SaveChangesAsync();
                queuedJobs = jobs.Count;
            }
        }
        else
        {
            foreach (var source in sources)
            {
                if (action == "pause")
                {
                    source.HealthStatus = SourceHealthStatus.Paused;
                    source.NextRetryAt = null;
                    source.LastErrorCode = "MANUAL_PAUSE";
                    source.LastErrorMessage = "Paused manually by operator.";
                }
                else
                {
                    source.HealthStatus = SourceHealthStatus.Active;
                    source.ConsecutiveFailures = 0;
                    source.NextRetryAt = null;
                    source.LastErrorCode = null;
                    source.LastErrorMessage = null;
                }

                await _unitOfWork.NewsSources.UpdateAsync(source);
            }

            await _unitOfWork.SaveChangesAsync();
            await _cache.RemoveAsync(CacheKeys.ActiveSources);
        }

        var result = new BulkNewsSourceActionResultDto
        {
            Action = action,
            TotalRequested = sourceIds.Count,
            AffectedCount = sources.Count,
            QueuedJobs = queuedJobs,
            SkippedSourceIds = skipped,
            Message = action == "fetch"
                ? $"{queuedJobs} fetch jobs queued."
                : $"{sources.Count} sources {action}d successfully."
        };

        return Ok(result);
    }

    [Authorize(Roles = "Admin,Editor,SuperAdmin")]
    [HttpPost("{id}/resume")]
    public async Task<IActionResult> Resume(int id)
    {
        var source = await _unitOfWork.NewsSources.GetByIdAsync(id);
        if (source == null)
            return NotFound(new { message = "Source not found" });

        source.HealthStatus = SourceHealthStatus.Active;
        source.ConsecutiveFailures = 0;
        source.NextRetryAt = null;
        source.LastErrorCode = null;
        source.LastErrorMessage = null;

        await _unitOfWork.NewsSources.UpdateAsync(source);
        await _unitOfWork.SaveChangesAsync();
        await _cache.RemoveAsync(CacheKeys.ActiveSources);

        return Ok(new { message = "Source resumed successfully", sourceId = id });
    }

    [Authorize(Roles = "Admin,Editor,SuperAdmin")]
    [HttpPost("{id}/pause")]
    public async Task<IActionResult> Pause(int id)
    {
        var source = await _unitOfWork.NewsSources.GetByIdAsync(id);
        if (source == null)
            return NotFound(new { message = "Source not found" });

        source.HealthStatus = SourceHealthStatus.Paused;
        source.NextRetryAt = null;
        source.LastErrorCode = "MANUAL_PAUSE";
        source.LastErrorMessage = "Paused manually by operator.";

        await _unitOfWork.NewsSources.UpdateAsync(source);
        await _unitOfWork.SaveChangesAsync();
        await _cache.RemoveAsync(CacheKeys.ActiveSources);

        return Ok(new { message = "Source paused successfully", sourceId = id });
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("{id}/disable")]
    public async Task<IActionResult> Disable(int id)
    {
        var source = await _unitOfWork.NewsSources.GetByIdAsync(id);
        if (source == null)
            return NotFound(new { message = "Source not found" });

        source.HealthStatus = SourceHealthStatus.Disabled;
        source.LastErrorCode = "MANUAL_DISABLE";
        source.LastErrorMessage = "Disabled manually by admin.";

        await _unitOfWork.NewsSources.UpdateAsync(source);
        await _unitOfWork.SaveChangesAsync();
        await _cache.RemoveAsync(CacheKeys.ActiveSources);

        return Ok(new { message = "Source disabled successfully", sourceId = id });
    }

    [Authorize(Roles = "Admin,Editor,SuperAdmin")]
    [HttpPost("{id}/fetch")]
    public async Task<IActionResult> FetchNews(int id)
    {
        try
        {
            var source = await _unitOfWork.NewsSources.GetByIdAsync(id);
            if (source == null || !source.IsActive)
            {
                return NotFound(new { message = "Source not found" });
            }

            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var requestedByUserId = int.TryParse(userIdClaim, out var userId) ? userId : (int?)null;

            var fetchJob = new SourceFetchJob
            {
                SourceId = id,
                TriggerType = "Manual",
                Status = FetchJobStatus.Queued,
                RequestedByUserId = requestedByUserId
            };

            await _unitOfWork.SourceFetchJobs.AddAsync(fetchJob);
            await _unitOfWork.SaveChangesAsync();

            var hangfireJobId = _backgroundJobClient.Enqueue<INewsFetchJob>(
                job => job.FetchSourceWithTrackingAsync(id, fetchJob.Id));

            fetchJob.HangfireJobId = hangfireJobId;
            await _unitOfWork.SourceFetchJobs.UpdateAsync(fetchJob);
            await _unitOfWork.SaveChangesAsync();

            return Accepted(new
            {
                message = "News fetch queued successfully",
                sourceId = id,
                jobId = fetchJob.ExternalId,
                status = fetchJob.Status.ToString(),
                hangfireJobId
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    private static List<NewsSourceTestIssueDto> ValidateSourceConfig(CreateNewsSourceDto dto)
    {
        var issues = new List<NewsSourceTestIssueDto>();
        var method = NormalizeFetchMethod(dto.FetchMethod);

        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            issues.Add(new NewsSourceTestIssueDto
            {
                Code = "NAME_REQUIRED",
                Message = "Source name is required."
            });
        }

        if (!Uri.TryCreate(dto.BaseUrl, UriKind.Absolute, out _))
        {
            issues.Add(new NewsSourceTestIssueDto
            {
                Code = "INVALID_BASE_URL",
                Message = "Base URL must be a valid absolute URL."
            });
        }

        if (method == FetchMethod.Rss && !Uri.TryCreate(dto.RssFeedUrl, UriKind.Absolute, out _))
        {
            issues.Add(new NewsSourceTestIssueDto
            {
                Code = "RSS_URL_REQUIRED",
                Message = "RSS Feed URL is required for RSS method.",
                Method = "Rss"
            });
        }

        if (method == FetchMethod.Api && !Uri.TryCreate(dto.ApiEndpoint, UriKind.Absolute, out _))
        {
            issues.Add(new NewsSourceTestIssueDto
            {
                Code = "API_ENDPOINT_REQUIRED",
                Message = "API Endpoint is required for API method.",
                Method = "Api"
            });
        }

        if (dto.FetchIntervalMinutes is < 5 or > 1440)
        {
            issues.Add(new NewsSourceTestIssueDto
            {
                Code = "INVALID_INTERVAL",
                Message = "Fetch interval must be between 5 and 1440 minutes."
            });
        }

        return issues;
    }

    private static FetchMethod NormalizeFetchMethod(FetchMethod method)
    {
        if ((int)method == 0)
        {
            return FetchMethod.Rss;
        }

        return Enum.IsDefined(typeof(FetchMethod), method) ? method : FetchMethod.Rss;
    }
}
