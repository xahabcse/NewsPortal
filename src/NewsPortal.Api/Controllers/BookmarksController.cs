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
public class BookmarksController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;

    public BookmarksController(IUnitOfWork unitOfWork)
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
    public async Task<IActionResult> GetBookmarks(
        [FromQuery][Range(1, int.MaxValue)] int page = 1,
        [FromQuery][Range(1, 100)] int pageSize = 12)
    {
        var userId = GetUserId();
        var bookmarks = await _unitOfWork.Bookmarks.GetByUserIdAsync(userId, page, pageSize);
        var totalCount = await _unitOfWork.Bookmarks.GetCountByUserIdAsync(userId);
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        var result = new PagedBookmarkResultDto
        {
            Items = bookmarks.Select(b => new BookmarkResponseDto
            {
                Id = b.Id,
                ArticleId = b.ArticleId,
                UserId = b.UserId,
                CreatedAt = b.CreatedAt,
                Article = new BookmarkArticleDto
                {
                    Id = b.Article.Id,
                    Title = b.Article.Title,
                    Slug = b.Article.Slug,
                    Summary = b.Article.Summary,
                    ThumbnailUrl = b.Article.OriginalImageUrl,
                    PublishedAt = b.Article.PublishedAt,
                    SourceName = b.Article.Source.Name,
                    CategoryName = b.Article.Category?.Name
                }
            }).ToList(),
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount,
            TotalPages = totalPages
        };

        return Ok(result);
    }

    [HttpPost("{articleId}")]
    public async Task<IActionResult> AddBookmark(int articleId)
    {
        var userId = GetUserId();

        // Check if already bookmarked
        var existing = await _unitOfWork.Bookmarks.GetByUserAndArticleAsync(userId, articleId);
        if (existing != null)
        {
            return BadRequest(new { message = "Article already bookmarked" });
        }

        // Verify article exists
        var article = await _unitOfWork.NewsArticles.GetByIdAsync(articleId);
        if (article == null)
        {
            return NotFound(new { message = "Article not found" });
        }

        var bookmark = new UserBookmark
        {
            UserId = userId,
            ArticleId = articleId
        };

        await _unitOfWork.Bookmarks.AddAsync(bookmark);
        await _unitOfWork.SaveChangesAsync();

        return Ok(new { message = "Article bookmarked successfully", bookmarkId = bookmark.Id, articleId });
    }

    [HttpDelete("{articleId}")]
    public async Task<IActionResult> RemoveBookmark(int articleId)
    {
        var userId = GetUserId();

        var bookmark = await _unitOfWork.Bookmarks.GetByUserAndArticleAsync(userId, articleId);
        if (bookmark == null)
        {
            return NotFound(new { message = "Bookmark not found" });
        }

        await _unitOfWork.Bookmarks.DeleteAsync(bookmark);
        await _unitOfWork.SaveChangesAsync();

        return Ok(new { message = "Bookmark removed successfully", articleId });
    }

    [HttpGet("{articleId}/check")]
    public async Task<IActionResult> CheckBookmark(int articleId)
    {
        var userId = GetUserId();
        var exists = await _unitOfWork.Bookmarks.ExistsAsync(userId, articleId);
        return Ok(new { isBookmarked = exists, articleId });
    }
}
