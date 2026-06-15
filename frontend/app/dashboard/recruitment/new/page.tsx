'use client';
import { AI_URL } from '@/lib/utils/constants';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import PageHeader from '@/components/ui/PageHeader';
import { DEPARTMENTS } from '@/lib/utils/constants';

export default function NewJobPage() {
  const router = useRouter();
  const [step, setStep] = useState<'generate' | 'review'>('generate');
  const [genForm, setGenForm] = useState({ job_title: '', department: '', seniority: 'mid', skills: [] as string[], skillInput: '' });
  const [jd, setJd] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const generateJD = async () => {
    if (!genForm.job_title || !genForm.department) { alert('Fill in title and department'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${AI_URL}/ai/generate-jd`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_title: genForm.job_title, department: genForm.department, seniority: genForm.seniority, skills: genForm.skills })
      });
      const data = await res.json();
      setJd(data); setStep('review');
    } catch { alert('AI service error'); } finally { setLoading(false); }
  };

  const saveJob = async () => {
    if (!jd) return;
    setSaving(true);
    try {
      await api.post('/jobs', {
        title: jd.title || genForm.job_title,
        department: genForm.department, 
        description: jd.summary,
        responsibilities: jd.responsibilities, 
        requiredSkills: jd.required_skills,
        niceToHave: jd.nice_to_have, 
        salaryRange: jd.salary_range,
        seniority: genForm.seniority, 
        screeningQuestions: jd.screening_questions,
        employmentType: 'full_time', 
        status: 'active'
      });
      router.push('/dashboard/recruitment');
    } catch (err: any) { alert(err.response?.data?.message || 'Error'); } finally { setSaving(false); }
  };

  const addSkill = () => {
    if (genForm.skillInput.trim()) {
      setGenForm(p => ({ ...p, skills: [...p.skills, p.skillInput.trim()], skillInput: '' }));
    }
  };

  return (
    <div style={{ maxWidth: 720 }}>
      <PageHeader title="Post New Job" subtitle="AI generates the full job description from your inputs" />

      {step === 'generate' ? (
        <div className="card" style={{ padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, padding: '12px 16px', background: 'rgba(124,92,252,0.06)', borderRadius: 10, borderLeft: '2px solid var(--accent2)' }}>
            <span style={{ fontSize: 16 }}>◌</span>
            <p style={{ fontSize: 13, color: 'var(--text-2)' }}>Enter 3 inputs — AI generates a complete professional JD with responsibilities, skills, salary range, and interview questions.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-2)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Job Title *</label>
              <input className="input-field" value={genForm.job_title} onChange={e => setGenForm(p => ({ ...p, job_title: e.target.value }))} placeholder="e.g. Senior React Developer" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-2)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Department *</label>
                <select className="input-field" value={genForm.department} onChange={e => setGenForm(p => ({ ...p, department: e.target.value }))}>
                  <option value="">Select</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-2)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Seniority *</label>
                <select className="input-field" value={genForm.seniority} onChange={e => setGenForm(p => ({ ...p, seniority: e.target.value }))}>
                  {['junior','mid','senior','lead'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-2)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Key Skills (optional)</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input className="input-field" value={genForm.skillInput} onChange={e => setGenForm(p => ({ ...p, skillInput: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }} placeholder="Type a skill and press Enter" />
                <button type="button" onClick={addSkill} style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-1)', cursor: 'pointer' }}>+</button>
              </div>
              {genForm.skills.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {genForm.skills.map((s, i) => (
                    <span key={i} style={{ padding: '3px 10px', borderRadius: 99, background: 'rgba(79,142,247,0.15)', color: '#7eb4ff', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {s}
                      <span onClick={() => setGenForm(p => ({ ...p, skills: p.skills.filter((_, j) => j !== i) }))} style={{ cursor: 'pointer', opacity: 0.6 }}>×</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button className="btn-primary" onClick={generateJD} disabled={loading} style={{ padding: '13px' }}>
              {loading ? '◌ Generating JD with AI...' : '⬡ Generate Job Description'}
            </button>
          </div>
        </div>
      ) : jd ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setStep('generate')} style={{ padding: '9px 18px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-2)', cursor: 'pointer', fontSize: 13 }}>← Regenerate</button>
            <button onClick={saveJob} disabled={saving} className="btn-primary" style={{ flex: 1, padding: '9px' }}>{saving ? 'Posting...' : '✓ Post this Job'}</button>
          </div>

          <div className="card" style={{ padding: 28 }}>
            <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 700, marginBottom: 6 }}>{jd.title || genForm.job_title}</h2>
              <p style={{ color: 'var(--text-2)', fontSize: 13 }}>{jd.summary}</p>
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <span style={{ padding: '4px 12px', borderRadius: 99, background: 'rgba(34,201,122,0.15)', color: '#5fe8a5', fontSize: 12, fontWeight: 500 }}>{jd.salary_range}</span>
                <span style={{ padding: '4px 12px', borderRadius: 99, background: 'rgba(79,142,247,0.15)', color: '#7eb4ff', fontSize: 12, fontWeight: 500, textTransform: 'capitalize' }}>{genForm.seniority}</span>
              </div>
            </div>

            {[
              { title: 'Responsibilities', items: jd.responsibilities, color: 'var(--accent)' },
              { title: 'Required Skills', items: jd.required_skills, color: '#22c97a' },
              { title: 'Nice to Have', items: jd.nice_to_have, color: '#f5a623' },
              { title: 'Screening Questions', items: jd.screening_questions, color: 'var(--accent2)' },
            ].map(section => (
              <div key={section.title} style={{ marginBottom: 20 }}>
                <p style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: 14, color: section.color, marginBottom: 10 }}>{section.title}</p>
                {(section.items || []).map((item: string, i: number) => (
                  <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 6 }}>
                    <span style={{ color: section.color, fontSize: 12, marginTop: 2, flexShrink: 0 }}>◉</span>
                    <p style={{ fontSize: 13, color: 'var(--text-1)', lineHeight: 1.6 }}>{item}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}