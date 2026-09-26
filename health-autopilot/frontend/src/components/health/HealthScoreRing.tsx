'use client';
import { useEffect, useRef, useState } from 'react';

interface Props {
  score: number;
  breakdown?: {
    sleep:    { score: number; max: number; pct: number };
    activity: { score: number; max: number; pct: number };
    mental:   { score: number; max: number; pct: number };
    nutrition:{ score: number; max: number; pct: number };
  };
  delta?: number | null;
  predictedTomorrow?: number | null;
  onTap?: () => void;
}

const SUBSCORE_COLORS = {
  sleep:    '#818CF8',
  activity: '#34D399',
  mental:   '#FB923C',
  nutrition:'#60A5FA',
};

const SUBSCORE_LABELS = {
  sleep:    'Sleep',
  activity: 'Activity',
  mental:   'Mental',
  nutrition:'Nutrition',
};

function getScoreColor(score: number): [string, string] {
  if (score >= 85) return ['#00E5FF', '#00E096'];
  if (score >= 70) return ['#00E096', '#FFB547'];
  if (score >= 50) return ['#FFB547', '#FF5757'];
  return ['#FF5757', '#FF5757'];
}

export default function HealthScoreRing({ score, breakdown, delta, predictedTomorrow, onTap }: Props) {
  const [animated, setAnimated] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const size = 180;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const offset = circumference - progress;

  const [c1, c2] = getScoreColor(score);
  const gradientId = `score-gradient-${Math.random().toString(36).slice(2)}`;

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleTap = () => {
    setShowBreakdown(true);
    onTap?.();
  };

  return (
    <>
      <div
        onClick={handleTap}
        style={{
          position: 'relative',
          width: size,
          height: size,
          cursor: 'pointer',
          flexShrink: 0,
        }}
        role="button"
        aria-label={`Health score ${score} out of 100. Tap to see breakdown.`}
      >
        <svg
          ref={svgRef}
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{
            transform: 'rotate(-90deg)',
            filter: score > 80 ? `drop-shadow(0 0 12px ${c1}60)` : 'none',
            transition: 'filter 500ms ease',
          }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={c1} />
              <stop offset="100%" stopColor={c2} />
            </linearGradient>
          </defs>

          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--border-subtle)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Animated foreground arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={animated ? offset : circumference}
            style={{
              transition: 'stroke-dashoffset 1.4s cubic-bezier(0.34, 1.2, 0.64, 1)',
            }}
          />
        </svg>

        {/* Center content */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
            <span style={{
              fontFamily: 'Cabinet Grotesk, sans-serif',
              fontWeight: 800,
              fontSize: 'clamp(2.5rem, 8vw, 3.5rem)',
              color: 'var(--text-primary)',
              lineHeight: 1,
            }}>
              {score}
            </span>
            <span style={{
              fontFamily: 'Satoshi, sans-serif',
              fontWeight: 400,
              fontSize: 'var(--text-sm)',
              color: 'var(--text-tertiary)',
            }}>
              /100
            </span>
          </div>
          {delta !== undefined && delta !== null && (
            <span style={{
              fontFamily: 'Satoshi, sans-serif',
              fontWeight: 600,
              fontSize: 'var(--text-xs)',
              color: delta >= 0 ? 'var(--success)' : 'var(--danger)',
            }}>
              {delta >= 0 ? `+${delta}` : delta} {delta >= 0 ? '↑' : '↓'}
            </span>
          )}
        </div>
      </div>

      {/* Score Breakdown Bottom Sheet */}
      {showBreakdown && breakdown && (
        <ScoreBreakdownSheet
          score={score}
          breakdown={breakdown}
          predictedTomorrow={predictedTomorrow}
          onClose={() => setShowBreakdown(false)}
        />
      )}
    </>
  );
}

function ScoreBreakdownSheet({ score, breakdown, predictedTomorrow, onClose }: {
  score: number;
  breakdown: Props['breakdown'];
  predictedTomorrow?: number | null;
  onClose: () => void;
}) {
  const [animateBars, setAnimateBars] = useState(false);

  useEffect(() => {
    setTimeout(() => setAnimateBars(true), 50);
  }, []);

  const descriptions: Record<string, string> = {
    sleep:    'Based on hours, consistency, and quality of your recent sleep.',
    activity: 'Based on daily steps and physical activity patterns.',
    mental:   'Derived from your mood, stress, and energy levels.',
    nutrition: 'Calculated from hydration and calorie estimates.',
  };

  return (
    <>
      <div className="bottom-sheet-overlay" onClick={onClose} />
      <div className="bottom-sheet">
        <div className="bottom-sheet-handle" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h2 style={{
              fontFamily: 'Cabinet Grotesk, sans-serif',
              fontWeight: 700,
              fontSize: 'var(--text-2xl)',
              color: 'var(--text-primary)',
              letterSpacing: '-0.03em',
              margin: 0,
            }}>
              Why {score}/100?
            </h2>
            <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)', margin: '4px 0 0' }}>
              Your health score is built from 4 pillars
            </p>
          </div>
          {predictedTomorrow && (
            <div style={{
              textAlign: 'right',
              background: 'var(--accent-subtle)',
              border: '1px solid var(--border-default)',
              borderRadius: 10,
              padding: '8px 14px',
            }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tomorrow</div>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 'var(--text-xl)',
                fontWeight: 600,
                color: 'var(--accent-primary)',
              }}>{predictedTomorrow}</div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {breakdown && Object.entries(breakdown).map(([key, val], i) => (
            <div key={key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <span style={{
                    fontFamily: 'Satoshi, sans-serif',
                    fontWeight: 600,
                    fontSize: 'var(--text-base)',
                    color: 'var(--text-primary)',
                  }}>
                    {SUBSCORE_LABELS[key as keyof typeof SUBSCORE_LABELS]}
                  </span>
                  <p style={{ margin: '2px 0 0', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                    {descriptions[key]}
                  </p>
                </div>
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 500,
                  fontSize: 'var(--text-sm)',
                  color: SUBSCORE_COLORS[key as keyof typeof SUBSCORE_COLORS],
                }}>
                  {val.score}/{val.max}
                </span>
              </div>
              <div className="subscore-bar-track">
                <div
                  className="subscore-bar-fill"
                  style={{
                    width: animateBars ? `${val.pct}%` : '0%',
                    background: SUBSCORE_COLORS[key as keyof typeof SUBSCORE_COLORS],
                    transitionDelay: `${i * 80}ms`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
