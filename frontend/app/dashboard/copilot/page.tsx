'use client';
import { AI_URL } from '@/lib/utils/constants';
import { useState, useRef, useEffect } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import { useAuthStore } from '@/lib/store/authStore';

interface Message { role: 'user' | 'assistant'; content: string; loading?: boolean; }

const SUGGESTED = [
  'Who might be at attrition risk this quarter?',
  'Summarize this month\'s attendance trends',
  'Which department has the highest salary costs?',
  'What should I focus on as HR today?',
  'Generate interview questions for a React developer',
  'What are signs of employee burnout to watch for?',
];

export default function CopilotPage() {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: `Hello ${user?.name?.split(' ')[0] || ''}! I'm your AI HR Co-pilot. I can help you analyze employee data, generate insights, answer HR questions, and assist with recruitment. What would you like to know?` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg: Message = { role: 'user', content: msg };
    const loadingMsg: Message = { role: 'assistant', content: '', loading: true };
    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setLoading(true);

    try {
      const res = await fetch(`${AI_URL}/ai/copilot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page_context: 'general_hr_assistant',
          entity_data: { question: msg, user_role: user?.role },
          user_role: user?.role || 'hr_recruiter'
        })
      });
      const data = await res.json();
      setMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: data.insight }]);
    } catch {
      setMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: 'Sorry, I could not connect to the AI service. Make sure it\'s running on port 8000.' }]);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      <PageHeader title="AI Co-pilot" subtitle="Your intelligent HR assistant — powered by Gemini" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: 20, flex: 1, overflow: 'hidden' }}>
        {/* Chat */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--accent2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>◌</div>
            <div>
              <p style={{ fontWeight: 600, fontSize: 14 }}>Nexus AI</p>
              <p style={{ fontSize: 11, color: '#22c97a' }}>● Online — Gemini 2.0 Flash</p>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: 10 }}>
                {msg.role === 'assistant' && (
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--accent2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0, marginTop: 2 }}>◌</div>
                )}
                <div style={{
                  maxWidth: '75%', padding: '12px 16px',
                  borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: msg.role === 'user' ? 'linear-gradient(135deg, var(--accent), var(--accent2))' : 'rgba(255,255,255,0.05)',
                  border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                  fontSize: 13, lineHeight: 1.7
                }}>
                  {msg.loading ? (
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '2px 0' }}>
                      {[0,1,2].map(j => <div key={j} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', animation: `bounce 1s ${j*0.2}s infinite` }} />)}
                    </div>
                  ) : msg.content}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
            <input
              className="input-field"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Ask anything about your workforce..."
              disabled={loading}
            />
            <button onClick={() => sendMessage()} disabled={loading || !input.trim()} style={{
              padding: '10px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
              color: 'white', fontWeight: 500, fontSize: 14, opacity: loading || !input.trim() ? 0.5 : 1
            }}>→</button>
          </div>
        </div>

        {/* Suggestions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
          <p style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Suggested Questions</p>
          {SUGGESTED.map((s, i) => (
            <div key={i} onClick={() => sendMessage(s)} style={{
              padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)',
              background: 'rgba(255,255,255,0.02)', cursor: 'pointer', fontSize: 12,
              color: 'var(--text-2)', lineHeight: 1.5, transition: 'all 0.15s'
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-1)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-2)'; }}
            >{s}</div>
          ))}

          {/* Role info */}
          <div style={{ marginTop: 8, padding: '12px 14px', borderRadius: 10, background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.15)' }}>
            <p style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, marginBottom: 4 }}>Your Access Level</p>
            <p style={{ fontSize: 12, color: 'var(--text-2)', textTransform: 'capitalize' }}>{user?.role?.replace(/_/g,' ')}</p>
          </div>
        </div>
      </div>

      <style>{`@keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-6px)} }`}</style>
    </div>
  );
}