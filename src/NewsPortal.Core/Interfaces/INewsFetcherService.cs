using NewsPortal.Core.DTOs;
using NewsPortal.Core.Entities;

namespace NewsPortal.Core.Interfaces;

public interface INewsFetcherService
{
    Task<FetchExecutionResultDto> FetchWithFallbackAsync(NewsSource source);
    Task<IEnumerable<CreateNewsArticleDto>> FetchFromRssAsync(NewsSource source);
    Task<IEnumerable<CreateNewsArticleDto>> FetchFromApiAsync(NewsSource source);
    Task<IEnumerable<CreateNewsArticleDto>> FetchByScrapingAsync(NewsSource source);
    Task<CreateNewsArticleDto?> FetchArticleContentAsync(string url, ScrapingConfig config);
}

public interface IWebSearchService
{
    Task<IEnumerable<SearchResultDto>> SearchNewsAsync(string query, string? language = null, int count = 10);
}

public interface IRssFeedService
{
    Task<IEnumerable<SearchResultDto>> ParseFeedAsync(string feedUrl);
}

public interface IScrapingService
{
    Task<string?> ExtractContentAsync(string url, string selector);
    Task<string?> ExtractAttributeAsync(string url, string selector, string attribute);
    Task<IEnumerable<string>> ExtractLinksAsync(string url, string selector);
}

public interface IContentScraperService
{
    Task<string?> ScrapeFullContentAsync(string url);
}
