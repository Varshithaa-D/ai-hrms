'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import PageHeader from '@/components/ui/PageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';

export default function AnalyticsPage() {
  const [employees, setEmployees]   = useState<any[]>([]);
  const [selectedEmp, setSelectedEmp] = useState('');
  const [exs, setExs]               = useState<any>(null);
  const [exsLoading, setExsLoading] = useState(false);
  const [exsForm, setExsForm]       = useState({ attendance_rate: 90, performance_score: 75, leave_utilization: 60, salary_growth_percent: 5, goal_completion: 70, days_since_last_raise: 180, manager_interactions_monthly: 8 });

  useEffect(() => {
    api.get('/employees?limit=100').then(({ data }) => setEmployees(data.employees)).catch(() => {});
  }, []);

  const computeEXS = async () => {
    if (!selectedEmp) return;
    const emp = employees.find(e => e._id === selectedEmp);
    if (!emp) return;
    setExsLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/ai/exs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_name: `${emp.firstName} ${emp.lastName}`, ...exsForm })
      });
      setExs(await res.json());
    } catch { alert('AI service error'); } finally { setExsLoading(false); }
  };

  const exsColor = (score: number) => score >= 80 ? '#22c97a' : score >= 60 ? '#4f8ef7' : score >= 40 ? '#f5a623' : '#f7525a';

  const deptData = employees.reduce((acc: any, emp) => {
    const d = emp.department;
    acc[d] = (acc[d] || 0) + 1;
    return acc;
  }, {});
  const deptChart = Object.entries(deptData).map(([dept, count]) => ({ dept: dept.substring(0,4), count }));

  const salaryData = employees.slice(0, 8).map(e => ({
    name: e.firstName,
    salary: (e.salary?.basic || 0) + (e.salary?.hra || 0) + (e.salary?.allowances || 0)
  }));

  return (
    <div>
      <PageHeader title="Analytics & EXS" subtitle="Employee Experience Score + workforce insights" />

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
        <div className="card" style={{ padding: 20 }}>
          <p style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Headcount by Department</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={deptChart}>
              <XAxis dataKey="dept" stroke="#4a5568" fontSize={11} />
              <YAxis stroke="#4a5568" fontSize={11} />
              <Tooltip contentStyle={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" fill="#4f8ef7" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <p style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Gross Salary Distribution</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={salaryData}>
              <XAxis dataKey="name" stroke="#4a5568" fontSize={11} />
              <YAxis stroke="#4a5568" fontSize={11} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }} formatter={(v: any) => [`₹${v.toLocaleString('en-IN')}`, 'Salary']} />
              <Bar dataKey="salary" fill="#7c5cfc" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* EXS Calculator */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <span style={{ fontSize: 20 }}>◉</span>
          <div>
            <p style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 16 }}>Employee Experience Score (EXS)</p>
            <p style={{ fontSize: 12, color: 'var(--text-2)' }}>AI-computed engagement health metric — like a credit score for employee wellness</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Inputs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-2)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Select Employee</label>
              <select className="input-field" value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)}>
                <option value="">Select employee</option>
                {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName}</option>)}
              </select>
            </div>
            {[
              { key: 'attendance_rate', label: 'Attendance Rate', unit: '%', max: 100 },
              { key: 'performance_score', label: 'Performance Score', unit: '/100', max: 100 },
              { key: 'goal_completion', label: 'Goal Completion', unit: '%', max: 100 },
              { key: 'leave_utilization', label: 'Leave Utilization', unit: '%', max: 100 },
              { key: 'salary_growth_percent', label: 'Salary Growth', unit: '% /yr', max: 50 },
              { key: 'days_since_last_raise', label: 'Days Since Last Raise', unit: 'days', max: 1000 },
            ].map(f => (
              <div key={f.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 500 }}>{f.label}</label>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>{(exsForm as any)[f.key]} {f.unit}</span>
                </div>
                <input type="range" min={0} max={f.max} value={(exsForm as any)[f.key]}
                  onChange={e => setExsForm(p => ({ ...p, [f.key]: Number(e.target.value) }))}
                  style={{ width: '100%', accentColor: 'var(--accent)' }} />
              </div>
            ))}
            <button className="btn-primary" onClick={computeEXS} disabled={!selectedEmp || exsLoading}>
              {exsLoading ? '◌ Computing...' : '◉ Compute EXS Score'}
            </button>
          </div>

          {/* EXS Result */}
          <div>
            {exsLoading ? <LoadingSpinner text="AI computing EXS..." /> :
            exs ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Score */}
                <div style={{ textAlign: 'center', padding: 24, background: `${exsColor(exs.exs_score)}08`, border: `1px solid ${exsColor(exs.exs_score)}22`, borderRadius: 14 }}>
                  <p style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>{exs.employee_name}</p>
                  <p style={{ fontFamily: 'var(--font-head)', fontSize: 64, fontWeight: 800, color: exsColor(exs.exs_score), lineHeight: 1 }}>{exs.exs_score}</p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: exsColor(exs.exs_score), marginTop: 4 }}>{exs.level}</p>
                  {/* Score ring visual */}
                  <div style={{ margin: '16px auto', width: 120, height: 12, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                    <div style={{ width: `${exs.exs_score}%`, height: '100%', background: `linear-gradient(90deg, ${exsColor(exs.exs_score)}, ${exsColor(exs.exs_score)}88)`, borderRadius: 99, transition: 'width 1s ease' }} />
                  </div>
                </div>
                {/* Breakdown */}
                <div className="card" style={{ padding: 16 }}>
                  <p style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Score Breakdown</p>
                  {Object.entries(exs.breakdown || {}).map(([key, val]: any) => (
                    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-2)', textTransform: 'capitalize' }}>{key.replace(/_/g,' ')}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 80, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                          <div style={{ width: `${(val/25)*100}%`, height: '100%', background: 'var(--accent)', borderRadius: 99 }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, minWidth: 28, textAlign: 'right' }}>{val}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {/* AI Narrative */}
                {exs.narrative && (
                  <div style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, borderLeft: '2px solid var(--accent)', fontSize: 13, lineHeight: 1.7 }}>
                    <p style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>◌ AI Insight</p>
                    {exs.narrative}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, opacity: 0.4 }}>
                <p style={{ fontSize: 48 }}>◉</p>
                <p style={{ fontFamily: 'var(--font-head)', fontWeight: 600 }}>EXS score appears here</p>
                <p style={{ fontSize: 13, color: 'var(--text-2)', textAlign: 'center' }}>Select an employee and adjust the sliders</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}