'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';

interface Message { role: 'user' | 'assistant'; content: string; }

// This page is a standalone locked interview environment
// HR shares: http://localhost:3000/interview/TOKEN
// Candidate opens it and cannot navigate away

export default function CandidateInterviewPage() {
  const { token } = useParams();
  const [phase, setPhase] = useState<'verify'|'brief'|'interview'|'done'>('verify');
  const [candidateName, setCandidateName] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [inputMode, setInputMode] = useState<'voice'|'text'>('voice');
  const [isComplete, setIsComplete] = useState(false);
  const [scorecard, setScorecard] = useState<any>(null);
  const [violations, setViolations] = useState<string[]>([]);
  const [cameraOn, setCameraOn] = useState(false);
  const [faceDetected, setFaceDetected] = useState(true);
  const [proctoringAlert, setProctoringAlert] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const procRef   = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Decode token to get job info (base64 encoded)
  const jobInfo = (() => {
    try {
      const decoded = atob(decodeURIComponent(token as string));
      return JSON.parse(decoded);
    } catch {
      return {
        title: 'Software Engineer',
        description: 'Full stack development role.',
        maxQuestions: 8,
        durationMinutes: 15,
        resumeScore: 0
      };
    }
  })();

  // LOCK: prevent leaving
  useEffect(() => {
    if (phase !== 'interview') return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Interview in progress. Are you sure you want to leave?';
      return e.returnValue;
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      const blocked = (e.ctrlKey || e.metaKey) && ['w','t','r','n'].includes(e.key.toLowerCase());
      const f12 = e.key === 'F12';
      const altTab = e.altKey && e.key === 'Tab';
      if (blocked || f12 || altTab) {
        e.preventDefault();
        addViolation(`Blocked: ${e.key}`);
        showAlert('⚠️ Navigation blocked during interview!');
      }
    };
    const handleVisibility = () => {
      if (document.hidden) {
        addViolation('Tab switch');
        showAlert('⚠️ You left the tab! This is recorded.');
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('contextmenu', e => e.preventDefault());
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [phase]);

  // Fullscreen
  useEffect(() => {
    if (phase !== 'interview') return;
    document.documentElement.requestFullscreen?.().catch(() => {});
    const onFSChange = () => {
      if (!document.fullscreenElement) {
        addViolation('Exited fullscreen');
        showAlert('⚠️ Stay fullscreen during interview!');
        setTimeout(() => document.documentElement.requestFullscreen?.().catch(() => {}), 1500);
      }
    };
    document.addEventListener('fullscreenchange', onFSChange);
    return () => document.removeEventListener('fullscreenchange', onFSChange);
  }, [phase]);

  const addViolation = (v: string) => setViolations(p => [...p, `${v} at ${new Date().toLocaleTimeString()}`]);
  const showAlert = (msg: string) => { setProctoringAlert(msg); setTimeout(() => setProctoringAlert(''), 4000); };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      setCameraOn(true);
      procRef.current = setInterval(() => {
        if (!videoRef.current || !canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(videoRef.current, 0, 0, 320, 240);
        const data = ctx.getImageData(0, 0, 320, 240).data;
        let skin = 0;
        for (let i = 0; i < data.length; i += 16) {
          const r=data[i],g=data[i+1],b=data[i+2];
          if (r>95&&g>40&&b>20&&r>g&&r>b&&Math.abs(r-g)>15) skin++;
        }
        const ratio = skin / (data.length/16);
        setFaceDetected(ratio > 0.04);
        if (ratio <= 0.04) { addViolation('No face detected'); showAlert('⚠️ Please stay in front of the camera!'); }
      }, 4000);
    } catch { alert('Camera is required for this interview. Please allow access.'); }
  };

  const speak = (text: string) => {
    return new Promise<void>(resolve => {
      if (!voiceEnabled || !window.speechSynthesis) { resolve(); return; }
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      utt.rate = 0.9; utt.pitch = 1;
      const go = () => {
        const v = window.speechSynthesis.getVoices();
        const pref = v.find(x => x.lang.startsWith('en')) || v[0];
        if (pref) utt.voice = pref;
        setSpeaking(true);
        utt.onend = () => { setSpeaking(false); resolve(); };
        utt.onerror = () => { setSpeaking(false); resolve(); };
        window.speechSynthesis.speak(utt);
      };
      window.speechSynthesis.getVoices().length ? go() : (window.speechSynthesis.onvoiceschanged = go);
    });
  };

  const startInterview = async () => {
    setPhase('interview');
    await startCamera();
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/ai/interview/next-question`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          job_title: jobInfo.title, 
          job_description: jobInfo.description, 
          conversation_history: [], 
          is_first_message: true,
          max_questions: jobInfo.maxQuestions || 8
        })
      });
      const data = await res.json();
      const msg: Message = { role: 'assistant', content: data.question };
      setMessages([msg]);
      await speak(data.question);
    } catch { alert('Could not connect to AI. Make sure the AI service is running.'); }
    finally { setLoading(false); }
  };

  const sendAnswer = async (answer: string) => {
    if (!answer.trim() || loading) return;
    setTranscript(''); setTextInput('');
    const userMsg: Message = { role: 'user', content: answer };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    if (isComplete) { generateScorecard(newHistory); return; }
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/ai/interview/next-question`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          job_title: jobInfo.title, 
          job_description: jobInfo.description, 
          conversation_history: newHistory,
          is_first_message: false,
          max_questions: jobInfo.maxQuestions || 8
        })
      });
      const data = await res.json();
      if (data.is_complete) setIsComplete(true);
      const botMsg: Message = { role: 'assistant', content: data.question };
      setMessages(p => [...p, botMsg]);
      await speak(data.question);
    } catch {} finally { setLoading(false); }
  };

  const generateScorecard = async (history: Message[]) => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/ai/interview/scorecard`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_title: jobInfo.title, conversation_history: history })
      });
      const data = await res.json();
      data.proctoring_violations = violations;
      data.candidate_name = candidateName;
      setScorecard(data);
      setPhase('done');
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (procRef.current) clearInterval(procRef.current);
      document.exitFullscreen?.().catch(() => {});
    } catch {} finally { setLoading(false); }
  };

  const startListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = false; rec.interimResults = true; rec.lang = 'en-IN';
    rec.onresult = (e: any) => setTranscript(Array.from(e.results).map((r: any) => r[0].transcript).join(''));
    rec.onend = () => setListening(false);
    rec.start();
    recognitionRef.current = rec;
    setListening(true);
  };

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Verify phase
  if (phase === 'verify') return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ maxWidth: 480, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg,var(--accent),var(--accent2))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24 }}>⬡</div>
          <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>NEXUS Interview</h1>
          <p style={{ color: 'var(--text-2)', fontSize: 13 }}>AI-Proctored Interview for {jobInfo.title}</p>
        </div>
        <div className="card" style={{ padding: 28 }}>
          <div style={{ marginBottom: 20, padding: '12px 16px', background: 'rgba(245,166,35,0.06)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: 10 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#f5a623', marginBottom: 8 }}>Before you start:</p>
            {['This interview is fully AI-conducted and recorded','Camera monitoring is active throughout','Tab switching and keyboard shortcuts are blocked','Stay in fullscreen mode at all times','Once started, do not refresh or close the window'].map((r,i) => (
              <p key={i} style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 3 }}>• {r}</p>
            ))}
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-2)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Your Full Name</label>
            <input className="input-field" value={candidateName} onChange={e => setCandidateName(e.target.value)} placeholder="Enter your name to continue" />
          </div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <button onClick={() => setInputMode('voice')} style={{ flex: 1, padding: '9px', borderRadius: 10, border: `1px solid ${inputMode==='voice'?'var(--accent)':'var(--border)'}`, background: inputMode==='voice'?'rgba(79,142,247,0.1)':'transparent', color: inputMode==='voice'?'var(--accent)':'var(--text-2)', cursor: 'pointer', fontSize: 13 }}>🎤 Voice</button>
            <button onClick={() => setInputMode('text')} style={{ flex: 1, padding: '9px', borderRadius: 10, border: `1px solid ${inputMode==='text'?'var(--accent)':'var(--border)'}`, background: inputMode==='text'?'rgba(79,142,247,0.1)':'transparent', color: inputMode==='text'?'var(--accent)':'var(--text-2)', cursor: 'pointer', fontSize: 13 }}>⌨ Text</button>
          </div>
          <button className="btn-primary" onClick={() => candidateName.trim() ? setPhase('brief') : alert('Enter your name')} style={{ padding: '12px' }}>
            Continue →
          </button>
        </div>
      </div>
    </div>
  );

  if (phase === 'brief') return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ maxWidth: 520, width: '100%', textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Ready, {candidateName.split(' ')[0]}?</p>
        <p style={{ color: 'var(--text-2)', marginBottom: 28 }}>Interview for <strong style={{ color: 'var(--text-1)' }}>{jobInfo.title}</strong></p>
        <div className="card" style={{ padding: 24, marginBottom: 20, textAlign: 'left' }}>
          {[['Duration',`${jobInfo.durationMinutes || 15} minutes, up to ${jobInfo.maxQuestions || 8} questions`],['Format','AI asks adaptive questions based on your answers'],['Mode', inputMode === 'voice' ? 'Voice — speak your answers' : 'Text — type your answers'],['Camera','Required — face must be visible throughout'],['Environment','Do not switch tabs or use other devices']].map(([l,v]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{l}</span>
              <span style={{ fontSize: 13, fontWeight: 500, maxWidth: '60%', textAlign: 'right' }}>{v}</span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <input 
              type="checkbox" 
              id="voiceToggle" 
              checked={voiceEnabled} 
              onChange={e => setVoiceEnabled(e.target.checked)} 
              style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--accent)' }} 
            />
            <label htmlFor="voiceToggle" style={{ fontSize: 13, color: 'var(--text-1)', cursor: 'pointer', fontWeight: 500 }}>
              Enable AI Voice (Read questions aloud)
            </label>
          </div>
        </div>
        <button className="btn-primary" onClick={startInterview} style={{ padding: '14px', fontSize: 15 }}>
          ◉ Start Interview Now
        </button>
      </div>
    </div>
  );

  if (phase === 'done' && scorecard) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ maxWidth: 520, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <p style={{ fontSize: 48, marginBottom: 8 }}>🎉</p>
          <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Interview Complete!</h2>
          <p style={{ color: 'var(--text-2)' }}>Thank you, {candidateName}. Your results have been submitted.</p>
        </div>
        <div className="card" style={{ padding: 24, textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Your Score</p>
          <p style={{ fontFamily: 'var(--font-head)', fontSize: 56, fontWeight: 800, color: scorecard.overall_score >= 70 ? '#22c97a' : '#4f8ef7', marginBottom: 8 }}>{scorecard.overall_score}</p>
          <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7 }}>{scorecard.summary}</p>
          {violations.length > 0 && (
            <p style={{ marginTop: 12, fontSize: 12, color: '#f5a623' }}>⚠ {violations.length} proctoring event(s) recorded</p>
          )}
        </div>
      </div>
    </div>
  );

  // Interview phase
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {proctoringAlert && (
        <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 999, padding: '10px 24px', background: '#f7525a', borderRadius: 10, color: 'white', fontWeight: 600, fontSize: 13, boxShadow: '0 4px 24px rgba(247,82,90,0.4)' }}>
          {proctoringAlert}
        </div>
      )}

      {/* Top bar */}
      <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-card)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f7525a', boxShadow: '0 0 8px #f7525a' }} />
          <p style={{ fontSize: 13, fontWeight: 600 }}>NEXUS AI Interview — {jobInfo.title}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{candidateName}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: faceDetected ? '#22c97a' : '#f7525a' }} />
            <span style={{ fontSize: 11, color: faceDetected ? '#22c97a' : '#f7525a' }}>Camera</span>
          </div>
          {violations.length > 0 && <span style={{ fontSize: 11, color: '#f5a623' }}>⚠ {violations.length} violation(s)</span>}
        </div>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 280px', gap: 0 }}>
        {/* Chat */}
        <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role==='user'?'flex-end':'flex-start', gap: 10 }}>
                {msg.role === 'assistant' && (
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,var(--accent),var(--accent2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>◌</div>
                )}
                <div style={{
                  maxWidth: '75%', padding: '12px 16px', fontSize: 14, lineHeight: 1.7,
                  borderRadius: msg.role==='user'?'16px 16px 4px 16px':'16px 16px 16px 4px',
                  background: msg.role==='user'?'linear-gradient(135deg,var(--accent),var(--accent2))':'rgba(255,255,255,0.06)',
                  border: msg.role==='assistant'?'1px solid var(--border)':'none'
                }}>{msg.content}</div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,var(--accent),var(--accent2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>◌</div>
                <div style={{ padding: '12px 16px', borderRadius: '16px 16px 16px 4px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', display: 'flex', gap: 4, alignItems: 'center' }}>
                  {[0,1,2].map(j => <div key={j} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', animation: `bounce 1s ${j*0.2}s infinite` }} />)}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          {!isComplete && (
            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                {['voice','text'].map(m => (
                  <button key={m} onClick={() => setInputMode(m as any)} style={{ padding: '4px 12px', borderRadius: 6, border: `1px solid ${inputMode===m?'var(--accent)':'var(--border)'}`, background: inputMode===m?'rgba(79,142,247,0.15)':'transparent', color: inputMode===m?'var(--accent)':'var(--text-2)', cursor: 'pointer', fontSize: 11 }}>
                    {m === 'voice' ? '🎤 Voice' : '⌨ Text'}
                  </button>
                ))}
              </div>
              {inputMode === 'voice' ? (
                <div>
                  {transcript && <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(79,142,247,0.08)', fontSize: 13, marginBottom: 10, color: 'var(--text-2)' }}>"{transcript}"</div>}
                  <div style={{ display: 'flex', gap: 10 }}>
                    {!listening ? (
                      <button onClick={startListening} disabled={speaking || loading} style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,var(--accent),var(--accent2))', color: 'white', fontSize: 14, fontWeight: 500 }}>🎤 Speak Answer</button>
                    ) : (
                      <button onClick={() => { recognitionRef.current?.stop(); setListening(false); }} style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#f7525a,#d63b42)', color: 'white', fontSize: 14, fontWeight: 500 }}>⏹ Stop</button>
                    )}
                    {transcript && !listening && <button onClick={() => sendAnswer(transcript)} disabled={loading} style={{ padding: '12px 20px', borderRadius: 10, border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent)', cursor: 'pointer', fontSize: 14 }}>Send →</button>}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 10 }}>
                  <input className="input-field" value={textInput} onChange={e => setTextInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && textInput.trim()) { e.preventDefault(); sendAnswer(textInput); } }} placeholder="Type your answer..." disabled={loading || speaking} />
                  <button onClick={() => sendAnswer(textInput)} disabled={!textInput.trim() || loading} style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,var(--accent),var(--accent2))', color: 'white', cursor: 'pointer' }}>→</button>
                </div>
              )}
            </div>
          )}
          {isComplete && !scorecard && (
            <div style={{ padding: 16, borderTop: '1px solid var(--border)', textAlign: 'center' }}>
              <button onClick={() => generateScorecard(messages)} disabled={loading} className="btn-primary">{loading ? '◌ Generating...' : '◎ Finish & Get Results'}</button>
            </div>
          )}
        </div>

        {/* Camera sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div style={{ position: 'relative', background: '#000', aspectRatio: '4/3' }}>
            <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} autoPlay muted playsInline />
            <canvas ref={canvasRef} width={320} height={240} style={{ display: 'none' }} />
            {!faceDetected && cameraOn && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(247,82,90,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: 'white', fontWeight: 700, textAlign: 'center', fontSize: 13 }}>⚠ No face<br/>detected!</p>
              </div>
            )}
          </div>
          <div style={{ padding: 14 }}>
            <p style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Proctoring</p>
            {[['Camera', cameraOn], ['Face', faceDetected], ['Tab focus', violations.filter(v=>v.includes('Tab')).length === 0]].map(([l,ok]) => (
              <div key={l as string} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: 'var(--text-2)' }}>{l as string}</span>
                <span style={{ fontSize: 11, color: ok ? '#22c97a' : '#f7525a', fontWeight: 600 }}>{ok ? '✓' : '✗'}</span>
              </div>
            ))}
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
              <p style={{ fontSize: 11, color: '#f5a623' }}>{violations.length} violation(s)</p>
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}`}</style>
    </div>
  );
}