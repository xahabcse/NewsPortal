using NewsPortal.Service.Helpers;
using NewsPortal.Core.Constants;
using NewsPortal.Core.DTOs;
using NewsPortal.Core.Entities;
using NewsPortal.Core.Interfaces;

namespace NewsPortal.Service.Services;

public interface INewsSourceService
{
    Task<IEnumerable<NewsSourceDto>> GetAllSourcesAsync();
    Task<IEnumerable<NewsSourceDto>> GetAllSourcesIncludingDisabledAsync();
    Task<NewsSourceDto?> GetSourceBySlugAsync(string slug);
    Task<NewsSource> CreateSourceAsync(CreateNewsSourceDto dto);
    Task UpdateSourceAsync(int id, CreateNewsSourceDto dto);
    Task DeleteSourceAsync(int id);
    Task<IEnumerable<NewsSource>> GetActiveSourcesForFetchingAsync();
}

public class NewsSourceService : INewsSourceService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICacheService _cache;

    public NewsSourceService(IUnitOfWork unitOfWork, ICacheService cache)
    {
        _unitOfWork = unitOfWork;
        _cache = cache;
    }

    public async Task<IEnumerable<NewsSourceDto>> GetAllSourcesAsync()
    {
        return await _cache.GetOrSetAsync(CacheKeys.ActiveSources, async () =>
        {
            // Get sources and article counts in separate optimized queries (fixes N+1 problem)
            var sources = await _unitOfWork.NewsSources.GetActiveSourcesAsync();
            var articleCounts = await _unitOfWork.NewsSources.GetActiveSourcesWithArticleCountsAsync();

            // Map to DTOs - no N+1 query problem
            var result = sources.Select(source => new NewsSourceDto
            {
                Id = source.Id,
                Name = source.Name,
                Slug = source.Slug,
                BaseUrl = source.BaseUrl,
                LogoUrl = source.LogoUrl,
                FetchMethod = source.FetchMethod,
                RssFeedUrl = source.RssFeedUrl,
                ApiEndpoint = source.ApiEndpoint,
                ApiKey = source.ApiKey,
                FetchIntervalMinutes = source.FetchIntervalMinutes > 0 ? source.FetchIntervalMinutes : 30,
                IsActive = source.IsActive,
                LastFetchedAt = source.LastFetchedAt,
                HealthStatus = source.HealthStatus,
                ConsecutiveFailures = source.ConsecutiveFailures,
                LastSuccessAt = source.LastSuccessAt,
                LastFailureAt = source.LastFailureAt,
                LastErrorCode = source.LastErrorCode,
                NextRetryAt = source.NextRetryAt,
                RequestTimeoutSeconds = source.RequestTimeoutSeconds > 0 ? source.RequestTimeoutSeconds : 90,
                MaxRetryAttempts = source.MaxRetryAttempts > 0 ? source.MaxRetryAttempts : 3,
                CircuitBreakerThreshold = source.CircuitBreakerThreshold > 0 ? source.CircuitBreakerThreshold : 5,
                ArticleCount = articleCounts.GetValueOrDefault(source.Id, 0)
            }).ToList();

            return result;
        }, CacheDurations.Long);
    }

    public async Task<IEnumerable<NewsSourceDto>> GetAllSourcesIncludingDisabledAsync()
    {
        var sources = await _unitOfWork.NewsSources.GetAllSourcesIncludingDisabledAsync();
        var articleCounts = await _unitOfWork.NewsSources.GetActiveSourcesWithArticleCountsAsync();

        return sources.Select(source => new NewsSourceDto
        {
            Id = source.Id,
            Name = source.Name,
            Slug = source.Slug,
            BaseUrl = source.BaseUrl,
            LogoUrl = source.LogoUrl,
            FetchMethod = source.FetchMethod,
            RssFeedUrl = source.RssFeedUrl,
            ApiEndpoint = source.ApiEndpoint,
            ApiKey = source.ApiKey,
            FetchIntervalMinutes = source.FetchIntervalMinutes > 0 ? source.FetchIntervalMinutes : 30,
            IsActive = source.IsActive,
            LastFetchedAt = source.LastFetchedAt,
            HealthStatus = source.HealthStatus,
            ConsecutiveFailures = source.ConsecutiveFailures,
            LastSuccessAt = source.LastSuccessAt,
            LastFailureAt = source.LastFailureAt,
            LastErrorCode = source.LastErrorCode,
            NextRetryAt = source.NextRetryAt,
            RequestTimeoutSeconds = source.RequestTimeoutSeconds > 0 ? source.RequestTimeoutSeconds : 90,
            MaxRetryAttempts = source.MaxRetryAttempts > 0 ? source.MaxRetryAttempts : 3,
            CircuitBreakerThreshold = source.CircuitBreakerThreshold > 0 ? source.CircuitBreakerThreshold : 5,
            ArticleCount = articleCounts.GetValueOrDefault(source.Id, 0)
        }).ToList();
    }

    public async Task<NewsSourceDto?> GetSourceBySlugAsync(string slug)
    {
        var source = await _unitOfWork.NewsSources.GetBySlugAsync(slug);
        if (source == null)
            return null;

        var count = await _unitOfWork.NewsArticles.CountAsync(x => x.SourceId == source.Id && x.IsActive);

        return new NewsSourceDto
        {
            Id = source.Id,
            Name = source.Name,
            Slug = source.Slug,
            BaseUrl = source.BaseUrl,
            LogoUrl = source.LogoUrl,
            FetchMethod = source.FetchMethod,
            RssFeedUrl = source.RssFeedUrl,
            ApiEndpoint = source.ApiEndpoint,
            ApiKey = source.ApiKey,
            FetchIntervalMinutes = source.FetchIntervalMinutes > 0 ? source.FetchIntervalMinutes : 30,
            IsActive = source.IsActive,
            LastFetchedAt = source.LastFetchedAt,
            HealthStatus = source.HealthStatus,
            ConsecutiveFailures = source.ConsecutiveFailures,
            LastSuccessAt = source.LastSuccessAt,
            LastFailureAt = source.LastFailureAt,
            LastErrorCode = source.LastErrorCode,
            NextRetryAt = source.NextRetryAt,
            RequestTimeoutSeconds = source.RequestTimeoutSeconds > 0 ? source.RequestTimeoutSeconds : 90,
            MaxRetryAttempts = source.MaxRetryAttempts > 0 ? source.MaxRetryAttempts : 3,
            CircuitBreakerThreshold = source.CircuitBreakerThreshold > 0 ? source.CircuitBreakerThreshold : 5,
            ArticleCount = count
        };
    }

    public async Task<NewsSource> CreateSourceAsync(CreateNewsSourceDto dto)
    {
        var fetchMethod = NormalizeFetchMethod(dto.FetchMethod);
        var source = new NewsSource
        {
            Name = dto.Name,
            Slug = SlugHelper.GenerateSlug(dto.Name),
            BaseUrl = dto.BaseUrl,
            LogoUrl = dto.LogoUrl,
            FetchMethod = fetchMethod,
            RssFeedUrl = dto.RssFeedUrl,
            ApiEndpoint = dto.ApiEndpoint,
            ApiKey = dto.ApiKey,
            FetchIntervalMinutes = Math.Clamp(dto.FetchIntervalMinutes, 5, 1440),
            RequestTimeoutSeconds = 90,
            MaxRetryAttempts = 3,
            CircuitBreakerThreshold = 5
        };

        await _unitOfWork.NewsSources.AddAsync(source);
        await _unitOfWork.SaveChangesAsync();
        await _cache.RemoveAsync(CacheKeys.ActiveSources);

        return source;
    }

    public async Task UpdateSourceAsync(int id, CreateNewsSourceDto dto)
    {
        var source = await _unitOfWork.NewsSources.GetByIdAsync(id);
        if (source == null)
            throw new InvalidOperationException("Source not found");

        source.Name = dto.Name;
        source.BaseUrl = dto.BaseUrl;
        source.LogoUrl = dto.LogoUrl;
        source.FetchMethod = NormalizeFetchMethod(dto.FetchMethod);
        source.RssFeedUrl = dto.RssFeedUrl;
        source.ApiEndpoint = dto.ApiEndpoint;
        source.ApiKey = dto.ApiKey;
        source.FetchIntervalMinutes = Math.Clamp(dto.FetchIntervalMinutes, 5, 1440);

        await _unitOfWork.NewsSources.UpdateAsync(source);
        await _unitOfWork.SaveChangesAsync();
        await _cache.RemoveAsync(CacheKeys.ActiveSources);
    }

    public async Task DeleteSourceAsync(int id)
    {
        var source = await _unitOfWork.NewsSources.GetByIdAsync(id);
        if (source == null)
            throw new InvalidOperationException("Source not found");

        await _unitOfWork.NewsSources.DeleteAsync(source);
        await _unitOfWork.SaveChangesAsync();
        await _cache.RemoveAsync(CacheKeys.ActiveSources);
    }

    public async Task<IEnumerable<NewsSource>> GetActiveSourcesForFetchingAsync()
    {
        return await _unitOfWork.NewsSources.GetActiveSourcesAsync();
    }

    private static Core.Enums.FetchMethod NormalizeFetchMethod(Core.Enums.FetchMethod method)
    {
        if ((int)method == 0)
        {
            return Core.Enums.FetchMethod.Rss;
        }

        return Enum.IsDefined(typeof(Core.Enums.FetchMethod), method)
            ? method
            : Core.Enums.FetchMethod.Rss;
    }
}
