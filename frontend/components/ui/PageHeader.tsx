'use client';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: { label: string; onClick: () => void; color?: string };
}

export default function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{title}</h1>
        {subtitle && <p style={{ color: 'var(--text-2)', fontSize: 13 }}>{subtitle}</p>}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          suppressHydrationWarning
          style={{
            background: `linear-gradient(135deg, ${action.color || 'var(--accent)'}, var(--accent2))`,
            color: 'white', border: 'none', borderRadius: 10, padding: '10px 20px',
            fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)'
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}