using Microsoft.AspNetCore.Mvc;
using NewsPortal.Application.Services;
using NewsPortal.Core.DTOs;

namespace NewsPortal.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class NewsController : ControllerBase
{
    private readonly INewsService _newsService;

    public NewsController(INewsService newsService)
    {
        _newsService = newsService;
    }

    [HttpGet("latest")]
    public async Task<IActionResult> GetLatestNews([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
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
    public async Task<IActionResult> GetFeaturedNews([FromQuery] int count = 5)
    {
        var result = await _newsService.GetFeaturedNewsAsync(count);
        return Ok(result);
    }

    [HttpGet("category/{slug}")]
    public async Task<IActionResult> GetNewsByCategory(string slug, [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        var result = await _newsService.GetNewsByCategoryAsync(slug, page, pageSize);
        return Ok(result);
    }

    [HttpPost("search")]
    public async Task<IActionResult> SearchNews([FromBody] SearchQueryDto query)
    {
        var result = await _newsService.SearchNewsAsync(query);
        return Ok(result);
    }
}
