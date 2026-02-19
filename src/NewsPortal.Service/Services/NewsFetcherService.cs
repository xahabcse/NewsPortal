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

    public async Task<FetchExecutionResultDto> FetchWithFallbackAsync(NewsSource source)
    {
        var result = new FetchExecutionResultDto
        {
            PrimaryMethod = source.FetchMethod,
            SuccessfulMethod = source.FetchMethod
        };

        Exception? lastException = null;

        foreach (var method in GetFetchOrder(source.FetchMethod))
        {
            if (!IsMethodConfigured(source, method))
            {
                result.Issues.Add(new FetchAttemptIssueDto
                {
                    Method = method,
                    Code = "METHOD_NOT_CONFIGURED",
                    Message = $"Fetch method {method} is not configured for source {source.Name}."
                });
                continue;
            }

            try
            {
                var articles = (await FetchByMethodAsync(source, method)).ToList();
                result.Articles = articles;
                result.SuccessfulMethod = method;
                result.UsedFallback = method != source.FetchMethod;

                if (result.UsedFallback)
                {
                    _logger.LogWarning(
                        "Primary method {PrimaryMethod} failed or unavailable for {SourceName}. Fallback method {Method} succeeded with {Count} articles.",
                        source.FetchMethod,
                        source.Name,
                        method,
                        articles.Count);
                }

                return result;
            }
            catch (Exception ex)
            {
                lastException = ex;
                result.Issues.Add(new FetchAttemptIssueDto
                {
                    Method = method,
                    Code = MapFetchErrorCode(ex),
                    Message = ex.Message
                });

                _logger.LogWarning(ex, "Fetch method {Method} failed for source {SourceName}", method, source.Name);
            }
        }

        if (lastException != null)
        {
            throw new InvalidOperationException($"All fetch methods failed for source {source.Name}.", lastException);
        }

        throw new InvalidOperationException($"No configured fetch methods available for source {source.Name}.");
    }

    public async Task<IEnumerable<CreateNewsArticleDto>> FetchFromRssAsync(NewsSource source)
    {
        if (string.IsNullOrEmpty(source.RssFeedUrl))
        {
            _logger.LogWarning("RSS feed URL is empty for source: {SourceName}", source.Name);
            return Enumerable.Empty<CreateNewsArticleDto>();
        }

        var feedItems = await _rssFeedService.ParseFeedAsync(source.RssFeedUrl);

        var articles = new List<CreateNewsArticleDto>();
        var totalItems = 0;
        var validItems = 0;

        foreach (var item in feedItems)
        {
            totalItems++;

            // Validate minimum required fields
            if (string.IsNullOrWhiteSpace(item.Title) || string.IsNullOrWhiteSpace(item.Url))
            {
                _logger.LogWarning("Skipping RSS item with missing title or URL from source {SourceName}. Title: {Title}, URL: {Url}",
                    source.Name, item.Title ?? "N/A", item.Url ?? "N/A");
                continue;
            }

            articles.Add(new CreateNewsArticleDto
            {
                Title = item.Title,
                Summary = StripHtml(item.Summary),
                SourceUrl = item.Url,
                OriginalImageUrl = item.ImageUrl,
                PublishedAt = item.PublishedAt,
                SourceId = source.Id
            });

            validItems++;
        }

        if (totalItems > 0)
        {
            _logger.LogInformation("RSS feed {SourceName}: {Valid}/{Total} items validated successfully",
                source.Name, validItems, totalItems);
        }

        return articles;
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
        var totalLinks = 0;
        var successfulArticles = 0;
        var skippedArticles = 0;

        try
        {
            // Get article links from list page
            var articleLinks = await _scrapingService.ExtractLinksAsync(
                config.ListPageUrl,
                config.ArticleLinkSelector ?? "a");

            var linksToProcess = articleLinks.Take(20).ToList(); // Limit to 20 articles per fetch
            totalLinks = linksToProcess.Count;

            _logger.LogInformation("Found {Count} article links to process from {SourceName}", totalLinks, source.Name);

            foreach (var link in linksToProcess)
            {
                var article = await FetchArticleContentAsync(link, config);
                if (article != null)
                {
                    article.SourceId = source.Id;
                    results.Add(article);
                    successfulArticles++;
                }
                else
                {
                    skippedArticles++;
                }
            }

            _logger.LogInformation("Scraping complete for {SourceName}: {Successful}/{Total} articles extracted, {Skipped} skipped",
                source.Name, successfulArticles, totalLinks, skippedArticles);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to scrape source: {SourceName}. Partial results: {Count} articles",
                source.Name, results.Count);
        }

        return results;
    }

    public async Task<CreateNewsArticleDto?> FetchArticleContentAsync(string url, ScrapingConfig config)
    {
        try
        {
            // Resilient title extraction with multiple fallback strategies
            var title = await ExtractTitleWithFallbackAsync(url, config.TitleSelector ?? "h1");

            if (string.IsNullOrWhiteSpace(title))
            {
                _logger.LogWarning("Could not extract title from article: {Url}. Skipping article.", url);
                return null;
            }

            // Extract other fields with graceful degradation (failures logged but don't stop article save)
            string? content = null;
            string? summary = null;
            string? imageUrl = null;
            string? author = null;

            try
            {
                content = await _scrapingService.ExtractContentAsync(url, config.ContentSelector ?? "article");
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to extract content from {Url}. Continuing with partial data.", url);
            }

            try
            {
                summary = await _scrapingService.ExtractContentAsync(url, config.SummarySelector ?? "p");
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to extract summary from {Url}. Continuing with partial data.", url);
            }

            try
            {
                imageUrl = await _scrapingService.ExtractAttributeAsync(url, config.ImageSelector ?? "img", "src");
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to extract image from {Url}. Continuing without image.", url);
            }

            try
            {
                author = await _scrapingService.ExtractContentAsync(url, config.AuthorSelector ?? ".author");
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to extract author from {Url}. Continuing without author.", url);
            }

            // Log success with partial data indicator
            var partialDataFields = new List<string>();
            if (string.IsNullOrEmpty(content)) partialDataFields.Add("content");
            if (string.IsNullOrEmpty(summary)) partialDataFields.Add("summary");
            if (string.IsNullOrEmpty(imageUrl)) partialDataFields.Add("image");
            if (string.IsNullOrEmpty(author)) partialDataFields.Add("author");

            if (partialDataFields.Any())
            {
                _logger.LogInformation("Successfully extracted article from {Url} with partial data. Missing fields: {MissingFields}",
                    url, string.Join(", ", partialDataFields));
            }

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
            _logger.LogError(ex, "Fatal error fetching article content from: {Url}. Skipping article.", url);
            return null;
        }
    }

    /// <summary>
    /// Extracts title with multiple fallback strategies to ensure we get at least a title
    /// </summary>
    private async Task<string?> ExtractTitleWithFallbackAsync(string url, string primarySelector)
    {
        // Strategy 1: Try the configured primary selector (e.g., h1)
        var title = await _scrapingService.ExtractContentAsync(url, primarySelector);
        if (!string.IsNullOrWhiteSpace(title))
        {
            _logger.LogDebug("Extracted title from primary selector '{Selector}': {Title}", primarySelector, StripHtml(title)?.Substring(0, Math.Min(50, title.Length)));
            return title;
        }

        // Strategy 2: Try Open Graph title meta tag
        title = await _scrapingService.ExtractAttributeAsync(url, "//meta[@property='og:title']", "content");
        if (!string.IsNullOrWhiteSpace(title))
        {
            _logger.LogDebug("Extracted title from og:title meta tag: {Title}", title.Substring(0, Math.Min(50, title.Length)));
            return title;
        }

        // Strategy 3: Try Twitter card title meta tag
        title = await _scrapingService.ExtractAttributeAsync(url, "//meta[@name='twitter:title']", "content");
        if (!string.IsNullOrWhiteSpace(title))
        {
            _logger.LogDebug("Extracted title from twitter:title meta tag: {Title}", title.Substring(0, Math.Min(50, title.Length)));
            return title;
        }

        // Strategy 4: Try HTML title tag
        title = await _scrapingService.ExtractContentAsync(url, "//title");
        if (!string.IsNullOrWhiteSpace(title))
        {
            _logger.LogDebug("Extracted title from HTML title tag: {Title}", StripHtml(title)?.Substring(0, Math.Min(50, title.Length)));
            return title;
        }

        // Strategy 5: Try any h1 tag
        title = await _scrapingService.ExtractContentAsync(url, "//h1");
        if (!string.IsNullOrWhiteSpace(title))
        {
            _logger.LogDebug("Extracted title from first h1 tag: {Title}", StripHtml(title)?.Substring(0, Math.Min(50, title.Length)));
            return title;
        }

        // Strategy 6: Try any h2 tag as last resort
        title = await _scrapingService.ExtractContentAsync(url, "//h2");
        if (!string.IsNullOrWhiteSpace(title))
        {
            _logger.LogWarning("Using h2 tag as title fallback for {Url}: {Title}", url, StripHtml(title)?.Substring(0, Math.Min(50, title.Length)));
            return title;
        }

        // Strategy 7: Last resort - extract from URL (domain + path)
        try
        {
            var uri = new Uri(url);
            var urlBasedTitle = $"{uri.Host}{uri.AbsolutePath}".Replace("/", " - ").Replace("-", " ").Trim();
            _logger.LogWarning("Using URL-based title as last resort for {Url}: {Title}", url, urlBasedTitle);
            return urlBasedTitle;
        }
        catch
        {
            _logger.LogError("All title extraction strategies failed for {Url}", url);
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

    private Task<IEnumerable<CreateNewsArticleDto>> FetchByMethodAsync(NewsSource source, FetchMethod method)
    {
        return method switch
        {
            FetchMethod.Rss => FetchFromRssAsync(source),
            FetchMethod.Api => FetchFromApiAsync(source),
            FetchMethod.Scrape => FetchByScrapingAsync(source),
            _ => throw new NotSupportedException($"Fetch method not supported: {method}")
        };
    }

    private static IEnumerable<FetchMethod> GetFetchOrder(FetchMethod primaryMethod)
    {
        var methods = new[] { FetchMethod.Rss, FetchMethod.Api, FetchMethod.Scrape };
        yield return primaryMethod;

        foreach (var method in methods)
        {
            if (method != primaryMethod)
            {
                yield return method;
            }
        }
    }

    private static bool IsMethodConfigured(NewsSource source, FetchMethod method)
    {
        return method switch
        {
            FetchMethod.Rss => !string.IsNullOrWhiteSpace(source.RssFeedUrl),
            FetchMethod.Api => !string.IsNullOrWhiteSpace(source.ApiEndpoint),
            FetchMethod.Scrape => source.ScrapingConfig != null && !string.IsNullOrWhiteSpace(source.ScrapingConfig.ListPageUrl),
            _ => false
        };
    }

    private static string MapFetchErrorCode(Exception ex)
    {
        return Helpers.FetchErrorClassifier.Classify(ex);
    }
}
