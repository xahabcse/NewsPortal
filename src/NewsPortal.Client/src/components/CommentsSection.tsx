import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { axiosInstance } from '../services/axiosInstance';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Avatar } from '../utils/avatars';

interface Comment {
    id: number;
    articleId: number;
    userId: number;
    username: string;
    avatarId: number;
    content: string;
    createdAt: string;
    parentId?: number;
    replies: Comment[];
}

type SortMode = 'newest' | 'oldest' | 'top';

const CommentsSection = () => {
    const { slug } = useParams<{ slug: string }>();
    const { isAuthenticated } = useAuth();
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [newComment, setNewComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [sortMode, setSortMode] = useState<SortMode>('newest');
    const [voteCounts, setVoteCounts] = useState<Record<number, { upvotes: number; downvotes: number; score: number }>>({});
    const [userVotes, setUserVotes] = useState<Record<number, string | null>>({});
    const COMMENTS_PER_PAGE = 5;
    const [displayCount, setDisplayCount] = useState(COMMENTS_PER_PAGE);

    useEffect(() => {
        if (slug) {
            fetchComments(slug);
        }
    }, [slug]);

    const fetchVoteCounts = useCallback(async (commentList: Comment[]) => {
        const allIds = getAllCommentIds(commentList);
        if (allIds.length === 0) return;
        try {
            const res = await axiosInstance.get(`/reactions/comments/batch?commentIds=${allIds.join(',')}`);
            setVoteCounts(res.data);
        } catch {
            // votes are optional
        }
    }, []);

    const getAllCommentIds = (commentList: Comment[]): number[] => {
        const ids: number[] = [];
        const collect = (list: Comment[]) => {
            for (const c of list) {
                ids.push(c.id);
                if (c.replies?.length) collect(c.replies);
            }
        };
        collect(commentList);
        return ids;
    };

    const fetchComments = async (articleSlug: string) => {
        try {
            const articleResp = await axiosInstance.get(`/news/${articleSlug}`);
            const articleId = articleResp.data.id;
            const resp = await axiosInstance.get<Comment[]>(`/comments/article/${articleId}`);
            setComments(resp.data);
            fetchVoteCounts(resp.data);
        } catch (error) {
            console.error('Failed to fetch comments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent, parentId?: number) => {
        e.preventDefault();
        if (!newComment.trim() || !slug) return;

        setSubmitting(true);
        try {
            const articleResp = await axiosInstance.get(`/news/${slug}`);
            const articleId = articleResp.data.id;

            await axiosInstance.post('/comments', {
                articleId,
                content: newComment,
                parentId
            });

            setNewComment('');
            toast.success(parentId ? 'Reply posted!' : 'Comment posted!');
            await fetchComments(slug);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to post comment');
        } finally {
            setSubmitting(false);
        }
    };

    const handleVote = async (commentId: number, isUpvote: boolean) => {
        if (!isAuthenticated) {
            toast.error('Please login to vote');
            return;
        }
        try {
            const res = await axiosInstance.post(`/reactions/comments/${commentId}/vote`, { isUpvote });
            setVoteCounts(prev => ({ ...prev, [commentId]: { upvotes: res.data.upvotes, downvotes: res.data.downvotes, score: res.data.score } }));
            setUserVotes(prev => ({ ...prev, [commentId]: res.data.userVote }));
        } catch {
            toast.error('Failed to vote');
        }
    };

    const sortedComments = [...comments].sort((a, b) => {
        if (sortMode === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        if (sortMode === 'top') {
            const scoreA = voteCounts[a.id]?.score || 0;
            const scoreB = voteCounts[b.id]?.score || 0;
            return scoreB - scoreA;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const CommentItem = ({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) => {
        const votes = voteCounts[comment.id] || { upvotes: 0, downvotes: 0, score: 0 };
        const userVote = userVotes[comment.id] ?? null;

        return (
            <div className={`${isReply ? 'ml-3 sm:ml-8 mt-3' : ''}`}>
                <div className="bg-white/5 rounded-lg p-3 sm:p-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <Avatar id={comment.avatarId || 1} size="xs" clickable username={comment.username} />
                            <span className="text-sm font-semibold text-white">{comment.username}</span>
                        </div>
                        <span className="text-xs text-secondary">
                            {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                    </div>
                    <p className="text-sm text-white/80 mb-3">{comment.content}</p>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => handleVote(comment.id, true)}
                            className={`flex items-center gap-1 text-xs transition-colors ${
                                userVote === 'up' ? 'text-green-400' : 'text-secondary hover:text-green-400'
                            }`}
                            title="Upvote"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={userVote === 'up' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                            </svg>
                            {votes.upvotes > 0 && <span>{votes.upvotes}</span>}
                        </button>
                        <button
                            onClick={() => handleVote(comment.id, false)}
                            className={`flex items-center gap-1 text-xs transition-colors ${
                                userVote === 'down' ? 'text-red-400' : 'text-secondary hover:text-red-400'
                            }`}
                            title="Downvote"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={userVote === 'down' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path>
                            </svg>
                            {votes.downvotes > 0 && <span>{votes.downvotes}</span>}
                        </button>
                        {votes.score !== 0 && (
                            <span className={`text-xs font-medium ${votes.score > 0 ? 'text-green-400/70' : 'text-red-400/70'}`}>
                                {votes.score > 0 ? '+' : ''}{votes.score}
                            </span>
                        )}
                    </div>
                </div>
                {comment.replies?.length > 0 && (
                    <div className="mt-2">
                        {comment.replies.map(reply => (
                            <CommentItem key={reply.id} comment={reply} isReply />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="mt-12 pt-8 border-t border-glass-border">
            <div className="flex items-center justify-between gap-2 mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                    Comments {comments.length > 0 && <span className="text-sm sm:text-base font-normal text-secondary">({comments.length})</span>}
                </h2>
                {comments.length > 1 && (
                    <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5 border border-glass-border">
                        {(['newest', 'oldest', 'top'] as SortMode[]).map(mode => (
                            <button
                                key={mode}
                                onClick={() => { setSortMode(mode); setDisplayCount(COMMENTS_PER_PAGE); }}
                                className={`px-2 sm:px-3 py-1 text-[10px] sm:text-xs rounded-md transition-colors capitalize ${
                                    sortMode === mode ? 'bg-accent text-white' : 'text-secondary hover:text-white'
                                }`}
                            >
                                {mode === 'top' ? 'Most Voted' : mode}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Comment Form */}
            {isAuthenticated ? (
                <form onSubmit={handleSubmit} className="mb-8">
                    <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Write a comment..."
                        className="w-full bg-white/5 border border-glass-border rounded-lg p-3 text-white text-sm focus:outline-none focus:border-accent/50"
                        rows={3}
                        maxLength={2000}
                    />
                    <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-secondary">{newComment.length}/2000</span>
                        <button
                            type="submit"
                            disabled={submitting || !newComment.trim()}
                            className="px-4 py-2 bg-accent text-white text-sm font-semibold rounded-lg hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'Posting...' : 'Post Comment'}
                        </button>
                    </div>
                </form>
            ) : (
                <div className="mb-8 p-4 bg-white/5 rounded-lg text-center text-sm text-secondary">
                    Please login to comment
                </div>
            )}

            {/* Comments List */}
            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-20 bg-white/5 rounded-lg animate-pulse"></div>
                    ))}
                </div>
            ) : comments.length === 0 ? (
                <p className="text-secondary text-sm">No comments yet. Be the first to comment!</p>
            ) : (
                <>
                    <div className="space-y-4">
                        {sortedComments.slice(0, displayCount).map(comment => (
                            <CommentItem key={comment.id} comment={comment} />
                        ))}
                    </div>
                    {sortedComments.length > displayCount && (
                        <div className="flex items-center justify-center gap-3 mt-6">
                            <button
                                onClick={() => setDisplayCount(prev => prev + COMMENTS_PER_PAGE)}
                                className="px-4 py-2 text-sm font-medium rounded-lg bg-white/5 border border-glass-border text-secondary hover:text-white hover:bg-white/10 transition-colors"
                            >
                                See More ({sortedComments.length - displayCount} remaining)
                            </button>
                            <button
                                onClick={() => setDisplayCount(sortedComments.length)}
                                className="px-4 py-2 text-sm font-medium rounded-lg bg-accent/10 border border-accent/30 text-accent hover:bg-accent/20 transition-colors"
                            >
                                See All Comments
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default CommentsSection;
