using Microsoft.EntityFrameworkCore;
using NewsPortal.Core.Entities;
using NewsPortal.Core.Interfaces;
using NewsPortal.Repository.Data;

namespace NewsPortal.Repository.Repositories;

public class CommentRepository : Repository<Comment>, ICommentRepository
{
    public CommentRepository(NewsPortalDbContext context) : base(context)
    {
    }

    public async Task<IEnumerable<Comment>> GetByArticleAsync(int articleId)
    {
        return await _dbSet
            .Include(c => c.User)
            .Include(c => c.Replies)
                .ThenInclude(r => r.User)
            .Where(c => c.ArticleId == articleId && c.IsApproved && !c.IsDeleted)
            .OrderBy(c => c.CreatedAt)
            .ToListAsync();
    }

    public new async Task<Comment?> GetByIdAsync(int id)
    {
        return await _dbSet
            .Include(c => c.User)
            .FirstOrDefaultAsync(c => c.Id == id);
    }
}
