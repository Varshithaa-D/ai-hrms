'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import PageHeader from '@/components/ui/PageHeader';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import { useAuthStore } from '@/lib/store/authStore';
import { formatDate } from '@/lib/utils/formatters';

const RATING_FIELDS = ['technical','communication','teamwork','leadership','punctuality'] as const;

export default function PerformancePage() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const [employees, setEmployees] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [selectedEmp, setSelectedEmp] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  
  // FIX: Explicitly typed form to avoid TS errors
  const [form, setForm] = useState({
    employee: '', reviewPeriod: 'Q2 2026',
    ratings: { technical: 7, communication: 7, teamwork: 7, leadership: 6, punctuality: 8 } as Record<string, number>,
    strengths: '', areasOfImprovement: '', managerComments: ''
  });

  const isEmployee = user?.role === 'employee';
  const isManager  = !isEmployee;

  useEffect(() => {
    if (isEmployee) {
      fetchMyReviews();
    } else {
      api.get('/employees?limit=100').then(({ data }) => {
        setEmployees(data.employees);
        const empIdFromUrl = searchParams.get('emp');
        if (empIdFromUrl) setSelectedEmp(empIdFromUrl);
      }).catch(() => {});
    }
  }, [isEmployee, searchParams]);

  useEffect(() => {
    if (!isEmployee && selectedEmp) fetchReviews(selectedEmp);
  }, [selectedEmp, isEmployee]);

  const fetchMyReviews = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/performance/my');
      setReviews(data);
    } catch {
      try {
        const { data: empData } = await api.get('/employees/me');
        if (empData?._id) await fetchReviews(empData._id);
      } catch {}
    } finally { setLoading(false); }
  };

  const fetchReviews = async (empId: string) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/performance/employee/${empId}`);
      setReviews(data);
    } catch {} finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/performance', { ...form, employee: selectedEmp });
      setModalOpen(false);
      fetchReviews(selectedEmp);
    } catch (err: any) { alert(err.response?.data?.message || 'Error'); }
  };

  const ScoreBar = ({ value, max = 10 }: { value: number; max?: number }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <div style={{ width: `${(value / max) * 100}%`, height: '100%', borderRadius: 99, background: value >= 8 ? '#22c97a' : value >= 6 ? '#4f8ef7' : '#f5a623', transition: 'width 0.6s' }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, minWidth: 24, color: value >= 8 ? '#22c97a' : value >= 6 ? '#7eb4ff' : '#ffc95c' }}>{value}</span>
    </div>
  );

  const ReviewCard = ({ r }: { r: any }) => {
    const avg = RATING_FIELDS.reduce((s, f) => s + (r.ratings?.[f] || 0), 0) / RATING_FIELDS.length;
    return (
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <p style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{r.reviewPeriod}</p>
            <p style={{ fontSize: 12, color: 'var(--text-2)' }}>Reviewed on {formatDate(r.createdAt)}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontFamily: 'var(--font-head)', fontSize: 28, fontWeight: 700, color: avg >= 8 ? '#22c97a' : avg >= 6 ? '#4f8ef7' : '#f5a623' }}>
              {avg.toFixed(1)}<span style={{ fontSize: 14, color: 'var(--text-2)', fontWeight: 400 }}>/10</span>
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-2)' }}>Overall</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {RATING_FIELDS.map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 12, color: 'var(--text-2)', minWidth: 100, textTransform: 'capitalize' }}>{f}</span>
              <div style={{ flex: 1 }}><ScoreBar value={r.ratings?.[f] || 0} /></div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {r.strengths && (
            <div style={{ padding: '10px 14px', background: 'rgba(34,201,122,0.06)', borderRadius: 8, borderLeft: '2px solid #22c97a' }}>
              <p style={{ fontSize: 11, color: '#22c97a', fontWeight: 600, marginBottom: 4 }}>Strengths</p>
              <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>{r.strengths}</p>
            </div>
          )}
          {r.areasOfImprovement && (
            <div style={{ padding: '10px 14px', background: 'rgba(245,166,35,0.06)', borderRadius: 8, borderLeft: '2px solid #f5a623' }}>
              <p style={{ fontSize: 11, color: '#f5a623', fontWeight: 600, marginBottom: 4 }}>Areas to Improve</p>
              <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>{r.areasOfImprovement}</p>
            </div>
          )}
          {r.managerComments && (
            <div style={{ padding: '10px 14px', background: 'rgba(79,142,247,0.06)', borderRadius: 8, borderLeft: '2px solid var(--accent)', gridColumn: '1 / -1' }}>
              <p style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, marginBottom: 4 }}>Manager Comments</p>
              <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>{r.managerComments}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <PageHeader
        title={isEmployee ? 'My Performance' : 'Performance'}
        subtitle={isEmployee ? 'Your reviews and goal completion history' : 'Track reviews and goal completion'}
        action={isManager && selectedEmp ? { label: '+ Add Review', onClick: () => { setForm(p => ({ ...p, employee: selectedEmp })); setModalOpen(true); } } : undefined}
      />

      {!isEmployee && (
        <div className="card" style={{ padding: 20, marginBottom: 24, maxWidth: 320 }}>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--text-2)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Select Employee</label>
          <select className="input-field" value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)}>
            <option value="">Select employee</option>
            {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName}</option>)}
          </select>
        </div>
      )}

      {(!isEmployee && !selectedEmp) ? (
        <EmptyState icon="◈" title="Select an employee to view reviews" />
      ) : loading ? <LoadingSpinner /> : reviews.length === 0 ? (
        <EmptyState icon="◈" title="No reviews yet" subtitle={isEmployee ? 'Your performance reviews will appear here' : 'Add the first performance review'} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {reviews.map(r => <ReviewCard key={r._id} r={r} />)}
        </div>
      )}

      {/* FIX: Changed isOpen to open */}
      {isManager && (
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Performance Review">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '70vh', overflowY: 'auto' }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-2)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Review Period</label>
              <input className="input-field" value={form.reviewPeriod} onChange={e => setForm(p => ({ ...p, reviewPeriod: e.target.value }))} placeholder="e.g. Q2 2026" required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-2)', fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ratings (1–10)</label>
              {RATING_FIELDS.map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-2)', minWidth: 110, textTransform: 'capitalize' }}>{f}</span>
                  <input type="range" min={1} max={10} value={form.ratings[f]}
                    onChange={e => setForm(p => ({ ...p, ratings: { ...p.ratings, [f]: Number(e.target.value) } }))}
                    style={{ flex: 1, accentColor: 'var(--accent)' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, minWidth: 24, color: 'var(--accent)' }}>{form.ratings[f]}</span>
                </div>
              ))}
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-2)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Strengths</label>
              <textarea className="input-field" rows={2} value={form.strengths} onChange={e => setForm(p => ({ ...p, strengths: e.target.value }))} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-2)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Areas to Improve</label>
              <textarea className="input-field" rows={2} value={form.areasOfImprovement} onChange={e => setForm(p => ({ ...p, areasOfImprovement: e.target.value }))} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-2)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Manager Comments</label>
              <textarea className="input-field" rows={2} value={form.managerComments} onChange={e => setForm(p => ({ ...p, managerComments: e.target.value }))} />
            </div>
            <button className="btn-primary" type="submit">Submit Review</button>
          </form>
        </Modal>
      )}
    </div>
  );
}