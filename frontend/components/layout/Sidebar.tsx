'use client';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';

const navByRole: Record<string, { icon: string; label: string; href: string }[]> = {
  management_admin: [
    { icon: '◈', label: 'Dashboard',   href: '/dashboard' },
    { icon: '⬡', label: 'Employees',   href: '/dashboard/employees' },
    { icon: '◷', label: 'Attendance',  href: '/dashboard/attendance' },
    { icon: '◫', label: 'Leave',       href: '/dashboard/leave' },
    { icon: '◎', label: 'Payroll',     href: '/dashboard/payroll' },
    { icon: '◈', label: 'Performance', href: '/dashboard/performance' },
    { icon: '⬡', label: 'Recruitment', href: '/dashboard/recruitment' },
    { icon: '◉', label: 'Analytics',   href: '/dashboard/analytics' },
    { icon: '◌', label: 'AI Co-pilot', href: '/dashboard/copilot' },
  ],
  senior_manager: [
    { icon: '◈', label: 'Dashboard',   href: '/dashboard' },
    { icon: '⬡', label: 'My Team',     href: '/dashboard/employees' },
    { icon: '◷', label: 'Attendance',  href: '/dashboard/attendance' },
    { icon: '◫', label: 'Leave',       href: '/dashboard/leave' },
    { icon: '◈', label: 'Performance', href: '/dashboard/performance' },
    { icon: '◉', label: 'Analytics',   href: '/dashboard/analytics' },
    { icon: '◌', label: 'AI Co-pilot', href: '/dashboard/copilot' },
  ],
  hr_recruiter: [
    { icon: '◈', label: 'Dashboard',    href: '/dashboard' },
    { icon: '⬡', label: 'Employees',    href: '/dashboard/employees' },
    { icon: '◷', label: 'Attendance',   href: '/dashboard/attendance' },
    { icon: '◫', label: 'Leave',        href: '/dashboard/leave' },
    { icon: '⬡', label: 'Recruitment',  href: '/dashboard/recruitment' },
    { icon: '◌', label: 'AI Screening', href: '/dashboard/screening' },
  ],
  employee: [
    { icon: '◈', label: 'Dashboard',    href: '/dashboard' },
    { icon: '◷', label: 'Attendance',   href: '/dashboard/attendance' },
    { icon: '◫', label: 'Leave',        href: '/dashboard/leave' },
    { icon: '◎', label: 'Payslips',     href: '/dashboard/payroll' },
    { icon: '◈', label: 'Performance',  href: '/dashboard/performance' },
  ],
};

const roleColors: Record<string, string> = {
  management_admin: '#4f8ef7',
  senior_manager:   '#7c5cfc',
  hr_recruiter:     '#22c97a',
  employee:         '#f5a623',
};

const roleLabels: Record<string, string> = {
  management_admin: 'Management Admin',
  senior_manager:   'Senior Manager',
  hr_recruiter:     'HR Recruiter',
  employee:         'Employee',
};

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { logout } = useAuthStore();
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('hrms_user');
    if (stored) { try { setUser(JSON.parse(stored)); } catch {} }
    const unsubscribe = useAuthStore.subscribe((state) => setUser(state.user));
    return unsubscribe;
  }, []);

  if (!mounted || !user) return <aside style={{ width: 220, minHeight: '100vh', background: 'var(--bg-card)', borderRight: '1px solid var(--border)' }} />;

  const nav   = navByRole[user.role] || [];
  const color = roleColors[user.role] || '#4f8ef7';

  return (
    <aside style={{ width: 220, minHeight: '100vh', background: 'var(--bg-card)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, zIndex: 50 }}>
      {/* FWC Logo */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: `linear-gradient(135deg, var(--accent), var(--accent2))`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 16px rgba(79,142,247,0.3)` }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="9" cy="7" r="4" stroke="white" strokeWidth="2.5"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <p style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 14 }}>FWC Inc.</p>
            <p style={{ fontSize: 10, color: 'var(--text-2)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>HRMS Platform</p>
          </div>
        </div>
      </div>

      {/* User */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', marginBottom: 8, background: `${color}22`, border: `1.5px solid ${color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 14, color }}>
          {user.name?.charAt(0)?.toUpperCase() || '?'}
        </div>
        <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-1)', marginBottom: 2 }}>{user.name}</p>
        <p style={{ fontSize: 11, color, fontWeight: 500 }}>{roleLabels[user.role]}</p>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
        {nav.map(item => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <div key={item.href} onClick={() => router.push(item.href)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, marginBottom: 2, cursor: 'pointer', transition: 'all 0.15s', background: active ? `${color}18` : 'transparent', color: active ? color : 'var(--text-2)', fontWeight: active ? 500 : 400, fontSize: 13, borderLeft: active ? `2px solid ${color}` : '2px solid transparent' }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>{item.icon}</span>
              {item.label}
            </div>
          );
        })}
      </nav>

      {/* Sign Out */}
      <div style={{ padding: '12px 10px', borderTop: '1px solid var(--border)' }}>
        <div onClick={() => { logout(); router.push('/login'); }}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, cursor: 'pointer', color: 'var(--text-2)', fontSize: 13, transition: 'all 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f7525a'; (e.currentTarget as HTMLElement).style.background = 'rgba(247,82,90,0.08)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-2)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sign Out
        </div>
      </div>
    </aside>
  );
}