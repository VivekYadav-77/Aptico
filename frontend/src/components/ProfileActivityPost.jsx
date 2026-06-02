import { useState } from 'react';
import { deleteSocialPost, likePost } from '../api/socialApi.js';
import ConfirmDialog from './ConfirmDialog.jsx';
import PostComments from './PostComments.jsx';

function initials(name) {
  return String(name || 'U').trim().charAt(0).toUpperCase() || 'U';
}

function postTypeLabel(value) {
  return String(value || 'post').replace('_', ' ');
}

export default function ProfileActivityPost({ post, currentUserId, onPostChanged, onDeleted, onEdit }) {
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [hasLiked, setHasLiked] = useState(post.has_liked || false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const isOwn = Boolean(post.user_id && currentUserId && String(post.user_id) === String(currentUserId));

  async function handleLike() {
    setError('');
    try {
      const result = await likePost(post.id);
      setLikesCount(result.newLikesCount);
      setHasLiked(result.liked);
      onPostChanged?.({ ...post, likes_count: result.newLikesCount, has_liked: result.liked });
    } catch (requestError) {
      setError(requestError.response?.data?.error || requestError.response?.data?.message || 'Could not like this post.');
    }
  }

  function toggleComments() {
    setCommentsOpen(!commentsOpen);
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
          className={`flex items-center gap-1.5 text-xs font-bold transition-all ${hasLiked ? 'text-pink-500' : 'text-[var(--muted-strong)]'}`}
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

      {commentsOpen ? <PostComments postId={post.id} initialCommentsCount={post.comments_count || 0} onCommentAdded={() => onPostChanged?.({ ...post, comments_count: (post.comments_count || 0) + 1 })} /> : null}
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
