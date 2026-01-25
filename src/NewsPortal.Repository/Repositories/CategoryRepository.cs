using Microsoft.EntityFrameworkCore;
using NewsPortal.Core.Entities;
using NewsPortal.Core.Interfaces;
using NewsPortal.Repository.Data;

namespace NewsPortal.Repository.Repositories;

public class CategoryRepository : Repository<Category>, ICategoryRepository
{
    public CategoryRepository(NewsPortalDbContext context) : base(context)
    {
    }

    public async Task<Category?> GetBySlugAsync(string slug)
    {
        return await _dbSet.FirstOrDefaultAsync(x => x.Slug == slug && x.IsActive);
    }

    public async Task<IEnumerable<Category>> GetActiveWithCountsAsync()
    {
        return await _dbSet
            .Where(x => x.IsActive)
            .OrderBy(x => x.SortOrder)
            .Select(c => new Category
            {
                Id = c.Id,
                Name = c.Name,
                NameBn = c.NameBn,
                Slug = c.Slug,
                Description = c.Description,
                Icon = c.Icon,
                Color = c.Color,
                SortOrder = c.SortOrder,
                IsActive = c.IsActive,
                Articles = c.Articles.Where(a => a.IsActive).ToList()
            })
            .ToListAsync();
    }
}
