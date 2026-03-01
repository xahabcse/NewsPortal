using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NewsPortal.Service.Services;
using NewsPortal.Core.DTOs;
using System.ComponentModel.DataAnnotations;

namespace NewsPortal.API.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/[controller]")]
public class NewsController : ControllerBase
{
    private readonly INewsService _newsService;
    private readonly ICategoryService _categoryService;

    public NewsController(INewsService newsService, ICategoryService categoryService)
    {
        _newsService = newsService;
        _categoryService = categoryService;
    }

    [HttpGet("latest")]
    public async Task<IActionResult> GetLatestNews(
        [FromQuery][Range(1, int.MaxValue)] int page = 1,
        [FromQuery][Range(1, 100)] int pageSize = 10)
    {
        var result = await _newsService.GetLatestNewsAsync(page, pageSize);
        return Ok(result);
    }

    [HttpGet("{slug}")]
    public async Task<IActionResult> GetNewsDetail(string slug)
    {
        var result = await _newsService.GetNewsDetailAsync(slug);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpGet("featured")]
    public async Task<IActionResult> GetFeaturedNews([FromQuery][Range(1, 100)] int count = 5)
    {
        var result = await _newsService.GetFeaturedNewsAsync(count);
        return Ok(result);
    }

    [HttpGet("category/{slug}")]
    public async Task<IActionResult> GetNewsByCategory(
        string slug,
        [FromQuery][Range(1, int.MaxValue)] int page = 1,
        [FromQuery][Range(1, 100)] int pageSize = 10)
    {
        var result = await _newsService.GetNewsByCategoryAsync(slug, page, pageSize);
        return Ok(result);
    }

    [HttpGet("source/{slug}")]
    public async Task<IActionResult> GetNewsBySource(
        string slug,
        [FromQuery][Range(1, int.MaxValue)] int page = 1,
        [FromQuery][Range(1, 100)] int pageSize = 10)
    {
        var result = await _newsService.GetNewsBySourceAsync(slug, page, pageSize);
        return Ok(result);
    }

    [HttpPost("search")]
    public async Task<IActionResult> SearchNews([FromBody] SearchQueryDto query)
    {
        var result = await _newsService.SearchNewsAsync(query);
        return Ok(result);
    }

    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories()
    {
        var result = await _categoryService.GetAllCategoriesAsync();
        return Ok(result);
    }

    [HttpGet("trending")]
    public async Task<IActionResult> GetTrendingNews(
        [FromQuery][Range(1, 100)] int count = 12,
        [FromQuery][Range(1, 72)] int hours = 24)
    {
        var result = await _newsService.GetTrendingNewsAsync(count, hours);
        return Ok(result);
    }

    [HttpGet("{slug}/related")]
    public async Task<IActionResult> GetRelatedNews(string slug, [FromQuery][Range(1, 10)] int count = 4)
    {
        var result = await _newsService.GetRelatedNewsAsync(slug, count);
        return Ok(result);
    }

    [HttpGet("categories/{id}")]
    public async Task<IActionResult> GetCategory(int id)
    {
        var result = await _categoryService.GetCategoryBySlugAsync(id.ToString());
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpPost("categories")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> CreateCategory([FromBody] CreateCategoryDto dto)
    {
        var result = await _categoryService.CreateCategoryAsync(dto);
        return CreatedAtAction(nameof(GetCategory), new { id = result.Id }, result);
    }

    [HttpPut("categories/{id}")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> UpdateCategory(int id, [FromBody] CreateCategoryDto dto)
    {
        await _categoryService.UpdateCategoryAsync(id, dto);
        return NoContent();
    }

    [HttpDelete("categories/{id}")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> DeleteCategory(int id)
    {
        await _categoryService.DeleteCategoryAsync(id);
        return NoContent();
    }

    [HttpGet("daily-highlights")]
    public async Task<IActionResult> GetDailyHighlights(
        [FromQuery][Range(1, 30)] int days = 7)
    {
        var result = await _newsService.GetDailyHighlightsAsync(days);
        return Ok(result);
    }

    [HttpGet("stats/today")]
    public async Task<IActionResult> GetTodayStats()
    {
        var count = await _newsService.GetArticlesCountTodayAsync();
        return Ok(new { count, timestamp = DateTime.UtcNow });
    }
}
