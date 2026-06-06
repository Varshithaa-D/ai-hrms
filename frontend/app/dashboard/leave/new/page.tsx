'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import PageHeader from '@/components/ui/PageHeader';
import { LEAVE_TYPES } from '@/lib/utils/constants';

export default function ApplyLeavePage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<any[]>([]);
  const [form, setForm] = useState({ employee: '', leaveType: 'casual', startDate: '', endDate: '', reason: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [days, setDays] = useState(0);

  useEffect(() => {
    api.get('/employees?limit=100').then(({ data }) => setEmployees(data.employees)).catch(() => {});
  }, []);

  useEffect(() => {
    if (form.startDate && form.endDate) {
      const d = Math.ceil((new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / 86400000) + 1;
      setDays(Math.max(0, d));
    }
  }, [form.startDate, form.endDate]);

  const set = (field: string, value: string) => setForm(p => ({ ...p, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      await api.post('/leave', form);
      router.push('/dashboard/leave');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit');
    } finally { setLoading(false); }
  };

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label style={{ display: 'block', fontSize: 12, color: 'var(--text-2)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</label>
      {children}
    </div>
  );

  return (
    <div style={{ maxWidth: 560 }}>
      <PageHeader title="Apply for Leave" subtitle="Submit a leave request" />
      {error && <div style={{ background: 'rgba(247,82,90,0.1)', border: '1px solid rgba(247,82,90,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: '#ff8a8a', fontSize: 13 }}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field label="Employee">
            <select className="input-field" value={form.employee} onChange={e => set('employee', e.target.value)} required>
              <option value="">Select employee</option>
              {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName} — {emp.department}</option>)}
            </select>
          </Field>
          <Field label="Leave Type">
            <select className="input-field" value={form.leaveType} onChange={e => set('leaveType', e.target.value)}>
              {LEAVE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Start Date"><input className="input-field" type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} required /></Field>
            <Field label="End Date"><input className="input-field" type="date" value={form.endDate} min={form.startDate} onChange={e => set('endDate', e.target.value)} required /></Field>
          </div>
          {days > 0 && (
            <div style={{ padding: '10px 14px', background: 'rgba(79,142,247,0.08)', borderRadius: 8, border: '1px solid rgba(79,142,247,0.2)', fontSize: 13, color: 'var(--accent)' }}>
              Duration: <strong>{days} day{days > 1 ? 's' : ''}</strong>
            </div>
          )}
          <Field label="Reason">
            <textarea className="input-field" rows={3} value={form.reason} onChange={e => set('reason', e.target.value)} placeholder="Briefly describe your reason..." required style={{ resize: 'vertical' }} />
          </Field>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <button type="button" onClick={() => router.back()} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-2)', cursor: 'pointer', fontSize: 14 }}>Cancel</button>
          <button className="btn-primary" type="submit" disabled={loading} style={{ flex: 2 }}>{loading ? 'Submitting...' : 'Submit Request'}</button>
        </div>
      </form>
    </div>
  );
}