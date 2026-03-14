using Microsoft.EntityFrameworkCore;
using NewsPortal.Core.Entities;
using NewsPortal.Core.Enums;
using NewsPortal.Core.Interfaces;
using NewsPortal.Repository.Data;

namespace NewsPortal.Repository.Repositories;

public class NewsSourceRepository : Repository<NewsSource>, INewsSourceRepository
{
    public NewsSourceRepository(NewsPortalDbContext context) : base(context)
    {
    }

    public async Task<NewsSource?> GetBySlugAsync(string slug)
    {
        return await _dbSet.FirstOrDefaultAsync(x => x.Slug == slug && x.IsActive);
    }

    public async Task<IEnumerable<NewsSource>> GetActiveSourcesAsync()
    {
        return await _dbSet
            .Include(x => x.ScrapingConfig)
            .Where(x => x.IsActive && x.HealthStatus != SourceHealthStatus.Disabled)
            .OrderBy(x => x.Name)
            .ToListAsync();
    }

    public async Task<IEnumerable<NewsSource>> GetAllSourcesIncludingDisabledAsync()
    {
        return await _dbSet
            .Include(x => x.ScrapingConfig)
            .Where(x => x.IsActive)
            .OrderBy(x => x.Name)
            .ToListAsync();
    }

    public async Task<Dictionary<int, int>> GetActiveSourcesWithArticleCountsAsync()
    {
        // Efficient single query using GroupJoin to get article counts
        return await _context.NewsArticles
            .Where(a => a.IsActive)
            .GroupBy(a => a.SourceId)
            .Select(g => new { SourceId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.SourceId, x => x.Count);
    }

    public async Task<NewsSource?> GetWithScrapingConfigAsync(int id)
    {
        return await _dbSet
            .Include(x => x.ScrapingConfig)
            .FirstOrDefaultAsync(x => x.Id == id);
    }

    public async Task UpdateLastFetchedAsync(int id)
    {
        // Use ExecuteUpdateAsync for efficient bulk update without loading entity
        var now = DateTime.UtcNow;
        await _dbSet
            .Where(x => x.Id == id)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(s => s.LastFetchedAt, now));
    }
}
