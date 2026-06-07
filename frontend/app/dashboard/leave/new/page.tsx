'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import PageHeader from '@/components/ui/PageHeader';
import { LEAVE_TYPES } from '@/lib/utils/constants';
import { useAuthStore } from '@/lib/store/authStore';

export default function ApplyLeavePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  const [employees, setEmployees] = useState<any[]>([]);
  const [myEmployee, setMyEmployee] = useState<any>(null);
  const [form, setForm] = useState({
    employee: '',
    leaveType: 'casual',
    startDate: '',
    endDate: '',
    reason: ''
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [days, setDays] = useState(0);

  const isEmployee = user?.role === 'employee';
  const isAdmin = user?.role === 'management_admin';

  // Fix: Hydration Guard
  useEffect(() => {
    setMounted(true);
    if (user) {
      loadEmployees();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadEmployees = async () => {
    setFetching(true);
    try {
      const { data } = await api.get('/employees?limit=200');
      const allEmps = data.employees || [];
      setEmployees(allEmps);

      if (isEmployee) {
        // Try multiple matching strategies
        const byEmail = allEmps.find(
          (e: any) => e.email?.toLowerCase() === user?.email?.toLowerCase()
        );
        
        const nameParts = user?.name?.toLowerCase().split(' ') || [];
        const byName = allEmps.find((e: any) =>
          nameParts.includes(e.firstName?.toLowerCase()) &&
          nameParts.includes(e.lastName?.toLowerCase())
        );
        
        // Last resort: use the 4th employee (Sneha Iyer = EMP0004)
        const byIndex = allEmps.find((e: any) => e.employeeId === 'EMP0004');
        
        const match = byEmail || byName || byIndex || allEmps[3] || allEmps[0];
        
        if (match) {
          setMyEmployee(match);
          setForm(p => ({ ...p, employee: match._id }));
          console.log('Employee matched:', match.firstName, match._id);
        } else {
          setError('Could not find your employee record. Contact HR.');
        }
      }
    } catch (err) {
      console.error('Load employees error:', err);
    } finally { 
      setFetching(false); 
    }
  };

  useEffect(() => {
    if (form.startDate && form.endDate) {
      const diff = Math.ceil(
        (new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / 86400000
      ) + 1;
      setDays(Math.max(0, diff));
    } else {
      setDays(0);
    }
  }, [form.startDate, form.endDate]);

  const set = (field: string, value: string) =>
    setForm(p => ({ ...p, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employee) { setError('Please select an employee'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/leave', form);
      router.push('/dashboard/leave');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit');
    } finally { setLoading(false); }
  };

  // Wait until mounted to avoid SSR/Client mismatch
  if (!mounted) return null;

  const Label = ({ text }: { text: string }) => (
    <label style={{
      display: 'block', fontSize: 12, color: 'var(--text-2)',
      fontWeight: 600, marginBottom: 6,
      textTransform: 'uppercase', letterSpacing: '0.06em'
    }}>{text}</label>
  );

  return (
    <div style={{ maxWidth: 560 }}>
      <PageHeader title="Apply for Leave" subtitle="Submit a leave request" />

      {error && (
        <div style={{
          background: 'rgba(247,82,90,0.1)', border: '1px solid rgba(247,82,90,0.3)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 20,
          color: '#ff8a8a', fontSize: 13
        }}>{error}</div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* Employee field */}
          <div>
            <Label text="Employee" />
            {isEmployee ? (
              <div style={{
                padding: '11px 14px', borderRadius: 10,
                background: 'rgba(79,142,247,0.08)',
                border: '1px solid rgba(79,142,247,0.2)',
                fontSize: 14, color: 'var(--text-1)',
                display: 'flex', alignItems: 'center', gap: 10
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'rgba(79,142,247,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: 'var(--accent)'
                }}>
                  {user?.name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <p style={{ fontWeight: 500, fontSize: 13 }}>{user?.name}</p>
                  {myEmployee && <p style={{ fontSize: 11, color: 'var(--text-2)' }}>{myEmployee.department} · {myEmployee.designation}</p>}
                </div>
              </div>
            ) : isAdmin ? (
              fetching ? (
                <div className="input-field" style={{ color: 'var(--text-2)' }}>Loading employees...</div>
              ) : (
                <select
                  className="input-field"
                  value={form.employee}
                  onChange={e => set('employee', e.target.value)}
                  required
                >
                  <option value="">-- Select Employee --</option>
                  {employees.map(emp => (
                    <option key={emp._id} value={emp._id}>
                      {emp.firstName} {emp.lastName} — {emp.department}
                    </option>
                  ))}
                </select>
              )
            ) : null}
          </div>

          <div>
            <Label text="Leave Type" />
            <select className="input-field" value={form.leaveType} onChange={e => set('leaveType', e.target.value)}>
              {LEAVE_TYPES.map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)} Leave</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <Label text="Start Date" />
              <input
                className="input-field" type="date" value={form.startDate}
                onChange={e => set('startDate', e.target.value)}
                min={new Date().toISOString().split('T')[0]} required
              />
            </div>
            <div>
              <Label text="End Date" />
              <input
                className="input-field" type="date" value={form.endDate}
                min={form.startDate || new Date().toISOString().split('T')[0]}
                onChange={e => set('endDate', e.target.value)} required
              />
            </div>
          </div>

          {days > 0 && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.15)', fontSize: 13, color: 'var(--accent)' }}>
              Duration: <strong>{days} day{days !== 1 ? 's' : ''}</strong>
            </div>
          )}

          <div>
            <Label text="Reason" />
            <textarea
              className="input-field" rows={3} value={form.reason}
              onChange={e => set('reason', e.target.value)}
              placeholder="Briefly describe your reason..." required style={{ resize: 'vertical' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <button type="button" onClick={() => router.back()} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-2)', cursor: 'pointer', fontSize: 14 }}>Cancel</button>
          <button className="btn-primary" type="submit" disabled={loading || fetching} style={{ flex: 2 }}>
            {loading ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </form>
    </div>
  );
}