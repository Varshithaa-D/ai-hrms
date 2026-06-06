export default function LoadingSpinner({ text = 'Loading...' }: { text?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 16 }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        border: '3px solid var(--border)',
        borderTopColor: 'var(--accent)',
        animation: 'spin 0.8s linear infinite'
      }}/>
      <p style={{ color: 'var(--text-2)', fontSize: 13 }}>{text}</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}