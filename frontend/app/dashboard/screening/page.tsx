'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function ResumeScreeningPage() {
  const router  = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [jdText,   setJdText]   = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [file,     setFile]     = useState<File | null>(null);
  const [result,   setResult]   = useState<any>(null);
  const [loading,  setLoading]  = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Interview scheduling state (only shown when eligible)
  const [duration, setDuration] = useState(15);
  const [maxQ,     setMaxQ]     = useState(8);

  const handleScreen = async () => {
    if (!file)         { alert('Please upload a resume file (PDF or DOCX)'); return; }
    if (!jdText.trim()) { alert('Please enter a job description'); return; }

    setLoading(true);
    setResult(null);

    const fd = new FormData();
    fd.append('file', file);
    // send jdText correctly as form field (not JSON body)
    fd.append('job_description', jdText.trim());
    fd.append('candidate_id', file.name);

    try {
      // ✅ FIX: Hit the local backend API proxy instead of AI directly
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/ai/screen-resume`, {
        method: 'POST',
        // Do NOT set Content-Type header — browser sets it with boundary for multipart
        body: fd,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
        throw new Error(err.detail || 'AI service returned an error');
      }

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      alert(
        `Error: ${err.message}\n\nMake sure:\n` +
        `1. AI service is running (uvicorn main:app --port 8000)\n` +
        `2. Your Gemini API key is set in ai-service/.env`
      );
    } finally {
      setLoading(false);
    }
  };

  const isEligible = result && (
    result.llm_evaluation?.recommendation === 'hire' ||
    (result.llm_evaluation?.score ?? 0) >= 65
  );

  const scheduleInterview = () => {
    if (!isEligible || !result) return;
    const payload = {
      title: jobTitle || 'Position',
      description: jdText,
      maxQuestions: maxQ,
      durationMinutes: duration,
      resumeScore: result.llm_evaluation?.score ?? 0,
      candidateName: result.filename?.replace(/\.[^.]+$/, '') ?? 'Candidate',
      createdAt: Date.now(),
    };
    const token = btoa(encodeURIComponent(JSON.stringify(payload)));
    const link  = `${window.location.origin}/interview/${token}`;
    navigator.clipboard.writeText(link).catch(() => {});
    alert(
      `✅ Interview link copied to clipboard!\n\n${link}\n\n` +
      `Share this link with the candidate.\n` +
      `• ${maxQ} adaptive AI questions\n` +
      `• ~${duration} minute session\n` +
      `• Camera proctoring enabled`
    );
  };

  const scoreColor = (s: number) =>
    s >= 70 ? '#22c97a' : s >= 50 ? '#4f8ef7' : '#f7525a';

  const recColor = (r: string) =>
    r === 'hire' ? '#22c97a' : r === 'reject' ? '#f7525a' : '#f5a623';

  const recLabel = (r: string) =>
    r === 'hire' ? '✓ Shortlisted' : r === 'reject' ? '✗ Rejected' : '~ On Hold';

  return (
    <div>
      <PageHeader
        title="AI Resume Screener"
        subtitle="Zero human intervention — strict AI evaluation with automatic interview scheduling"
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── LEFT: Inputs ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Job Info */}
          <div className="card" style={{ padding: 20 }}>
            <p style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: 13, marginBottom: 8, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ① Job Title
            </p>
            <input
              className="input-field"
              style={{ marginBottom: 16 }}
              value={jobTitle}
              onChange={e => setJobTitle(e.target.value)}
              placeholder="e.g. Senior React Developer"
            />

            <p style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: 13, marginBottom: 8, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ② Job Description
            </p>
            <textarea
              className="input-field"
              rows={8}
              placeholder="Paste the full job description here — responsibilities, required skills, qualifications..."
              value={jdText}
              onChange={e => setJdText(e.target.value)}
              style={{ resize: 'vertical' }}
            />
            {jdText.trim().length > 0 && (
              <p style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 4 }}>
                {jdText.trim().length} characters ✓
              </p>
            )}
          </div>

          {/* Resume Upload */}
          <div className="card" style={{ padding: 20 }}>
            <p style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: 13, marginBottom: 12, color: 'var(--accent2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ③ Upload Resume (PDF or DOCX)
            </p>
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault(); setDragOver(false);
                const f = e.dataTransfer.files[0];
                if (f) setFile(f);
              }}
              style={{
                border: `2px dashed ${dragOver ? 'var(--accent)' : file ? '#22c97a' : 'var(--border)'}`,
                borderRadius: 12, padding: '28px 20px', textAlign: 'center', cursor: 'pointer',
                background: file ? 'rgba(34,201,122,0.04)' : dragOver ? 'rgba(79,142,247,0.04)' : 'transparent',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>{file ? '📄' : '⬆'}</div>
              <p style={{ fontSize: 13, fontWeight: 500, color: file ? '#22c97a' : 'var(--text-1)' }}>
                {file ? file.name : 'Drop PDF / DOCX here or click to upload'}
              </p>
              {file && (
                <p style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 4 }}>
                  {(file.size / 1024).toFixed(1)} KB — click to change
                </p>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.docx,.doc"
                style={{ display: 'none' }}
                onChange={e => { if (e.target.files?.[0]) setFile(e.target.files[0]); }}
              />
            </div>
          </div>

          <button
            className="btn-primary"
            onClick={handleScreen}
            disabled={loading || !file || !jdText.trim()}
            style={{ padding: '13px', fontSize: 14 }}
          >
            {loading ? '◌ AI Analyzing...' : '⬡ Screen Resume with AI'}
          </button>
        </div>

        {/* ── RIGHT: Results ── */}
        <div>
          {loading ? (
            <div className="card" style={{ padding: 40, textAlign: 'center' }}>
              <LoadingSpinner text="AI analyzing resume..." />
              <p style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 12 }}>
                Running semantic matching + strict LLM evaluation
              </p>
            </div>

          ) : result ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Score Hero */}
              <div className="card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <p style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
                      AI Match Score
                    </p>
                    <p style={{ fontFamily: 'var(--font-head)', fontSize: 52, fontWeight: 800, color: scoreColor(result.llm_evaluation?.score ?? 0), lineHeight: 1 }}>
                      {result.llm_evaluation?.score ?? '—'}
                      <span style={{ fontSize: 18, color: 'var(--text-2)', fontWeight: 400 }}>/100</span>
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 4 }}>
                      Semantic similarity: {result.semantic_match_percent}% · Est. {result.llm_evaluation?.experience_years ?? '?'} yrs exp
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      display: 'inline-block', padding: '8px 18px', borderRadius: 99,
                      background: `${recColor(result.llm_evaluation?.recommendation ?? 'maybe')}18`,
                      border: `1px solid ${recColor(result.llm_evaluation?.recommendation ?? 'maybe')}44`,
                      color: recColor(result.llm_evaluation?.recommendation ?? 'maybe'),
                      fontWeight: 700, fontSize: 13, letterSpacing: '0.04em',
                    }}>
                      {recLabel(result.llm_evaluation?.recommendation ?? 'maybe')}
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 6 }}>
                      Confidence: {result.llm_evaluation?.confidence ?? 'medium'}
                    </p>
                  </div>
                </div>
                {/* Score bar */}
                <div style={{ height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{
                    width: `${result.llm_evaluation?.score ?? 0}%`,
                    height: '100%', borderRadius: 99,
                    background: `linear-gradient(90deg, ${scoreColor(result.llm_evaluation?.score ?? 0)}, ${scoreColor(result.llm_evaluation?.score ?? 0)}88)`,
                    transition: 'width 1s ease',
                  }} />
                </div>
              </div>

              {/* AI Summary */}
              {result.llm_evaluation?.summary && (
                <div className="card" style={{ padding: 16, borderLeft: '2px solid var(--accent)' }}>
                  <p style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>◌ AI Summary</p>
                  <p style={{ fontSize: 13, lineHeight: 1.7 }}>{result.llm_evaluation.summary}</p>
                </div>
              )}

              {/* Strengths & Weaknesses */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="card" style={{ padding: 16 }}>
                  <p style={{ fontSize: 11, color: '#22c97a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>✓ Strengths</p>
                  {(result.llm_evaluation?.strengths ?? []).map((s: string, i: number) => (
                    <p key={i} style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 6, display: 'flex', gap: 6 }}>
                      <span style={{ color: '#22c97a', flexShrink: 0 }}>·</span>{s}
                    </p>
                  ))}
                </div>
                <div className="card" style={{ padding: 16 }}>
                  <p style={{ fontSize: 11, color: '#f7525a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>✗ Gaps</p>
                  {(result.llm_evaluation?.weaknesses ?? []).map((w: string, i: number) => (
                    <p key={i} style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 6, display: 'flex', gap: 6 }}>
                      <span style={{ color: '#f7525a', flexShrink: 0 }}>·</span>{w}
                    </p>
                  ))}
                </div>
              </div>

              {/* Skills found */}
              {result.skills_found?.length > 0 && (
                <div className="card" style={{ padding: 16 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Skills Detected</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {result.skills_found.map((s: string) => (
                      <span key={s} style={{
                        padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 500,
                        background: 'rgba(79,142,247,0.12)', color: 'var(--accent)',
                        border: '1px solid rgba(79,142,247,0.2)', textTransform: 'capitalize',
                      }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Interview Scheduling (only if eligible) ── */}
              {isEligible ? (
                <div className="card" style={{ padding: 20, borderColor: 'rgba(34,201,122,0.3)', background: 'rgba(34,201,122,0.04)' }}>
                  <p style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 14, color: '#22c97a', marginBottom: 4 }}>
                    ✓ Candidate Eligible for Interview
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 16 }}>
                    Score of {result.llm_evaluation?.score}/100 meets the threshold. Configure and generate an interview link.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, color: 'var(--text-2)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase' }}>
                        Duration (mins): {duration}
                      </label>
                      <input type="range" min={5} max={30} step={5} value={duration}
                        onChange={e => setDuration(Number(e.target.value))}
                        style={{ width: '100%', accentColor: '#22c97a' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, color: 'var(--text-2)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase' }}>
                        Questions: {maxQ}
                      </label>
                      <input type="range" min={4} max={12} value={maxQ}
                        onChange={e => setMaxQ(Number(e.target.value))}
                        style={{ width: '100%', accentColor: '#22c97a' }} />
                    </div>
                  </div>
                  <button
                    onClick={scheduleInterview}
                    style={{
                      width: '100%', padding: '12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                      background: 'linear-gradient(135deg, #22c97a, #1aaa60)',
                      color: 'white', fontSize: 13, fontWeight: 600,
                    }}
                  >
                    🔗 Generate & Copy Interview Link
                  </button>
                </div>
              ) : (
                <div className="card" style={{ padding: 20, borderColor: 'rgba(247,82,90,0.3)', background: 'rgba(247,82,90,0.04)' }}>
                  <p style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 14, color: '#f7525a', marginBottom: 4 }}>
                    ✗ Not Eligible for Interview
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-2)' }}>
                    Score of {result.llm_evaluation?.score}/100 is below the 65-point threshold. The candidate does not qualify for the next round.
                  </p>
                </div>
              )}

            </div>

          ) : (
            /* Empty state */
            <div className="card" style={{ padding: 40, textAlign: 'center', opacity: 0.5 }}>
              <p style={{ fontSize: 40, marginBottom: 12 }}>⬡</p>
              <p style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: 15, marginBottom: 6 }}>
                AI evaluation appears here
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
                Upload a resume and paste the job description,<br />then click "Screen with AI"
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}