using Microsoft.EntityFrameworkCore;
using NewsPortal.Core.Entities;
using NewsPortal.Core.Interfaces;
using NewsPortal.Repository.Data;

namespace NewsPortal.Repository.Repositories;

public class NewsArticleRepository : Repository<NewsArticle>, INewsArticleRepository
{
    public NewsArticleRepository(NewsPortalDbContext context) : base(context)
    {
    }

    public async Task<NewsArticle?> GetBySlugAsync(string slug)
    {
        return await _dbSet
            .Include(x => x.Source)
            .Include(x => x.Category)
            .FirstOrDefaultAsync(x => x.Slug == slug && x.IsActive);
    }

    public async Task<IEnumerable<NewsArticle>> GetLatestAsync(int count)
    {
        return await _dbSet
            .Include(x => x.Source)
            .Include(x => x.Category)
            .Where(x => x.IsActive)
            .OrderByDescending(x => x.PublishedAt ?? x.FetchedAt)
            .Take(count)
            .ToListAsync();
    }

    public async Task<IEnumerable<NewsArticle>> GetByCategoryAsync(int categoryId, int page, int pageSize)
    {
        return await _dbSet
            .Include(x => x.Source)
            .Include(x => x.Category)
            .Where(x => x.CategoryId == categoryId && x.IsActive)
            .OrderByDescending(x => x.PublishedAt ?? x.FetchedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
    }

    public async Task<IEnumerable<NewsArticle>> GetBySourceAsync(int sourceId, int page, int pageSize)
    {
        return await _dbSet
            .Include(x => x.Source)
            .Include(x => x.Category)
            .Where(x => x.SourceId == sourceId && x.IsActive)
            .OrderByDescending(x => x.PublishedAt ?? x.FetchedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
    }

    public async Task<IEnumerable<NewsArticle>> GetFeaturedAsync(int count)
    {
        return await _dbSet
            .Include(x => x.Source)
            .Include(x => x.Category)
            .Where(x => x.IsFeatured && x.IsActive)
            .OrderByDescending(x => x.PublishedAt ?? x.FetchedAt)
            .Take(count)
            .ToListAsync();
    }

    public async Task<IEnumerable<NewsArticle>> GetTrendingAsync(int count, DateTime since)
    {
        // Get articles with highest view count in the specified time period
        return await _dbSet
            .Include(x => x.Source)
            .Include(x => x.Category)
            .Where(x => x.IsActive && x.FetchedAt >= since)
            .OrderByDescending(x => x.ViewCount)
            .ThenByDescending(x => x.PublishedAt ?? x.FetchedAt)
            .Take(count)
            .ToListAsync();
    }

    public async Task<IEnumerable<NewsArticle>> SearchAsync(string query, int page, int pageSize)
    {
        // Use PostgreSQL ILIKE for case-insensitive search (more efficient than ToLower().Contains())
        var searchPattern = $"%{query}%";
        return await _dbSet
            .Include(x => x.Source)
            .Include(x => x.Category)
            .Where(x => x.IsActive &&
                (EF.Functions.ILike(x.Title, searchPattern) ||
                 (x.Summary != null && EF.Functions.ILike(x.Summary, searchPattern)) ||
                 (x.PlainText != null && EF.Functions.ILike(x.PlainText, searchPattern))))
            .OrderByDescending(x => x.PublishedAt ?? x.FetchedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
    }

    public async Task<int> SearchCountAsync(string query)
    {
        var searchPattern = $"%{query}%";
        return await _dbSet
            .CountAsync(x => x.IsActive &&
                (EF.Functions.ILike(x.Title, searchPattern) ||
                 (x.Summary != null && EF.Functions.ILike(x.Summary, searchPattern)) ||
                 (x.PlainText != null && EF.Functions.ILike(x.PlainText, searchPattern))));
    }

    public async Task IncrementViewCountAsync(int id)
    {
        // Use ExecuteUpdateAsync for efficient bulk update without loading entity
        await _dbSet
            .Where(x => x.Id == id)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(a => a.ViewCount, a => a.ViewCount + 1));
    }

    public async Task<bool> ExistsBySourceUrlAsync(string sourceUrl)
    {
        return await _dbSet.AnyAsync(x => x.SourceUrl == sourceUrl);
    }

    public async Task<bool> ExistsByCanonicalUrlAsync(int sourceId, string canonicalUrl)
    {
        return await _dbSet.AnyAsync(x => x.SourceId == sourceId && x.CanonicalUrl == canonicalUrl);
    }

    public async Task<IEnumerable<string>> GetRecentTitlesBySourceAsync(int sourceId, DateTime since)
    {
        return await _dbSet
            .Where(x => x.SourceId == sourceId && x.FetchedAt >= since)
            .Select(x => x.Title)
            .ToListAsync();
    }

    public async Task<(IEnumerable<NewsArticle> Items, int Total)> GetFilteredAsync(NewsPortal.Core.DTOs.NewsFilterQuery filter)
    {
        var query = _dbSet
            .Include(x => x.Source)
            .Include(x => x.Category)
            .Where(x => x.IsActive)
            .AsQueryable();

        if (filter.SourceIds.Length > 0)
            query = query.Where(x => filter.SourceIds.Contains(x.SourceId));

        if (filter.CategoryIds.Length > 0)
            query = query.Where(x => x.CategoryId.HasValue && filter.CategoryIds.Contains(x.CategoryId.Value));

        if (!string.IsNullOrEmpty(filter.DateFrom) &&
            DateTime.TryParse(filter.DateFrom, System.Globalization.CultureInfo.InvariantCulture,
                System.Globalization.DateTimeStyles.None, out var fromDate))
        {
            var fromUtc = DateTime.SpecifyKind(fromDate, DateTimeKind.Utc);
            query = query.Where(x => (x.PublishedAt ?? x.FetchedAt) >= fromUtc);
        }

        if (!string.IsNullOrEmpty(filter.DateTo) &&
            DateTime.TryParse(filter.DateTo, System.Globalization.CultureInfo.InvariantCulture,
                System.Globalization.DateTimeStyles.None, out var toDate))
        {
            var toUtc = DateTime.SpecifyKind(toDate.AddDays(1), DateTimeKind.Utc);
            query = query.Where(x => (x.PublishedAt ?? x.FetchedAt) < toUtc);
        }

        if (filter.HasThumbnail)
            query = query.Where(x => x.OriginalImageUrl != null && x.OriginalImageUrl != "");

        query = filter.SortBy switch
        {
            "oldest"    => query.OrderBy(x => x.PublishedAt ?? x.FetchedAt),
            "mostviewed" => query.OrderByDescending(x => x.ViewCount).ThenByDescending(x => x.PublishedAt ?? x.FetchedAt),
            _           => query.OrderByDescending(x => x.PublishedAt ?? x.FetchedAt)
        };

        var total = await query.CountAsync();
        var items = await query
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .ToListAsync();

        return (items, total);
    }

    public async Task<IEnumerable<NewsArticle>> GetTopArticlePerCategoryPerDayAsync(int days)
    {
        var since = DateTime.UtcNow.Date.AddDays(-(days - 1));

        return await _dbSet
            .Include(x => x.Source)
            .Include(x => x.Category)
            .Where(x => x.IsActive
                && x.CategoryId.HasValue
                && (x.PublishedAt ?? x.FetchedAt) >= since)
            .OrderByDescending(x => x.ViewCount)
            .ThenByDescending(x => x.PublishedAt ?? x.FetchedAt)
            .ToListAsync();
    }
}
