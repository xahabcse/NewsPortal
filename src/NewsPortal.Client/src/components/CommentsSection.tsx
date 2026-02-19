import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { axiosInstance } from '../services/axiosInstance';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

interface Comment {
    id: number;
    articleId: number;
    userId: number;
    username: string;
    content: string;
    createdAt: string;
    parentId?: number;
    replies: Comment[];
}

const CommentsSection = () => {
    const { slug } = useParams<{ slug: string }>();
    const { isAuthenticated } = useAuth();
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [newComment, setNewComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (slug) {
            fetchComments(slug);
        }
    }, [slug]);

    const fetchComments = async (articleSlug: string) => {
        try {
            // First get article ID from slug
            const articleResp = await axiosInstance.get(`/news/${articleSlug}`);
            const articleId = articleResp.data.id;
            
            const resp = await axiosInstance.get<Comment[]>(`/comments/article/${articleId}`);
            setComments(resp.data);
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

    const CommentItem = ({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) => (
        <div className={`${isReply ? 'ml-8 mt-4' : ''}`}>
            <div className="bg-white/5 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-white">{comment.username}</span>
                    <span className="text-xs text-secondary">
                        {new Date(comment.createdAt).toLocaleDateString()}
                    </span>
                </div>
                <p className="text-sm text-white/80">{comment.content}</p>
            </div>
            {comment.replies.length > 0 && (
                <div className="mt-2">
                    {comment.replies.map(reply => (
                        <CommentItem key={reply.id} comment={reply} isReply />
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <div className="mt-12 pt-8 border-t border-glass-border">
            <h2 className="text-2xl font-bold text-white mb-6">Comments</h2>

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
                    Please <a href="/login" className="text-accent hover:underline">login</a> to comment
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
                <div className="space-y-4">
                    {comments.map(comment => (
                        <CommentItem key={comment.id} comment={comment} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default CommentsSection;
