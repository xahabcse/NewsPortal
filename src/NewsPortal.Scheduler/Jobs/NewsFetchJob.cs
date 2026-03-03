using Microsoft.Extensions.Logging;
using NewsPortal.Service.Services;
using NewsPortal.Core.Constants;
using NewsPortal.Core.Entities;
using NewsPortal.Core.Enums;
using NewsPortal.Core.Interfaces;
using System.Diagnostics;
using System.Text.Json;
using NewsPortal.Core.Monitoring;

namespace NewsPortal.Scheduler.Jobs;

public interface INewsFetchJob
{
    Task FetchAllSourcesAsync();
    Task FetchSourceAsync(int sourceId);
    Task FetchSourceWithTrackingAsync(int sourceId, int fetchJobId);
}

public class NewsFetchJob : INewsFetchJob
{
    private readonly INewsSourceService _sourceService;
    private readonly INewsFetcherService _fetcherService;
    private readonly INewsService _newsService;
    private readonly IUnitOfWork _unitOfWork;
    private readonly INewsFetchLogRepository _fetchLogRepository;
    private readonly ICacheService _cache;
    private readonly ILogger<NewsFetchJob> _logger;

    public NewsFetchJob(
        INewsSourceService sourceService,
        INewsFetcherService fetcherService,
        INewsService newsService,
        IUnitOfWork unitOfWork,
        INewsFetchLogRepository fetchLogRepository,
        ICacheService cache,
        ILogger<NewsFetchJob> logger)
    {
        _sourceService = sourceService;
        _fetcherService = fetcherService;
        _newsService = newsService;
        _unitOfWork = unitOfWork;
        _fetchLogRepository = fetchLogRepository;
        _cache = cache;
        _logger = logger;
    }

    public async Task FetchAllSourcesAsync()
    {
        _logger.LogInformation("Starting to fetch news from all sources");

        var sources = await _sourceService.GetActiveSourcesForFetchingAsync();

        foreach (var source in sources)
        {
            try
            {
                if (source.HealthStatus == SourceHealthStatus.Disabled)
                {
                    _logger.LogDebug("Skipping source {SourceName} - source is disabled", source.Name);
                    continue;
                }

                if (source.HealthStatus == SourceHealthStatus.Paused &&
                    (!source.NextRetryAt.HasValue || source.NextRetryAt.Value > DateTime.UtcNow))
                {
                    _logger.LogDebug("Skipping source {SourceName} - paused until {RetryAt}", source.Name, source.NextRetryAt);
                    continue;
                }

                // Check if it's time to fetch
                if (source.LastFetchedAt.HasValue)
                {
                    var effectiveFetchInterval = source.FetchIntervalMinutes > 0 ? source.FetchIntervalMinutes : 30;
                    var timeSinceLastFetch = DateTime.UtcNow - source.LastFetchedAt.Value;
                    if (timeSinceLastFetch.TotalMinutes < effectiveFetchInterval)
                    {
                        _logger.LogDebug("Skipping source {SourceName} - not yet time to fetch", source.Name);
                        continue;
                    }
                }

                await FetchSourceAsync(source.Id);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching news from source: {SourceName}", source.Name);
            }
        }

        _logger.LogInformation("Completed fetching news from all sources");
    }

    public async Task FetchSourceAsync(int sourceId)
    {
        await ExecuteSourceFetchAsync(sourceId, fetchJobId: null);
    }

    public async Task FetchSourceWithTrackingAsync(int sourceId, int fetchJobId)
    {
        await ExecuteSourceFetchAsync(sourceId, fetchJobId);
    }

    private async Task ExecuteSourceFetchAsync(int sourceId, int? fetchJobId)
    {
        var source = await _unitOfWork.NewsSources.GetWithScrapingConfigAsync(sourceId);
        if (source == null || !source.IsActive)
        {
            _logger.LogWarning("Source not found or inactive: {SourceId}", sourceId);
            return;
        }

        if (source.HealthStatus == SourceHealthStatus.Disabled)
        {
            _logger.LogWarning("Source is disabled and cannot be fetched: {SourceName}", source.Name);
            return;
        }

        if (source.HealthStatus == SourceHealthStatus.Paused &&
            (!source.NextRetryAt.HasValue || source.NextRetryAt.Value > DateTime.UtcNow))
        {
            _logger.LogInformation("Source {SourceName} is paused until {RetryAt}", source.Name, source.NextRetryAt);
            return;
        }

        SourceFetchJob? trackedJob = null;
        if (fetchJobId.HasValue)
        {
            trackedJob = await _unitOfWork.SourceFetchJobs.GetByIdAsync(fetchJobId.Value);
            if (trackedJob != null)
            {
                trackedJob.Status = FetchJobStatus.Running;
                trackedJob.StartedAt = DateTime.UtcNow;
                await _unitOfWork.SourceFetchJobs.UpdateAsync(trackedJob);
                await _unitOfWork.SaveChangesAsync();
            }
        }

        _logger.LogInformation("Fetching news from source: {SourceName}", source.Name);

        var fetchLog = new NewsFetchLog
        {
            SourceId = source.Id,
            SourceName = source.Name,
            FetchedAt = DateTime.UtcNow
        };

        var stopwatch = Stopwatch.StartNew();
        var maxAttempts = source.MaxRetryAttempts < 1 ? 1 : source.MaxRetryAttempts;
        Exception? lastException = null;

        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            try
            {
                var timeoutSeconds = source.RequestTimeoutSeconds < 5 ? 5 : source.RequestTimeoutSeconds;
                var fetchResult = await _fetcherService.FetchWithFallbackAsync(source).WaitAsync(TimeSpan.FromSeconds(timeoutSeconds));
                var articleList = fetchResult.Articles.ToList();

                fetchLog.ArticlesFetched = articleList.Count;
                var importResult = await _newsService.ImportNewsArticlesWithReportAsync(articleList);
                fetchLog.NewArticles = importResult.ImportedCount;
                fetchLog.UpdatedArticles = Math.Max(0, fetchLog.ArticlesFetched - fetchLog.NewArticles);

                source.LastFetchedAt = DateTime.UtcNow;
                source.LastSuccessAt = DateTime.UtcNow;
                source.ConsecutiveFailures = 0;
                source.HealthStatus = SourceHealthStatus.Active;
                source.LastErrorCode = null;
                source.LastErrorMessage = null;
                source.NextRetryAt = null;

                stopwatch.Stop();
                fetchLog.Duration = stopwatch.Elapsed;
                fetchLog.Success = true;
                fetchLog.Details = BuildFetchDetails(fetchResult, importResult);
                await _fetchLogRepository.AddAsync(fetchLog);

                if (trackedJob != null)
                {
                    trackedJob.Status = FetchJobStatus.Succeeded;
                    trackedJob.Attempts = attempt;
                    trackedJob.ArticlesFetched = fetchLog.ArticlesFetched;
                    trackedJob.NewArticles = fetchLog.NewArticles;
                    trackedJob.UpdatedArticles = fetchLog.UpdatedArticles;
                    trackedJob.FinishedAt = DateTime.UtcNow;
                    trackedJob.ErrorCode = null;
                    trackedJob.ErrorSummary = null;
                    await _unitOfWork.SourceFetchJobs.UpdateAsync(trackedJob);
                }

                await _unitOfWork.NewsSources.UpdateAsync(source);
                await _unitOfWork.SaveChangesAsync();
                await _cache.RemoveAsync(CacheKeys.ActiveSources);

                AppMetrics.McpFetchesTotal.Inc();

                _logger.LogInformation(
                    "Imported {Count} articles from {SourceName}. Duplicate={Duplicate}, Invalid={Invalid}, FallbackUsed={FallbackUsed}",
                    importResult.ImportedCount,
                    source.Name,
                    importResult.DuplicateCount,
                    importResult.InvalidCount,
                    fetchResult.UsedFallback);
                return;
            }
            catch (Exception ex)
            {
                lastException = ex;
                _logger.LogWarning(ex, "Attempt {Attempt}/{MaxAttempts} failed for source {SourceName}", attempt, maxAttempts, source.Name);

                if (attempt < maxAttempts)
                {
                    var delaySeconds = (int)Math.Min(60, Math.Pow(2, attempt) * 5);
                    await Task.Delay(TimeSpan.FromSeconds(delaySeconds));
                }
            }
        }

        stopwatch.Stop();
        var finalError = lastException ?? new Exception("Unknown fetch failure");
        var errorCode = MapErrorCode(finalError);

        source.ConsecutiveFailures += 1;
        source.LastFailureAt = DateTime.UtcNow;
        source.LastErrorCode = errorCode;
        source.LastErrorMessage = finalError.Message;
        source.NextRetryAt = DateTime.UtcNow.AddMinutes(CalculateBackoffMinutes(source.ConsecutiveFailures));

        if (source.ConsecutiveFailures >= source.CircuitBreakerThreshold)
        {
            source.HealthStatus = SourceHealthStatus.Paused;
        }
        else
        {
            source.HealthStatus = SourceHealthStatus.Degraded;
        }

        fetchLog.Duration = stopwatch.Elapsed;
        fetchLog.Success = false;
        fetchLog.ErrorMessage = finalError.Message;
        fetchLog.Details = BuildFailureDetails(errorCode, finalError, maxAttempts);
        await _fetchLogRepository.AddAsync(fetchLog);

        if (trackedJob != null)
        {
            trackedJob.Status = FetchJobStatus.Failed;
            trackedJob.Attempts = maxAttempts;
            trackedJob.FinishedAt = DateTime.UtcNow;
            trackedJob.ErrorCode = errorCode;
            trackedJob.ErrorSummary = finalError.Message;
            await _unitOfWork.SourceFetchJobs.UpdateAsync(trackedJob);
        }

        await _unitOfWork.NewsSources.UpdateAsync(source);
        await _unitOfWork.SaveChangesAsync();
        await _cache.RemoveAsync(CacheKeys.ActiveSources);

        _logger.LogError(finalError, "Failed to fetch news from source: {SourceName}", source.Name);
    }

    private static int CalculateBackoffMinutes(int consecutiveFailures)
    {
        var exponent = Math.Min(6, Math.Max(1, consecutiveFailures));
        return (int)Math.Min(360, Math.Pow(2, exponent) * 5);
    }

    private static string MapErrorCode(Exception exception)
    {
        return NewsPortal.Service.Helpers.FetchErrorClassifier.Classify(exception);
    }

    private static string BuildFetchDetails(NewsPortal.Core.DTOs.FetchExecutionResultDto fetchResult, NewsPortal.Core.DTOs.NewsImportResultDto importResult)
    {
        var details = new
        {
            primaryMethod = fetchResult.PrimaryMethod.ToString(),
            successfulMethod = fetchResult.SuccessfulMethod.ToString(),
            usedFallback = fetchResult.UsedFallback,
            fetchIssues = fetchResult.Issues.Take(10).Select(x => new { method = x.Method.ToString(), x.Code, x.Message }),
            importSummary = new
            {
                importResult.TotalReceived,
                importResult.ImportedCount,
                importResult.DuplicateCount,
                importResult.InvalidCount,
                importResult.NearDuplicateCount
            },
            validationIssues = importResult.Issues.Take(20).Select(x => new { x.Code, x.Message, x.SourceUrl, x.Title })
        };

        return JsonSerializer.Serialize(details);
    }

    private static string BuildFailureDetails(string errorCode, Exception exception, int attempts)
    {
        var details = new
        {
            errorCode,
            attempts,
            exceptionType = exception.GetType().Name,
            message = exception.Message,
            innerMessage = exception.InnerException?.Message,
            stackTrace = exception.StackTrace?.Length > 500
                ? exception.StackTrace[..500]
                : exception.StackTrace
        };

        return JsonSerializer.Serialize(details);
    }
}
