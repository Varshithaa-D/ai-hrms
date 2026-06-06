'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import PageHeader from '@/components/ui/PageHeader';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import { formatDate, getInitials } from '@/lib/utils/formatters';
import { useAuthStore } from '@/lib/store/authStore';

export default function EmployeesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [employees, setEmployees] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [departments, setDepartments] = useState<string[]>([]);

  const canAdd = user?.role === 'management_admin' || user?.role === 'hr_recruiter';

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    const timer = setTimeout(fetchEmployees, 300);
    return () => clearTimeout(timer);
  }, [search, department]);

  const fetchDepartments = async () => {
    try {
      const { data } = await api.get('/employees/meta/departments');
      setDepartments(data);
    } catch {}
  };

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 50 };
      if (search) params.search = search;
      if (department) params.department = department;
      const { data } = await api.get('/employees', { params });
      setEmployees(data.employees);
      setTotal(data.total);
    } catch {} finally { setLoading(false); }
  };

  const deptColors: Record<string, string> = {
    Engineering: '#4f8ef7', Product: '#7c5cfc', Design: '#f7525a',
    Marketing: '#f5a623', HR: '#22c97a', Finance: '#5fe8a5', Operations: '#b39dff',
  };

  return (
    <div>
      <PageHeader
        title="Employees"
        subtitle={`${total} total employees`}
        action={canAdd ? { label: '+ Add Employee', onClick: () => router.push('/dashboard/employees/new') } : undefined}
      />

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <input
          className="input-field"
          style={{ maxWidth: 280 }}
          placeholder="Search by name or ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="input-field"
          style={{ maxWidth: 180 }}
          value={department}
          onChange={e => setDepartment(e.target.value)}
        >
          <option value="">All Departments</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? <LoadingSpinner /> : employees.length === 0 ? (
        <EmptyState icon="⬡" title="No employees found" subtitle="Try adjusting your search filters" />
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Employee', 'ID', 'Department', 'Designation', 'Type', 'Joined', ''].map(h => (
                  <th key={h} style={{
                    padding: '12px 16px', textAlign: 'left',
                    fontSize: 11, fontWeight: 600, color: 'var(--text-2)',
                    textTransform: 'uppercase', letterSpacing: '0.07em'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((emp, i) => (
                <tr key={emp._id}
                  style={{
                    borderBottom: i < employees.length - 1 ? '1px solid var(--border)' : 'none',
                    cursor: 'pointer', transition: 'background 0.15s'
                  }}
                  onClick={() => router.push(`/dashboard/employees/${emp._id}`)}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                        background: `${deptColors[emp.department] || '#4f8ef7'}22`,
                        border: `1.5px solid ${deptColors[emp.department] || '#4f8ef7'}44`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700, color: deptColors[emp.department] || '#4f8ef7',
                        fontFamily: 'var(--font-head)'
                      }}>
                        {getInitials(`${emp.firstName} ${emp.lastName}`)}
                      </div>
                      <div>
                        <p style={{ fontWeight: 500, fontSize: 13 }}>{emp.firstName} {emp.lastName}</p>
                        <p style={{ fontSize: 12, color: 'var(--text-2)' }}>{emp.email}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-2)', fontFamily: 'monospace' }}>{emp.employeeId}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 500,
                      background: `${deptColors[emp.department] || '#4f8ef7'}18`,
                      color: deptColors[emp.department] || '#4f8ef7'
                    }}>{emp.department}</span>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-1)' }}>{emp.designation}</td>
                  <td style={{ padding: '14px 16px' }}><Badge status={emp.employmentType} /></td>
                  <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-2)' }}>{formatDate(emp.joiningDate)}</td>
                  <td style={{ padding: '14px 16px', fontSize: 18, color: 'var(--text-3)' }}>›</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}