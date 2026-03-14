using Microsoft.Extensions.Logging;
using NewsPortal.Core.Interfaces;

namespace NewsPortal.Scheduler.Jobs;

public interface ICacheCleanupJob
{
    Task CleanupAsync();
}

public class CacheCleanupJob : ICacheCleanupJob
{
    private readonly ICacheService _cacheService;
    private readonly ILogger<CacheCleanupJob> _logger;

    public CacheCleanupJob(ICacheService cacheService, ILogger<CacheCleanupJob> logger)
    {
        _cacheService = cacheService;
        _logger = logger;
    }

    public async Task CleanupAsync()
    {
        _logger.LogInformation("Starting cache cleanup");

        try
        {
            // Clear old cache entries
            await _cacheService.RemoveByPatternAsync("news:*");
            await _cacheService.RemoveByPatternAsync("search:*");
            await _cacheService.RemoveByPatternAsync("categories:*");

            _logger.LogInformation("Cache cleanup completed");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during cache cleanup");
            throw;
        }
    }
}
