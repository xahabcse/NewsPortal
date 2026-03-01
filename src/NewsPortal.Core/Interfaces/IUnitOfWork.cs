namespace NewsPortal.Core.Interfaces;

public interface IUnitOfWork : IDisposable
{
    INewsArticleRepository NewsArticles { get; }
    ICategoryRepository Categories { get; }
    INewsSourceRepository NewsSources { get; }
    ISourceFetchJobRepository SourceFetchJobs { get; }
    IUserRepository Users { get; }
    IBookmarkRepository Bookmarks { get; }
    IReadHistoryRepository ReadHistory { get; }
    ICommentRepository Comments { get; }
    IArticleReactionRepository ArticleReactions { get; }
    ICommentVoteRepository CommentVotes { get; }
    IArticleReportRepository ArticleReports { get; }
    Task<int> SaveChangesAsync();
    Task BeginTransactionAsync();
    Task CommitTransactionAsync();
    Task RollbackTransactionAsync();
}
