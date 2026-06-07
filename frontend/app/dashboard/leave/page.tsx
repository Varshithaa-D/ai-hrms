'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import PageHeader from '@/components/ui/PageHeader';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import { formatDate } from '@/lib/utils/formatters';
import { useAuthStore } from '@/lib/store/authStore';

export default function LeavePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const isManager = user?.role === 'management_admin' || user?.role === 'senior_manager' || user?.role === 'hr_recruiter';
  const isEmployee = user?.role === 'employee';

  // FIX: Added 'user' to dependencies and ensured we only fetch when user exists
  useEffect(() => { 
    if (user) {
      fetchLeaves(); 
    }
  }, [statusFilter, user]);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;

      const endpoint = isEmployee ? '/leave/my' : '/leave';
      const { data } = await api.get(endpoint, { params });
      setLeaves(data);
    } catch {} finally { setLoading(false); }
  };

  const handleAction = async (status: 'approved' | 'rejected') => {
    if (!selected) return;
    setActionLoading(true);
    try {
      await api.put(`/leave/${selected._id}/status`, { status });
      setModalOpen(false);
      fetchLeaves();
    } catch {} finally { setActionLoading(false); }
  };

  if (!user) return null; // Wait for auth store to hydrate

  return (
    <div>
      <PageHeader
        title="Leave Management"
        subtitle={isEmployee ? 'Your leave requests and history' : 'Track and manage all leave requests'}
        action={user?.role === 'employee' || user?.role === 'management_admin'
  ? { label: '+ Apply Leave', onClick: () => router.push('/dashboard/leave/new') }
  : undefined}
      />

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {['', 'pending', 'approved', 'rejected'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} style={{
            padding: '7px 16px', borderRadius: 99, fontSize: 12, fontWeight: 500, cursor: 'pointer',
            border: '1px solid', transition: 'all 0.15s',
            borderColor: statusFilter === s ? 'var(--accent)' : 'var(--border)',
            background: statusFilter === s ? 'rgba(79,142,247,0.15)' : 'transparent',
            color: statusFilter === s ? 'var(--accent)' : 'var(--text-2)',
          }}>{s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}</button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : leaves.length === 0 ? (
        <EmptyState icon="◫" title="No leave requests" subtitle={isEmployee ? "You haven't applied for any leaves yet" : "No leave requests found"} />
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {/* Only show Employee column for managers */}
                {!isEmployee && <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Employee</th>}
                {['Type', 'From', 'To', 'Days', 'Status', 'Applied On'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
                ))}
                {isManager && <th style={{ padding: '12px 16px' }} />}
              </tr>
            </thead>
            <tbody>
              {leaves.map((leave, i) => {
                const days = Math.ceil((new Date(leave.endDate).getTime() - new Date(leave.startDate).getTime()) / 86400000) + 1;
                return (
                  <tr key={leave._id} style={{ borderBottom: i < leaves.length - 1 ? '1px solid var(--border)' : 'none', cursor: isManager ? 'pointer' : 'default', transition: 'background 0.15s' }}
                    onClick={() => { if (isManager) { setSelected(leave); setModalOpen(true); } }}
                    onMouseEnter={e => isManager && ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)')}
                    onMouseLeave={e => isManager && ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                  >
                    {!isEmployee && (
                      <td style={{ padding: '14px 16px', fontSize: 13 }}>
                        {leave.employee?.firstName} {leave.employee?.lastName}
                      </td>
                    )}
                    <td style={{ padding: '14px 16px', fontSize: 13, textTransform: 'capitalize' }}>{leave.leaveType}</td>
                    <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-2)' }}>{formatDate(leave.startDate)}</td>
                    <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-2)' }}>{formatDate(leave.endDate)}</td>
                    <td style={{ padding: '14px 16px', fontWeight: 600, fontSize: 13 }}>{days}d</td>
                    <td style={{ padding: '14px 16px' }}><Badge status={leave.status} /></td>
                    <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-2)' }}>{formatDate(leave.createdAt)}</td>
                    {isManager && (
                      <td style={{ padding: '14px 16px', fontSize: 18, color: 'var(--text-3)' }}>›</td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* FIX: Changed isOpen to open to match your standard Modal component props */}
      {isManager && selected && (
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Leave Request">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                ['Employee', `${selected.employee?.firstName} ${selected.employee?.lastName}`],
                ['Type', selected.leaveType],
                ['From', formatDate(selected.startDate)],
                ['To', formatDate(selected.endDate)],
                ['Status', selected.status],
              ].map(([l, v]) => (
                <div key={l as string} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{l}</p>
                  <p style={{ fontSize: 13, fontWeight: 500, textTransform: 'capitalize' }}>{v}</p>
                </div>
              ))}
            </div>
            {selected.reason && (
              <div style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
                <p style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Reason</p>
                <p style={{ fontSize: 13 }}>{selected.reason}</p>
              </div>
            )}
            {selected.status === 'pending' && (
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button onClick={() => handleAction('rejected')} disabled={actionLoading} style={{ flex: 1, padding: '10px', borderRadius: 9, border: '1px solid rgba(247,82,90,0.3)', background: 'rgba(247,82,90,0.08)', color: '#f7525a', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                  ✗ Reject
                </button>
                <button onClick={() => handleAction('approved')} disabled={actionLoading} style={{ flex: 1, padding: '10px', borderRadius: 9, border: '1px solid rgba(34,201,122,0.3)', background: 'rgba(34,201,122,0.08)', color: '#22c97a', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                  ✓ Approve
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}