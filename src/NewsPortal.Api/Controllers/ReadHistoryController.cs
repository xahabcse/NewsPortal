using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NewsPortal.Core.DTOs;
using NewsPortal.Core.Entities;
using NewsPortal.Core.Interfaces;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;

namespace NewsPortal.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/[controller]")]
[Authorize]
public class ReadHistoryController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;

    public ReadHistoryController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    private int GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null || !int.TryParse(userIdClaim, out var userId))
        {
            throw new UnauthorizedAccessException("User ID not found in token");
        }
        return userId;
    }

    [HttpGet]
    public async Task<IActionResult> GetReadingHistory([FromQuery][Range(1, 100)] int limit = 50)
    {
        var userId = GetUserId();
        var history = await _unitOfWork.ReadHistory.GetByUserIdAsync(userId, limit);

        var result = history.Select(h => new BookmarkResponseDto
        {
            Id = h.Id,
            ArticleId = h.ArticleId,
            UserId = h.UserId,
            CreatedAt = h.ReadAt,
            Article = new BookmarkArticleDto
            {
                Id = h.Article.Id,
                Title = h.Article.Title,
                Slug = h.Article.Slug,
                Summary = h.Article.Summary,
                ThumbnailUrl = h.Article.OriginalImageUrl,
                PublishedAt = h.Article.PublishedAt,
                SourceName = h.Article.Source.Name,
                CategoryName = h.Article.Category?.Name
            }
        }).ToList();

        return Ok(new { items = result, totalCount = result.Count });
    }

    [HttpPost("{articleId}")]
    public async Task<IActionResult> RecordRead(int articleId)
    {
        var userId = GetUserId();

        // Verify article exists
        var article = await _unitOfWork.NewsArticles.GetByIdAsync(articleId);
        if (article == null)
        {
            return NotFound(new { message = "Article not found" });
        }

        await _unitOfWork.ReadHistory.UpsertAsync(userId, articleId);

        return Ok(new { message = "Reading history recorded", articleId });
    }

    [HttpGet("{articleId}/check")]
    public async Task<IActionResult> CheckReadHistory(int articleId)
    {
        var userId = GetUserId();
        var exists = await _unitOfWork.ReadHistory.ExistsAsync(userId, articleId);
        return Ok(new { hasRead = exists, articleId });
    }
}
