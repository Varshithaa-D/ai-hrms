'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import PageHeader from '@/components/ui/PageHeader';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import { formatCurrency } from '@/lib/utils/formatters';
import { useAuthStore } from '@/lib/store/authStore';

export default function PayrollPage() {
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [payslips, setPayslips] = useState<any[]>([]);
  const [selectedEmp, setSelectedEmp] = useState('');
  const [loading, setLoading] = useState(false);
  const [genModal, setGenModal] = useState(false);
  const [genForm, setGenForm] = useState({ employeeId: '', month: 1, year: 2026, daysWorked: 26 });
  const [genLoading, setGenLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
    const now = new Date();
    setGenForm(p => ({ ...p, month: now.getMonth() + 1, year: now.getFullYear() }));
  }, []);

  const isEmployee = mounted && user?.role === 'employee';
  const isAdmin = mounted && (user?.role === 'management_admin' || user?.role === 'hr_recruiter');

  useEffect(() => {
    if (!mounted) return;
    if (isEmployee) {
      fetchMyPayslips();
    } else {
      api.get('/employees?limit=100').then(({ data }) => setEmployees(data.employees)).catch(() => {});
    }
  }, [isEmployee, mounted]);

  useEffect(() => {
    if (!mounted) return;
    if (!isEmployee && selectedEmp) fetchPayslips(selectedEmp);
  }, [selectedEmp, isEmployee, mounted]);

  const fetchMyPayslips = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/payroll/my');
      setPayslips(data);
    } catch {
      try {
        const { data: empData } = await api.get('/employees/me');
        if (empData?._id) await fetchPayslips(empData._id);
      } catch {}
    } finally { setLoading(false); }
  };

  const fetchPayslips = async (empId: string) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/payroll/employee/${empId}`);
      setPayslips(data);
    } catch {} finally { setLoading(false); }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault(); setGenLoading(true);
    try {
      await api.post('/payroll/generate', genForm);
      setGenModal(false);
      if (selectedEmp === genForm.employeeId) fetchPayslips(selectedEmp);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error');
    } finally { setGenLoading(false); }
  };

  if (!mounted) return null;

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const PayslipCard = ({ p }: { p: any }) => (
    <div key={p._id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(79,142,247,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 13, color: '#7eb4ff' }}>
            {months[(p.month || 1) - 1]}
          </div>
          <div>
            <p style={{ fontWeight: 600, fontSize: 14 }}>{months[(p.month || 1) - 1]} {p.year}</p>
            <p style={{ fontSize: 12, color: 'var(--text-2)' }}>{p.daysWorked || 26} days worked</p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 700, color: '#22c97a' }}>{formatCurrency(p.netSalary || p.grossSalary || 0)}</p>
          <Badge status={p.status || 'paid'} />
        </div>
      </div>
      <div style={{ padding: '14px 20px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[['Basic', p.basic || 0], ['HRA', p.hra || 0], ['Allowances', p.allowances || 0], ['Deductions', p.deductions || 0]].map(([l, v]) => (
          <div key={l as string}>
            <p style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{l}</p>
            <p style={{ fontSize: 13, fontWeight: 500, color: l === 'Deductions' ? '#f7525a' : 'var(--text-1)' }}>{formatCurrency(v as number)}</p>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Payroll"
        subtitle={isEmployee ? 'Your salary history and payslip details' : 'Manage payslips and salary processing'}
        action={isAdmin ? { label: '+ Generate Payroll', onClick: () => setGenModal(true) } : undefined}
      />

      {!isEmployee && (
        <div className="card" style={{ padding: 20, marginBottom: 24 }}>
          <div style={{ maxWidth: 300 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-2)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>View Payslips For</label>
            <select className="input-field" value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)}>
              <option value="">Select employee</option>
              {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName}</option>)}
            </select>
          </div>
        </div>
      )}

      {(!isEmployee && !selectedEmp) ? (
        <EmptyState icon="◎" title="Select an employee" subtitle="Choose an employee to view their payslips" />
      ) : loading ? <LoadingSpinner /> : payslips.length === 0 ? (
        <EmptyState icon="◎" title="No payslips yet" subtitle={isEmployee ? "Your payslips will appear here once generated" : "Generate payroll to create payslips"} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {payslips.map(p => <PayslipCard key={p._id} p={p} />)}
        </div>
      )}

      {isAdmin && (
        <Modal open={genModal} onClose={() => setGenModal(false)} title="Generate Payroll">
          <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-2)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Employee</label>
              <select className="input-field" value={genForm.employeeId} onChange={e => setGenForm(p => ({ ...p, employeeId: e.target.value }))} required>
                <option value="">Select employee</option>
                {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName}</option>)}
              </select>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-2)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Month</label>
                <select className="input-field" value={genForm.month} onChange={e => setGenForm(p => ({ ...p, month: Number(e.target.value) }))}>
                  {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m,i) => (
                    <option key={i+1} value={i+1}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-2)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Year</label>
                <select className="input-field" value={genForm.year} onChange={e => setGenForm(p => ({ ...p, year: Number(e.target.value) }))}>
                  {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-2)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Days Worked</label>
              <input className="input-field" type="number" min={1} max={31} value={genForm.daysWorked} onChange={e => setGenForm(p => ({ ...p, daysWorked: Number(e.target.value) }))} />
            </div>
            <button className="btn-primary" type="submit" disabled={genLoading}>{genLoading ? 'Generating...' : 'Generate Payslip'}</button>
          </form>
        </Modal>
      )}
    </div>
  );
}