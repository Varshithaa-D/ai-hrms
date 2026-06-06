export default function EmptyState({ icon = '◎', title, subtitle }: { icon?: string; title: string; subtitle?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.3 }}>{icon}</div>
      <p style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{title}</p>
      {subtitle && <p style={{ color: 'var(--text-2)', fontSize: 13 }}>{subtitle}</p>}
    </div>
  );
}