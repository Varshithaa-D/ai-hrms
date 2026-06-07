'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import PageHeader from '@/components/ui/PageHeader';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatDate } from '@/lib/utils/formatters';
import { useAuthStore } from '@/lib/store/authStore';

export default function RecruitmentPage() {
  const router  = useRouter();
  const { user } = useAuthStore();
  const [jobs, setJobs]         = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('');
  const [selected, setSelected] = useState<any>(null);

  const canPost = user?.role === 'management_admin' || user?.role === 'hr_recruiter';

  useEffect(() => { fetchJobs(); }, [filter]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filter) params.status = filter;
      const { data } = await api.get('/jobs', { params });
      setJobs(data);
    } catch {} finally { setLoading(false); }
  };

  const toggleStatus = async (id: string, current: string) => {
    const next = current === 'active' ? 'closed' : 'active';
    try { await api.put(`/jobs/${id}`, { status: next }); fetchJobs(); } catch {}
  };

  const seniorityColor: Record<string, string> = {
    junior: '#22c97a', mid: '#4f8ef7', senior: '#7c5cfc', lead: '#f5a623'
  };

  return (
    <div>
      <PageHeader
        title="Recruitment"
        subtitle="Manage job openings and candidate pipeline"
        action={canPost ? { label: '+ Post New Job', onClick: () => router.push('/dashboard/recruitment/new') } : undefined}
      />

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {['', 'active', 'draft', 'closed'].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding: '7px 16px', borderRadius: 99, fontSize: 12, fontWeight: 500,
            cursor: 'pointer', border: '1px solid',
            borderColor: filter === s ? 'var(--accent)' : 'var(--border)',
            background: filter === s ? 'rgba(79,142,247,0.15)' : 'transparent',
            color: filter === s ? 'var(--accent)' : 'var(--text-2)',
          }}>
            {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 400px' : '1fr', gap: 20 }}>
        {/* Job list */}
        <div>
          {loading ? <LoadingSpinner /> : jobs.length === 0 ? (
            <EmptyState icon="⬡" title="No jobs posted yet" subtitle="Post your first job opening" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {jobs.map(job => (
                <div
                  key={job._id}
                  className="card"
                  onClick={() => setSelected(selected?._id === job._id ? null : job)}
                  style={{
                    padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16,
                    cursor: 'pointer', transition: 'all 0.15s',
                    borderColor: selected?._id === job._id ? 'var(--accent)' : undefined,
                    background: selected?._id === job._id ? 'rgba(79,142,247,0.05)' : undefined
                  }}
                  onMouseEnter={e => { if (selected?._id !== job._id) (e.currentTarget as HTMLElement).style.transform = 'translateX(3px)'; }}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'none'}
                >
                  <div style={{
                    width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                    background: `${seniorityColor[job.seniority] || '#4f8ef7'}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18
                  }}>⬡</div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <p style={{ fontWeight: 600, fontSize: 15 }}>{job.title}</p>
                      <span style={{
                        padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 500,
                        background: `${seniorityColor[job.seniority] || '#4f8ef7'}18`,
                        color: seniorityColor[job.seniority] || '#4f8ef7',
                        textTransform: 'capitalize'
                      }}>{job.seniority}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-2)', flexWrap: 'wrap' }}>
                      <span>{job.department}</span>
                      <span>·</span>
                      <span style={{ textTransform: 'capitalize' }}>{job.employmentType?.replace('_', ' ')}</span>
                      <span>·</span>
                      <span>{job.location}</span>
                      {job.salaryRange && <><span>·</span><span style={{ color: '#22c97a', fontWeight: 500 }}>{job.salaryRange}</span></>}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 20, color: 'var(--accent)' }}>{job.applicantCount || 0}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-2)' }}>applicants</p>
                    </div>
                    <Badge status={job.status} />
                    {canPost && (
                      <button
                        onClick={e => { e.stopPropagation(); toggleStatus(job._id, job.status); }}
                        style={{
                          padding: '6px 12px', borderRadius: 8,
                          border: '1px solid var(--border)', background: 'transparent',
                          color: 'var(--text-2)', cursor: 'pointer', fontSize: 12
                        }}
                      >
                        {job.status === 'active' ? 'Close' : 'Activate'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Job Detail Panel */}
        {selected && (
          <div className="card" style={{ padding: 0, overflow: 'hidden', height: 'fit-content', position: 'sticky', top: 20 }}>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', background: 'rgba(79,142,247,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 18, marginBottom: 4 }}>{selected.title}</p>
                  <p style={{ fontSize: 13, color: 'var(--text-2)' }}>{selected.department} · {selected.location}</p>
                </div>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                <Badge status={selected.status} />
                <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 500, background: 'rgba(34,201,122,0.15)', color: '#5fe8a5' }}>{selected.salaryRange}</span>
                <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 500, background: `${seniorityColor[selected.seniority]}18`, color: seniorityColor[selected.seniority], textTransform: 'capitalize' }}>{selected.seniority}</span>
              </div>
            </div>

            <div style={{ padding: '20px 24px', maxHeight: '65vh', overflowY: 'auto' }}>
              {/* Summary */}
              {selected.description && (
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>About the Role</p>
                  <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7 }}>{selected.description}</p>
                </div>
              )}

              {/* Responsibilities */}
              {selected.responsibilities?.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Responsibilities</p>
                  {selected.responsibilities.map((r: string, i: number) => (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                      <span style={{ color: 'var(--accent)', fontSize: 10, marginTop: 4, flexShrink: 0 }}>◉</span>
                      <p style={{ fontSize: 13, color: 'var(--text-1)', lineHeight: 1.5 }}>{r}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Required Skills */}
              {selected.requiredSkills?.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#22c97a', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Required Skills</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {selected.requiredSkills.map((s: string, i: number) => (
                      <span key={i} style={{ padding: '4px 10px', borderRadius: 99, fontSize: 12, fontWeight: 500, background: 'rgba(34,201,122,0.12)', color: '#5fe8a5' }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Nice to have */}
              {selected.niceToHave?.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#f5a623', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Nice to Have</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {selected.niceToHave.map((s: string, i: number) => (
                      <span key={i} style={{ padding: '4px 10px', borderRadius: 99, fontSize: 12, fontWeight: 500, background: 'rgba(245,166,35,0.12)', color: '#ffc95c' }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Screening Questions */}
              {selected.screeningQuestions?.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Screening Questions</p>
                  {selected.screeningQuestions.map((q: string, i: number) => (
                    <div key={i} style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(124,92,252,0.08)', border: '1px solid rgba(124,92,252,0.15)', marginBottom: 6 }}>
                      <p style={{ fontSize: 12, color: 'var(--text-1)' }}>{i + 1}. {q}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Meta */}
              <div style={{ paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-2)' }}>
                <span>Posted {selected.createdAt ? formatDate(selected.createdAt) : '—'}</span>
                <span>·</span>
                <span style={{ textTransform: 'capitalize' }}>{selected.employmentType?.replace('_', ' ')}</span>
              </div>

              {/* Screen Candidates button */}
              {canPost && (
                <button
                  onClick={() => router.push('/dashboard/screening')}
                  className="btn-primary"
                  style={{ marginTop: 16, padding: '10px' }}
                >
                  Screen Candidates for this Role →
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}