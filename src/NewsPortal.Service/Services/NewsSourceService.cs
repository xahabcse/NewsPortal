using NewsPortal.Service.Helpers;
using NewsPortal.Core.Constants;
using NewsPortal.Core.DTOs;
using NewsPortal.Core.Entities;
using NewsPortal.Core.Interfaces;

namespace NewsPortal.Service.Services;

public interface INewsSourceService
{
    Task<IEnumerable<NewsSourceDto>> GetAllSourcesAsync();
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
                IsActive = source.IsActive,
                LastFetchedAt = source.LastFetchedAt,
                ArticleCount = articleCounts.GetValueOrDefault(source.Id, 0)
            }).ToList();

            return result;
        }, CacheDurations.Long);
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
            IsActive = source.IsActive,
            LastFetchedAt = source.LastFetchedAt,
            ArticleCount = count
        };
    }

    public async Task<NewsSource> CreateSourceAsync(CreateNewsSourceDto dto)
    {
        var source = new NewsSource
        {
            Name = dto.Name,
            Slug = SlugHelper.GenerateSlug(dto.Name),
            BaseUrl = dto.BaseUrl,
            LogoUrl = dto.LogoUrl,
            FetchMethod = dto.FetchMethod,
            RssFeedUrl = dto.RssFeedUrl,
            ApiEndpoint = dto.ApiEndpoint,
            ApiKey = dto.ApiKey,
            FetchIntervalMinutes = dto.FetchIntervalMinutes
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
        source.FetchMethod = dto.FetchMethod;
        source.RssFeedUrl = dto.RssFeedUrl;
        source.ApiEndpoint = dto.ApiEndpoint;
        source.ApiKey = dto.ApiKey;
        source.FetchIntervalMinutes = dto.FetchIntervalMinutes;

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
}
