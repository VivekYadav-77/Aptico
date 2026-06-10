import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { addPostComment, getPostComments, likeComment, deletePostComment } from '../api/socialApi.js';
import { selectAuth } from '../store/authSlice.js';
import ConfirmDialog from './ConfirmDialog.jsx';
import { getRequestErrorMessage } from '../utils/requestError.js';

function timeAgo(value) {
  if (!value) return '';
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

function Avatar({ user, size = 32 }) {
  const initial = String(user?.name || user?.username || 'U').trim().charAt(0).toUpperCase();
  if (user?.avatar_url) {
    return <img src={user.avatar_url} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: size * 0.4, flexShrink: 0 }}>
      {initial}
    </div>
  );
}

function CommentItem({ comment, onLike, onReply, onDelete, isReply = false, currentUserId, highlighted = false }) {
  const displayName = comment.user?.name || comment.user?.username || 'Member';

  return (
    <div
      id={`comment-${comment.id}`}
      style={{
        display: 'flex',
        gap: isReply ? 8 : 10,
        alignItems: 'flex-start',
        borderRadius: 12,
        padding: highlighted ? 8 : 0,
        background: highlighted ? 'var(--accent-soft)' : 'transparent',
        boxShadow: highlighted ? '0 0 0 2px color-mix(in srgb, var(--accent) 35%, transparent)' : 'none',
        transition: 'background 0.2s, box-shadow 0.2s, padding 0.2s'
      }}
    >
      <Avatar user={comment.user} size={isReply ? 24 : 32} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div>
          <span style={{ fontWeight: 800, fontSize: isReply ? 12 : 13, color: 'var(--text)' }}>{displayName}</span>
          <span style={{ marginLeft: 6, fontSize: isReply ? 12 : 13, color: 'var(--text)', fontWeight: 400 }}>{comment.content}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 4, fontSize: 11, fontWeight: 600, color: 'var(--muted-strong)' }}>
          <span>{timeAgo(comment.created_at)}</span>
          {(comment.likes_count || 0) > 0 && (
            <span style={{ fontWeight: 700 }}>{comment.likes_count} {comment.likes_count === 1 ? 'like' : 'likes'}</span>
          )}
          {!isReply && (
            <button type="button" onClick={() => onReply(comment)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 700, fontSize: 11, color: 'var(--muted-strong)' }}>
              Reply
            </button>
          )}
          {String(comment.user_id || comment.user?.id) === String(currentUserId) && (
            <button type="button" onClick={() => onDelete(comment.id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 700, fontSize: 11, color: '#ef4444' }}>
              Delete
            </button>
          )}
        </div>
      </div>
      <button type="button" onClick={() => onLike(comment.id)} style={{ background: 'none', border: 'none', padding: '4px 0 0 0', cursor: 'pointer', flexShrink: 0 }}>
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: 14,
            color: comment.has_liked ? '#ec4899' : 'var(--muted)',
            transition: 'color 0.15s',
            fontVariationSettings: comment.has_liked ? '"FILL" 1' : '"FILL" 0'
          }}
        >
          favorite
        </span>
      </button>
    </div>
  );
}

export default function PostComments({ postId, initialCommentsCount, onCommentAdded, focusCommentId = null }) {
  const auth = useSelector(selectAuth);
  const currentUserId = auth?.user?.id;
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [totalCount, setTotalCount] = useState(initialCommentsCount || 0);
  const [expandedReplies, setExpandedReplies] = useState({});
  const [highlightedCommentId, setHighlightedCommentId] = useState(null);
  const [error, setError] = useState('');

  const toggleReplies = (id) => {
    setExpandedReplies((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const debounceTimeouts = useRef({});
  const pendingLikeStates = useRef({});

  useEffect(() => {
    return () => {
      Object.values(debounceTimeouts.current).forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getPostComments(postId, { limit: 20 })
      .then((data) => {
        if (!cancelled) {
          setComments(data);
          setHasLoaded(true);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [postId]);

  useEffect(() => {
    if (!focusCommentId || !comments.length) return;

    const focused = comments.find((comment) => String(comment.id) === String(focusCommentId));
    if (!focused) return;

    if (focused.parent_id) {
      setExpandedReplies((prev) => ({ ...prev, [focused.parent_id]: true }));
    }

    setHighlightedCommentId(focused.id);
    const scrollTimer = setTimeout(() => {
      const element = document.getElementById(`comment-${focused.id}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
    const clearTimer = setTimeout(() => setHighlightedCommentId(null), 3200);

    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(clearTimer);
    };
  }, [comments, focusCommentId]);

  async function submit(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    setError('');
    try {
      const created = await addPostComment(postId, trimmed, replyingTo?.id || null);
      setComments((cur) => [...cur, created]);
      setText('');
      setReplyingTo(null);
      setTotalCount((c) => c + 1);
      onCommentAdded?.();
    } catch (err) {
      setError(getRequestErrorMessage(err, 'Could not post this comment.'));
    }
    setSubmitting(false);
  }

  async function handleLike(commentId) {
    const comment = comments.find((c) => c.id === commentId);
    if (!comment) return;

    const nextState = !comment.has_liked;
    pendingLikeStates.current[commentId] = nextState;

    setComments((cur) =>
      cur.map((c) =>
        c.id === commentId
          ? { ...c, has_liked: nextState, likes_count: nextState ? c.likes_count + 1 : Math.max(c.likes_count - 1, 0) }
          : c
      )
    );

    if (debounceTimeouts.current[commentId]) {
      clearTimeout(debounceTimeouts.current[commentId]);
    }

    debounceTimeouts.current[commentId] = setTimeout(async () => {
      try {
        const res = await likeComment(commentId);
        setComments((cur) =>
          cur.map((c) => (c.id === commentId ? { ...c, likes_count: res.newLikesCount, has_liked: res.liked } : c))
        );
        pendingLikeStates.current[commentId] = res.liked;
      } catch (err) {
        setError(getRequestErrorMessage(err, 'Could not update this comment reaction.'));
        const rollbackState = !nextState;
        setComments((cur) =>
          cur.map((c) =>
            c.id === commentId
              ? { ...c, has_liked: rollbackState, likes_count: rollbackState ? c.likes_count + 1 : Math.max(c.likes_count - 1, 0) }
              : c
          )
        );
        pendingLikeStates.current[commentId] = rollbackState;
      }
    }, 400);
  }

  function handleDelete(commentId) {
    setDeleteTarget(commentId);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setError('');
    try {
      await deletePostComment(deleteTarget);
      setComments((cur) => cur.filter((c) => c.id !== deleteTarget));
      setTotalCount((c) => Math.max(c - 1, 0));
      setDeleteTarget(null);
    } catch (err) {
      setError(getRequestErrorMessage(err, 'Could not delete this comment.'));
    }
    setDeleting(false);
  }

  function handleReply(comment) {
    setReplyingTo(comment);
    setText(`@${comment.user?.username || comment.user?.name || 'user'} `);
  }

  const topLevel = comments.filter((c) => !c.parent_id);

  return (
    <>
    <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
      {error ? (
        <p style={{ marginBottom: 10, border: '1px solid var(--danger-border)', borderRadius: 10, background: 'var(--danger-soft)', padding: 10, color: '#ef4444', fontSize: 13, fontWeight: 700 }}>
          {error}
        </p>
      ) : null}
      {/* Comments list */}
      {loading && !hasLoaded ? (
        <p style={{ fontSize: 13, color: 'var(--muted-strong)', padding: '8px 0' }}>Loading...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {topLevel.map((item) => {
            const replies = comments.filter((c) => c.parent_id === item.id);
            return (
              <div key={item.id}>
                <CommentItem comment={item} onLike={handleLike} onReply={handleReply} onDelete={handleDelete} currentUserId={currentUserId} highlighted={String(highlightedCommentId) === String(item.id)} />
                {replies.length > 0 && (
                  <div style={{ marginLeft: 42, marginTop: 8 }}>
                    <button
                      type="button"
                      onClick={() => toggleReplies(item.id)}
                      style={{
                        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                        fontSize: 12, fontWeight: 700, color: 'var(--muted-strong)',
                        display: 'flex', alignItems: 'center', gap: 8, marginBottom: expandedReplies[item.id] ? 12 : 0
                      }}
                    >
                      <span style={{ width: 24, height: 1, background: 'var(--muted-strong)' }}></span>
                      {expandedReplies[item.id] ? 'Hide replies' : `View replies (${replies.length})`}
                    </button>
                    {expandedReplies[item.id] && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderLeft: '2px solid var(--border)', paddingLeft: 12 }}>
                        {replies.map((reply) => (
                          <CommentItem key={reply.id} comment={reply} onLike={handleLike} onReply={handleReply} onDelete={handleDelete} currentUserId={currentUserId} isReply highlighted={String(highlightedCommentId) === String(reply.id)} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Load more */}
      {totalCount > comments.length && hasLoaded && (
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            getPostComments(postId, { limit: 50 }).then(setComments).finally(() => setLoading(false));
          }}
          style={{ background: 'none', border: 'none', padding: '8px 0 4px', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--muted-strong)' }}
        >
          View all {totalCount} comments
        </button>
      )}

      {/* Reply indicator */}
      {replyingTo && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', marginTop: 8, borderRadius: 8, background: 'var(--accent-soft)', fontSize: 12, fontWeight: 600, color: 'var(--accent-strong)' }}>
          <span>Replying to {replyingTo.user?.name || replyingTo.user?.username}</span>
          <button type="button" onClick={() => { setReplyingTo(null); setText(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--accent-strong)', fontWeight: 700, fontSize: 12 }}>✕</button>
        </div>
      )}

      {/* Input */}
      <form onSubmit={submit} style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
        <input
          className="app-input"
          style={{ flex: 1, fontSize: 13 }}
          placeholder={replyingTo ? 'Write a reply...' : 'Add a comment...'}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={300}
        />
        <button
          type="submit"
          disabled={submitting || !text.trim()}
          style={{
            background: 'none', border: 'none', cursor: text.trim() ? 'pointer' : 'default',
            padding: '6px 4px', fontWeight: 800, fontSize: 13,
            color: text.trim() ? 'var(--accent-strong)' : 'var(--muted)',
            transition: 'color 0.15s'
          }}
        >
          Post
        </button>
      </form>
    </div>
    <ConfirmDialog
      open={Boolean(deleteTarget)}
      title="Delete this comment?"
      description="This action cannot be undone and the comment will be permanently removed."
      confirmLabel="Delete"
      loading={deleting}
      onCancel={() => setDeleteTarget(null)}
      onConfirm={confirmDelete}
    />
    </>
  );
}
