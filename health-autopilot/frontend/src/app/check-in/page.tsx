'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import MoodSelector from '@/components/health/MoodSelector';
import HydrationTracker from '@/components/health/HydrationTracker';
import { metricsApi, eventsApi } from '@/lib/api';

type Stage = 'mood' | 'energy' | 'stress' | 'voice' | 'done';

interface CheckInState {
  mood?: number;
  energy?: number;
  stress?: number;
}

export default function CheckInPage() {
  const [stage, setStage] = useState<Stage>('mood');
  const [data, setData] = useState<CheckInState>({});
  const [todayMetrics, setTodayMetrics] = useState<any>(null);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [voiceResult, setVoiceResult] = useState<any>(null);
  const recognitionRef = useRef<any>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    metricsApi.getToday().then(r => setTodayMetrics(r.data)).catch(() => {});
  }, []);

  // Progress timer
  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const STAGES: Stage[] = ['mood', 'energy', 'stress', 'voice', 'done'];
  const stageIndex = STAGES.indexOf(stage);
  const progressPct = (stageIndex / (STAGES.length - 1)) * 100;

  const handleMoodSelect = async (score: number) => {
    setData(d => ({ ...d, mood: score }));
    setTimeout(() => setStage('energy'), 400);
  };

  const handleEnergy = async (score: number) => {
    setData(d => ({ ...d, energy: score }));
    try {
      await metricsApi.updateToday({ energy_level: score });
    } catch {}
    setTimeout(() => setStage('stress'), 200);
  };

  const handleStress = async (score: number) => {
    setData(d => ({ ...d, stress: score }));
    try {
      await metricsApi.submitMood(data.mood!, data.energy, score);
    } catch {}
    setTimeout(() => setStage('voice'), 200);
  };

  const startRecording = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice input not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = async (event: any) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      setRecording(false);

      try {
        const res = await eventsApi.logVoice(text);
        setVoiceResult(res.data);
      } catch {}
    };

    recognition.onerror = () => setRecording(false);
    recognition.onend = () => setRecording(false);

    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
  }, []);

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setRecording(false);
  };

  const finishCheckin = () => {
    clearInterval(timerRef.current);
    setStage('done');
  };

  const stageVariants = {
    enter: { opacity: 0, x: 20 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: 'var(--space-8) 0' }}>
      {/* Header */}
      <h1 style={{
        fontFamily: 'Cabinet Grotesk, sans-serif',
        fontWeight: 800,
        fontSize: 'var(--text-3xl)',
        color: 'var(--text-primary)',
        letterSpacing: '-0.04em',
        margin: '0 0 8px',
      }}>
        Daily Check-in
      </h1>
      <p style={{
        fontFamily: 'Satoshi, sans-serif',
        fontSize: 'var(--text-sm)',
        color: 'var(--text-tertiary)',
        margin: '0 0 var(--space-8)',
      }}>
        10 seconds. Zero effort.
      </p>

      {/* Progress bar */}
      {stage !== 'done' && (
        <div style={{
          height: 3,
          background: 'var(--border-subtle)',
          borderRadius: 2,
          marginBottom: 'var(--space-8)',
          overflow: 'hidden',
        }}>
          <motion.div
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.4, ease: [0.76, 0, 0.24, 1] }}
            style={{ height: '100%', background: 'var(--accent-primary)', borderRadius: 2 }}
          />
        </div>
      )}

      {/* Stage content */}
      <AnimatePresence mode="wait">
        {stage === 'mood' && (
          <motion.div
            key="mood"
            variants={stageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            <StagePod
              step="1 of 4"
              question="How are you feeling right now?"
              subtext="Your honest baseline — no wrong answers"
            >
              <MoodSelector onSelect={handleMoodSelect} />
            </StagePod>
          </motion.div>
        )}

        {stage === 'energy' && (
          <motion.div key="energy" variants={stageVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
            <StagePod
              step="2 of 4"
              question="Energy level?"
              subtext="How much physical or mental fuel do you have?"
            >
              <ScaleSelector max={5} onSelect={handleEnergy}
                labels={['Depleted', 'Low', 'Okay', 'Good', 'High']} />
            </StagePod>
          </motion.div>
        )}

        {stage === 'stress' && (
          <motion.div key="stress" variants={stageVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
            <StagePod
              step="3 of 4"
              question="Stress load?"
              subtext="From 1 (completely calm) to 5 (maxed out)"
            >
              <ScaleSelector max={5} onSelect={handleStress}
                labels={['Calm', 'Light', 'Moderate', 'High', 'Maxed']}
                reverseColor />
            </StagePod>
          </motion.div>
        )}

        {stage === 'voice' && (
          <motion.div key="voice" variants={stageVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
            <StagePod
              step="4 of 4 (optional)"
              question="Anything to log?"
              subtext='Try: "Had salad for lunch" · "Walked 20 minutes" · "Feeling stressed about work"'
            >
              <VoicePod
                recording={recording}
                transcript={transcript}
                result={voiceResult}
                onStart={startRecording}
                onStop={stopRecording}
                onSkip={finishCheckin}
                onDone={finishCheckin}
              />
            </StagePod>
          </motion.div>
        )}

        {stage === 'done' && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
            <DoneCard data={data} todayMetrics={todayMetrics} elapsed={elapsed} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StagePod({ step, question, subtext, children }: any) {
  return (
    <div className="card-l2" style={{ padding: 'var(--space-8)' }}>
      <p style={{ fontFamily: 'Satoshi', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 16px' }}>{step}</p>
      <h2 style={{ fontFamily: 'Cabinet Grotesk', fontWeight: 700, fontSize: 'var(--text-2xl)', color: 'var(--text-primary)', letterSpacing: '-0.03em', margin: '0 0 8px' }}>{question}</h2>
      <p style={{ fontFamily: 'Satoshi', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: '0 0 28px', lineHeight: 1.5 }}>{subtext}</p>
      {children}
    </div>
  );
}

function ScaleSelector({ max, onSelect, labels, reverseColor }: { max: number; onSelect: (v: number) => void; labels: string[]; reverseColor?: boolean }) {
  const [selected, setSelected] = useState<number | null>(null);

  const handle = (v: number) => {
    setSelected(v);
    if (navigator.vibrate) navigator.vibrate(10);
    setTimeout(() => onSelect(v), 250);
  };

  return (
    <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
      {Array.from({ length: max }, (_, i) => {
        const val = i + 1;
        const isSelected = selected === val;
        // Color: reverseColor means high is bad
        const hue = reverseColor
          ? `hsl(${120 - (i / (max - 1)) * 120}, 70%, 55%)`
          : `hsl(${(i / (max - 1)) * 120}, 70%, 55%)`;

        return (
          <motion.button
            key={val}
            onClick={() => handle(val)}
            whileTap={{ scale: 0.9 }}
            style={{
              width: 60,
              height: 60,
              borderRadius: 14,
              border: isSelected ? `2px solid ${hue}` : '1px solid var(--border-subtle)',
              background: isSelected ? `${hue}20` : 'var(--bg-base)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              boxShadow: isSelected ? `0 0 0 3px ${hue}30` : 'none',
              transition: 'all 150ms ease',
            }}
          >
            <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 'var(--text-lg)', color: isSelected ? hue : 'var(--text-primary)' }}>{val}</span>
            <span style={{ fontFamily: 'Satoshi', fontSize: 8, color: 'var(--text-tertiary)', textAlign: 'center', lineHeight: 1.2 }}>{labels[i]}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

function VoicePod({ recording, transcript, result, onStart, onStop, onSkip, onDone }: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
      <motion.button
        onClick={recording ? onStop : onStart}
        animate={{ scale: recording ? [1, 1.05, 1] : 1 }}
        transition={{ repeat: recording ? Infinity : 0, duration: 1.5 }}
        style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          border: `2px solid ${recording ? 'var(--danger)' : 'var(--accent-primary)'}`,
          background: recording ? 'rgba(255,87,87,0.1)' : 'var(--accent-subtle)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: recording ? '0 0 0 6px rgba(255,87,87,0.2)' : 'none',
          transition: 'all 200ms ease',
        }}
      >
        {recording ? <MicOff size={32} color="var(--danger)" /> : <Mic size={32} color="var(--accent-primary)" />}
      </motion.button>

      {recording && (
        <p style={{ fontFamily: 'Satoshi', color: 'var(--danger)', fontSize: 'var(--text-sm)', animation: 'pulse-glow 1s infinite' }}>
          Listening...
        </p>
      )}

      {transcript && (
        <div style={{
          background: 'var(--bg-overlay)',
          borderRadius: 10,
          padding: 'var(--space-4)',
          width: '100%',
          border: '1px solid var(--border-subtle)',
        }}>
          <p style={{ fontFamily: 'Satoshi', fontSize: 'var(--text-sm)', color: 'var(--text-primary)', margin: 0 }}>"{transcript}"</p>
          {result && (
            <p style={{ fontFamily: 'Satoshi', fontSize: 'var(--text-xs)', color: 'var(--success)', margin: '8px 0 0' }}>
              ✓ Logged as {result.event_type.replace('_', ' ')}
            </p>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12 }}>
        <button className="btn-primary" onClick={onDone}>
          {transcript ? 'Finish' : 'Done ✓'}
        </button>
        <button className="btn-ghost" onClick={onSkip}>Skip</button>
      </div>
    </div>
  );
}

function DoneCard({ data, todayMetrics, elapsed }: any) {
  const moodLabels = ['', '😞', '😕', '😐', '🙂', '😄'];
  return (
    <div className="card-l2" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17, delay: 0.1 }}
        style={{ fontSize: 64, marginBottom: 16 }}
      >
        ✅
      </motion.div>
      <h2 style={{ fontFamily: 'Cabinet Grotesk', fontWeight: 800, fontSize: 'var(--text-2xl)', color: 'var(--text-primary)', letterSpacing: '-0.04em', margin: '0 0 8px' }}>
        Check-in complete!
      </h2>
      <p style={{ fontFamily: 'Satoshi', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: '0 0 var(--space-6)' }}>
        Done in {elapsed}s. Autopilot is processing your data.
      </p>
      <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center', marginBottom: 'var(--space-8)', flexWrap: 'wrap' }}>
        {data.mood && <Stat label="Mood" value={moodLabels[data.mood]} />}
        {data.energy && <Stat label="Energy" value={`${data.energy}/5`} />}
        {data.stress && <Stat label="Stress" value={`${data.stress}/5`} />}
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
        <a href="/dashboard" className="btn-primary">See today's plan →</a>
        <a href="/insights" className="btn-secondary">View insights</a>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign: 'center', background: 'var(--bg-overlay)', borderRadius: 10, padding: '10px 16px', minWidth: 80 }}>
      <div style={{ fontFamily: 'JetBrains Mono', fontSize: 'var(--text-xl)', fontWeight: 600, color: 'var(--text-primary)' }}>{value}</div>
      <div style={{ fontFamily: 'Satoshi', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
    </div>
  );
}
