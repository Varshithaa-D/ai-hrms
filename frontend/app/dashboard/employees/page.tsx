'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import PageHeader from '@/components/ui/PageHeader';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import { useAuthStore } from '@/lib/store/authStore';

export default function EmployeesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  
  // 1. Add mounted state
  const [mounted, setMounted] = useState(false);
  
  const [employees, setEmployees] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  // 2. Set mounted to true on initial client render
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // 3. Only fetch if mounted
    if (!mounted) return;
    const fetchEmployees = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/employees?page=${page}&limit=12&search=${search}`);
        setEmployees(data.employees || []);
        setTotal(data.total || 0);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    // Add a slight debounce to search to avoid spamming the API
    const delayDebounceFn = setTimeout(() => {
      fetchEmployees();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [page, search, mounted]);

  // 4. Guard against SSR rendering
  if (!mounted) return null;

  const isAdmin = user?.role === 'management_admin' || user?.role === 'hr_recruiter';

  return (
    <div>
      <PageHeader 
        title="Employees" 
        subtitle={`${total} total employees`}
        action={isAdmin ? { label: '+ Add Employee', onClick: () => router.push('/dashboard/employees/new') } : undefined}
      />

      <div style={{ marginBottom: 24, display: 'flex', gap: 12 }}>
        <input 
          className="input-field" 
          placeholder="Search by name, ID, or email..." 
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={{ maxWidth: 400 }}
        />
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : employees.length === 0 ? (
        <EmptyState icon="⬡" title="No employees found" subtitle={search ? "Try adjusting your search criteria" : "Start building your team"} />
      ) : (
        <>
          <div style={{ overflowX: 'auto', background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                  <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 11 }}>Employee</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 11 }}>ID</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 11 }}>Role</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 11 }}>Status</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 11, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp._id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(79,142,247,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#7eb4ff', fontSize: 12 }}>
                          {emp.firstName.charAt(0)}{emp.lastName.charAt(0)}
                        </div>
                        <div>
                          <p style={{ fontWeight: 600 }}>{emp.firstName} {emp.lastName}</p>
                          <p style={{ fontSize: 11, color: 'var(--text-2)' }}>{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 20px', fontFamily: 'var(--font-mono)' }}>{emp.employeeId}</td>
                    <td style={{ padding: '14px 20px' }}>
                      <p style={{ fontWeight: 500 }}>{emp.designation}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-2)' }}>{emp.department}</p>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <Badge status={emp.isActive ? 'active' : 'inactive'} />
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      {isAdmin && (
                        <button 
                          onClick={() => router.push(`/dashboard/employees/${emp._id}`)}
                          style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-1)', padding: '6px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer', transition: 'border 0.2s' }}
                          onMouseEnter={e => e.currentTarget.style.borderColor='var(--accent)'}
                          onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
            <p style={{ fontSize: 12, color: 'var(--text-2)' }}>Showing {employees.length} of {total}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))} 
                disabled={page === 1}
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: page === 1 ? 'var(--text-3)' : 'var(--text-1)', padding: '6px 12px', borderRadius: 8, fontSize: 12, cursor: page === 1 ? 'not-allowed' : 'pointer' }}
              >Prev</button>
              <button 
                onClick={() => setPage(p => p + 1)} 
                disabled={employees.length < 12}
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: employees.length < 12 ? 'var(--text-3)' : 'var(--text-1)', padding: '6px 12px', borderRadius: 8, fontSize: 12, cursor: employees.length < 12 ? 'not-allowed' : 'pointer' }}
              >Next</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}