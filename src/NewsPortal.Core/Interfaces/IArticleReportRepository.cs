using NewsPortal.Core.Entities;

namespace NewsPortal.Core.Interfaces;

public interface IArticleReportRepository : IRepository<ArticleReport>
{
    Task<ArticleReport?> GetByUserAndArticleAsync(int userId, int articleId);
    Task<IEnumerable<ArticleReport>> GetPendingReportsAsync(int page, int pageSize);
    Task<int> GetPendingCountAsync();
}
