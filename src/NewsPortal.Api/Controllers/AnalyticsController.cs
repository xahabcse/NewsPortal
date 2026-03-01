using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NewsPortal.Core.Interfaces;

namespace NewsPortal.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/[controller]")]
[Authorize(Roles = "Admin,SuperAdmin")]
public class AnalyticsController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;

    public AnalyticsController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    [HttpGet("overview")]
    public async Task<IActionResult> GetOverview()
    {
        var totalArticles = await _unitOfWork.NewsArticles.CountAsync();
        var totalComments = await _unitOfWork.Comments.CountAsync();
        var totalUsers = await _unitOfWork.Users.CountAsync();
        var totalSources = await _unitOfWork.NewsSources.CountAsync();

        var today = DateTime.UtcNow.Date;
        var articlesToday = await _unitOfWork.NewsArticles.CountAsync(a => a.FetchedAt >= today);
        var commentsToday = await _unitOfWork.Comments.CountAsync(c => c.CreatedAt >= today);

        // Total views
        var allArticles = await _unitOfWork.NewsArticles.FindAsync(a => a.IsActive);
        var totalViews = allArticles.Sum(a => a.ViewCount);

        return Ok(new
        {
            totalArticles,
            totalComments,
            totalUsers,
            totalSources,
            articlesToday,
            commentsToday,
            totalViews
        });
    }

    [HttpGet("articles/daily")]
    public async Task<IActionResult> GetDailyArticles([FromQuery] int days = 30)
    {
        var since = DateTime.UtcNow.AddDays(-days);
        var articles = await _unitOfWork.NewsArticles.FindAsync(a => a.IsActive && a.FetchedAt >= since);

        var dailyCounts = articles
            .GroupBy(a => a.FetchedAt.Date)
            .Select(g => new { date = g.Key.ToString("MMM dd"), count = g.Count(), views = g.Sum(a => a.ViewCount) })
            .OrderBy(d => d.date)
            .ToList();

        return Ok(dailyCounts);
    }

    [HttpGet("categories/performance")]
    public async Task<IActionResult> GetCategoryPerformance()
    {
        var categories = await _unitOfWork.Categories.GetAllAsync();
        var activeArticles = await _unitOfWork.NewsArticles.FindAsync(a => a.IsActive);
        var articlesList = activeArticles.ToList();

        var performance = categories.Select(c =>
        {
            var catArticles = articlesList.Where(a => a.CategoryId == c.Id).ToList();
            return new
            {
                name = c.Name,
                articles = catArticles.Count,
                views = catArticles.Sum(a => a.ViewCount),
                color = c.Color ?? "#6366f1"
            };
        })
        .Where(p => p.articles > 0)
        .OrderByDescending(p => p.articles)
        .ToList();

        return Ok(performance);
    }

    [HttpGet("sources/performance")]
    public async Task<IActionResult> GetSourcePerformance()
    {
        var sources = await _unitOfWork.NewsSources.GetAllAsync();
        var activeArticles = await _unitOfWork.NewsArticles.FindAsync(a => a.IsActive);
        var articlesList = activeArticles.ToList();

        var performance = sources.Select(s =>
        {
            var srcArticles = articlesList.Where(a => a.SourceId == s.Id).ToList();
            return new
            {
                name = s.Name,
                articles = srcArticles.Count,
                views = srcArticles.Sum(a => a.ViewCount)
            };
        })
        .Where(p => p.articles > 0)
        .OrderByDescending(p => p.articles)
        .ToList();

        return Ok(performance);
    }

    [HttpGet("articles/top")]
    public async Task<IActionResult> GetTopArticles([FromQuery] int count = 10)
    {
        var articles = await _unitOfWork.NewsArticles.FindAsync(a => a.IsActive && a.ViewCount > 0);
        var top = articles
            .OrderByDescending(a => a.ViewCount)
            .Take(count)
            .Select(a => new
            {
                title = a.Title.Length > 50 ? a.Title[..50] + "..." : a.Title,
                views = a.ViewCount,
                slug = a.Slug,
                source = a.Source?.Name ?? "Unknown",
                category = a.Category?.Name ?? "General"
            })
            .ToList();

        return Ok(top);
    }

    [HttpGet("engagement/hourly")]
    public async Task<IActionResult> GetHourlyEngagement()
    {
        var sevenDaysAgo = DateTime.UtcNow.AddDays(-7);
        var comments = await _unitOfWork.Comments.FindAsync(c => c.CreatedAt >= sevenDaysAgo);

        var hourly = comments
            .GroupBy(c => c.CreatedAt.Hour)
            .Select(g => new { hour = g.Key, comments = g.Count() })
            .OrderBy(h => h.hour)
            .ToList();

        // Fill gaps for all 24 hours
        var allHours = Enumerable.Range(0, 24).Select(h =>
        {
            var existing = hourly.FirstOrDefault(x => x.hour == h);
            return new { hour = h, comments = existing?.comments ?? 0 };
        }).ToList();

        return Ok(allHours);
    }
}
