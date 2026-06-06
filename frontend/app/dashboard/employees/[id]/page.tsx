'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import PageHeader from '@/components/ui/PageHeader';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatDate, formatCurrency } from '@/lib/utils/formatters';

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [emp, setEmp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exs, setExs] = useState<any>(null);

  useEffect(() => {
    api.get(`/employees/${id}`).then(({ data }) => { setEmp(data); fetchEXS(data); }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  const fetchEXS = async (employee: any) => {
    try {
      const res = await fetch('http://localhost:8000/ai/exs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_name: `${employee.firstName} ${employee.lastName}`,
          attendance_rate: 88, performance_score: 72, leave_utilization: 55,
          salary_growth_percent: 4, goal_completion: 68,
          days_since_last_raise: 200, manager_interactions_monthly: 6
        })
      });
      setExs(await res.json());
    } catch {}
  };

  if (loading) return <LoadingSpinner />;
  if (!emp) return <div>Employee not found</div>;

  const exsColor = (s: number) => s >= 80 ? '#22c97a' : s >= 60 ? '#4f8ef7' : s >= 40 ? '#f5a623' : '#f7525a';
  const deptColor = '#4f8ef7';

  return (
    <div>
      <PageHeader title="Employee Profile" subtitle={`${emp.employeeId} · ${emp.department}`} />

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
        {/* Profile Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card" style={{ padding: 24, textAlign: 'center' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', margin: '0 auto 14px', background: `${deptColor}22`, border: `2px solid ${deptColor}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 24, color: deptColor }}>
              {emp.firstName[0]}{emp.lastName[0]}
            </div>
            <p style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 18, marginBottom: 4 }}>{emp.firstName} {emp.lastName}</p>
            <p style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 10 }}>{emp.designation}</p>
            <Badge status={emp.isActive ? 'active' : 'rejected'} />
          </div>

          {/* EXS Score */}
          {exs && (
            <div className="card" style={{ padding: 18, textAlign: 'center', border: `1px solid ${exsColor(exs.exs_score)}22` }}>
              <p style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Experience Score</p>
              <p style={{ fontFamily: 'var(--font-head)', fontSize: 40, fontWeight: 800, color: exsColor(exs.exs_score), lineHeight: 1 }}>{exs.exs_score}</p>
              <p style={{ fontSize: 12, color: exsColor(exs.exs_score), marginTop: 4, fontWeight: 500 }}>{exs.level}</p>
              <p style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 8, lineHeight: 1.5 }}>{exs.narrative}</p>
            </div>
          )}
        </div>

        {/* Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 24 }}>
            <p style={{ fontFamily: 'var(--font-head)', fontWeight: 600, marginBottom: 16, color: 'var(--accent)' }}>Contact & Personal</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[['Email', emp.email], ['Phone', emp.phone || '—'], ['Address', emp.address || '—'], ['Joined', formatDate(emp.joiningDate)]].map(([l, v]) => (
                <div key={l}>
                  <p style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{l}</p>
                  <p style={{ fontSize: 13 }}>{v}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 24 }}>
            <p style={{ fontFamily: 'var(--font-head)', fontWeight: 600, marginBottom: 16, color: '#22c97a' }}>Salary Breakdown</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
              {[
                ['Basic', emp.salary?.basic],
                ['HRA', emp.salary?.hra],
                ['Allowances', emp.salary?.allowances],
                ['Gross', (emp.salary?.basic || 0) + (emp.salary?.hra || 0) + (emp.salary?.allowances || 0)]
              ].map(([l, v]) => (
                <div key={l} style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{l}</p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: l === 'Gross' ? '#22c97a' : 'var(--text-1)' }}>{formatCurrency(v as number)}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => router.push(`/dashboard/performance?emp=${emp._id}`)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid rgba(34,201,122,0.3)', background: 'rgba(34,201,122,0.08)', color: '#5fe8a5', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
              View Performance
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}