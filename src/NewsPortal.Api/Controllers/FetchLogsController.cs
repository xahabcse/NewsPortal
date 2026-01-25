using Microsoft.AspNetCore.Mvc;
using NewsPortal.Core.DTOs;
using NewsPortal.Core.Interfaces;

namespace NewsPortal.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FetchLogsController : ControllerBase
{
    private readonly INewsFetchLogRepository _fetchLogRepository;

    public FetchLogsController(INewsFetchLogRepository fetchLogRepository)
    {
        _fetchLogRepository = fetchLogRepository;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllFetchLogs([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var logs = await _fetchLogRepository.GetAllAsync(page, pageSize);
        var totalCount = await _fetchLogRepository.GetTotalCountAsync();

        var logDtos = logs.Select(log => new NewsFetchLogDto
        {
            Id = log.Id,
            SourceName = log.SourceName,
            SourceId = log.SourceId,
            FetchedAt = log.FetchedAt,
            ArticlesFetched = log.ArticlesFetched,
            NewArticles = log.NewArticles,
            UpdatedArticles = log.UpdatedArticles,
            Success = log.Success,
            ErrorMessage = log.ErrorMessage,
            Duration = FormatDuration(log.Duration),
            Details = log.Details
        }).ToList();

        var result = new NewsFetchLogListDto
        {
            Logs = logDtos,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };

        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetFetchLogById(string id)
    {
        var log = await _fetchLogRepository.GetByIdAsync(id);
        if (log == null)
            return NotFound();

        var logDto = new NewsFetchLogDto
        {
            Id = log.Id,
            SourceName = log.SourceName,
            SourceId = log.SourceId,
            FetchedAt = log.FetchedAt,
            ArticlesFetched = log.ArticlesFetched,
            NewArticles = log.NewArticles,
            UpdatedArticles = log.UpdatedArticles,
            Success = log.Success,
            ErrorMessage = log.ErrorMessage,
            Duration = FormatDuration(log.Duration),
            Details = log.Details
        };

        return Ok(logDto);
    }

    [HttpGet("source/{sourceId}")]
    public async Task<IActionResult> GetFetchLogsBySource(int sourceId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var logs = await _fetchLogRepository.GetBySourceIdAsync(sourceId, page, pageSize);
        var totalCount = await _fetchLogRepository.GetTotalCountAsync();

        var logDtos = logs.Select(log => new NewsFetchLogDto
        {
            Id = log.Id,
            SourceName = log.SourceName,
            SourceId = log.SourceId,
            FetchedAt = log.FetchedAt,
            ArticlesFetched = log.ArticlesFetched,
            NewArticles = log.NewArticles,
            UpdatedArticles = log.UpdatedArticles,
            Success = log.Success,
            ErrorMessage = log.ErrorMessage,
            Duration = FormatDuration(log.Duration),
            Details = log.Details
        }).ToList();

        var result = new NewsFetchLogListDto
        {
            Logs = logDtos,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };

        return Ok(result);
    }

    [HttpGet("recent")]
    public async Task<IActionResult> GetRecentFetchLogs([FromQuery] int count = 10)
    {
        var logs = await _fetchLogRepository.GetRecentAsync(count);

        var logDtos = logs.Select(log => new NewsFetchLogDto
        {
            Id = log.Id,
            SourceName = log.SourceName,
            SourceId = log.SourceId,
            FetchedAt = log.FetchedAt,
            ArticlesFetched = log.ArticlesFetched,
            NewArticles = log.NewArticles,
            UpdatedArticles = log.UpdatedArticles,
            Success = log.Success,
            ErrorMessage = log.ErrorMessage,
            Duration = FormatDuration(log.Duration),
            Details = log.Details
        }).ToList();

        return Ok(logDtos);
    }

    [HttpGet("failed")]
    public async Task<IActionResult> GetFailedFetchLogs([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var logs = await _fetchLogRepository.GetFailedLogsAsync(page, pageSize);
        var totalCount = await _fetchLogRepository.GetTotalCountAsync();

        var logDtos = logs.Select(log => new NewsFetchLogDto
        {
            Id = log.Id,
            SourceName = log.SourceName,
            SourceId = log.SourceId,
            FetchedAt = log.FetchedAt,
            ArticlesFetched = log.ArticlesFetched,
            NewArticles = log.NewArticles,
            UpdatedArticles = log.UpdatedArticles,
            Success = log.Success,
            ErrorMessage = log.ErrorMessage,
            Duration = FormatDuration(log.Duration),
            Details = log.Details
        }).ToList();

        var result = new NewsFetchLogListDto
        {
            Logs = logDtos,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };

        return Ok(result);
    }

    private static string FormatDuration(TimeSpan duration)
    {
        if (duration.TotalSeconds < 1)
            return $"{duration.TotalMilliseconds:F0}ms";
        if (duration.TotalMinutes < 1)
            return $"{duration.TotalSeconds:F1}s";
        return $"{duration.TotalMinutes:F1}m";
    }
}
