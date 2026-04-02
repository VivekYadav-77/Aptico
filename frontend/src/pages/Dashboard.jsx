import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import api from '../api/axios.js';
import Gauge from '../components/Gauge.jsx';
import DiffViewer from '../components/DiffViewer.jsx';
import { selectAuth } from '../store/authSlice.js';
import { setCurrentAnalysis } from '../store/historySlice.js';

function bufferToBase64(arrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(arrayBuffer);

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

export default function Dashboard() {
  const auth = useSelector(selectAuth);
  const dispatch = useDispatch();
  const [selectedFile, setSelectedFile] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const modeLabel = useMemo(() => {
    if (auth.isAuthenticated) {
      return auth.user?.email || 'Authenticated session';
    }

    if (auth.guestMode) {
      return 'Guest mode';
    }

    return 'Anonymous session';
  }, [auth.guestMode, auth.isAuthenticated, auth.user]);

  async function handleAnalyze(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (!selectedFile) {
        throw new Error('Please choose a PDF resume first.');
      }

      if (selectedFile.size > 1 * 1024 * 1024) {
        throw new Error('PDF must be under 1 MB.');
      }

      const arrayBuffer = await selectedFile.arrayBuffer();
      const contentBase64 = bufferToBase64(arrayBuffer);
      const response = await api.post('/api/analyze', {
        file: {
          name: selectedFile.name,
          type: selectedFile.type || 'application/pdf',
          size: selectedFile.size,
          contentBase64
        },
        jobDescription
      });

      setResult(response.data.data);
      dispatch(
        setCurrentAnalysis({
          id: response.data.data.id,
          companyName: response.data.data.companyName,
          confidenceScore: response.data.data.confidenceScore,
          summary: response.data.data.summary
        })
      );
    } catch (requestError) {
      setResult(null);
      setError(requestError.response?.data?.error || requestError.message || 'Analysis failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),_transparent_38%),linear-gradient(180deg,_#020617_0%,_#020617_35%,_#0f172a_100%)] px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Aptico Analysis Lab</p>
            <h1 className="text-3xl font-semibold tracking-tight text-white">Resume confidence analysis</h1>
            <p className="text-sm text-slate-300">Upload a PDF resume, paste a job description, and inspect the structured gap analysis.</p>
          </div>
          <div className="flex flex-col items-start gap-3 rounded-3xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-slate-300">
            <span className="text-xs uppercase tracking-[0.25em] text-slate-400">Current mode</span>
            <span className="font-medium text-white">{modeLabel}</span>
            <Link to="/auth" className="rounded-full border border-slate-700 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-200 transition hover:border-cyan-400 hover:text-cyan-200">
              Auth screen
            </Link>
            <Link to="/jobs" className="rounded-full border border-slate-700 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-200 transition hover:border-cyan-400 hover:text-cyan-200">
              Job search
            </Link>
          </div>
        </header>

        <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
            <form className="space-y-6" onSubmit={handleAnalyze}>
              <div className="grid gap-6 md:grid-cols-2">
                <label className="block rounded-3xl border border-dashed border-slate-700 bg-slate-950/50 p-6 transition hover:border-cyan-400">
                  <span className="text-xs uppercase tracking-[0.25em] text-slate-400">Resume PDF</span>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    className="mt-4 block w-full text-sm text-slate-300 file:mr-4 file:rounded-full file:border-0 file:bg-cyan-400 file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-950"
                    onChange={(event) => {
                      setSelectedFile(event.target.files?.[0] || null);
                    }}
                  />
                  <p className="mt-4 text-sm text-slate-400">
                    {selectedFile ? `${selectedFile.name} · ${(selectedFile.size / 1024).toFixed(1)} KB` : 'Choose a PDF under 1 MB.'}
                  </p>
                </label>

                <label className="block rounded-3xl border border-white/10 bg-slate-950/50 p-6">
                  <span className="text-xs uppercase tracking-[0.25em] text-slate-400">Job description</span>
                  <textarea
                    value={jobDescription}
                    onChange={(event) => setJobDescription(event.target.value)}
                    className="mt-4 h-48 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
                    placeholder="Paste the target job description here..."
                    required
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-full bg-cyan-400 px-6 py-3 text-sm font-medium uppercase tracking-[0.2em] text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
              >
                {isSubmitting ? 'Analyzing...' : 'Analyze resume'}
              </button>
            </form>

            {error ? (
              <div className="mt-6 rounded-3xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">
                {error}
              </div>
            ) : null}
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
            <div className="flex h-full flex-col items-center justify-center gap-6 rounded-3xl border border-white/10 bg-slate-950/50 p-6 text-center">
              <Gauge value={result?.confidenceScore || 0} />
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Analysis summary</p>
                <h2 className="text-2xl font-semibold text-white">{result?.companyName || 'Awaiting analysis result'}</h2>
                <p className="max-w-md text-sm leading-6 text-slate-300">
                  {result?.summary || 'Your structured Gemini analysis will appear here once the PDF and job description are submitted.'}
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Keyword mismatches</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Missing signal areas</h2>
              </div>
              <div className="grid gap-4">
                {(result?.keywordMismatches || []).length ? (
                  result.keywordMismatches.map((item, index) => (
                    <article key={`${item.keyword}-${index}`} className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
                      <p className="text-sm font-medium text-cyan-300">{item.keyword}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-200">{item.jobRequirement}</p>
                      <p className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-500">Resume evidence</p>
                      <p className="mt-1 text-sm leading-6 text-slate-300">{item.resumeEvidence}</p>
                      <p className="mt-3 text-xs text-slate-500">{item.importance}</p>
                    </article>
                  ))
                ) : (
                  <div className="rounded-3xl border border-dashed border-slate-700 px-5 py-6 text-sm text-slate-400">
                    Keyword mismatches will render here once analysis completes.
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Seniority alignment</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Level gaps and rewrites</h2>
              </div>
              <div className="grid gap-4">
                {(result?.seniorityMismatches || []).length ? (
                  result.seniorityMismatches.map((item, index) => (
                    <article key={`${item.topic}-${index}`} className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
                      <p className="text-sm font-medium text-amber-300">{item.topic}</p>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Resume level</p>
                          <p className="mt-2 text-sm text-slate-200">{item.resumeLevel}</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Target level</p>
                          <p className="mt-2 text-sm text-slate-200">{item.targetLevel}</p>
                        </div>
                      </div>
                      <p className="mt-4 text-sm leading-6 text-slate-300">{item.explanation}</p>
                    </article>
                  ))
                ) : (
                  <div className="rounded-3xl border border-dashed border-slate-700 px-5 py-6 text-sm text-slate-400">
                    Seniority mismatch insights will render here after the Gemini response.
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Bullet rewrite diff</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Before and after suggestions</h2>
            </div>
            <DiffViewer items={result?.rewriteSuggestions || []} />
          </div>
        </section>
      </div>
    </main>
  );
}
