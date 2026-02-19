using Microsoft.Extensions.Logging;
using NewsPortal.Service.Helpers;
using NewsPortal.Core.Constants;
using NewsPortal.Core.DTOs;
using NewsPortal.Core.Entities;
using NewsPortal.Core.Interfaces;

namespace NewsPortal.Service.Services;

public interface INewsService
{
    Task<PagedResultDto<NewsArticleListDto>> GetLatestNewsAsync(int page, int pageSize);
    Task<PagedResultDto<NewsArticleListDto>> GetNewsByCategoryAsync(string categorySlug, int page, int pageSize);
    Task<PagedResultDto<NewsArticleListDto>> GetNewsBySourceAsync(string sourceSlug, int page, int pageSize);
    Task<NewsArticleDto?> GetNewsDetailAsync(string slug);
    Task<IEnumerable<NewsArticleListDto>> GetFeaturedNewsAsync(int count);
    Task<PagedResultDto<NewsArticleListDto>> SearchNewsAsync(SearchQueryDto query);
    Task<NewsArticle> CreateNewsAsync(CreateNewsArticleDto dto);
    Task<int> ImportNewsArticlesAsync(IEnumerable<CreateNewsArticleDto> articles);
    Task<NewsImportResultDto> ImportNewsArticlesWithReportAsync(IEnumerable<CreateNewsArticleDto> articles);
}

public class NewsService : INewsService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICacheService _cache;
    private readonly IImageStorageService _imageStorage;
    private readonly ILogger<NewsService> _logger;

    public NewsService(
        IUnitOfWork unitOfWork,
        ICacheService cache,
        IImageStorageService imageStorage,
        ILogger<NewsService> logger)
    {
        _unitOfWork = unitOfWork;
        _cache = cache;
        _imageStorage = imageStorage;
        _logger = logger;
    }

    public async Task<PagedResultDto<NewsArticleListDto>> GetLatestNewsAsync(int page, int pageSize)
    {
        var cacheKey = $"{CacheKeys.LatestNews}:{page}:{pageSize}";

        return await _cache.GetOrSetAsync(cacheKey, async () =>
        {
            var articles = await _unitOfWork.NewsArticles.GetLatestAsync(page * pageSize);
            var paged = articles.Skip((page - 1) * pageSize).Take(pageSize);
            var total = await _unitOfWork.NewsArticles.CountAsync(x => x.IsActive);

            return new PagedResultDto<NewsArticleListDto>
            {
                Items = paged.Select(MapToListDto).ToList(),
                TotalCount = total,
                Page = page,
                PageSize = pageSize
            };
        }, CacheDurations.Short);
    }

    public async Task<PagedResultDto<NewsArticleListDto>> GetNewsByCategoryAsync(string categorySlug, int page, int pageSize)
    {
        var category = await _unitOfWork.Categories.GetBySlugAsync(categorySlug);
        if (category == null)
            return new PagedResultDto<NewsArticleListDto> { Items = new List<NewsArticleListDto>() };

        var cacheKey = $"{CacheKeys.NewsByCategory(category.Id)}:{page}:{pageSize}";

        return await _cache.GetOrSetAsync(cacheKey, async () =>
        {
            var articles = await _unitOfWork.NewsArticles.GetByCategoryAsync(category.Id, page, pageSize);
            var total = await _unitOfWork.NewsArticles.CountAsync(x => x.CategoryId == category.Id && x.IsActive);

            return new PagedResultDto<NewsArticleListDto>
            {
                Items = articles.Select(MapToListDto).ToList(),
                TotalCount = total,
                Page = page,
                PageSize = pageSize
            };
        }, CacheDurations.Short);
    }

    public async Task<PagedResultDto<NewsArticleListDto>> GetNewsBySourceAsync(string sourceSlug, int page, int pageSize)
    {
        var source = await _unitOfWork.NewsSources.GetBySlugAsync(sourceSlug);
        if (source == null)
            return new PagedResultDto<NewsArticleListDto> { Items = new List<NewsArticleListDto>() };

        var cacheKey = $"{CacheKeys.NewsBySource(source.Id)}:{page}:{pageSize}";

        return await _cache.GetOrSetAsync(cacheKey, async () =>
        {
            var articles = await _unitOfWork.NewsArticles.GetBySourceAsync(source.Id, page, pageSize);
            var total = await _unitOfWork.NewsArticles.CountAsync(x => x.SourceId == source.Id && x.IsActive);

            return new PagedResultDto<NewsArticleListDto>
            {
                Items = articles.Select(MapToListDto).ToList(),
                TotalCount = total,
                Page = page,
                PageSize = pageSize
            };
        }, CacheDurations.Short);
    }

    public async Task<NewsArticleDto?> GetNewsDetailAsync(string slug)
    {
        var cacheKey = CacheKeys.NewsArticleBySlug(slug);

        var article = await _cache.GetOrSetAsync(cacheKey, async () =>
        {
            return await _unitOfWork.NewsArticles.GetBySlugAsync(slug);
        }, CacheDurations.Medium);

        if (article == null)
            return null;

        // Increment view count asynchronously with proper error handling
        _ = Task.Run(async () =>
        {
            try
            {
                await _unitOfWork.NewsArticles.IncrementViewCountAsync(article.Id);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to increment view count for article {ArticleId}", article.Id);
            }
        });

        return MapToDetailDto(article);
    }

    public async Task<IEnumerable<NewsArticleListDto>> GetFeaturedNewsAsync(int count)
    {
        return await _cache.GetOrSetAsync($"{CacheKeys.FeaturedNews}:{count}", async () =>
        {
            var articles = await _unitOfWork.NewsArticles.GetFeaturedAsync(count);
            return articles.Select(MapToListDto).ToList();
        }, CacheDurations.Short);
    }

    public async Task<PagedResultDto<NewsArticleListDto>> SearchNewsAsync(SearchQueryDto query)
    {
        if (string.IsNullOrWhiteSpace(query.Query))
            return new PagedResultDto<NewsArticleListDto> { Items = new List<NewsArticleListDto>() };

        var articles = await _unitOfWork.NewsArticles.SearchAsync(query.Query, query.Page, query.PageSize);

        return new PagedResultDto<NewsArticleListDto>
        {
            Items = articles.Select(MapToListDto).ToList(),
            Page = query.Page,
            PageSize = query.PageSize
        };
    }

    public async Task<NewsArticle> CreateNewsAsync(CreateNewsArticleDto dto)
    {
        var normalizedDto = NewsArticleIngestionHelper.Normalize(dto);
        var canonicalUrl = CanonicalUrlHelper.Normalize(normalizedDto.SourceUrl);
        var validationIssues = NewsArticleIngestionHelper.Validate(normalizedDto, canonicalUrl);
        if (validationIssues.Any())
        {
            throw new InvalidOperationException(validationIssues[0].Message);
        }

        if (canonicalUrl == null)
        {
            throw new InvalidOperationException("Article URL is invalid.");
        }

        if (await _unitOfWork.NewsArticles.ExistsByCanonicalUrlAsync(normalizedDto.SourceId, canonicalUrl))
        {
            throw new InvalidOperationException("Article with this canonical URL already exists for the source.");
        }

        var article = new NewsArticle
        {
            Title = normalizedDto.Title,
            Slug = await GenerateUniqueSlugAsync(normalizedDto.Title),
            CanonicalUrl = canonicalUrl,
            Summary = normalizedDto.Summary,
            Content = normalizedDto.Content,
            PlainText = StripHtml(normalizedDto.Content),
            SourceUrl = normalizedDto.SourceUrl,
            OriginalImageUrl = normalizedDto.OriginalImageUrl,
            Author = normalizedDto.Author,
            PublishedAt = normalizedDto.PublishedAt,
            SourceId = normalizedDto.SourceId,
            CategoryId = normalizedDto.CategoryId
        };

        // Download and store image
        if (!string.IsNullOrEmpty(normalizedDto.OriginalImageUrl))
        {
            try
            {
                article.MongoImageId = await _imageStorage.UploadImageFromUrlAsync(normalizedDto.OriginalImageUrl, 0);
                if (!string.IsNullOrEmpty(article.MongoImageId))
                {
                    article.MongoThumbId = await _imageStorage.GetThumbnailIdAsync(article.MongoImageId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to download image for article: {Url}", dto.SourceUrl);
            }
        }

        await _unitOfWork.NewsArticles.AddAsync(article);
        await _unitOfWork.SaveChangesAsync();

        // Clear related list/search caches (keys include pagination/count suffixes)
        await _cache.RemoveByPatternAsync("news:*");
        await _cache.RemoveByPatternAsync("search:*");

        return article;
    }

    public async Task<int> ImportNewsArticlesAsync(IEnumerable<CreateNewsArticleDto> articles)
    {
        var result = await ImportNewsArticlesWithReportAsync(articles);
        return result.ImportedCount;
    }

    public async Task<NewsImportResultDto> ImportNewsArticlesWithReportAsync(IEnumerable<CreateNewsArticleDto> articles)
    {
        var articlesList = articles.ToList();
        var result = new NewsImportResultDto
        {
            TotalReceived = articlesList.Count
        };

        if (!articlesList.Any())
        {
            _logger.LogInformation("No articles to import");
            return result;
        }

        await _unitOfWork.BeginTransactionAsync();

        try
        {
            _logger.LogInformation("Starting import of {Count} articles in transaction", articlesList.Count);
            var batchCanonicalKeys = new HashSet<string>(StringComparer.Ordinal);
            var batchSlugs = new HashSet<string>(StringComparer.Ordinal);

            foreach (var rawDto in articlesList)
            {
                var dto = NewsArticleIngestionHelper.Normalize(rawDto);
                var canonicalUrl = CanonicalUrlHelper.Normalize(dto.SourceUrl);
                var validationIssues = NewsArticleIngestionHelper.Validate(dto, canonicalUrl);

                if (validationIssues.Any())
                {
                    result.InvalidCount += 1;
                    result.Issues.AddRange(validationIssues);
                    continue;
                }

                if (canonicalUrl == null)
                {
                    result.InvalidCount += 1;
                    result.Issues.Add(new NewsImportIssueDto
                    {
                        Code = "INVALID_URL",
                        Message = "Failed to build canonical URL.",
                        SourceUrl = dto.SourceUrl,
                        Title = dto.Title
                    });
                    continue;
                }

                var batchCanonicalKey = $"{dto.SourceId}:{canonicalUrl}";
                if (!batchCanonicalKeys.Add(batchCanonicalKey))
                {
                    result.DuplicateCount += 1;
                    result.Issues.Add(new NewsImportIssueDto
                    {
                        Code = "DUPLICATE_IN_BATCH",
                        Message = "Article skipped because canonical URL is duplicated in this fetch batch.",
                        SourceUrl = dto.SourceUrl,
                        Title = dto.Title
                    });
                    continue;
                }

                if (await _unitOfWork.NewsArticles.ExistsByCanonicalUrlAsync(dto.SourceId, canonicalUrl))
                {
                    result.DuplicateCount += 1;
                    result.Issues.Add(new NewsImportIssueDto
                    {
                        Code = "DUPLICATE_IN_STORAGE",
                        Message = "Article skipped because canonical URL already exists for this source.",
                        SourceUrl = dto.SourceUrl,
                        Title = dto.Title
                    });
                    continue;
                }

                var article = new NewsArticle
                {
                    Title = dto.Title,
                    Slug = await GenerateUniqueSlugAsync(dto.Title, batchSlugs),
                    CanonicalUrl = canonicalUrl,
                    Summary = dto.Summary,
                    Content = dto.Content,
                    PlainText = StripHtml(dto.Content),
                    SourceUrl = dto.SourceUrl,
                    OriginalImageUrl = dto.OriginalImageUrl,
                    Author = dto.Author,
                    PublishedAt = dto.PublishedAt,
                    SourceId = dto.SourceId,
                    CategoryId = dto.CategoryId
                };

                if (!string.IsNullOrEmpty(dto.OriginalImageUrl))
                {
                    try
                    {
                        article.MongoImageId = await _imageStorage.UploadImageFromUrlAsync(dto.OriginalImageUrl, 0);
                        if (!string.IsNullOrEmpty(article.MongoImageId))
                        {
                            article.MongoThumbId = await _imageStorage.GetThumbnailIdAsync(article.MongoImageId);
                        }
                    }
                    catch (Exception imgEx)
                    {
                        _logger.LogWarning(imgEx, "Failed to download image for article: {Title}. Continuing without image.", dto.Title);
                    }
                }

                await _unitOfWork.NewsArticles.AddAsync(article);
                result.ImportedCount += 1;
            }

            await _unitOfWork.SaveChangesAsync();
            await _unitOfWork.CommitTransactionAsync();

            _logger.LogInformation(
                "Import completed: {Imported}/{Total} imported, {Duplicate} duplicates, {Invalid} invalid",
                result.ImportedCount,
                result.TotalReceived,
                result.DuplicateCount,
                result.InvalidCount);

            if (result.ImportedCount > 0)
            {
                await _cache.RemoveByPatternAsync("news:*");
                await _cache.RemoveByPatternAsync("search:*");
            }

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to import articles. Rolling back transaction.");
            await _unitOfWork.RollbackTransactionAsync();
            throw;
        }
    }

    private async Task<string> GenerateUniqueSlugAsync(string title, HashSet<string>? reservedSlugs = null)
    {
        var baseSlug = SlugHelper.GenerateSlug(title);
        if (string.IsNullOrWhiteSpace(baseSlug))
        {
            baseSlug = "article";
        }

        var normalizedBaseSlug = baseSlug.Length > 540 ? baseSlug[..540] : baseSlug;
        var candidate = normalizedBaseSlug;
        var suffix = 2;

        while ((reservedSlugs != null && reservedSlugs.Contains(candidate)) ||
               await _unitOfWork.NewsArticles.ExistsAsync(x => x.Slug == candidate))
        {
            var suffixText = $"-{suffix}";
            var maxBaseLength = 550 - suffixText.Length;
            var truncatedBase = normalizedBaseSlug.Length > maxBaseLength
                ? normalizedBaseSlug[..maxBaseLength]
                : normalizedBaseSlug;

            candidate = $"{truncatedBase}{suffixText}";
            suffix++;
        }

        reservedSlugs?.Add(candidate);
        return candidate;
    }

    private static NewsArticleListDto MapToListDto(NewsArticle article)
    {
        // Determine thumbnail URL with fallback chain
        string? thumbnailUrl = null;
        if (!string.IsNullOrEmpty(article.MongoThumbId))
        {
            thumbnailUrl = $"/api/images/{article.MongoThumbId}";
        }
        else if (!string.IsNullOrEmpty(article.OriginalImageUrl))
        {
            thumbnailUrl = article.OriginalImageUrl;
        }

        return new NewsArticleListDto
        {
            Id = article.Id,
            Title = article.Title,
            Slug = article.Slug,
            Summary = article.Summary ?? "No summary available",
            ThumbnailUrl = thumbnailUrl,
            PublishedAt = article.PublishedAt,
            SourceName = article.Source?.Name ?? "Unknown Source",
            CategoryName = article.Category?.Name
        };
    }

    private static NewsArticleDto MapToDetailDto(NewsArticle article)
    {
        // Determine image URLs with fallback chain
        string? imageUrl = null;
        if (!string.IsNullOrEmpty(article.MongoImageId))
        {
            imageUrl = $"/api/images/{article.MongoImageId}";
        }
        else if (!string.IsNullOrEmpty(article.OriginalImageUrl))
        {
            imageUrl = article.OriginalImageUrl;
        }

        string? thumbnailUrl = null;
        if (!string.IsNullOrEmpty(article.MongoThumbId))
        {
            thumbnailUrl = $"/api/images/{article.MongoThumbId}";
        }
        else if (!string.IsNullOrEmpty(article.OriginalImageUrl))
        {
            thumbnailUrl = article.OriginalImageUrl;
        }

        return new NewsArticleDto
        {
            Id = article.Id,
            Title = article.Title,
            Slug = article.Slug,
            Summary = article.Summary ?? "No summary available",
            Content = article.Content ?? "No content available",
            SourceUrl = article.SourceUrl,
            ImageUrl = imageUrl,
            ThumbnailUrl = thumbnailUrl,
            Author = article.Author,
            PublishedAt = article.PublishedAt,
            ViewCount = article.ViewCount,
            IsFeatured = article.IsFeatured,
            SourceName = article.Source?.Name ?? "Unknown Source",
            CategoryName = article.Category?.Name,
            CategorySlug = article.Category?.Slug
        };
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
