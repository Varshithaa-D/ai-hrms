'use client';
import { AI_URL } from '@/lib/utils/constants';
import { useState, useRef, useEffect } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface Message { role: 'user' | 'assistant'; content: string; }

export default function VoiceInterviewPage() {
  const [jobTitle,  setJobTitle]  = useState('');
  const [jobDesc,   setJobDesc]   = useState('');
  const [started,   setStarted]   = useState(false);
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [transcript,setTranscript]= useState('');
  const [textInput, setTextInput] = useState('');
  const [listening, setListening] = useState(false);
  const [speaking,  setSpeaking]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [isComplete,setIsComplete]= useState(false);
  const [scorecard, setScorecard] = useState<any>(null);
  const [scorecardLoading, setScorecardLoading] = useState(false);
  const [inputMode, setInputMode] = useState<'voice'|'text'>('voice');
  const [speechSupported, setSpeechSupported] = useState(false);
  const [micError,  setMicError]  = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(false); // ← New state added

  // Proctoring state
  const [violations,      setViolations]      = useState<string[]>([]);
  const [proctoringAlert, setProctoringAlert] = useState('');
  const [cameraEnabled,   setCameraEnabled]   = useState(false);
  const [faceDetected,    setFaceDetected]    = useState(true);
  const [tabWarnings,     setTabWarnings]     = useState(0);

  const recognitionRef = useRef<any>(null);
  const chatEndRef     = useRef<HTMLDivElement>(null);
  const videoRef       = useRef<HTMLVideoElement>(null);
  const canvasRef      = useRef<HTMLCanvasElement>(null);
  const streamRef      = useRef<MediaStream | null>(null);
  const proctoringRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Check speech support on mount ──────────────────────────────────────
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const supported = !!SR;
    setSpeechSupported(supported);
    if (!supported) {
      setInputMode('text');
      setMicError('Speech recognition is not available in this browser. Using text input instead. For voice, use Chrome or Edge.');
    }
    return () => { stopCamera(); };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Tab switching detection ─────────────────────────────────────────────
  useEffect(() => {
    if (!started) return;
    const handleVisibility = () => {
      if (document.hidden) {
        const w = `Tab switch at ${new Date().toLocaleTimeString()}`;
        setViolations(v => [...v, w]);
        setTabWarnings(n => n + 1);
        setProctoringAlert('⚠ Tab switching detected — this will be reported.');
        setTimeout(() => setProctoringAlert(''), 4000);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [started]);

  // ── Camera & proctoring ─────────────────────────────────────────────────
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      setCameraEnabled(true);

      proctoringRef.current = setInterval(() => {
        if (!videoRef.current || !canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(videoRef.current, 0, 0, 320, 240);
        const data = ctx.getImageData(0, 0, 320, 240).data;
        let skinPixels = 0;
        for (let i = 0; i < data.length; i += 16) {
          const r = data[i], g = data[i+1], b = data[i+2];
          if (r > 95 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 15) skinPixels++;
        }
        const facePresent = skinPixels / (data.length / 16) > 0.04;
        setFaceDetected(facePresent);
        if (!facePresent) {
          setViolations(v => {
            if (v[v.length - 1]?.startsWith('No face')) return v;
            return [...v, `No face at ${new Date().toLocaleTimeString()}`];
          });
          setProctoringAlert('⚠ Face not detected — please stay in front of the camera.');
          setTimeout(() => setProctoringAlert(''), 3000);
        }
      }, 4000);
    } catch {
      // Camera denied — continue without it
      setCameraEnabled(false);
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (proctoringRef.current) clearInterval(proctoringRef.current);
    setCameraEnabled(false);
  };

  // ── TTS ─────────────────────────────────────────────────────────────────
  const speak = (text: string) =>
    new Promise<void>(resolve => {
      // ← Updated logic here
      if (!voiceEnabled || !window.speechSynthesis) { resolve(); return; }
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      utt.rate = 0.9; utt.pitch = 1; utt.volume = 1;
      const trySpeak = () => {
        const voices = window.speechSynthesis.getVoices();
        const preferred =
          voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) ||
          voices.find(v => v.lang.startsWith('en')) ||
          voices[0];
        if (preferred) utt.voice = preferred;
        setSpeaking(true);
        utt.onend  = () => { setSpeaking(false); resolve(); };
        utt.onerror = () => { setSpeaking(false); resolve(); };
        window.speechSynthesis.speak(utt);
      };
      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = trySpeak;
      } else {
        trySpeak();
      }
    });

  // ── Fetch next AI question ───────────────────────────────────────────────
  const getNextQuestion = async (history: Message[], isFirst = false) => {
    const res = await fetch(`${AI_URL}/ai/interview/next-question`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_title: jobTitle,
        job_description: jobDesc,
        conversation_history: history,
        is_first_message: isFirst,
        max_questions: 8,
      }),
    });
    if (!res.ok) throw new Error(`AI service error: ${res.status}`);
    const data = await res.json();
    if (data.is_complete) setIsComplete(true);
    return data.question as string;
  };

  // ── Start interview ──────────────────────────────────────────────────────
  const startInterview = async () => {
    if (!jobTitle.trim() || !jobDesc.trim()) { alert('Please fill in both Job Title and Job Description'); return; }
    setStarted(true); setMessages([]); setLoading(true);
    await startCamera();
    try {
      const question = await getNextQuestion([], true);
      setMessages([{ role: 'assistant', content: question }]);
      await speak(question);
    } catch {
      alert('Could not connect to AI service on port 8000. Make sure it is running.');
      setStarted(false); stopCamera();
    } finally {
      setLoading(false);
    }
  };

  // ── Voice STT (Web Speech API) with Groq Whisper fallback ───────────────
  const startListening = async () => {
    setMicError('');

    // First: try native Web Speech API
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      try {
        // Request mic permission explicitly first
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        setMicError('Microphone permission denied. Please allow microphone access and try again.');
        setInputMode('text');
        return;
      }

      const rec = new SR();
      rec.continuous      = false;
      rec.interimResults  = true;
      rec.lang            = 'en-IN';
      rec.maxAlternatives = 1;

      rec.onstart = () => { setListening(true); setMicError(''); };

      rec.onresult = (e: any) => {
        const t = Array.from(e.results)
          .map((r: any) => r[0].transcript)
          .join('');
        setTranscript(t);
      };

      rec.onend = () => setListening(false);

      rec.onerror = (e: any) => {
        setListening(false);
        const code = e.error || 'unknown';
        if (code === 'not-allowed' || code === 'permission-denied') {
          setMicError('Microphone access denied. Please allow mic access in browser settings, then try again.');
          setInputMode('text');
        } else if (code === 'network') {
          setMicError('Network error with speech recognition. Switched to text input.');
          setInputMode('text');
        } else if (code === 'no-speech') {
          setMicError('No speech detected. Click the mic button and speak clearly.');
        } else if (code === 'aborted') {
          // User or system stopped — normal, no message needed
        } else {
          setMicError(`Speech error (${code}). Try text input instead.`);
        }
        console.warn('Speech recognition error:', code, e);
      };

      try {
        rec.start();
        recognitionRef.current = rec;
      } catch (err) {
        setMicError('Could not start speech recognition. Use text input instead.');
        setInputMode('text');
      }
      return;
    }

    // Fallback: record via MediaRecorder → send to Groq Whisper
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const chunks: BlobPart[] = [];
      mr.ondataavailable = e => chunks.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setListening(false);
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const fd = new FormData();
        fd.append('file', blob, 'audio.webm');
        try {
          const res = await fetch(`${AI_URL}/ai/transcribe`, { method: 'POST', body: fd });
          const data = await res.json();
          if (data.transcript) setTranscript(data.transcript);
        } catch {
          setMicError('Transcription failed. Please type your answer instead.');
          setInputMode('text');
        }
      };
      mr.start();
      setListening(true);
      // Auto stop after 30s
      setTimeout(() => { if (mr.state === 'recording') mr.stop(); }, 30000);
      recognitionRef.current = { stop: () => mr.stop(), _isMR: true };
    } catch {
      setMicError('Cannot access microphone. Switched to text input.');
      setInputMode('text');
    }
  };

  const stopListening = () => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    setListening(false);
  };

  // ── Send answer ──────────────────────────────────────────────────────────
  const sendAnswer = async (override?: string) => {
    const userText = (override || transcript || textInput).trim();
    if (!userText) return;
    recognitionRef.current?.stop();
    setListening(false);
    setTranscript('');
    setTextInput('');

    const userMsg: Message = { role: 'user', content: userText };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);

    if (isComplete) { fetchScorecard(newHistory); return; }

    setLoading(true);
    try {
      const question = await getNextQuestion(newHistory);
      setMessages(prev => [...prev, { role: 'assistant', content: question }]);
      await speak(question);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please check the AI service.' }]);
    } finally {
      setLoading(false);
    }
  };

  // ── Scorecard ────────────────────────────────────────────────────────────
  const fetchScorecard = async (history: Message[]) => {
    setScorecardLoading(true);
    try {
      const res = await fetch(`${AI_URL}/ai/interview/scorecard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_title: jobTitle,
          conversation_history: history,
          proctoring_violations: violations,
        }),
      });
      const data = await res.json();
      data.tab_switches = tabWarnings;
      setScorecard(data);
    } catch {
      setScorecard({ error: true, summary: 'Could not generate scorecard. Manual review required.' });
    } finally {
      setScorecardLoading(false);
    }
  };

  const verdictColor = (v: string) =>
    v === 'Selected' ? '#22c97a' : v === 'Not Selected' ? '#f7525a' : '#f5a623';

  // ─────────────────────────────────────────────────────────────────────────
  // PRE-INTERVIEW SETUP
  // ─────────────────────────────────────────────────────────────────────────
  if (!started) {
    return (
      <div>
        <PageHeader title="AI Voice Interview" subtitle="Adaptive voice screening — camera proctored, AI evaluated" />
        <div style={{ maxWidth: 580 }}>
          <div className="card" style={{ padding: 18, marginBottom: 16, borderLeft: '2px solid #f5a623', background: 'rgba(245,166,35,0.04)' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#f5a623', marginBottom: 8 }}>⚠ Before you begin</p>
            {['Allow microphone and camera access when prompted',
              'Use Chrome or Edge for best voice recognition',
              'Tab switching will be detected and logged',
              'AI will ask 8 adaptive questions based on your answers',
            ].map((r, i) => (
              <p key={i} style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 4, display: 'flex', gap: 8 }}>
                <span style={{ color: '#f5a623' }}>·</span>{r}
              </p>
            ))}
          </div>

          {micError && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(247,82,90,0.08)', border: '1px solid rgba(247,82,90,0.2)', fontSize: 12, color: '#f7525a', marginBottom: 12 }}>
              {micError}
            </div>
          )}

          <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-2)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Job Title</label>
              <input className="input-field" value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="e.g. Senior React Developer" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-2)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Job Description</label>
              <textarea className="input-field" rows={4} value={jobDesc} onChange={e => setJobDesc(e.target.value)} placeholder="Paste key requirements and responsibilities..." />
            </div>

            {/* Input mode selector */}
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-2)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Response Mode</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['voice', 'text'] as const).map(mode => (
                  <button key={mode} onClick={() => setInputMode(mode)} style={{
                    flex: 1, padding: '10px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500,
                    border: `1px solid ${inputMode === mode ? 'var(--accent)' : 'var(--border)'}`,
                    background: inputMode === mode ? 'rgba(79,142,247,0.1)' : 'transparent',
                    color: inputMode === mode ? 'var(--accent)' : 'var(--text-2)',
                    opacity: mode === 'voice' && !speechSupported ? 0.4 : 1,
                  }}>
                    {mode === 'voice' ? '🎤 Voice' : '⌨ Text'}
                    {mode === 'voice' && !speechSupported && ' (unavailable)'}
                  </button>
                ))}
              </div>
            </div>

            {/* ← New Voice toggle inserted here */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px', borderRadius: 10,
              background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
              marginBottom: 16
            }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 500 }}>AI Voice (Text-to-Speech)</p>
                <p style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
                  Interviewer speaks questions aloud
                </p>
              </div>
              <div
                onClick={() => setVoiceEnabled(v => !v)}
                style={{
                  width: 44, height: 24, borderRadius: 99, cursor: 'pointer',
                  background: voiceEnabled ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
                  position: 'relative', transition: 'background 0.2s', flexShrink: 0
                }}
              >
                <div style={{
                  position: 'absolute', top: 3, borderRadius: '50%',
                  width: 18, height: 18, background: 'white',
                  left: voiceEnabled ? 23 : 3, transition: 'left 0.2s',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.3)'
                }} />
              </div>
            </div>

            <button className="btn-primary" onClick={startInterview} style={{ padding: '13px' }}>
              ◉ Start Interview
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SCORECARD VIEW
  // ─────────────────────────────────────────────────────────────────────────
  if (scorecard) {
    return (
      <div>
        <PageHeader title="Interview Scorecard" subtitle={`${jobTitle} — AI evaluation complete`} />
        {scorecardLoading ? <LoadingSpinner text="Generating scorecard..." /> : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Left */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="card" style={{ padding: 24, textAlign: 'center' }}>
                <p style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Overall Score</p>
                <p style={{ fontFamily: 'var(--font-head)', fontSize: 64, fontWeight: 800, color: verdictColor(scorecard.final_verdict ?? 'On Hold'), lineHeight: 1 }}>
                  {scorecard.overall_score ?? '—'}
                </p>
                <div style={{
                  display: 'inline-block', marginTop: 10, padding: '8px 20px', borderRadius: 99,
                  background: `${verdictColor(scorecard.final_verdict ?? 'On Hold')}18`,
                  border: `1px solid ${verdictColor(scorecard.final_verdict ?? 'On Hold')}44`,
                  color: verdictColor(scorecard.final_verdict ?? 'On Hold'),
                  fontWeight: 700, fontSize: 15,
                }}>
                  {scorecard.final_verdict ?? 'On Hold'}
                </div>
                {tabWarnings > 0 && (
                  <p style={{ fontSize: 11, color: '#f7525a', marginTop: 8 }}>⚠ {tabWarnings} tab switch(es) detected</p>
                )}
              </div>

              {/* Dimension scores */}
              {[
                { key: 'communication',   label: 'Communication' },
                { key: 'technical_depth', label: 'Technical Depth' },
                { key: 'confidence',      label: 'Confidence' },
                { key: 'cultural_fit',    label: 'Cultural Fit' },
              ].map(d => scorecard[d.key] && (
                <div key={d.key} className="card" style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <p style={{ fontSize: 13, fontWeight: 500 }}>{d.label}</p>
                    <span style={{ fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 700, color: scorecard[d.key].score >= 7 ? '#22c97a' : scorecard[d.key].score >= 5 ? '#4f8ef7' : '#f5a623' }}>
                      {scorecard[d.key].score}/10
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-2)' }}>{scorecard[d.key].comment}</p>
                </div>
              ))}
            </div>

            {/* Right */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {scorecard.summary && (
                <div className="card" style={{ padding: 16, borderLeft: '2px solid var(--accent)' }}>
                  <p style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>◌ AI Summary</p>
                  <p style={{ fontSize: 13, lineHeight: 1.7 }}>{scorecard.summary}</p>
                </div>
              )}
              {scorecard.key_highlights?.length > 0 && (
                <div className="card" style={{ padding: 16 }}>
                  <p style={{ fontSize: 11, color: '#22c97a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>✓ Highlights</p>
                  {scorecard.key_highlights.map((h: string, i: number) => (
                    <p key={i} style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 5, display: 'flex', gap: 6 }}>
                      <span style={{ color: '#22c97a' }}>·</span>{h}
                    </p>
                  ))}
                </div>
              )}
              {scorecard.red_flags?.filter((f: string) => f).length > 0 && (
                <div className="card" style={{ padding: 16 }}>
                  <p style={{ fontSize: 11, color: '#f7525a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>⚠ Red Flags</p>
                  {scorecard.red_flags.map((f: string, i: number) => (
                    <p key={i} style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 5, display: 'flex', gap: 6 }}>
                      <span style={{ color: '#f7525a' }}>·</span>{f}
                    </p>
                  ))}
                </div>
              )}
              {violations.length > 0 && (
                <div className="card" style={{ padding: 16, borderColor: 'rgba(247,82,90,0.3)' }}>
                  <p style={{ fontSize: 11, color: '#f7525a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Proctoring Log ({violations.length})</p>
                  {violations.slice(-6).map((v, i) => (
                    <p key={i} style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 3 }}>· {v}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ACTIVE INTERVIEW
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div>
      <PageHeader title={`Voice Interview — ${jobTitle}`} subtitle="AI is interviewing you — speak clearly into your microphone" />

      {proctoringAlert && (
        <div style={{ padding: '10px 16px', borderRadius: 8, background: 'rgba(245,166,35,0.12)', border: '1px solid rgba(245,166,35,0.3)', color: '#f5a623', fontSize: 13, fontWeight: 500, marginBottom: 14 }}>
          {proctoringAlert}
        </div>
      )}

      {micError && (
        <div style={{ padding: '10px 16px', borderRadius: 8, background: 'rgba(247,82,90,0.08)', border: '1px solid rgba(247,82,90,0.2)', color: '#f7525a', fontSize: 12, marginBottom: 14 }}>
          {micError}
          <button onClick={() => setInputMode('text')} style={{ marginLeft: 10, fontSize: 11, color: 'var(--accent)', cursor: 'pointer', background: 'none', border: 'none', textDecoration: 'underline' }}>
            Switch to text
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>

        {/* Chat */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '72vh' }}>
          {/* Status bar */}
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: speaking ? '#22c97a' : listening ? '#f5a623' : 'var(--text-3)',
                boxShadow: speaking ? '0 0 8px #22c97a' : listening ? '0 0 8px #f5a623' : 'none',
                transition: 'all 0.3s',
              }} />
              <p style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: 14 }}>Nexus AI Interviewer</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <p style={{ fontSize: 12, color: speaking ? '#22c97a' : listening ? '#f5a623' : 'var(--text-2)' }}>
                {speaking ? '🔊 Speaking...' : listening ? '🎤 Listening...' : loading ? '◌ Thinking...' : '● Ready'}
              </p>
              <button onClick={() => setInputMode(m => m === 'voice' ? 'text' : 'voice')} style={{
                padding: '4px 10px', borderRadius: 6, fontSize: 11, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text-2)', cursor: 'pointer',
              }}>
                {inputMode === 'voice' ? '⌨ Text' : '🎤 Voice'}
              </button>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '80%', padding: '10px 14px',
                  borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: msg.role === 'user' ? 'linear-gradient(135deg, var(--accent), var(--accent2))' : 'rgba(255,255,255,0.06)',
                  border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                  fontSize: 13, lineHeight: 1.65,
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex' }}>
                <div style={{ padding: '10px 16px', borderRadius: '14px 14px 14px 4px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', display: 'flex', gap: 4, alignItems: 'center' }}>
                  {[0,1,2].map(j => <div key={j} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', animation: `bounce 1s ${j*0.2}s infinite`, opacity: 0.7 }} />)}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input controls */}
          {!isComplete ? (
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)' }}>

              {/* Live transcript preview */}
              {transcript && (
                <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.2)', fontSize: 13, color: 'var(--text-1)', marginBottom: 10, fontStyle: 'italic' }}>
                  "{transcript}"
                </div>
              )}

              {inputMode === 'voice' ? (
                <div style={{ display: 'flex', gap: 10 }}>
                  {!listening ? (
                    <button
                      onClick={startListening}
                      disabled={speaking || loading}
                      style={{
                        flex: 1, padding: '12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                        background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
                        color: 'white', fontSize: 14, fontWeight: 500,
                        opacity: speaking || loading ? 0.5 : 1,
                      }}
                    >
                      🎤 Press to Speak
                    </button>
                  ) : (
                    <button
                      onClick={() => { stopListening(); if (transcript) sendAnswer(); }}
                      style={{
                        flex: 1, padding: '12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                        background: 'linear-gradient(135deg, #f5a623, #f7525a)',
                        color: 'white', fontSize: 14, fontWeight: 500,
                        animation: 'pulse 1s infinite',
                      }}
                    >
                      ⏹ Stop &amp; Send
                    </button>
                  )}
                  {transcript && !listening && (
                    <button
                      onClick={() => sendAnswer()}
                      style={{
                        padding: '12px 18px', borderRadius: 10, border: '1px solid var(--border)',
                        background: 'transparent', color: 'var(--text-1)', cursor: 'pointer', fontSize: 14,
                      }}
                    >
                      Send →
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    className="input-field"
                    style={{ flex: 1 }}
                    value={textInput}
                    onChange={e => setTextInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAnswer(textInput); } }}
                    placeholder="Type your answer and press Enter..."
                    disabled={speaking || loading}
                    autoFocus
                  />
                  <button
                    onClick={() => sendAnswer(textInput)}
                    disabled={!textInput.trim() || speaking || loading}
                    style={{
                      padding: '12px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
                      background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
                      color: 'white', fontSize: 14, opacity: !textInput.trim() || speaking || loading ? 0.5 : 1,
                    }}
                  >
                    →
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: '#22c97a', marginBottom: 10 }}>✓ Interview complete!</p>
              <button
                onClick={() => fetchScorecard(messages)}
                disabled={scorecardLoading}
                className="btn-primary"
                style={{ width: '100%', padding: '12px' }}
              >
                {scorecardLoading ? '◌ Generating...' : '◉ Generate Scorecard'}
              </button>
            </div>
          )}
        </div>

        {/* Side panel — camera + proctoring */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Camera feed */}
          <div className="card" style={{ padding: 12, overflow: 'hidden' }}>
            <p style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Camera {cameraEnabled ? (faceDetected ? '— ✓ Face detected' : '— ⚠ No face') : '— Off'}
            </p>
            {cameraEnabled ? (
              <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', background: '#000' }}>
                <video ref={videoRef} width={256} height={180} style={{ display: 'block', width: '100%' }} muted playsInline />
                <canvas ref={canvasRef} width={320} height={240} style={{ display: 'none' }} />
                <div style={{
                  position: 'absolute', top: 6, right: 6,
                  width: 8, height: 8, borderRadius: '50%',
                  background: faceDetected ? '#22c97a' : '#f7525a',
                  boxShadow: `0 0 6px ${faceDetected ? '#22c97a' : '#f7525a'}`,
                }} />
              </div>
            ) : (
              <div style={{ height: 100, borderRadius: 8, background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: 12 }}>
                Camera not available
              </div>
            )}
          </div>

          {/* Proctoring stats */}
          <div className="card" style={{ padding: 14 }}>
            <p style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Proctoring</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text-2)' }}>Tab switches</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: tabWarnings > 0 ? '#f7525a' : '#22c97a' }}>{tabWarnings}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'var(--text-2)' }}>Violations</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: violations.length > 3 ? '#f7525a' : violations.length > 0 ? '#f5a623' : '#22c97a' }}>{violations.length}</span>
            </div>
          </div>

          {/* Q&A counter */}
          <div className="card" style={{ padding: 14 }}>
            <p style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Progress</p>
            <p style={{ fontFamily: 'var(--font-head)', fontSize: 28, fontWeight: 700 }}>
              {messages.filter(m => m.role === 'user').length}
              <span style={{ fontSize: 14, color: 'var(--text-2)', fontWeight: 400 }}> / 8</span>
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>Questions answered</p>
            <div style={{ marginTop: 10, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <div style={{
                width: `${(messages.filter(m => m.role === 'user').length / 8) * 100}%`,
                height: '100%', borderRadius: 99,
                background: 'linear-gradient(90deg, var(--accent), var(--accent2))',
                transition: 'width 0.5s ease',
              }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}