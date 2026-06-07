'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import Sidebar from '@/components/layout/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated()) router.push('/login');
  }, [isAuthenticated, router]);

  // Wait until mounted to prevent hydration errors
  if (!mounted) return null;

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