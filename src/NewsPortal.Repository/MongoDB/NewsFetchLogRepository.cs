using MongoDB.Driver;
using NewsPortal.Core.Entities;
using NewsPortal.Core.Interfaces;

namespace NewsPortal.Repository.MongoDB;

public class NewsFetchLogRepository : INewsFetchLogRepository
{
    private readonly IMongoCollection<NewsFetchLog> _collection;

    public NewsFetchLogRepository(IMongoDatabase database)
    {
        _collection = database.GetCollection<NewsFetchLog>("NewsFetchLogs");
    }

    public async Task<NewsFetchLog> AddAsync(NewsFetchLog log)
    {
        await _collection.InsertOneAsync(log);
        return log;
    }

    public async Task<IEnumerable<NewsFetchLog>> GetAllAsync(int page, int pageSize)
    {
        return await _collection.Find(_ => true)
            .SortByDescending(x => x.FetchedAt)
            .Skip((page - 1) * pageSize)
            .Limit(pageSize)
            .ToListAsync();
    }

    public async Task<IEnumerable<NewsFetchLog>> GetBySourceIdAsync(int sourceId, int page, int pageSize)
    {
        return await _collection.Find(x => x.SourceId == sourceId)
            .SortByDescending(x => x.FetchedAt)
            .Skip((page - 1) * pageSize)
            .Limit(pageSize)
            .ToListAsync();
    }

    public async Task<NewsFetchLog?> GetByIdAsync(string id)
    {
        return await _collection.Find(x => x.Id == id).FirstOrDefaultAsync();
    }

    public async Task<long> GetTotalCountAsync()
    {
        return await _collection.CountDocumentsAsync(_ => true);
    }

    public async Task<IEnumerable<NewsFetchLog>> GetRecentAsync(int count)
    {
        return await _collection.Find(_ => true)
            .SortByDescending(x => x.FetchedAt)
            .Limit(count)
            .ToListAsync();
    }

    public async Task<IEnumerable<NewsFetchLog>> GetFailedLogsAsync(int page, int pageSize)
    {
        return await _collection.Find(x => !x.Success)
            .SortByDescending(x => x.FetchedAt)
            .Skip((page - 1) * pageSize)
            .Limit(pageSize)
            .ToListAsync();
    }
}
