using NewsPortal.Core.Entities;

namespace NewsPortal.Core.Interfaces;

public interface IArticleReactionRepository : IRepository<ArticleReaction>
{
    Task<ArticleReaction?> GetByUserAndArticleAsync(int userId, int articleId);
    Task<Dictionary<string, int>> GetReactionCountsAsync(int articleId);
}
