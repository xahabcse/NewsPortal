using Microsoft.EntityFrameworkCore;
using NewsPortal.Core.Entities;
using NewsPortal.Core.Interfaces;
using NewsPortal.Repository.Data;

namespace NewsPortal.Repository.Repositories;

public class ArticleReactionRepository : Repository<ArticleReaction>, IArticleReactionRepository
{
    public ArticleReactionRepository(NewsPortalDbContext context) : base(context) { }

    public async Task<ArticleReaction?> GetByUserAndArticleAsync(int userId, int articleId)
    {
        return await _dbSet.FirstOrDefaultAsync(r => r.UserId == userId && r.ArticleId == articleId && r.IsActive);
    }

    public async Task<Dictionary<string, int>> GetReactionCountsAsync(int articleId)
    {
        return await _dbSet
            .Where(r => r.ArticleId == articleId && r.IsActive)
            .GroupBy(r => r.ReactionType)
            .ToDictionaryAsync(g => g.Key, g => g.Count());
    }
}
