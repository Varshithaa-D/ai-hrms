'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import Sidebar from '@/components/layout/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('hrms_token');
    if (!token) {
      router.replace('/login');
    } else {
      setChecked(true);
    }
  }, []);

  if (!checked) return null;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{
        marginLeft: 220, flex: 1, padding: '32px',
        minHeight: '100vh', background: 'var(--bg)'
      }}>
        {children}
      </main>
    </div>
  );
}