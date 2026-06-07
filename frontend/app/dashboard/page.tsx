'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store/authStore';
import StatCard from '@/components/ui/StatCard';
import api from '@/lib/api';

// Scalability Panel component
const ScalabilityPanel = () => (
  <div className="card" style={{ padding: 24, marginTop: 28, border: '1px solid #4f8ef7', background: 'rgba(79,142,247,0.05)' }}>
    <h3 style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: 16, marginBottom: 8, color: '#4f8ef7' }}>System Scalability</h3>
    <p style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 16 }}>Infrastructure health check for 5,000+ employee load.</p>
    <div style={{ display: 'flex', gap: 24 }}>
      <div>
        <p style={{ fontSize: 11, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>DB Latency</p>
        <p style={{ fontSize: 14, fontWeight: 600 }}>12ms</p>
      </div>
      <div>
        <p style={{ fontSize: 11, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Request Load</p>
        <p style={{ fontSize: 14, fontWeight: 600 }}>45%</p>
      </div>
    </div>
  </div>
);

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<any>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchStats();
  }, [user]);

  const fetchStats = async () => {
    try {
      const [empRes, attRes] = await Promise.all([
        api.get('/employees?limit=1'),
        api.get('/attendance/summary/today'),
      ]);
      setStats({ totalEmployees: empRes.data.total, attendance: attRes.data });
    } catch {}
  };

  if (!mounted || !user) return null;

  const isAdmin   = user.role === 'management_admin';
  const isManager = user.role === 'senior_manager';
  const isHR      = user.role === 'hr_recruiter';
  const isEmp     = user.role === 'employee';

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%', background: 'var(--success)',
            boxShadow: '0 0 8px var(--success)'
          }}/>
          <p style={{ fontSize: 12, color: 'var(--text-2)' }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 28, fontWeight: 700 }}>
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
          <span style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {user.name.split(' ')[0]}
          </span>
        </h1>
        <p style={{ color: 'var(--text-2)', marginTop: 4 }}>Here's what's happening across your workspace today.</p>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
        {(isAdmin || isManager || isHR) && (
          <StatCard label="Total Employees" value={stats.totalEmployees || 0} icon="⬡" color="#4f8ef7" sub="Active headcount" />
        )}
        {(isAdmin || isManager) && (
          <>
            <StatCard label="Present Today"  value={stats.attendance?.present || 0} icon="◷" color="#22c97a" trend={{ value: 3, label: 'vs yesterday' }} />
            <StatCard label="On Leave"       value={stats.attendance?.absent  || 0} icon="◫" color="#f5a623" />
            <StatCard label="Late Arrivals"  value={stats.attendance?.late    || 0} icon="⚠" color="#f7525a" />
          </>
        )}
        {isHR && (
          <>
            <StatCard label="Present Today"  value={stats.attendance?.present || 0} icon="◷" color="#22c97a" />
            <StatCard label="Open Positions" value="—" icon="⬡" color="#7c5cfc" sub="Check recruitment" />
          </>
        )}
        {isEmp && (
          <>
            <StatCard label="Leave Balance"   value="12 days" icon="◫" color="#f5a623" sub="Casual + Earned" />
            <StatCard label="Attendance"      value="96%" icon="◷" color="#22c97a" sub="This month" />
            <StatCard label="Performance"     value="—" icon="◈" color="#7c5cfc" sub="Last review" />
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: 15, marginBottom: 14 }}>Quick Actions</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {isHR && [
            { label: 'Screen Resumes', href: '/dashboard/screening', color: '#4f8ef7' },
            { label: 'Post a Job',     href: '/dashboard/recruitment/new', color: '#22c97a' },
          ].map(a => (
            <a key={a.label} href={a.href} style={{ padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 500, background: `${a.color}18`, color: a.color, border: `1px solid ${a.color}33`, textDecoration: 'none' }}>{a.label}</a>
          ))}
          {(isAdmin || isManager) && [
            { label: 'View Analytics',  href: '/dashboard/analytics', color: '#4f8ef7' },
            { label: 'Process Payroll', href: '/dashboard/payroll',   color: '#22c97a' },
            { label: 'Review Leaves',   href: '/dashboard/leave',     color: '#f5a623' },
          ].map(a => (
            <a key={a.label} href={a.href} style={{ padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 500, background: `${a.color}18`, color: a.color, border: `1px solid ${a.color}33`, textDecoration: 'none' }}>{a.label}</a>
          ))}
          {isEmp && [
            { label: 'Apply for Leave',  href: '/dashboard/leave/new', color: '#f5a623' },
            { label: 'View Payslip',     href: '/dashboard/payroll',   color: '#22c97a' },
          ].map(a => (
            <a key={a.label} href={a.href} style={{ padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 500, background: `${a.color}18`, color: a.color, border: `1px solid ${a.color}33`, textDecoration: 'none' }}>{a.label}</a>
          ))}
        </div>
      </div>

      {/* Scalability Panel — Admin only */}
      {isAdmin && <ScalabilityPanel />}
    </div>
  );
}