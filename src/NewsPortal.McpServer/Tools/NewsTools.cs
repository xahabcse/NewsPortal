using System.ComponentModel;
using ModelContextProtocol.Server;
using NewsPortal.Service.Services;
using NewsPortal.Core.DTOs;
using NewsPortal.Core.Interfaces;
using Microsoft.Extensions.Logging;

namespace NewsPortal.McpServer.Tools;

[McpServerToolType]
public class NewsTools
{
    private readonly INewsService _newsService;
    private readonly ICategoryService _categoryService;
    private readonly INewsSourceService _sourceService;
    private readonly IRssFeedService _rssFeedService;
    private readonly INewsFetcherService _newsFetcherService;
    private readonly ILogger<NewsTools> _logger;

    public NewsTools(
        INewsService newsService,
        ICategoryService categoryService,
        INewsSourceService sourceService,
        IRssFeedService rssFeedService,
        INewsFetcherService newsFetcherService,
        ILogger<NewsTools> logger)
    {
        _newsService = newsService;
        _categoryService = categoryService;
        _sourceService = sourceService;
        _rssFeedService = rssFeedService;
        _newsFetcherService = newsFetcherService;
        _logger = logger;
    }

    [McpServerTool, Description("Get latest news articles with pagination")]
    public async Task<PagedResultDto<NewsArticleListDto>> GetLatestNews(
        [Description("Page number (default: 1)")] int page = 1,
        [Description("Items per page (default: 20)")] int pageSize = 20)
    {
        try
        {
            // Validate pagination parameters
            if (page < 1)
            {
                _logger.LogWarning("Invalid page number: {Page}. Setting to 1", page);
                page = 1;
            }

            if (pageSize < 1 || pageSize > 100)
            {
                _logger.LogWarning("Invalid page size: {PageSize}. Setting to 20", pageSize);
                pageSize = 20;
            }

            _logger.LogInformation("Fetching latest news - Page: {Page}, PageSize: {PageSize}", page, pageSize);
            return await _newsService.GetLatestNewsAsync(page, pageSize);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting latest news");
            throw;
        }
    }

    [McpServerTool, Description("Get news articles by category")]
    public async Task<PagedResultDto<NewsArticleListDto>> GetNewsByCategory(
        [Description("Category slug")] string categorySlug,
        [Description("Page number")] int page = 1,
        [Description("Items per page")] int pageSize = 20)
    {
        try
        {
            // Validate category slug
            if (string.IsNullOrWhiteSpace(categorySlug))
            {
                _logger.LogWarning("Empty category slug provided");
                throw new ArgumentException("Category slug is required", nameof(categorySlug));
            }

            // Validate pagination parameters
            if (page < 1)
            {
                _logger.LogWarning("Invalid page number: {Page}. Setting to 1", page);
                page = 1;
            }

            if (pageSize < 1 || pageSize > 100)
            {
                _logger.LogWarning("Invalid page size: {PageSize}. Setting to 20", pageSize);
                pageSize = 20;
            }

            _logger.LogInformation("Fetching news by category: {CategorySlug}, Page: {Page}, PageSize: {PageSize}",
                categorySlug, page, pageSize);
            return await _newsService.GetNewsByCategoryAsync(categorySlug, page, pageSize);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting news by category: {CategorySlug}", categorySlug);
            throw;
        }
    }

    [McpServerTool, Description("Get featured news articles")]
    public async Task<IEnumerable<NewsArticleListDto>> GetFeaturedNews(
        [Description("Number of articles to return")] int count = 5)
    {
        try
        {
            // Validate count parameter
            if (count < 1 || count > 50)
            {
                _logger.LogWarning("Invalid count: {Count}. Setting to 5", count);
                count = 5;
            }

            _logger.LogInformation("Fetching featured news - Count: {Count}", count);
            return await _newsService.GetFeaturedNewsAsync(count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting featured news");
            throw;
        }
    }

    [McpServerTool, Description("Search news articles")]
    public async Task<PagedResultDto<NewsArticleListDto>> SearchNews(
        [Description("Search query")] string query,
        [Description("Page number")] int page = 1,
        [Description("Items per page")] int pageSize = 20)
    {
        try
        {
            // Validate search query
            if (string.IsNullOrWhiteSpace(query))
            {
                _logger.LogWarning("Empty search query provided");
                throw new ArgumentException("Search query is required", nameof(query));
            }

            if (query.Length > 500)
            {
                _logger.LogWarning("Search query too long: {Length} characters. Truncating to 500", query.Length);
                query = query.Substring(0, 500);
            }

            // Validate pagination parameters
            if (page < 1)
            {
                _logger.LogWarning("Invalid page number: {Page}. Setting to 1", page);
                page = 1;
            }

            if (pageSize < 1 || pageSize > 100)
            {
                _logger.LogWarning("Invalid page size: {PageSize}. Setting to 20", pageSize);
                pageSize = 20;
            }

            _logger.LogInformation("Searching news with query: {Query}, Page: {Page}, PageSize: {PageSize}",
                query, page, pageSize);
            return await _newsService.SearchNewsAsync(new SearchQueryDto
            {
                Query = query,
                Page = page,
                PageSize = pageSize
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching news with query: {Query}", query);
            throw;
        }
    }

    [McpServerTool, Description("Get news article details by slug")]
    public async Task<NewsArticleDto?> GetNewsDetail(
        [Description("Article slug")] string slug)
    {
        try
        {
            // Validate slug
            if (string.IsNullOrWhiteSpace(slug))
            {
                _logger.LogWarning("Empty slug provided");
                throw new ArgumentException("Article slug is required", nameof(slug));
            }

            _logger.LogInformation("Fetching article details for slug: {Slug}", slug);
            return await _newsService.GetNewsDetailAsync(slug);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting news detail for slug: {Slug}", slug);
            throw;
        }
    }

    [McpServerTool, Description("Get all categories")]
    public async Task<IEnumerable<CategoryDto>> GetCategories()
    {
        return await _categoryService.GetAllCategoriesAsync();
    }

    [McpServerTool, Description("Get all news sources")]
    public async Task<IEnumerable<NewsSourceDto>> GetSources()
    {
        return await _sourceService.GetAllSourcesAsync();
    }

    [McpServerTool, Description("Fetch news from RSS feed")]
    public async Task<IEnumerable<SearchResultDto>> FetchRssFeed(
        [Description("RSS feed URL")] string feedUrl)
    {
        try
        {
            _logger.LogInformation("Fetching RSS feed from URL: {FeedUrl}", feedUrl);

            if (string.IsNullOrWhiteSpace(feedUrl))
            {
                _logger.LogWarning("Attempted to fetch RSS feed with empty URL");
                return Enumerable.Empty<SearchResultDto>();
            }

            var results = await _rssFeedService.ParseFeedAsync(feedUrl);
            _logger.LogInformation("Successfully fetched {Count} items from RSS feed: {FeedUrl}",
                results.Count(), feedUrl);
            return results;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching RSS feed from URL: {FeedUrl}", feedUrl);
            return Enumerable.Empty<SearchResultDto>();
        }
    }

    [McpServerTool, Description("Fetch and import news from a source")]
    public async Task<string> FetchNewsFromSource(
        [Description("Source ID")] int sourceId)
    {
        try
        {
            _logger.LogInformation("Fetching news from source ID: {SourceId}", sourceId);

            var sources = await _sourceService.GetActiveSourcesForFetchingAsync();
            var source = sources.FirstOrDefault(s => s.Id == sourceId);

            if (source == null)
            {
                _logger.LogWarning("Source not found with ID: {SourceId}", sourceId);
                return "Source not found";
            }

            _logger.LogInformation("Fetching news from source: {SourceName} using method: {FetchMethod}",
                source.Name, source.FetchMethod);

            var articles = source.FetchMethod switch
            {
                Core.Enums.FetchMethod.Rss => await _newsFetcherService.FetchFromRssAsync(source),
                Core.Enums.FetchMethod.Api => await _newsFetcherService.FetchFromApiAsync(source),
                Core.Enums.FetchMethod.Scrape => await _newsFetcherService.FetchByScrapingAsync(source),
                _ => Enumerable.Empty<CreateNewsArticleDto>()
            };

            var count = await _newsService.ImportNewsArticlesAsync(articles);
            _logger.LogInformation("Successfully imported {Count} articles from {SourceName}", count, source.Name);
            return $"Imported {count} articles from {source.Name}";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching news from source ID: {SourceId}", sourceId);
            return $"Error fetching news: {ex.Message}";
        }
    }

    [McpServerTool, Description("Create a new news article")]
    public async Task<string> CreateNewsArticle(
        [Description("Article title")] string title,
        [Description("Article summary")] string summary,
        [Description("Article content (HTML)")] string content,
        [Description("Source URL")] string sourceUrl,
        [Description("Image URL")] string? imageUrl,
        [Description("Source ID")] int sourceId,
        [Description("Category ID")] int? categoryId)
    {
        try
        {
            _logger.LogInformation("Creating new article with title: {Title}", title);

            if (string.IsNullOrWhiteSpace(title))
            {
                _logger.LogWarning("Attempted to create article with empty title");
                return "Error: Title is required";
            }

            if (string.IsNullOrWhiteSpace(content))
            {
                _logger.LogWarning("Attempted to create article with empty content");
                return "Error: Content is required";
            }

            if (string.IsNullOrWhiteSpace(sourceUrl))
            {
                _logger.LogWarning("Attempted to create article with empty source URL");
                return "Error: Source URL is required";
            }

            var dto = new CreateNewsArticleDto
            {
                Title = title,
                Summary = summary,
                Content = content,
                SourceUrl = sourceUrl,
                OriginalImageUrl = imageUrl,
                SourceId = sourceId,
                CategoryId = categoryId,
                PublishedAt = DateTime.UtcNow
            };

            var article = await _newsService.CreateNewsAsync(dto);
            _logger.LogInformation("Successfully created article with ID: {ArticleId}, Slug: {Slug}",
                article.Id, article.Slug);
            return $"Created article with ID: {article.Id}, Slug: {article.Slug}";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating article with title: {Title}", title);
            return $"Error creating article: {ex.Message}";
        }
    }
}
