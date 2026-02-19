using Microsoft.EntityFrameworkCore.Storage;
using NewsPortal.Core.Interfaces;
using NewsPortal.Repository.Data;

namespace NewsPortal.Repository.Repositories;

public class UnitOfWork : IUnitOfWork
{
    private readonly NewsPortalDbContext _context;
    private IDbContextTransaction? _transaction;

    private INewsArticleRepository? _newsArticles;
    private ICategoryRepository? _categories;
    private INewsSourceRepository? _newsSources;
    private ISourceFetchJobRepository? _sourceFetchJobs;
    private IUserRepository? _users;
    private IBookmarkRepository? _bookmarks;
    private IReadHistoryRepository? _readHistory;

    public UnitOfWork(NewsPortalDbContext context)
    {
        _context = context;
    }

    public INewsArticleRepository NewsArticles =>
        _newsArticles ??= new NewsArticleRepository(_context);

    public ICategoryRepository Categories =>
        _categories ??= new CategoryRepository(_context);

    public INewsSourceRepository NewsSources =>
        _newsSources ??= new NewsSourceRepository(_context);

    public ISourceFetchJobRepository SourceFetchJobs =>
        _sourceFetchJobs ??= new SourceFetchJobRepository(_context);

    public IUserRepository Users =>
        _users ??= new UserRepository(_context);

    public IBookmarkRepository Bookmarks =>
        _bookmarks ??= new BookmarkRepository(_context);

    public IReadHistoryRepository ReadHistory =>
        _readHistory ??= new ReadHistoryRepository(_context);

    public async Task<int> SaveChangesAsync()
    {
        return await _context.SaveChangesAsync();
    }

    public async Task BeginTransactionAsync()
    {
        _transaction = await _context.Database.BeginTransactionAsync();
    }

    public async Task CommitTransactionAsync()
    {
        if (_transaction != null)
        {
            await _transaction.CommitAsync();
            await _transaction.DisposeAsync();
            _transaction = null;
        }
    }

    public async Task RollbackTransactionAsync()
    {
        if (_transaction != null)
        {
            await _transaction.RollbackAsync();
            await _transaction.DisposeAsync();
            _transaction = null;
        }
    }

    public void Dispose()
    {
        _transaction?.Dispose();
        _context.Dispose();
    }
}
