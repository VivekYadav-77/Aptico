import { useState } from 'react';
import {
  addPostComment,
  deleteSocialPost,
  getPostComments,
  likePost
} from '../api/socialApi.js';
import ConfirmDialog from './ConfirmDialog.jsx';

function initials(name) {
  return String(name || 'U').trim().charAt(0).toUpperCase() || 'U';
}

function postTypeLabel(value) {
  return String(value || 'post').replace('_', ' ');
}

export default function ProfileActivityPost({ post, currentUserId, onPostChanged, onDeleted, onEdit }) {
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [comment, setComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const isOwn = Boolean(post.user_id && currentUserId && String(post.user_id) === String(currentUserId));

  async function handleLike() {
    setError('');
    try {
      const result = await likePost(post.id);
      setLikesCount(result.newLikesCount);
      onPostChanged?.({ ...post, likes_count: result.newLikesCount });
    } catch (requestError) {
      setError(requestError.response?.data?.error || requestError.response?.data?.message || 'Could not like this post.');
    }
  }

  async function toggleComments() {
    const next = !commentsOpen;
    setCommentsOpen(next);

    if (next && !comments.length) {
      setError('');
      setLoadingComments(true);
      getPostComments(post.id, { limit: 5 })
        .then(setComments)
        .catch((requestError) => setError(requestError.response?.data?.error || 'Could not load comments.'))
        .finally(() => setLoadingComments(false));
    }
  }

  async function submitComment(event) {
    event.preventDefault();
    const trimmed = comment.trim();
    if (!trimmed) return;

    setError('');
    setSubmittingComment(true);
    try {
      const created = await addPostComment(post.id, trimmed);
      setComments((current) => [...current, created]);
      setComment('');
      onPostChanged?.({ ...post, comments_count: (post.comments_count || 0) + 1 });
    } catch (requestError) {
      setError(requestError.response?.data?.error || requestError.response?.data?.message || 'Could not add this comment.');
    } finally {
      setSubmittingComment(false);
    }
  }

  async function handleDelete() {
    setError('');
    setDeleting(true);
    try {
      await deleteSocialPost(post.id);
      setDeleteOpen(false);
      onDeleted?.(post.id);
    } catch (requestError) {
      setError(requestError.response?.data?.error || requestError.response?.data?.message || 'Could not delete this post.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)]/60 p-5 transition-all hover:border-[var(--accent)]/20 hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-strong)] text-[10px] font-black text-white shadow-sm">
            {initials(post.user?.name || post.author_name || post.user?.username)}
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--panel)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--accent-strong)]">
            {postTypeLabel(post.post_type)}
          </span>
        </div>
        <p className="text-xs font-bold text-[var(--muted)]">{new Date(post.created_at).toLocaleDateString()}</p>
      </div>

      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[var(--text)]">{post.content}</p>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[var(--border)]/60 pt-3">
        <button
          type="button"
          onClick={handleLike}
          className="flex items-center gap-1.5 text-xs font-bold text-[var(--muted-strong)] transition-all hover:text-pink-500"
        >
          <span className="material-symbols-outlined text-[18px]">favorite</span>
          {likesCount} {likesCount === 1 ? 'Like' : 'Likes'}
        </button>
        <button
          type="button"
          onClick={toggleComments}
          className="flex items-center gap-1.5 text-xs font-bold text-[var(--muted-strong)] transition-colors hover:text-[var(--text)]"
        >
          <span className="material-symbols-outlined text-[18px]">chat_bubble</span>
          {post.comments_count || 0} Comment{(post.comments_count || 0) === 1 ? '' : 's'}
        </button>
        {isOwn ? (
          <button type="button" onClick={() => onEdit?.(post)} className="flex items-center gap-1.5 text-xs font-bold text-[var(--muted-strong)] transition-colors hover:text-[var(--text)]">
            <span className="material-symbols-outlined text-[18px]">edit</span>
            Edit
          </button>
        ) : null}
        {isOwn ? (
          <button type="button" onClick={() => setDeleteOpen(true)} className="flex items-center gap-1.5 text-xs font-bold text-red-500 transition-colors hover:text-red-600">
            <span className="material-symbols-outlined text-[18px]">delete</span>
            Delete
          </button>
        ) : null}
      </div>

      {error ? <p className="mt-3 rounded-lg border border-red-500/25 bg-red-500/10 p-3 text-sm font-semibold text-red-500">{error}</p> : null}

      {commentsOpen ? (
        <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--panel)]/70 p-4">
          {loadingComments ? <p className="text-sm text-[var(--muted-strong)]">Loading comments...</p> : null}
          <div className="space-y-3">
            {comments.map((item) => (
              <div key={item.id} className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-black text-[var(--accent-strong)]">
                  {initials(item.user?.name || item.user?.username)}
                </div>
                <div>
                  <p className="text-sm font-bold text-[var(--text)]">{item.user?.name || item.user?.username || 'Member'}</p>
                  <p className="text-sm text-[var(--muted-strong)]">{item.content}</p>
                </div>
              </div>
            ))}
          </div>
          {(post.comments_count || 0) > comments.length ? (
            <button
              type="button"
              className="mt-3 text-sm font-bold text-[var(--accent-strong)]"
              onClick={() => getPostComments(post.id, { limit: 20 }).then(setComments).catch((requestError) => setError(requestError.response?.data?.error || 'Could not load comments.'))}
            >
              Show all {post.comments_count} comments
            </button>
          ) : null}
          <form onSubmit={submitComment} className="mt-4 flex gap-2">
            <input className="app-input" placeholder="Add a comment" value={comment} onChange={(event) => setComment(event.target.value)} maxLength={300} />
            <button type="submit" className="app-button" disabled={submittingComment}>{submittingComment ? 'Posting...' : 'Post'}</button>
          </form>
        </div>
      ) : null}
    </article>
    <ConfirmDialog
      open={deleteOpen}
      title="Delete this post?"
      description="This removes the post from your profile activity and community feeds. Comments and reactions on it will no longer be visible."
      confirmLabel="Delete Post"
      loading={deleting}
      onCancel={() => setDeleteOpen(false)}
      onConfirm={handleDelete}
    />
    </>
  );
}
