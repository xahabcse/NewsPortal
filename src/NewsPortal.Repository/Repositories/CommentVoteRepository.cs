using Microsoft.EntityFrameworkCore;
using NewsPortal.Core.Entities;
using NewsPortal.Core.Interfaces;
using NewsPortal.Repository.Data;

namespace NewsPortal.Repository.Repositories;

public class CommentVoteRepository : Repository<CommentVote>, ICommentVoteRepository
{
    public CommentVoteRepository(NewsPortalDbContext context) : base(context) { }

    public async Task<CommentVote?> GetByUserAndCommentAsync(int userId, int commentId)
    {
        return await _dbSet.FirstOrDefaultAsync(v => v.UserId == userId && v.CommentId == commentId && v.IsActive);
    }

    public async Task<(int upvotes, int downvotes)> GetVoteCountsAsync(int commentId)
    {
        var votes = await _dbSet.Where(v => v.CommentId == commentId && v.IsActive).ToListAsync();
        return (votes.Count(v => v.IsUpvote), votes.Count(v => !v.IsUpvote));
    }

    public async Task<Dictionary<int, (int upvotes, int downvotes)>> GetVoteCountsBatchAsync(IEnumerable<int> commentIds)
    {
        var ids = commentIds.ToList();
        var votes = await _dbSet
            .Where(v => ids.Contains(v.CommentId) && v.IsActive)
            .GroupBy(v => v.CommentId)
            .Select(g => new
            {
                CommentId = g.Key,
                Upvotes = g.Count(v => v.IsUpvote),
                Downvotes = g.Count(v => !v.IsUpvote)
            })
            .ToDictionaryAsync(x => x.CommentId, x => (x.Upvotes, x.Downvotes));
        return votes;
    }
}
