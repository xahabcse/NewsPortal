using NewsPortal.Core.Entities;

namespace NewsPortal.Core.Interfaces;

public interface ICommentVoteRepository : IRepository<CommentVote>
{
    Task<CommentVote?> GetByUserAndCommentAsync(int userId, int commentId);
    Task<(int upvotes, int downvotes)> GetVoteCountsAsync(int commentId);
    Task<Dictionary<int, (int upvotes, int downvotes)>> GetVoteCountsBatchAsync(IEnumerable<int> commentIds);
}
