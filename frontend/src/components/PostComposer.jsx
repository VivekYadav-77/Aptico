import { useEffect, useMemo, useState } from 'react';
import { createSocialPost, updateSocialPost } from '../api/socialApi.js';
import { getRequestErrorMessage } from '../utils/requestError.js';

const postTypes = [
  ['career_update', 'emoji_events', 'Career Update', 'Share a milestone'],
  ['job_tip', 'lightbulb', 'Job Tip', 'Share advice with the community'],
  ['job_share', 'work', 'Share a Job', 'Share a role you found'],
  ['analysis_share', 'analytics', 'Share My Analysis', 'Share your gap analysis'],
  ['question', 'help', 'Ask a Question', 'Get help from the community']
];

const careerTypes = [
  ['got_hired', 'Got Hired'],
  ['got_promoted', 'Promoted'],
  ['started_learning', 'Started Learning'],
  ['completed_course', 'Completed Course'],
  ['new_project', 'New Project']
];

const contentPlaceholders = {
  career_update: 'Share the progress, milestone, or lesson you want your network to see...',
  job_tip: 'Share a practical resume, interview, or job-search tip that helped you...',
  job_share: 'Add why this role may be useful for the community...',
  analysis_share: 'Share what the analysis revealed and what you are improving next...',
  question: 'Ask the community anything about job search, resumes, interviews, or career decisions...'
};

function toDatetimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function toScheduledIso(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function getMinScheduleValue() {
  const date = new Date(Date.now() + 60000);
  date.setSeconds(0, 0);
  return toDatetimeLocal(date);
}

function isScheduledFuture(value) {
  return value && new Date(value).getTime() > Date.now();
}

function isPastScheduleValue(value) {
  if (!value) return false;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) || date.getTime() <= Date.now();
}

function buildAnalysisReportSnapshot(analysis) {
  if (!analysis) return null;

  return {
    id: analysis.id,
    localId: analysis.localId || null,
    createdAt: analysis.createdAt || null,
    companyName: analysis.companyName || analysis.company_name || analysis.stage1?.companyName || null,
    jobTitle: analysis.jobTitle || analysis.stage1?.jobTitle || null,
    confidenceScore: analysis.confidenceScore ?? analysis.confidence_score ?? analysis.stage1?.confidenceScore ?? 0,
    summary: analysis.summary || analysis.stage1?.summary || '',
    matchedSkills: Array.isArray(analysis.matchedSkills) ? analysis.matchedSkills : analysis.stage1?.skillsPresent || [],
    precheck: analysis.precheck || null,
    stage1: analysis.stage1 || null,
    stage2: analysis.stage2 || null,
    stage3: analysis.stage3 || null
  };
}

export default function PostComposer({ open, onClose, onCreated, onUpdated, recentAnalyses = [], initialJob = null, initialPost = null, initialPostType = '' }) {
  const isEditing = Boolean(initialPost?.id);
  const shouldSkipTypeStep = isEditing || initialJob || initialPostType;
  const defaultPostType = initialPost?.post_type || (initialJob ? 'job_share' : initialPostType || '');
  const [step, setStep] = useState(shouldSkipTypeStep ? 2 : 1);
  const [postType, setPostType] = useState(defaultPostType);
  const [content, setContent] = useState(initialPost?.content || '');
  const [careerUpdateType, setCareerUpdateType] = useState(initialPost?.career_update_type || '');
  const [analysisId, setAnalysisId] = useState(initialPost?.analysis_id || '');
  const [shareFullReport, setShareFullReport] = useState(Boolean(initialPost?.job_data?.shareFullReport));
  const [jobData, setJobData] = useState({
    title: initialPost?.job_data?.title || initialJob?.title || '',
    company: initialPost?.job_data?.company || initialJob?.company || '',
    applyUrl: initialPost?.job_data?.applyUrl || initialJob?.applyUrl || initialJob?.apply_url || ''
  });
  const [scheduledAt, setScheduledAt] = useState(isScheduledFuture(initialPost?.scheduled_at) ? toDatetimeLocal(initialPost?.scheduled_at) : '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const selectedAnalysis = useMemo(
    () => recentAnalyses.find((analysis) => analysis.id === analysisId),
    [analysisId, recentAnalyses]
  );

  useEffect(() => {
    if (!open) return;
    const nextPostType = initialPost?.post_type || (initialJob ? 'job_share' : initialPostType || '');
    setStep(isEditing || initialJob || initialPostType ? 2 : 1);
    setPostType(nextPostType);
    setContent(initialPost?.content || '');
    setCareerUpdateType(initialPost?.career_update_type || '');
    setAnalysisId(initialPost?.analysis_id || '');
    setShareFullReport(Boolean(initialPost?.job_data?.shareFullReport));
    setJobData({
      title: initialPost?.job_data?.title || initialJob?.title || '',
      company: initialPost?.job_data?.company || initialJob?.company || '',
      applyUrl: initialPost?.job_data?.applyUrl || initialJob?.applyUrl || initialJob?.apply_url || ''
    });
    setScheduledAt(isScheduledFuture(initialPost?.scheduled_at) ? toDatetimeLocal(initialPost?.scheduled_at) : '');
    setError('');
  }, [open, initialPost?.id, initialJob?.id, initialPostType]);

  if (!open) {
    return null;
  }

  function resetAndClose() {
    const nextPostType = initialPost?.post_type || (initialJob ? 'job_share' : initialPostType || '');
    setStep(isEditing || initialJob || initialPostType ? 2 : 1);
    setPostType(nextPostType);
    setContent(initialPost?.content || '');
    setCareerUpdateType(initialPost?.career_update_type || '');
    setAnalysisId(initialPost?.analysis_id || '');
    setShareFullReport(Boolean(initialPost?.job_data?.shareFullReport));
    setScheduledAt(isScheduledFuture(initialPost?.scheduled_at) ? toDatetimeLocal(initialPost?.scheduled_at) : '');
    setError('');
    onClose?.();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (postType === 'career_update' && !careerUpdateType) {
      setError('Choose what this update is about.');
      return;
    }

    if (postType === 'analysis_share' && !analysisId) {
      setError('Choose an analysis to share.');
      return;
    }

    if (postType === 'job_share' && (!jobData.title || !jobData.applyUrl)) {
      setError('Add the job title and apply URL.');
      return;
    }

    if (isPastScheduleValue(scheduledAt)) {
      setError('Choose a future date and time, or leave the schedule empty to post immediately.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        post_type: postType,
        content,
        career_update_type: postType === 'career_update' ? careerUpdateType : undefined,
        analysis_id: postType === 'analysis_share' ? analysisId : undefined,
        job_data: postType === 'job_share' ? jobData : postType === 'analysis_share' ? {
          shareFullReport,
          analysisReportSnapshot: shareFullReport ? buildAnalysisReportSnapshot(selectedAnalysis) : null
        } : undefined,
        scheduled_at: toScheduledIso(scheduledAt)
      };
      const saved = isEditing ? await updateSocialPost(initialPost.id, payload) : await createSocialPost(payload);
      if (isEditing) {
        onUpdated?.(saved);
      } else {
        onCreated?.(saved);
      }
      resetAndClose();
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, 'Could not save this post.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--panel)] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="app-kicker">Create post</p>
            <h2 className="mt-2 text-2xl font-black text-[var(--text)]">{isEditing ? 'Edit post' : step === 1 ? 'What do you want to share?' : 'Write your post'}</h2>
          </div>
          <button type="button" className="app-icon-button" onClick={resetAndClose} aria-label="Close composer">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {step === 1 ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {postTypes.map(([value, icon, title, subtitle]) => (
              <button
                key={value}
                type="button"
                onClick={() => { setPostType(value); setStep(2); }}
                className="rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] p-4 text-left transition hover:border-[var(--accent)]"
              >
                <span className="material-symbols-outlined text-[28px] text-[var(--accent-strong)]">{icon}</span>
                <p className="mt-3 font-black text-[var(--text)]">{title}</p>
                <p className="mt-1 text-sm text-[var(--muted-strong)]">{subtitle}</p>
              </button>
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {postType === 'career_update' ? (
              <div>
                <p className="app-field-label">What is this update about?</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {careerTypes.map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setCareerUpdateType(value)}
                      className={careerUpdateType === value ? 'app-button px-3 py-2' : 'app-button-secondary px-3 py-2'}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <label className="block">
              <span className="app-field-label">Post content</span>
              <textarea
                className="app-input mt-2 min-h-36"
                maxLength={500}
                placeholder={contentPlaceholders[postType] || 'Share a career update...'}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                required
              />
              <span className={`mt-1 block text-right text-xs ${content.length > 480 ? 'text-red-500' : 'text-[var(--muted)]'}`}>{content.length} / 500</span>
            </label>

            {postType === 'analysis_share' ? (
              <div className="rounded-lg border border-[var(--border)] p-4">
                <label className="block">
                  <span className="app-field-label">Which analysis do you want to share?</span>
                  <select className="app-input mt-2" value={analysisId} onChange={(event) => setAnalysisId(event.target.value)} disabled={!recentAnalyses.length}>
                    <option value="">{recentAnalyses.length ? 'Choose a saved analysis report' : 'No shareable saved analyses available here'}</option>
                    {recentAnalyses.slice(0, 10).map((analysis) => (
                      <option key={analysis.id} value={analysis.id}>
                        {analysis.company_name || analysis.companyName || 'Role Analysis'} - {analysis.jobTitle || 'Target Role'} - {analysis.confidence_score || analysis.confidenceScore || 0}% match
                      </option>
                    ))}
                  </select>
                </label>
                {selectedAnalysis ? <p className="mt-3 text-sm text-[var(--muted-strong)]">Ready to share: {selectedAnalysis.company_name || selectedAnalysis.companyName || 'Role Analysis'}</p> : null}
                <label className="mt-3 flex items-start gap-2 text-sm text-[var(--muted-strong)]">
                  <input className="mt-1" type="checkbox" checked={shareFullReport} onChange={(event) => setShareFullReport(event.target.checked)} />
                  <span>
                    <span className="block font-bold text-[var(--text)]">Share full gap report publicly</span>
                    <span className="mt-1 block text-xs leading-5">If unchecked, people only see the score, role, and top skill gaps.</span>
                  </span>
                </label>
              </div>
            ) : null}

            {postType === 'job_share' ? (
              <div className="rounded-lg border border-[var(--border)] p-4">
                <p className="app-field-label">Job details</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <input className="app-input" placeholder="Title" value={jobData.title} onChange={(event) => setJobData({ ...jobData, title: event.target.value })} />
                  <input className="app-input" placeholder="Company" value={jobData.company} onChange={(event) => setJobData({ ...jobData, company: event.target.value })} />
                </div>
                <input className="app-input mt-3" placeholder="Apply URL" value={jobData.applyUrl} onChange={(event) => setJobData({ ...jobData, applyUrl: event.target.value })} />
              </div>
            ) : null}

            <label className="block rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] p-4">
              <span className="app-field-label flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">event_upcoming</span>
                Schedule
              </span>
              <input
                type="datetime-local"
                className="app-input mt-2"
                min={getMinScheduleValue()}
                value={scheduledAt}
                onChange={(event) => setScheduledAt(event.target.value)}
              />
              <span className="mt-2 block text-xs text-[var(--muted-strong)]">Leave empty to post immediately.</span>
            </label>

            {error ? <p className="rounded-lg border border-red-500/25 bg-red-500/10 p-3 text-sm font-semibold text-red-500">{error}</p> : null}

            <div className="flex justify-between gap-3">
              {!isEditing ? <button type="button" className="app-button-secondary" onClick={() => setStep(1)}>Back</button> : <span />}
              <button type="submit" className="app-button" disabled={submitting}>{submitting ? 'Saving...' : scheduledAt ? 'Schedule' : isEditing ? 'Save Changes' : 'Post'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
