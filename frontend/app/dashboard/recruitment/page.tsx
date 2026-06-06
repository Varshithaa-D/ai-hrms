'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import PageHeader from '@/components/ui/PageHeader';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatDate, generateInterviewToken, getInterviewLink } from '@/lib/utils/formatters';
import { useAuthStore } from '@/lib/store/authStore';

export default function RecruitmentPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

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

  const seniorityColor: Record<string, string> = { junior: '#22c97a', mid: '#4f8ef7', senior: '#7c5cfc', lead: '#f5a623' };

  return (
    <div>
      <PageHeader
        title="Recruitment"
        subtitle="Manage job openings and candidate pipeline"
        action={canPost ? { label: '+ Post New Job', onClick: () => router.push('/dashboard/recruitment/new') } : undefined}
      />

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {['', 'active', 'draft', 'closed'].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding: '7px 16px', borderRadius: 99, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: '1px solid',
            borderColor: filter === s ? 'var(--accent)' : 'var(--border)',
            background: filter === s ? 'rgba(79,142,247,0.15)' : 'transparent',
            color: filter === s ? 'var(--accent)' : 'var(--text-2)',
          }}>{s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}</button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : jobs.length === 0 ? (
        <EmptyState icon="⬡" title="No jobs posted yet" subtitle="Post your first job opening" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {jobs.map(job => (
            <div key={job._id} className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16, transition: 'transform 0.15s' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'translateX(4px)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'none'}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(79,142,247,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>⬡</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <p style={{ fontWeight: 600, fontSize: 15 }}>{job.title}</p>
                  <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 500, background: `${seniorityColor[job.seniority] || '#4f8ef7'}18`, color: seniorityColor[job.seniority] || '#4f8ef7', textTransform: 'capitalize' }}>{job.seniority}</span>
                </div>
                <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--text-2)' }}>
                  <span>{job.department}</span>
                  <span>·</span>
                  <span style={{ textTransform: 'capitalize' }}>{job.employmentType?.replace('_',' ')}</span>
                  <span>·</span>
                  <span>{job.location}</span>
                  {job.salaryRange && <><span>·</span><span>{job.salaryRange}</span></>}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 20, color: 'var(--accent)' }}>{job.applicantCount || 0}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-2)' }}>applicants</p>
                </div>
                <Badge status={job.status} />
                {canPost && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const token = generateInterviewToken(job.title, job.description || job.summary || '');
                        const link = getInterviewLink(token);
                        navigator.clipboard.writeText(link);
                        alert(`Interview link copied!\n\n${link}\n\nShare this with the candidate.`);
                      }}
                      style={{
                        padding: '6px 14px', borderRadius: 8,
                        border: '1px solid rgba(34,201,122,0.3)',
                        background: 'rgba(34,201,122,0.08)',
                        color: '#5fe8a5', cursor: 'pointer', fontSize: 12
                      }}
                    >
                      🔗 Copy Interview Link
                    </button>
                    <button onClick={() => toggleStatus(job._id, job.status)} style={{
                      padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)',
                      background: 'transparent', color: 'var(--text-2)', cursor: 'pointer', fontSize: 12
                    }}>{job.status === 'active' ? 'Close' : 'Activate'}</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}