using Microsoft.EntityFrameworkCore;
using NewsPortal.Core.Entities;
using NewsPortal.Core.Interfaces;
using NewsPortal.Repository.Data;

namespace NewsPortal.Repository.Repositories;

public class BookmarkRepository : Repository<UserBookmark>, IBookmarkRepository
{
    public BookmarkRepository(NewsPortalDbContext context) : base(context)
    {
    }

    public async Task<UserBookmark?> GetByUserAndArticleAsync(int userId, int articleId)
    {
        return await _dbSet
            .Include(b => b.Article)
                .ThenInclude(a => a.Source)
            .Include(b => b.Article)
                .ThenInclude(a => a.Category)
            .FirstOrDefaultAsync(b => b.UserId == userId && b.ArticleId == articleId);
    }

    public async Task<IEnumerable<UserBookmark>> GetByUserIdAsync(int userId, int page, int pageSize)
    {
        return await _dbSet
            .Include(b => b.Article)
                .ThenInclude(a => a.Source)
            .Include(b => b.Article)
                .ThenInclude(a => a.Category)
            .Where(b => b.UserId == userId)
            .OrderByDescending(b => b.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
    }

    public async Task<bool> ExistsAsync(int userId, int articleId)
    {
        return await _dbSet.AnyAsync(b => b.UserId == userId && b.ArticleId == articleId);
    }

    public async Task<int> GetCountByUserIdAsync(int userId)
    {
        return await _dbSet.CountAsync(b => b.UserId == userId);
    }
}
