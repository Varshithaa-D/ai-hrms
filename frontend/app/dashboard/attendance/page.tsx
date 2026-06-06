'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import PageHeader from '@/components/ui/PageHeader';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import { useAuthStore } from '@/lib/store/authStore';
import { formatDate } from '@/lib/utils/formatters';

export default function AttendancePage() {
  const { user } = useAuthStore();
  const [records, setRecords] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmp, setSelectedEmp] = useState('');
  const [loading, setLoading] = useState(true);
  const [clockedIn, setClockedIn] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const now = new Date();

  const isAdmin = user?.role !== 'employee';
  const isEmployee = user?.role === 'employee';

  useEffect(() => {
    fetchSummary();
    api.get('/employees?limit=100').then(({ data }) => setEmployees(data.employees)).catch(() => {});
  }, []);

  // Auto-select the employee if they are logged in so their table and buttons load
  useEffect(() => {
    if (isEmployee && user) {
      setSelectedEmp((user as any)._id || (user as any).id || '');
    }
  }, [isEmployee, user]);

  useEffect(() => {
    if (selectedEmp) fetchRecords(selectedEmp);
  }, [selectedEmp]);

  const fetchSummary = async () => {
    try {
      const { data } = await api.get('/attendance/summary/today');
      setSummary(data);
    } catch {} finally { setLoading(false); }
  };

  const fetchRecords = async (empId: string) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/attendance/employee/${empId}`, {
        params: { month: now.getMonth() + 1, year: now.getFullYear() }
      });
      setRecords(data);
      const today = data.find((r: any) => {
        const d = new Date(r.date);
        return d.toDateString() === now.toDateString();
      });
      setClockedIn(today || null);
    } catch {} finally { setLoading(false); }
  };

  const handleClockIn = async () => {
    if (!selectedEmp) return;
    setActionLoading(true);
    try {
      await api.post('/attendance/clock-in', { employeeId: selectedEmp });
      fetchRecords(selectedEmp);
      fetchSummary();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error');
    } finally { setActionLoading(false); }
  };

  const handleClockOut = async () => {
    if (!clockedIn) return;
    setActionLoading(true);
    try {
      await api.put(`/attendance/clock-out/${clockedIn._id}`, {});
      fetchRecords(selectedEmp);
      fetchSummary();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error');
    } finally { setActionLoading(false); }
  };

  return (
    <div>
      <PageHeader title="Attendance" subtitle={`Today — ${now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}`} />

      {/* Today's Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'Present', value: summary.present || 0, color: '#22c97a' },
          { label: 'Absent', value: summary.absent || 0, color: '#f7525a' },
          { label: 'Late', value: summary.late || 0, color: '#f5a623' },
          { label: 'On Leave', value: summary.on_leave || 0, color: '#7c5cfc' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '18px 20px' }}>
            <p style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>{s.label}</p>
            <p style={{ fontFamily: 'var(--font-head)', fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Employee Selector + Clock In/Out */}
      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <p style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: 15, marginBottom: 16 }}>
          {isAdmin ? 'Employee Attendance' : 'My Attendance'}
        </p>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {isAdmin && (
            <div style={{ flex: 1, minWidth: 240 }}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-2)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Select Employee</label>
              <select className="input-field" value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)}>
                <option value="">-- Select --</option>
                {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName}</option>)}
              </select>
            </div>
          )}
          
          {/* ONLY show clock controls if the user is an employee */}
          {isEmployee && selectedEmp && (
            <div style={{ display: 'flex', gap: 10 }}>
              {!clockedIn ? (
                <button onClick={handleClockIn} disabled={actionLoading} style={{
                  padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #22c97a, #1aab68)', color: 'white', fontWeight: 500, fontSize: 14
                }}>{actionLoading ? '...' : '⏵ Clock In'}</button>
              ) : !clockedIn.clockOut ? (
                <button onClick={handleClockOut} disabled={actionLoading} style={{
                  padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #f7525a, #d63b42)', color: 'white', fontWeight: 500, fontSize: 14
                }}>{actionLoading ? '...' : '⏹ Clock Out'}</button>
              ) : (
                <div style={{ padding: '10px 20px', borderRadius: 10, background: 'rgba(34,201,122,0.1)', border: '1px solid rgba(34,201,122,0.3)', color: '#22c97a', fontSize: 13, fontWeight: 500 }}>
                  ✓ Completed — {clockedIn.hoursWorked}h worked
                </div>
              )}
              {clockedIn && (
                <div style={{ padding: '10px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-2)' }}>
                  In: {clockedIn.clockIn ? new Date(clockedIn.clockIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '--'}
                  {clockedIn.clockOut && ` · Out: ${new Date(clockedIn.clockOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Records Table */}
      {selectedEmp && (
        loading ? <LoadingSpinner /> : records.length === 0 ? (
          <EmptyState icon="◷" title="No records this month" />
        ) : (
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
              <p style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: 14 }}>
                {now.toLocaleString('en-IN', { month: 'long', year: 'numeric' })} — {records.length} records
              </p>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Date', 'Clock In', 'Clock Out', 'Hours', 'Status'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <tr key={r._id} style={{ borderBottom: i < records.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <td style={{ padding: '12px 16px', fontSize: 13 }}>{formatDate(r.date)}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-2)' }}>
                      {r.clockIn ? new Date(r.clockIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '--'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-2)' }}>
                      {r.clockOut ? new Date(r.clockOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '--'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500 }}>
                      {r.hoursWorked ? `${r.hoursWorked}h` : '--'}
                    </td>
                    <td style={{ padding: '12px 16px' }}><Badge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}