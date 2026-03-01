using Microsoft.EntityFrameworkCore;
using NewsPortal.Core.Entities;
using NewsPortal.Core.Enums;
using NewsPortal.Core.Interfaces;
using NewsPortal.Repository.Data;

namespace NewsPortal.Repository.Repositories;

public class SourceFetchJobRepository : Repository<SourceFetchJob>, ISourceFetchJobRepository
{
    public SourceFetchJobRepository(NewsPortalDbContext context) : base(context)
    {
    }

    public async Task<SourceFetchJob?> GetByExternalIdAsync(Guid externalId)
    {
        return await _dbSet
            .Include(x => x.Source)
            .FirstOrDefaultAsync(x => x.ExternalId == externalId);
    }

    public async Task<IEnumerable<SourceFetchJob>> GetRecentBySourceIdAsync(int sourceId, int count)
    {
        return await _dbSet
            .Where(x => x.SourceId == sourceId)
            .OrderByDescending(x => x.CreatedAt)
            .Take(count)
            .ToListAsync();
    }

    public async Task<(IEnumerable<SourceFetchJob> Items, int TotalCount)> GetPagedLogsAsync(int page, int pageSize, string? statusFilter = null)
    {
        var query = _dbSet.Include(x => x.Source).AsQueryable();

        if (!string.IsNullOrEmpty(statusFilter) && statusFilter != "all"
            && Enum.TryParse<FetchJobStatus>(statusFilter, true, out var status))
        {
            query = query.Where(x => x.Status == status);
        }

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(x => x.StartedAt ?? x.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, totalCount);
    }
}

