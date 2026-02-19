using Microsoft.EntityFrameworkCore;
using NewsPortal.Core.Entities;
using NewsPortal.Core.Interfaces;
using NewsPortal.Repository.Data;

namespace NewsPortal.Repository.Repositories;

public class ReadHistoryRepository : Repository<UserReadHistory>, IReadHistoryRepository
{
    public ReadHistoryRepository(NewsPortalDbContext context) : base(context)
    {
    }

    public async Task<UserReadHistory?> GetByUserAndArticleAsync(int userId, int articleId)
    {
        return await _dbSet
            .Include(h => h.Article)
                .ThenInclude(a => a.Source)
            .Include(h => h.Article)
                .ThenInclude(a => a.Category)
            .FirstOrDefaultAsync(h => h.UserId == userId && h.ArticleId == articleId);
    }

    public async Task<IEnumerable<UserReadHistory>> GetByUserIdAsync(int userId, int limit = 50)
    {
        return await _dbSet
            .Include(h => h.Article)
                .ThenInclude(a => a.Source)
            .Include(h => h.Article)
                .ThenInclude(a => a.Category)
            .Where(h => h.UserId == userId)
            .OrderByDescending(h => h.ReadAt)
            .Take(limit)
            .ToListAsync();
    }

    public async Task<bool> ExistsAsync(int userId, int articleId)
    {
        return await _dbSet.AnyAsync(h => h.UserId == userId && h.ArticleId == articleId);
    }

    public async Task UpsertAsync(int userId, int articleId)
    {
        var existing = await _dbSet.FirstOrDefaultAsync(h => h.UserId == userId && h.ArticleId == articleId);
        
        if (existing != null)
        {
            // Update existing - refresh the read timestamp
            existing.ReadAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
        else
        {
            // Insert new
            var history = new UserReadHistory
            {
                UserId = userId,
                ArticleId = articleId
            };
            await _dbSet.AddAsync(history);
            await _context.SaveChangesAsync();
        }
    }
}
