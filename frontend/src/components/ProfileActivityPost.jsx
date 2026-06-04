import { useState, useRef, useEffect } from 'react';
import { deleteSocialPost, likePost, getPostLikers } from '../api/socialApi.js';
import ConfirmDialog from './ConfirmDialog.jsx';
import PostComments from './PostComments.jsx';
import SharedAnalysisReportModal from './SharedAnalysisReportModal.jsx';
import UserListModal from './UserListModal.jsx';

function initials(name) {
  return String(name || 'U').trim().charAt(0).toUpperCase() || 'U';
}

function postTypeLabel(value) {
  return String(value || 'post').replace('_', ' ');
}

function AnalysisSharePreview({ analysis }) {
  const [reportOpen, setReportOpen] = useState(false);
  if (!analysis) return null;

  const report = analysis.gap_analysis_json || {};
  const score = Number(analysis.confidence_score || 0);
  const scoreClass = score >= 70 ? 'text-emerald-500' : score >= 50 ? 'text-amber-500' : 'text-red-500';
  const gaps = analysis.top_skill_gaps || (report.keywordMismatches || []).slice(0, 3).map((item) => item.keyword).filter(Boolean);
  const reportSnapshot = analysis.analysis_report_snapshot || null;

  return (
    <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-black text-[var(--text)]">Gap Analysis - {analysis.company_name || 'Role Analysis'}</p>
          <p className={`mt-1 text-sm font-black ${scoreClass}`}>{score}% readiness</p>
        </div>
        <span className="rounded-full border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[var(--muted-strong)]">
          {analysis.share_full_report ? 'Full report' : 'Summary'}
        </span>
      </div>
      {gaps.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {gaps.map((gap) => <span key={gap} className="app-chip">{gap}</span>)}
        </div>
      ) : null}
      {analysis.share_full_report ? (
        <>
          {reportSnapshot ? (
            <button type="button" className="app-button-secondary mt-4 px-3 py-2" onClick={() => setReportOpen(true)}>
              <span className="material-symbols-outlined text-[18px]">visibility</span>
              View full report
            </button>
          ) : <p className="mt-3 text-xs leading-5 text-[var(--muted-strong)]">Full report details are not available for this older shared analysis.</p>}
          <SharedAnalysisReportModal open={reportOpen} onClose={() => setReportOpen(false)} report={reportSnapshot} />
        </>
      ) : (
        <p className="mt-3 text-xs leading-5 text-[var(--muted-strong)]">The owner shared a summary only. The detailed gap report is private.</p>
      )}
    </div>
  );
}

export default function ProfileActivityPost({ post, currentUserId, onPostChanged, onDeleted, onEdit }) {
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [hasLiked, setHasLiked] = useState(post.has_liked || false);
  const [likersOpen, setLikersOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const isOwn = Boolean(post.user_id && currentUserId && String(post.user_id) === String(currentUserId));

  const pendingLikeState = useRef(post.has_liked || false);
  const debounceTimeout = useRef(null);

  useEffect(() => {
    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, []);

  async function handleLike() {
    setError('');
    
    // Optimistic Update
    const nextState = !pendingLikeState.current;
    pendingLikeState.current = nextState;
    setHasLiked(nextState);
    setLikesCount((prev) => (nextState ? prev + 1 : Math.max(prev - 1, 0)));

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(async () => {
      try {
        const result = await likePost(post.id);
        setLikesCount(result.newLikesCount);
        setHasLiked(result.liked);
        pendingLikeState.current = result.liked;
        onPostChanged?.({ ...post, likes_count: result.newLikesCount, has_liked: result.liked });
      } catch (requestError) {
        // Rollback on failure
        const rollbackState = !nextState;
        setHasLiked(rollbackState);
        setLikesCount((prev) => (rollbackState ? prev + 1 : Math.max(prev - 1, 0)));
        pendingLikeState.current = rollbackState;
        setError(requestError.response?.data?.error || requestError.response?.data?.message || 'Could not like this post.');
      }
    }, 400);
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
      {post.post_type === 'analysis_share' ? <AnalysisSharePreview analysis={post.analysis} /> : null}

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[var(--border)]/60 pt-3">
        <div className="flex items-stretch">
          <button
            type="button"
            onClick={handleLike}
            className={`flex items-center gap-1.5 py-1 px-2 text-xs font-bold transition-all rounded-l border border-r-0 ${hasLiked ? 'text-pink-500 bg-pink-500/10 border-pink-500/30' : 'text-[var(--muted-strong)] border-transparent hover:bg-[var(--panel)]'}`}
          >
            <span 
              className="material-symbols-outlined text-[18px]"
              style={{ fontVariationSettings: hasLiked ? '"FILL" 1' : '"FILL" 0' }}
            >
              favorite
            </span>
          </button>
          <button
            type="button"
            onClick={() => setLikersOpen(true)}
            className={`flex items-center py-1 px-2 text-xs font-bold transition-all rounded-r border ${hasLiked ? 'text-pink-500 bg-pink-500/10 border-pink-500/30 border-l-[rgba(236,72,153,0.3)]' : 'text-[var(--muted-strong)] border-transparent hover:bg-[var(--panel)] border-l-[var(--border)]'}`}
          >
            {likesCount} {likesCount === 1 ? 'Like' : 'Likes'}
          </button>
        </div>
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
    <UserListModal
      isOpen={likersOpen}
      onClose={() => setLikersOpen(false)}
      title="Liked by"
      fetchData={() => getPostLikers(post.id)}
      emptyMessage="No one has liked this post yet."
    />
    </>
  );
}
