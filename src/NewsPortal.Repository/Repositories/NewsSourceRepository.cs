using Microsoft.EntityFrameworkCore;
using NewsPortal.Core.Entities;
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
            .Where(x => x.IsActive)
            .OrderBy(x => x.Name)
            .ToListAsync();
    }

    public async Task<NewsSource?> GetWithScrapingConfigAsync(int id)
    {
        return await _dbSet
            .Include(x => x.ScrapingConfig)
            .FirstOrDefaultAsync(x => x.Id == id);
    }

    public async Task UpdateLastFetchedAsync(int id)
    {
        await _context.Database.ExecuteSqlRawAsync(
            "UPDATE news_sources SET \"LastFetchedAt\" = {0} WHERE \"Id\" = {1}",
            DateTime.UtcNow, id);
    }
}
