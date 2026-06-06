const colors: Record<string, { bg: string; color: string }> = {
  active:     { bg: 'rgba(34,201,122,0.15)',  color: '#5fe8a5' },
  pending:    { bg: 'rgba(245,166,35,0.15)',  color: '#ffc95c' },
  approved:   { bg: 'rgba(34,201,122,0.15)',  color: '#5fe8a5' },
  rejected:   { bg: 'rgba(247,82,90,0.15)',   color: '#ff8a8a' },
  paid:       { bg: 'rgba(34,201,122,0.15)',  color: '#5fe8a5' },
  processed:  { bg: 'rgba(79,142,247,0.15)',  color: '#7eb4ff' },
  draft:      { bg: 'rgba(136,146,164,0.15)', color: '#8892a4' },
  full_time:  { bg: 'rgba(79,142,247,0.15)',  color: '#7eb4ff' },
  contract:   { bg: 'rgba(124,92,252,0.15)',  color: '#b39dff' },
  intern:     { bg: 'rgba(245,166,35,0.15)',  color: '#ffc95c' },
  present:    { bg: 'rgba(34,201,122,0.15)',  color: '#5fe8a5' },
  absent:     { bg: 'rgba(247,82,90,0.15)',   color: '#ff8a8a' },
  late:       { bg: 'rgba(245,166,35,0.15)',  color: '#ffc95c' },
  on_leave:   { bg: 'rgba(124,92,252,0.15)',  color: '#b39dff' },
};

export default function Badge({ status }: { status: string }) {
  const c = colors[status] || { bg: 'rgba(136,146,164,0.15)', color: '#8892a4' };
  return (
    <span style={{
      background: c.bg, color: c.color,
      padding: '3px 10px', borderRadius: 99,
      fontSize: 11, fontWeight: 600,
      textTransform: 'capitalize', letterSpacing: '0.04em'
    }}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}