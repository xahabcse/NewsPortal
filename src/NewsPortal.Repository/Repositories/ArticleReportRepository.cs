using Microsoft.EntityFrameworkCore;
using NewsPortal.Core.Entities;
using NewsPortal.Core.Interfaces;
using NewsPortal.Repository.Data;

namespace NewsPortal.Repository.Repositories;

public class ArticleReportRepository : Repository<ArticleReport>, IArticleReportRepository
{
    public ArticleReportRepository(NewsPortalDbContext context) : base(context) { }

    public async Task<ArticleReport?> GetByUserAndArticleAsync(int userId, int articleId)
    {
        return await _dbSet.FirstOrDefaultAsync(r => r.UserId == userId && r.ArticleId == articleId);
    }

    public async Task<IEnumerable<ArticleReport>> GetPendingReportsAsync(int page, int pageSize)
    {
        return await _dbSet
            .Where(r => r.Status == ReportStatus.Pending)
            .Include(r => r.User)
            .Include(r => r.Article)
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
    }

    public async Task<int> GetPendingCountAsync()
    {
        return await _dbSet.CountAsync(r => r.Status == ReportStatus.Pending);
    }
}
