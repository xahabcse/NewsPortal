using System.Security.Claims;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NewsPortal.Core.Entities;
using NewsPortal.Core.Interfaces;

namespace NewsPortal.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/[controller]")]
public class ReactionsController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;

    public ReactionsController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    private int GetUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(claim, out var id) ? id : 0;
    }

    [HttpGet("article/{articleId}")]
    public async Task<IActionResult> GetReactions(int articleId)
    {
        var counts = await _unitOfWork.ArticleReactions.GetReactionCountsAsync(articleId);
        var userId = GetUserId();
        string? userReaction = null;

        if (userId > 0)
        {
            var existing = await _unitOfWork.ArticleReactions.GetByUserAndArticleAsync(userId, articleId);
            userReaction = existing?.ReactionType;
        }

        return Ok(new
        {
            counts,
            total = counts.Values.Sum(),
            userReaction
        });
    }

    [HttpPost("article/{articleId}")]
    [Authorize]
    public async Task<IActionResult> React(int articleId, [FromBody] ReactRequest request)
    {
        if (!ReactionTypes.All.Contains(request.Type))
            return BadRequest(new { message = "Invalid reaction type" });

        var userId = GetUserId();
        var existing = await _unitOfWork.ArticleReactions.GetByUserAndArticleAsync(userId, articleId);

        if (existing != null)
        {
            if (existing.ReactionType == request.Type)
            {
                // Remove reaction (toggle off)
                await _unitOfWork.ArticleReactions.DeleteAsync(existing);
            }
            else
            {
                // Change reaction type
                existing.ReactionType = request.Type;
                await _unitOfWork.ArticleReactions.UpdateAsync(existing);
            }
        }
        else
        {
            // Add new reaction
            await _unitOfWork.ArticleReactions.AddAsync(new ArticleReaction
            {
                UserId = userId,
                ArticleId = articleId,
                ReactionType = request.Type
            });
        }

        await _unitOfWork.SaveChangesAsync();

        var counts = await _unitOfWork.ArticleReactions.GetReactionCountsAsync(articleId);
        var current = await _unitOfWork.ArticleReactions.GetByUserAndArticleAsync(userId, articleId);

        return Ok(new
        {
            counts,
            total = counts.Values.Sum(),
            userReaction = current?.ReactionType
        });
    }

    [HttpGet("comments/{commentId}/votes")]
    public async Task<IActionResult> GetCommentVotes(int commentId)
    {
        var (upvotes, downvotes) = await _unitOfWork.CommentVotes.GetVoteCountsAsync(commentId);
        var userId = GetUserId();
        string? userVote = null;

        if (userId > 0)
        {
            var existing = await _unitOfWork.CommentVotes.GetByUserAndCommentAsync(userId, commentId);
            if (existing != null) userVote = existing.IsUpvote ? "up" : "down";
        }

        return Ok(new { upvotes, downvotes, score = upvotes - downvotes, userVote });
    }

    [HttpPost("comments/{commentId}/vote")]
    [Authorize]
    public async Task<IActionResult> VoteComment(int commentId, [FromBody] VoteRequest request)
    {
        var userId = GetUserId();
        var existing = await _unitOfWork.CommentVotes.GetByUserAndCommentAsync(userId, commentId);

        if (existing != null)
        {
            if (existing.IsUpvote == request.IsUpvote)
            {
                // Remove vote (toggle off)
                await _unitOfWork.CommentVotes.DeleteAsync(existing);
            }
            else
            {
                // Change vote direction
                existing.IsUpvote = request.IsUpvote;
                await _unitOfWork.CommentVotes.UpdateAsync(existing);
            }
        }
        else
        {
            await _unitOfWork.CommentVotes.AddAsync(new CommentVote
            {
                UserId = userId,
                CommentId = commentId,
                IsUpvote = request.IsUpvote
            });
        }

        await _unitOfWork.SaveChangesAsync();

        var (upvotes, downvotes) = await _unitOfWork.CommentVotes.GetVoteCountsAsync(commentId);
        var current = await _unitOfWork.CommentVotes.GetByUserAndCommentAsync(userId, commentId);

        return Ok(new
        {
            upvotes,
            downvotes,
            score = upvotes - downvotes,
            userVote = current != null ? (current.IsUpvote ? "up" : "down") : (string?)null
        });
    }

    [HttpGet("comments/batch")]
    public async Task<IActionResult> GetCommentVotesBatch([FromQuery] string commentIds)
    {
        var ids = commentIds.Split(',').Select(s => int.TryParse(s.Trim(), out var id) ? id : 0).Where(id => id > 0).ToList();
        if (ids.Count == 0) return Ok(new Dictionary<int, object>());

        var voteCounts = await _unitOfWork.CommentVotes.GetVoteCountsBatchAsync(ids);
        var result = ids.ToDictionary(
            id => id,
            id => voteCounts.TryGetValue(id, out var v) ? new { v.upvotes, v.downvotes, score = v.upvotes - v.downvotes } : new { upvotes = 0, downvotes = 0, score = 0 }
        );

        return Ok(result);
    }
}

public class ReactRequest
{
    public string Type { get; set; } = "like";
}

public class VoteRequest
{
    public bool IsUpvote { get; set; } = true;
}
