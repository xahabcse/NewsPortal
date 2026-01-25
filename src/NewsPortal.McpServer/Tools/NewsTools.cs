using System.ComponentModel;
using ModelContextProtocol.Server;
using NewsPortal.Service.Services;
using NewsPortal.Core.DTOs;
using NewsPortal.Core.Interfaces;

namespace NewsPortal.McpServer.Tools;

[McpServerToolType]
public class NewsTools
{
    private readonly INewsService _newsService;
    private readonly ICategoryService _categoryService;
    private readonly INewsSourceService _sourceService;
    private readonly IRssFeedService _rssFeedService;
    private readonly INewsFetcherService _newsFetcherService;

    public NewsTools(
        INewsService newsService,
        ICategoryService categoryService,
        INewsSourceService sourceService,
        IRssFeedService rssFeedService,
        INewsFetcherService newsFetcherService)
    {
        _newsService = newsService;
        _categoryService = categoryService;
        _sourceService = sourceService;
        _rssFeedService = rssFeedService;
        _newsFetcherService = newsFetcherService;
    }

    [McpServerTool, Description("Get latest news articles with pagination")]
    public async Task<PagedResultDto<NewsArticleListDto>> GetLatestNews(
        [Description("Page number (default: 1)")] int page = 1,
        [Description("Items per page (default: 20)")] int pageSize = 20)
    {
        return await _newsService.GetLatestNewsAsync(page, pageSize);
    }

    [McpServerTool, Description("Get news articles by category")]
    public async Task<PagedResultDto<NewsArticleListDto>> GetNewsByCategory(
        [Description("Category slug")] string categorySlug,
        [Description("Page number")] int page = 1,
        [Description("Items per page")] int pageSize = 20)
    {
        return await _newsService.GetNewsByCategoryAsync(categorySlug, page, pageSize);
    }

    [McpServerTool, Description("Get featured news articles")]
    public async Task<IEnumerable<NewsArticleListDto>> GetFeaturedNews(
        [Description("Number of articles to return")] int count = 5)
    {
        return await _newsService.GetFeaturedNewsAsync(count);
    }

    [McpServerTool, Description("Search news articles")]
    public async Task<PagedResultDto<NewsArticleListDto>> SearchNews(
        [Description("Search query")] string query,
        [Description("Page number")] int page = 1,
        [Description("Items per page")] int pageSize = 20)
    {
        return await _newsService.SearchNewsAsync(new SearchQueryDto
        {
            Query = query,
            Page = page,
            PageSize = pageSize
        });
    }

    [McpServerTool, Description("Get news article details by slug")]
    public async Task<NewsArticleDto?> GetNewsDetail(
        [Description("Article slug")] string slug)
    {
        return await _newsService.GetNewsDetailAsync(slug);
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
        return await _rssFeedService.ParseFeedAsync(feedUrl);
    }

    [McpServerTool, Description("Fetch and import news from a source")]
    public async Task<string> FetchNewsFromSource(
        [Description("Source ID")] int sourceId)
    {
        var sources = await _sourceService.GetActiveSourcesForFetchingAsync();
        var source = sources.FirstOrDefault(s => s.Id == sourceId);

        if (source == null)
            return "Source not found";

        var articles = source.FetchMethod switch
        {
            Core.Enums.FetchMethod.Rss => await _newsFetcherService.FetchFromRssAsync(source),
            Core.Enums.FetchMethod.Api => await _newsFetcherService.FetchFromApiAsync(source),
            Core.Enums.FetchMethod.Scrape => await _newsFetcherService.FetchByScrapingAsync(source),
            _ => Enumerable.Empty<CreateNewsArticleDto>()
        };

        var count = await _newsService.ImportNewsArticlesAsync(articles);
        return $"Imported {count} articles from {source.Name}";
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
        return $"Created article with ID: {article.Id}, Slug: {article.Slug}";
    }
}
