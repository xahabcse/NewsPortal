using System.Linq.Expressions;
using NewsPortal.Core.Entities;

namespace NewsPortal.Core.Interfaces;

public interface IRepository<T> where T : BaseEntity
{
    Task<T?> GetByIdAsync(int id);
    Task<IEnumerable<T>> GetAllAsync();
    Task<IEnumerable<T>> FindAsync(Expression<Func<T, bool>> predicate);
    Task<T?> FirstOrDefaultAsync(Expression<Func<T, bool>> predicate);
    Task<T> AddAsync(T entity);
    Task<IEnumerable<T>> AddRangeAsync(IEnumerable<T> entities);
    Task UpdateAsync(T entity);
    Task DeleteAsync(T entity);
    Task<bool> ExistsAsync(Expression<Func<T, bool>> predicate);
    Task<int> CountAsync(Expression<Func<T, bool>>? predicate = null);
}

public interface INewsArticleRepository : IRepository<NewsArticle>
{
    Task<NewsArticle?> GetBySlugAsync(string slug);
    Task<IEnumerable<NewsArticle>> GetLatestAsync(int count);
    Task<IEnumerable<NewsArticle>> GetByCategoryAsync(int categoryId, int page, int pageSize);
    Task<IEnumerable<NewsArticle>> GetBySourceAsync(int sourceId, int page, int pageSize);
    Task<IEnumerable<NewsArticle>> GetFeaturedAsync(int count);
    Task<IEnumerable<NewsArticle>> GetTrendingAsync(int count, DateTime since);
    Task<IEnumerable<NewsArticle>> SearchAsync(string query, int page, int pageSize);
    Task<int> SearchCountAsync(string query);
    Task IncrementViewCountAsync(int id);
    Task<bool> ExistsBySourceUrlAsync(string sourceUrl);
    Task<bool> ExistsByCanonicalUrlAsync(int sourceId, string canonicalUrl);
    Task<IEnumerable<string>> GetRecentTitlesBySourceAsync(int sourceId, DateTime since);
    Task<IEnumerable<NewsArticle>> GetTopArticlePerCategoryPerDayAsync(int[] categoryIds, int days);
}

public interface ICategoryRepository : IRepository<Category>
{
    Task<Category?> GetBySlugAsync(string slug);
    Task<IEnumerable<Category>> GetActiveWithCountsAsync();
}

public interface INewsSourceRepository : IRepository<NewsSource>
{
    Task<NewsSource?> GetBySlugAsync(string slug);
    Task<IEnumerable<NewsSource>> GetActiveSourcesAsync();
    Task<Dictionary<int, int>> GetActiveSourcesWithArticleCountsAsync();
    Task<NewsSource?> GetWithScrapingConfigAsync(int id);
    Task UpdateLastFetchedAsync(int id);
}

public interface ISourceFetchJobRepository : IRepository<SourceFetchJob>
{
    Task<SourceFetchJob?> GetByExternalIdAsync(Guid externalId);
    Task<IEnumerable<SourceFetchJob>> GetRecentBySourceIdAsync(int sourceId, int count);
    Task<(IEnumerable<SourceFetchJob> Items, int TotalCount)> GetPagedLogsAsync(int page, int pageSize, string? statusFilter = null);
}

public interface INewsFetchLogRepository
{
    Task<NewsFetchLog> AddAsync(NewsFetchLog log);
    Task<IEnumerable<NewsFetchLog>> GetAllAsync(int page, int pageSize);
    Task<IEnumerable<NewsFetchLog>> GetBySourceIdAsync(int sourceId, int page, int pageSize);
    Task<NewsFetchLog?> GetByIdAsync(string id);
    Task<long> GetTotalCountAsync();
    Task<IEnumerable<NewsFetchLog>> GetRecentAsync(int count);
    Task<IEnumerable<NewsFetchLog>> GetFailedLogsAsync(int page, int pageSize);
}

public interface IBookmarkRepository : IRepository<UserBookmark>
{
    Task<UserBookmark?> GetByUserAndArticleAsync(int userId, int articleId);
    Task<IEnumerable<UserBookmark>> GetByUserIdAsync(int userId, int page, int pageSize);
    Task<bool> ExistsAsync(int userId, int articleId);
    Task<int> GetCountByUserIdAsync(int userId);
}

public interface IReadHistoryRepository : IRepository<UserReadHistory>
{
    Task<UserReadHistory?> GetByUserAndArticleAsync(int userId, int articleId);
    Task<IEnumerable<UserReadHistory>> GetByUserIdAsync(int userId, int limit = 50);
    Task<bool> ExistsAsync(int userId, int articleId);
    Task UpsertAsync(int userId, int articleId);
}

public interface ICommentRepository : IRepository<Comment>
{
    Task<IEnumerable<Comment>> GetByArticleAsync(int articleId);
    Task<Comment?> GetByIdAsync(int id);
}
