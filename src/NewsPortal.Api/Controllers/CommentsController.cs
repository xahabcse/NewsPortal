using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NewsPortal.Core.DTOs;
using NewsPortal.Core.Entities;
using NewsPortal.Core.Interfaces;
using System.Security.Claims;

namespace NewsPortal.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/[controller]")]
public class CommentsController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;

    public CommentsController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    private int GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null || !int.TryParse(userIdClaim, out var userId))
        {
            throw new UnauthorizedAccessException("User ID not found");
        }
        return userId;
    }

    [HttpGet("article/{articleId}")]
    public async Task<IActionResult> GetArticleComments(int articleId)
    {
        var comments = await _unitOfWork.Comments.GetByArticleAsync(articleId);
        var rootComments = comments.Where(c => c.ParentId == null && !c.IsDeleted);
        
        var dtos = rootComments.Select(MapToDtoWithReplies).ToList();
        return Ok(dtos);
    }

    [HttpPost]
    [Authorize]
    public async Task<IActionResult> CreateComment([FromBody] CreateCommentDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Content) || dto.Content.Length > 2000)
        {
            return BadRequest(new { message = "Comment must be between 1-2000 characters" });
        }

        var article = await _unitOfWork.NewsArticles.GetByIdAsync(dto.ArticleId);
        if (article == null)
        {
            return NotFound(new { message = "Article not found" });
        }

        if (dto.ParentId.HasValue)
        {
            var parent = await _unitOfWork.Comments.GetByIdAsync(dto.ParentId.Value);
            if (parent == null || parent.ArticleId != dto.ArticleId)
            {
                return BadRequest(new { message = "Invalid parent comment" });
            }
        }

        var comment = new Comment
        {
            ArticleId = dto.ArticleId,
            UserId = GetUserId(),
            Content = dto.Content,
            ParentId = dto.ParentId,
            IsApproved = true
        };

        await _unitOfWork.Comments.AddAsync(comment);
        await _unitOfWork.SaveChangesAsync();

        return Ok(new { message = "Comment created", commentId = comment.Id });
    }

    [HttpDelete("{id}")]
    [Authorize]
    public async Task<IActionResult> DeleteComment(int id)
    {
        var comment = await _unitOfWork.Comments.GetByIdAsync(id);
        if (comment == null)
        {
            return NotFound(new { message = "Comment not found" });
        }

        // Only allow user to delete their own comments
        if (comment.UserId != GetUserId())
        {
            return Forbid();
        }

        comment.IsDeleted = true;
        comment.Content = "[Deleted]";
        await _unitOfWork.SaveChangesAsync();

        return Ok(new { message = "Comment deleted" });
    }

    private CommentDto MapToDtoWithReplies(Comment comment)
    {
        return new CommentDto
        {
            Id = comment.Id,
            ArticleId = comment.ArticleId,
            UserId = comment.UserId,
            Username = comment.User.Username,
            Content = comment.IsDeleted ? "[Deleted]" : comment.Content,
            CreatedAt = comment.CreatedAt,
            ParentId = comment.ParentId,
            Replies = comment.Replies.Where(r => !r.IsDeleted).Select(MapToDtoWithReplies).ToList()
        };
    }
}
