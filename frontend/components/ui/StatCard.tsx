interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: string;
  color?: string;
  trend?: { value: number; label: string };
}

export default function StatCard({ label, value, sub, icon, color = '#4f8ef7', trend }: StatCardProps) {
  return (
    <div className="card" style={{
      padding: '20px 22px', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'default'
    }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px ${color}22`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = 'none';
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <p style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          {label}
        </p>
        {icon && (
          <div style={{
            width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center',
            justifyContent: 'center', background: `${color}18`, fontSize: 16
          }}>{icon}</div>
        )}
      </div>
      <p style={{ fontFamily: 'var(--font-head)', fontSize: 28, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>
        {value}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {trend && (
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 99,
            background: trend.value >= 0 ? 'rgba(34,201,122,0.15)' : 'rgba(247,82,90,0.15)',
            color: trend.value >= 0 ? '#22c97a' : '#f7525a'
          }}>
            {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
        )}
        {sub && <p style={{ fontSize: 12, color: 'var(--text-2)' }}>{sub}</p>}
      </div>
    </div>
  );
}