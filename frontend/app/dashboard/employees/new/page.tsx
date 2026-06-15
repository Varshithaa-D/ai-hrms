'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import PageHeader from '@/components/ui/PageHeader';
import { DEPARTMENTS } from '@/lib/utils/constants';

// ✅ THE FIX: The Field component is now extracted OUTSIDE the main page function.
// React will no longer destroy and recreate this on every keystroke.
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label style={{ display: 'block', fontSize: 12, color: 'var(--text-2)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {label}
    </label>
    {children}
  </div>
);

export default function NewEmployeePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    department: '', designation: '', employmentType: 'full_time',
    joiningDate: '', address: '',
    salary: { basic: '', hra: '', allowances: '', deductions: '' }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Hydration fix: ensures component only renders on client
  useEffect(() => {
    setMounted(true);
  }, []);

  const set = (field: string, value: any) => setForm(p => ({ ...p, [field]: value }));
  const setSalary = (field: string, value: string) => setForm(p => ({ ...p, salary: { ...p.salary, [field]: value } }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      await api.post('/employees', {
        ...form,
        salary: {
          basic: Number(form.salary.basic), hra: Number(form.salary.hra),
          allowances: Number(form.salary.allowances), deductions: Number(form.salary.deductions)
        }
      });
      router.push('/dashboard/employees');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create employee');
    } finally { setLoading(false); }
  };

  if (!mounted) return null; // Wait until client-side mount

  return (
    <div style={{ maxWidth: 760 }}>
      <PageHeader title="Add New Employee" subtitle="Fill in the details below" />

      {error && (
        <div style={{ background: 'rgba(247,82,90,0.1)', border: '1px solid rgba(247,82,90,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: '#ff8a8a', fontSize: 13 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} autoComplete="off">
        {/* Personal Info */}
        <div className="card" style={{ padding: 24, marginBottom: 16 }}>
          <p style={{ fontFamily: 'var(--font-head)', fontWeight: 600, marginBottom: 18, color: 'var(--accent)' }}>Personal Information</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="First Name"><input className="input-field" value={form.firstName} onChange={e => set('firstName', e.target.value)} required /></Field>
            <Field label="Last Name"><input className="input-field" value={form.lastName} onChange={e => set('lastName', e.target.value)} required /></Field>
            <Field label="Email"><input className="input-field" type="email" value={form.email} onChange={e => set('email', e.target.value)} required /></Field>
            <Field label="Phone"><input className="input-field" value={form.phone} onChange={e => set('phone', e.target.value)} /></Field>
            <Field label="Address" ><input className="input-field" value={form.address} onChange={e => set('address', e.target.value)} /></Field>
          </div>
        </div>

        {/* Job Info */}
        <div className="card" style={{ padding: 24, marginBottom: 16 }}>
          <p style={{ fontFamily: 'var(--font-head)', fontWeight: 600, marginBottom: 18, color: 'var(--accent2)' }}>Job Details</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Department">
              <select className="input-field" value={form.department} onChange={e => set('department', e.target.value)} required>
                <option value="">Select department</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Designation"><input className="input-field" value={form.designation} onChange={e => set('designation', e.target.value)} required /></Field>
            <Field label="Employment Type">
              <select className="input-field" value={form.employmentType} onChange={e => set('employmentType', e.target.value)}>
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="intern">Intern</option>
              </select>
            </Field>
            <Field label="Joining Date"><input className="input-field" type="date" value={form.joiningDate} onChange={e => set('joiningDate', e.target.value)} required /></Field>
          </div>
        </div>

        {/* Salary */}
        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          <p style={{ fontFamily: 'var(--font-head)', fontWeight: 600, marginBottom: 18, color: '#22c97a' }}>Salary Details (₹/month)</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Basic"><input className="input-field" type="number" value={form.salary.basic} onChange={e => setSalary('basic', e.target.value)} placeholder="50000" /></Field>
            <Field label="HRA"><input className="input-field" type="number" value={form.salary.hra} onChange={e => setSalary('hra', e.target.value)} placeholder="20000" /></Field>
            <Field label="Allowances"><input className="input-field" type="number" value={form.salary.allowances} onChange={e => setSalary('allowances', e.target.value)} placeholder="10000" /></Field>
            <Field label="Deductions"><input className="input-field" type="number" value={form.salary.deductions} onChange={e => setSalary('deductions', e.target.value)} placeholder="3000" /></Field>
          </div>
          {form.salary.basic && (
            <div style={{ marginTop: 14, padding: '12px 16px', background: 'rgba(34,201,122,0.08)', borderRadius: 10, border: '1px solid rgba(34,201,122,0.2)' }}>
              <p style={{ fontSize: 13, color: '#22c97a' }}>
                Gross: ₹{(Number(form.salary.basic) + Number(form.salary.hra) + Number(form.salary.allowances)).toLocaleString('en-IN')} /month
              </p>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button type="button" onClick={() => router.back()} style={{
            flex: 1, padding: '11px', borderRadius: 10, border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--text-2)', cursor: 'pointer', fontSize: 14
          }}>Cancel</button>
          <button className="btn-primary" type="submit" disabled={loading} style={{ flex: 2 }}>
            {loading ? 'Creating...' : 'Create Employee'}
          </button>
        </div>
      </form>
    </div>
  );
}