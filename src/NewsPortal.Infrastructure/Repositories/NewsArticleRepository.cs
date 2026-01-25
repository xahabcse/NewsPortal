using Microsoft.EntityFrameworkCore;
using NewsPortal.Core.Entities;
using NewsPortal.Core.Interfaces;
using NewsPortal.Infrastructure.Data;

namespace NewsPortal.Infrastructure.Repositories;

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

    public async Task<IEnumerable<NewsArticle>> SearchAsync(string query, int page, int pageSize)
    {
        var lowerQuery = query.ToLower();
        return await _dbSet
            .Include(x => x.Source)
            .Include(x => x.Category)
            .Where(x => x.IsActive &&
                (x.Title.ToLower().Contains(lowerQuery) ||
                 (x.Summary != null && x.Summary.ToLower().Contains(lowerQuery)) ||
                 (x.PlainText != null && x.PlainText.ToLower().Contains(lowerQuery))))
            .OrderByDescending(x => x.PublishedAt ?? x.FetchedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
    }

    public async Task IncrementViewCountAsync(int id)
    {
        await _context.Database.ExecuteSqlRawAsync(
            "UPDATE news_articles SET \"ViewCount\" = \"ViewCount\" + 1 WHERE \"Id\" = {0}", id);
    }

    public async Task<bool> ExistsBySourceUrlAsync(string sourceUrl)
    {
        return await _dbSet.AnyAsync(x => x.SourceUrl == sourceUrl);
    }
}
