using System.Text.RegularExpressions;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NewsPortal.Core.Entities;
using NewsPortal.Core.Interfaces;

namespace NewsPortal.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/admin/articles")]
[Authorize(Roles = "Admin,SuperAdmin")]
public class AdminArticlesController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;

    public AdminArticlesController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] string? search = null, [FromQuery] string? status = null)
    {
        var allArticles = string.IsNullOrWhiteSpace(search)
            ? await _unitOfWork.NewsArticles.GetAllAsync()
            : await _unitOfWork.NewsArticles.SearchAsync(search, 1, 1000);

        var filtered = allArticles.AsEnumerable();

        // Filter by status
        if (status == "featured")
            filtered = filtered.Where(a => a.IsFeatured);
        else if (status == "hidden")
            filtered = filtered.Where(a => !a.IsActive);
        else if (status == "active")
            filtered = filtered.Where(a => a.IsActive);

        // Include hidden articles for admin view
        if (status != "hidden")
            filtered = filtered.Where(a => a.IsActive || status == null);

        var total = filtered.Count();
        var items = filtered
            .OrderByDescending(a => a.PublishedAt ?? a.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new
            {
                a.Id,
                a.Title,
                a.Slug,
                a.Summary,
                a.Author,
                a.PublishedAt,
                a.ViewCount,
                a.IsFeatured,
                a.IsActive,
                SourceName = a.Source?.Name,
                CategoryName = a.Category?.Name,
                a.CategoryId,
                a.SourceId
            });

        return Ok(new
        {
            items,
            totalCount = total,
            page,
            pageSize,
            totalPages = (int)Math.Ceiling(total / (double)pageSize)
        });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var article = await _unitOfWork.NewsArticles.GetByIdAsync(id);
        if (article == null) return NotFound(new { message = "Article not found" });

        return Ok(new
        {
            article.Id,
            article.Title,
            article.Slug,
            article.Summary,
            article.Content,
            article.SourceUrl,
            article.Author,
            article.PublishedAt,
            article.ViewCount,
            article.IsFeatured,
            article.IsActive,
            article.CategoryId,
            article.SourceId,
            SourceName = article.Source?.Name,
            CategoryName = article.Category?.Name
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] AdminCreateArticleRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
            return BadRequest(new { message = "Title is required" });

        var slug = GenerateSlug(request.Title);

        // Ensure unique slug
        var existing = await _unitOfWork.NewsArticles.GetBySlugAsync(slug);
        if (existing != null)
            slug = $"{slug}-{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}";

        var article = new NewsArticle
        {
            Title = request.Title.Trim(),
            Slug = slug,
            Summary = request.Summary?.Trim(),
            Content = request.Content?.Trim(),
            SourceUrl = request.SourceUrl?.Trim() ?? "",
            CanonicalUrl = request.SourceUrl?.Trim() ?? slug,
            Author = request.Author?.Trim(),
            PublishedAt = request.PublishedAt ?? DateTime.UtcNow,
            IsFeatured = request.IsFeatured,
            SourceId = request.SourceId,
            CategoryId = request.CategoryId,
            FetchedAt = DateTime.UtcNow
        };

        await _unitOfWork.NewsArticles.AddAsync(article);
        await _unitOfWork.SaveChangesAsync();

        return Ok(new { message = "Article created", articleId = article.Id, slug = article.Slug });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] AdminUpdateArticleRequest request)
    {
        var article = await _unitOfWork.NewsArticles.GetByIdAsync(id);
        if (article == null) return NotFound(new { message = "Article not found" });

        if (!string.IsNullOrWhiteSpace(request.Title))
            article.Title = request.Title.Trim();
        if (request.Summary != null)
            article.Summary = request.Summary.Trim();
        if (request.Content != null)
            article.Content = request.Content.Trim();
        if (request.Author != null)
            article.Author = request.Author.Trim();
        if (request.CategoryId.HasValue)
            article.CategoryId = request.CategoryId;
        if (request.IsFeatured.HasValue)
            article.IsFeatured = request.IsFeatured.Value;

        await _unitOfWork.NewsArticles.UpdateAsync(article);
        await _unitOfWork.SaveChangesAsync();

        return Ok(new { message = "Article updated" });
    }

    [HttpPut("{id}/feature")]
    public async Task<IActionResult> ToggleFeatured(int id)
    {
        var article = await _unitOfWork.NewsArticles.GetByIdAsync(id);
        if (article == null) return NotFound(new { message = "Article not found" });

        article.IsFeatured = !article.IsFeatured;
        await _unitOfWork.NewsArticles.UpdateAsync(article);
        await _unitOfWork.SaveChangesAsync();

        return Ok(new { message = article.IsFeatured ? "Article featured" : "Article unfeatured", isFeatured = article.IsFeatured });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var article = await _unitOfWork.NewsArticles.GetByIdAsync(id);
        if (article == null) return NotFound(new { message = "Article not found" });

        await _unitOfWork.NewsArticles.DeleteAsync(article); // Soft delete
        await _unitOfWork.SaveChangesAsync();

        return Ok(new { message = "Article hidden" });
    }

    private static string GenerateSlug(string title)
    {
        var slug = title.ToLowerInvariant();
        slug = Regex.Replace(slug, @"[^a-z0-9\s-]", "");
        slug = Regex.Replace(slug, @"\s+", "-");
        slug = Regex.Replace(slug, @"-+", "-");
        slug = slug.Trim('-');
        if (slug.Length > 100) slug = slug[..100].TrimEnd('-');
        return slug;
    }
}

public class AdminCreateArticleRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Summary { get; set; }
    public string? Content { get; set; }
    public string? SourceUrl { get; set; }
    public string? Author { get; set; }
    public DateTime? PublishedAt { get; set; }
    public bool IsFeatured { get; set; }
    public int SourceId { get; set; }
    public int? CategoryId { get; set; }
}

public class AdminUpdateArticleRequest
{
    public string? Title { get; set; }
    public string? Summary { get; set; }
    public string? Content { get; set; }
    public string? Author { get; set; }
    public int? CategoryId { get; set; }
    public bool? IsFeatured { get; set; }
}
