import { useMemo, useState } from 'react';
import { createSocialPost } from '../api/socialApi.js';

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

export default function PostComposer({ open, onClose, onCreated, recentAnalyses = [], initialJob = null }) {
  const [step, setStep] = useState(1);
  const [postType, setPostType] = useState(initialJob ? 'job_share' : '');
  const [content, setContent] = useState('');
  const [careerUpdateType, setCareerUpdateType] = useState('');
  const [analysisId, setAnalysisId] = useState('');
  const [showScore, setShowScore] = useState(true);
  const [jobData, setJobData] = useState({
    title: initialJob?.title || '',
    company: initialJob?.company || '',
    applyUrl: initialJob?.applyUrl || initialJob?.apply_url || ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const selectedAnalysis = useMemo(
    () => recentAnalyses.find((analysis) => analysis.id === analysisId),
    [analysisId, recentAnalyses]
  );

  if (!open) {
    return null;
  }

  function resetAndClose() {
    setStep(1);
    setPostType(initialJob ? 'job_share' : '');
    setContent('');
    setCareerUpdateType('');
    setAnalysisId('');
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

    setSubmitting(true);
    try {
      const created = await createSocialPost({
        post_type: postType,
        content,
        career_update_type: postType === 'career_update' ? careerUpdateType : undefined,
        analysis_id: postType === 'analysis_share' ? analysisId : undefined,
        job_data: postType === 'job_share' ? jobData : undefined,
        show_score: showScore
      });
      onCreated?.(created);
      resetAndClose();
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Could not publish this post.');
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
            <h2 className="mt-2 text-2xl font-black text-[var(--text)]">{step === 1 ? 'What do you want to share?' : 'Write your post'}</h2>
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
                placeholder={postType === 'question' ? 'Ask the community anything about job search, resumes, interviews, or career decisions...' : 'Share a career update...'}
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
                    <option value="">{recentAnalyses.length ? 'Choose an analysis' : 'No recent analyses available here'}</option>
                    {recentAnalyses.slice(0, 5).map((analysis) => (
                      <option key={analysis.id} value={analysis.id}>
                        {analysis.company_name || analysis.companyName || 'Role Analysis'} - {analysis.confidence_score || analysis.confidenceScore || 0}% match
                      </option>
                    ))}
                  </select>
                </label>
                {selectedAnalysis ? <p className="mt-3 text-sm text-[var(--muted-strong)]">Ready to share: {selectedAnalysis.company_name || selectedAnalysis.companyName || 'Role Analysis'}</p> : null}
                <label className="mt-3 flex items-center gap-2 text-sm text-[var(--muted-strong)]">
                  <input type="checkbox" checked={showScore} onChange={(event) => setShowScore(event.target.checked)} />
                  Show confidence score publicly
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

            {error ? <p className="rounded-lg border border-red-500/25 bg-red-500/10 p-3 text-sm font-semibold text-red-500">{error}</p> : null}

            <div className="flex justify-between gap-3">
              <button type="button" className="app-button-secondary" onClick={() => setStep(1)}>Back</button>
              <button type="submit" className="app-button" disabled={submitting}>{submitting ? 'Posting...' : 'Post'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
