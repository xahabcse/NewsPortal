using Microsoft.EntityFrameworkCore;
using NewsPortal.Core.Entities;
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
}

