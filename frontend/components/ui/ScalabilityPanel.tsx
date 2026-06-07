'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';

export default function ScalabilityPanel() {
  const [metrics, setMetrics] = useState<any>(null);
  const [ping, setPing]       = useState<number>(0);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async () => {
    const start = Date.now();
    try {
      const { data } = await api.get('/employees/meta/metrics');
      setPing(Date.now() - start);
      setMetrics(data);
    } catch {}
  };

  if (!metrics) return null;

  return (
    <div className="card" style={{ padding: 24, borderLeft: '2px solid #22c97a', background: 'rgba(34,201,122,0.03)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c97a', boxShadow: '0 0 8px #22c97a' }} />
        <p style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: 14 }}>System Scalability — Live</p>
        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: 'rgba(34,201,122,0.15)', color: '#22c97a', fontWeight: 600 }}>
          ENTERPRISE READY
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
        {[
          { label: 'Total Employees', value: metrics.totalEmployees?.toLocaleString('en-IN'), color: '#4f8ef7', icon: '⬡' },
          { label: 'Active Users', value: metrics.activeEmployees?.toLocaleString('en-IN'), color: '#22c97a', icon: '◉' },
          { label: 'DB Response', value: `${metrics.dbResponseMs}ms`, color: '#22c97a', icon: '◷' },
          { label: 'API Latency', value: `${ping}ms`, color: ping < 100 ? '#22c97a' : '#f5a623', icon: '◈' },
          { label: 'Uptime SLA', value: metrics.uptime, color: '#22c97a', icon: '◎' },
        ].map(m => (
          <div key={m.label} style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid var(--border)' }}>
            <p style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{m.label}</p>
            <p style={{ fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 700, color: m.color }}>{m.value}</p>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 10 }}>
        ◉ Real-time WebSocket connections: {metrics.realtimeConnections} active · Refreshes every 10s · MongoDB with pagination and indexed queries
      </p>
    </div>
  );
}