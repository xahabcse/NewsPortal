using Microsoft.Extensions.Logging;
using NewsPortal.Core.DTOs;
using NewsPortal.Core.Entities;
using NewsPortal.Core.Enums;
using NewsPortal.Core.Interfaces;

namespace NewsPortal.Service.Services;

public class NewsFetcherService : INewsFetcherService
{
    private readonly IRssFeedService _rssFeedService;
    private readonly IScrapingService _scrapingService;
    private readonly ILogger<NewsFetcherService> _logger;

    public NewsFetcherService(
        IRssFeedService rssFeedService,
        IScrapingService scrapingService,
        ILogger<NewsFetcherService> logger)
    {
        _rssFeedService = rssFeedService;
        _scrapingService = scrapingService;
        _logger = logger;
    }

    public async Task<IEnumerable<CreateNewsArticleDto>> FetchFromRssAsync(NewsSource source)
    {
        if (string.IsNullOrEmpty(source.RssFeedUrl))
        {
            _logger.LogWarning("RSS feed URL is empty for source: {SourceName}", source.Name);
            return Enumerable.Empty<CreateNewsArticleDto>();
        }

        var feedItems = await _rssFeedService.ParseFeedAsync(source.RssFeedUrl);

        return feedItems.Select(item => new CreateNewsArticleDto
        {
            Title = item.Title,
            Summary = StripHtml(item.Summary),
            SourceUrl = item.Url,
            OriginalImageUrl = item.ImageUrl,
            PublishedAt = item.PublishedAt,
            SourceId = source.Id
        });
    }

    public async Task<IEnumerable<CreateNewsArticleDto>> FetchFromApiAsync(NewsSource source)
    {
        // Implement API fetching logic based on source configuration
        _logger.LogInformation("API fetching not implemented for source: {SourceName}", source.Name);
        return await Task.FromResult(Enumerable.Empty<CreateNewsArticleDto>());
    }

    public async Task<IEnumerable<CreateNewsArticleDto>> FetchByScrapingAsync(NewsSource source)
    {
        var config = source.ScrapingConfig;
        if (config == null || string.IsNullOrEmpty(config.ListPageUrl))
        {
            _logger.LogWarning("Scraping config is missing for source: {SourceName}", source.Name);
            return Enumerable.Empty<CreateNewsArticleDto>();
        }

        var results = new List<CreateNewsArticleDto>();

        try
        {
            // Get article links from list page
            var articleLinks = await _scrapingService.ExtractLinksAsync(
                config.ListPageUrl,
                config.ArticleLinkSelector ?? "a");

            foreach (var link in articleLinks.Take(20)) // Limit to 20 articles per fetch
            {
                var article = await FetchArticleContentAsync(link, config);
                if (article != null)
                {
                    article.SourceId = source.Id;
                    results.Add(article);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to scrape source: {SourceName}", source.Name);
        }

        return results;
    }

    public async Task<CreateNewsArticleDto?> FetchArticleContentAsync(string url, ScrapingConfig config)
    {
        try
        {
            var title = await _scrapingService.ExtractContentAsync(url, config.TitleSelector ?? "h1");
            if (string.IsNullOrEmpty(title))
                return null;

            var content = await _scrapingService.ExtractContentAsync(url, config.ContentSelector ?? "article");
            var summary = await _scrapingService.ExtractContentAsync(url, config.SummarySelector ?? "p");
            var imageUrl = await _scrapingService.ExtractAttributeAsync(url, config.ImageSelector ?? "img", "src");
            var author = await _scrapingService.ExtractContentAsync(url, config.AuthorSelector ?? ".author");

            return new CreateNewsArticleDto
            {
                Title = StripHtml(title) ?? string.Empty,
                Summary = StripHtml(summary),
                Content = content,
                SourceUrl = url,
                OriginalImageUrl = imageUrl,
                Author = StripHtml(author),
                PublishedAt = DateTime.UtcNow
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch article content from: {Url}", url);
            return null;
        }
    }

    private static string? StripHtml(string? html)
    {
        if (string.IsNullOrEmpty(html))
            return null;

        var doc = new HtmlAgilityPack.HtmlDocument();
        doc.LoadHtml(html);
        return doc.DocumentNode.InnerText.Trim();
    }
}
