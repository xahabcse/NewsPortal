using Microsoft.Extensions.Logging;
using NewsPortal.Service.Helpers;
using NewsPortal.Core.Constants;
using NewsPortal.Core.DTOs;
using NewsPortal.Core.Entities;
using NewsPortal.Core.Interfaces;
using NewsPortal.Core.Monitoring;

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
    Task<IEnumerable<NewsArticleListDto>> GetTrendingNewsAsync(int count, int hours = 24);
    Task<IEnumerable<NewsArticleListDto>> GetRelatedNewsAsync(string slug, int count);
    Task<int> GetArticlesCountTodayAsync();
    Task<IEnumerable<DailyHighlightDto>> GetDailyHighlightsAsync(int days = 7);
    Task<PagedResultDto<NewsArticleListDto>> GetFilteredNewsAsync(NewsFilterQuery filter);
}

public class NewsService : INewsService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICacheService _cache;
    private readonly IImageStorageService _imageStorage;
    private readonly IContentScraperService _contentScraper;
    private readonly ILogger<NewsService> _logger;

    public NewsService(
        IUnitOfWork unitOfWork,
        ICacheService cache,
        IImageStorageService imageStorage,
        IContentScraperService contentScraper,
        ILogger<NewsService> logger)
    {
        _unitOfWork = unitOfWork;
        _cache = cache;
        _imageStorage = imageStorage;
        _contentScraper = contentScraper;
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
        try
        {
            if (string.IsNullOrWhiteSpace(slug))
                return null;

            var cacheKey = CacheKeys.NewsArticleBySlug(slug);

            // Cache the DTO (not the entity) to avoid circular reference serialization issues
            var dto = await _cache.GetOrSetAsync(cacheKey, async () =>
            {
                _logger.LogDebug("Fetching news article detail from DB for slug: {Slug}", slug);
                var article = await _unitOfWork.NewsArticles.GetBySlugAsync(slug);
                if (article == null)
                    return null;

                return MapToDetailDto(article);
            }, CacheDurations.Medium);

            if (dto == null)
            {
                _logger.LogInformation("News article not found for slug: {Slug}", slug);
                return null;
            }

            // Lazy content fetching: if content is missing, scrape it from source URL
            if (IsContentMissing(dto.Content) && !string.IsNullOrWhiteSpace(dto.SourceUrl))
            {
                _logger.LogInformation("Content missing for article {Slug}, attempting lazy scrape from {Url}", slug, dto.SourceUrl);

                var scrapedContent = await _contentScraper.ScrapeFullContentAsync(dto.SourceUrl);

                if (!string.IsNullOrWhiteSpace(scrapedContent))
                {
                    // Update the article in DB
                    var article = await _unitOfWork.NewsArticles.GetBySlugAsync(slug);
                    if (article != null)
                    {
                        article.Content = scrapedContent;
                        article.PlainText = StripHtml(scrapedContent);
                        await _unitOfWork.NewsArticles.UpdateAsync(article);
                        await _unitOfWork.SaveChangesAsync();

                        // Update the DTO and invalidate cache
                        dto.Content = scrapedContent;
                        await _cache.RemoveAsync(cacheKey);

                        _logger.LogInformation("Successfully lazy-fetched and saved content for article {Slug}", slug);
                    }
                }
                else
                {
                    _logger.LogWarning("Lazy scrape returned no content for article {Slug}", slug);
                }
            }

            // Increment view count asynchronously with proper error handling
            _ = Task.Run(async () =>
            {
                try
                {
                    await _unitOfWork.NewsArticles.IncrementViewCountAsync(dto.Id);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to increment view count for article {ArticleId}", dto.Id);
                }
            });

            return dto;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while getting news detail for slug: {Slug}", slug);
            throw;
        }
    }

    private static bool IsContentMissing(string? content)
    {
        return string.IsNullOrWhiteSpace(content)
            || content == "No content available";
    }

    public async Task<IEnumerable<NewsArticleListDto>> GetFeaturedNewsAsync(int count)
    {
        return await _cache.GetOrSetAsync($"{CacheKeys.FeaturedNews}:{count}", async () =>
        {
            var articles = await _unitOfWork.NewsArticles.GetFeaturedAsync(count);
            return articles.Select(MapToListDto).ToList();
        }, CacheDurations.Short);
    }

    public async Task<IEnumerable<NewsArticleListDto>> GetTrendingNewsAsync(int count, int hours = 24)
    {
        var cacheKey = $"{CacheKeys.TrendingNews}:{count}:{hours}";

        return await _cache.GetOrSetAsync(cacheKey, async () =>
        {
            var since = DateTime.UtcNow.AddHours(-hours);
            var articles = await _unitOfWork.NewsArticles.GetTrendingAsync(count, since);
            return articles.Select(MapToListDto).ToList();
        }, CacheDurations.Short);
    }

    public async Task<PagedResultDto<NewsArticleListDto>> SearchNewsAsync(SearchQueryDto query)
    {
        if (string.IsNullOrWhiteSpace(query.Query))
            return new PagedResultDto<NewsArticleListDto> { Items = new List<NewsArticleListDto>() };

        var articles = await _unitOfWork.NewsArticles.SearchAsync(query.Query, query.Page, query.PageSize);
        var totalCount = await _unitOfWork.NewsArticles.SearchCountAsync(query.Query);

        // Apply optional filters
        var filtered = articles.AsEnumerable();
        if (query.CategoryId.HasValue)
            filtered = filtered.Where(a => a.CategoryId == query.CategoryId.Value);
        if (query.SourceId.HasValue)
            filtered = filtered.Where(a => a.SourceId == query.SourceId.Value);
        if (query.FromDate.HasValue)
            filtered = filtered.Where(a => (a.PublishedAt ?? a.FetchedAt) >= query.FromDate.Value);
        if (query.ToDate.HasValue)
            filtered = filtered.Where(a => (a.PublishedAt ?? a.FetchedAt) <= query.ToDate.Value);

        return new PagedResultDto<NewsArticleListDto>
        {
            Items = filtered.Select(MapToListDto).ToList(),
            TotalCount = totalCount,
            Page = query.Page,
            PageSize = query.PageSize
        };
    }

    public async Task<IEnumerable<NewsArticleListDto>> GetRelatedNewsAsync(string slug, int count)
    {
        var currentArticle = await _unitOfWork.NewsArticles.GetBySlugAsync(slug);
        if (currentArticle == null || !currentArticle.CategoryId.HasValue)
            return Enumerable.Empty<NewsArticleListDto>();

        // Get articles from the same category, excluding current article
        var relatedArticles = await _unitOfWork.NewsArticles.GetByCategoryAsync(
            currentArticle.CategoryId.Value,
            1,
            count + 5 // Get extra to filter out current
        );

        // Filter out current article and limit to count
        return relatedArticles
            .Where(a => a.Id != currentArticle.Id)
            .Take(count)
            .Select(MapToListDto)
            .ToList();
    }

    public async Task<int> GetArticlesCountTodayAsync()
    {
        var today = DateTime.UtcNow.Date;
        return await _unitOfWork.NewsArticles.CountAsync(x => x.FetchedAt >= today && x.IsActive);
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
            CategoryId = normalizedDto.CategoryId ?? ArticleCategorizer.Categorize(normalizedDto.Title, normalizedDto.Summary, normalizedDto.SourceUrl)
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

        // Clear related list/search/category caches
        await _cache.RemoveByPatternAsync("news:*");
        await _cache.RemoveByPatternAsync("search:*");
        await _cache.RemoveByPatternAsync("categories:*");

        AppMetrics.TotalNewsArticles.Inc();

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

            var sourceIds = articlesList.Select(a => a.SourceId).Distinct().ToList();
            var recentTitlesBySource = new Dictionary<int, List<string>>();
            var since = DateTime.UtcNow.AddHours(-48);
            foreach (var sid in sourceIds)
            {
                var titles = (await _unitOfWork.NewsArticles.GetRecentTitlesBySourceAsync(sid, since)).ToList();
                recentTitlesBySource[sid] = titles;
            }

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

                if (recentTitlesBySource.TryGetValue(dto.SourceId, out var existingTitles))
                {
                    var nearDupes = TitleSimilarityHelper.FindNearDuplicates(dto.Title, existingTitles);
                    if (nearDupes.Count > 0)
                    {
                        result.NearDuplicateCount += 1;
                        result.Issues.Add(new NewsImportIssueDto
                        {
                            Code = "NEAR_DUPLICATE_TITLE",
                            Message = $"Title is near-duplicate of existing article: '{nearDupes[0][..Math.Min(80, nearDupes[0].Length)]}'",
                            SourceUrl = dto.SourceUrl,
                            Title = dto.Title
                        });
                    }
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
                    CategoryId = dto.CategoryId ?? ArticleCategorizer.Categorize(dto.Title, dto.Summary, dto.SourceUrl)
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

                if (recentTitlesBySource.TryGetValue(dto.SourceId, out var titleList))
                    titleList.Add(dto.Title);
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
                await _cache.RemoveByPatternAsync("categories:*");

                AppMetrics.TotalNewsArticles.Inc(result.ImportedCount);
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

    public async Task<PagedResultDto<NewsArticleListDto>> GetFilteredNewsAsync(NewsFilterQuery filter)
    {
        var (articles, total) = await _unitOfWork.NewsArticles.GetFilteredAsync(filter);

        return new PagedResultDto<NewsArticleListDto>
        {
            Items = articles.Select(MapToListDto).ToList(),
            TotalCount = total,
            Page = filter.Page,
            PageSize = filter.PageSize
        };
    }

    public async Task<IEnumerable<DailyHighlightDto>> GetDailyHighlightsAsync(int days = 7)
    {
        var cacheKey = $"{CacheKeys.DailyHighlights}:{days}";

        return await _cache.GetOrSetAsync(cacheKey, async () =>
        {
            // Fetch all categorized articles across ALL categories for the last N days
            var allCandidates = await _unitOfWork.NewsArticles
                .GetTopArticlePerCategoryPerDayAsync(days);

            const int maxPerCategoryPerDay = 3;

            // Group by date, then within each day group by category
            var byDate = allCandidates
                .GroupBy(a => (a.PublishedAt ?? a.FetchedAt).Date)
                .OrderByDescending(g => g.Key);

            var result = new List<DailyHighlightDto>();

            foreach (var dayGroup in byDate)
            {
                // Dedup titles within this day only (reset per day)
                var usedTitles = new List<string>();
                var selectedArticles = new List<NewsArticle>();

                // Group by category within the day, maintain category sort order
                var byCategory = dayGroup
                    .GroupBy(a => a.CategoryId!.Value)
                    .OrderBy(g => g.Key);

                foreach (var catGroup in byCategory)
                {
                    var picked = 0;
                    foreach (var article in catGroup)
                    {
                        if (picked >= maxPerCategoryPerDay) break;
                        if (!TitleSimilarityHelper.FindNearDuplicates(article.Title, usedTitles, 0.85).Any())
                        {
                            usedTitles.Add(article.Title);
                            selectedArticles.Add(article);
                            picked++;
                        }
                    }
                }

                if (selectedArticles.Count > 0)
                {
                    result.Add(new DailyHighlightDto
                    {
                        Date = dayGroup.Key,
                        Highlights = selectedArticles.Select(x => new CategoryHighlightDto
                        {
                            CategoryId = x.CategoryId!.Value,
                            CategoryName = x.Category?.Name ?? "Unknown",
                            CategoryNameBn = x.Category?.NameBn ?? "",
                            CategorySlug = x.Category?.Slug ?? "",
                            CategoryIcon = x.Category?.Icon,
                            CategoryColor = x.Category?.Color,
                            ArticleId = x.Id,
                            Title = x.Title,
                            Slug = x.Slug,
                            Summary = x.Summary,
                            SourceId = x.SourceId,
                            SourceName = x.Source?.Name ?? "Unknown Source",
                            PublishedAt = x.PublishedAt,
                            ViewCount = x.ViewCount
                        })
                        .OrderBy(h => h.CategoryId)
                        .ToList()
                    });
                }
            }

            return result;
        }, CacheDurations.Medium);
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
            SourceUrl = article.SourceUrl,
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
