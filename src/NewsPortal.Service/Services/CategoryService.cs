using NewsPortal.Service.Helpers;
using NewsPortal.Core.Constants;
using NewsPortal.Core.DTOs;
using NewsPortal.Core.Entities;
using NewsPortal.Core.Interfaces;

namespace NewsPortal.Service.Services;

public interface ICategoryService
{
    Task<IEnumerable<CategoryDto>> GetAllCategoriesAsync();
    Task<CategoryDto?> GetCategoryBySlugAsync(string slug);
    Task<Category> CreateCategoryAsync(CreateCategoryDto dto);
    Task UpdateCategoryAsync(int id, CreateCategoryDto dto);
    Task DeleteCategoryAsync(int id);
}

public class CategoryService : ICategoryService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICacheService _cache;

    public CategoryService(IUnitOfWork unitOfWork, ICacheService cache)
    {
        _unitOfWork = unitOfWork;
        _cache = cache;
    }

    public async Task<IEnumerable<CategoryDto>> GetAllCategoriesAsync()
    {
        return await _cache.GetOrSetAsync(CacheKeys.Categories, async () =>
        {
            var categories = await _unitOfWork.Categories.GetActiveWithCountsAsync();
            return categories.Select(c => new CategoryDto
            {
                Id = c.Id,
                Name = c.Name,
                NameBn = c.NameBn,
                Slug = c.Slug,
                Description = c.Description,
                Icon = c.Icon,
                Color = c.Color,
                ArticleCount = c.Articles.Count
            }).ToList();
        }, CacheDurations.Long);
    }

    public async Task<CategoryDto?> GetCategoryBySlugAsync(string slug)
    {
        var cacheKey = CacheKeys.CategoryBySlug(slug);

        return await _cache.GetOrSetAsync(cacheKey, async () =>
        {
            var category = await _unitOfWork.Categories.GetBySlugAsync(slug);
            if (category == null)
                return null;

            var count = await _unitOfWork.NewsArticles.CountAsync(x => x.CategoryId == category.Id && x.IsActive);

            return new CategoryDto
            {
                Id = category.Id,
                Name = category.Name,
                NameBn = category.NameBn,
                Slug = category.Slug,
                Description = category.Description,
                Icon = category.Icon,
                Color = category.Color,
                ArticleCount = count
            };
        }, CacheDurations.Medium);
    }

    public async Task<Category> CreateCategoryAsync(CreateCategoryDto dto)
    {
        var category = new Category
        {
            Name = dto.Name,
            NameBn = dto.NameBn,
            Slug = SlugHelper.GenerateSlug(dto.Name),
            Description = dto.Description,
            Icon = dto.Icon,
            Color = dto.Color,
            SortOrder = dto.SortOrder
        };

        await _unitOfWork.Categories.AddAsync(category);
        await _unitOfWork.SaveChangesAsync();
        await _cache.RemoveAsync(CacheKeys.Categories);

        return category;
    }

    public async Task UpdateCategoryAsync(int id, CreateCategoryDto dto)
    {
        var category = await _unitOfWork.Categories.GetByIdAsync(id);
        if (category == null)
            throw new InvalidOperationException("Category not found");

        category.Name = dto.Name;
        category.NameBn = dto.NameBn;
        category.Description = dto.Description;
        category.Icon = dto.Icon;
        category.Color = dto.Color;
        category.SortOrder = dto.SortOrder;

        await _unitOfWork.Categories.UpdateAsync(category);
        await _unitOfWork.SaveChangesAsync();
        await _cache.RemoveAsync(CacheKeys.Categories);
        await _cache.RemoveAsync(CacheKeys.CategoryBySlug(category.Slug));
    }

    public async Task DeleteCategoryAsync(int id)
    {
        var category = await _unitOfWork.Categories.GetByIdAsync(id);
        if (category == null)
            throw new InvalidOperationException("Category not found");

        await _unitOfWork.Categories.DeleteAsync(category);
        await _unitOfWork.SaveChangesAsync();
        await _cache.RemoveAsync(CacheKeys.Categories);
    }
}
