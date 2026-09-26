'use client';
import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { reportsApi } from '@/lib/api';

interface ScorePoint { date: string; score: number; breakdown?: any }

// Custom SVG line chart — no external library
function ScoreChart({ data }: { data: ScorePoint[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [animated, setAnimated] = useState(false);
  const w = 600, h = 180;
  const padL = 40, padR = 20, padT = 20, padB = 30;
  const chartW = w - padL - padR;
  const chartH = h - padT - padB;

  useEffect(() => {
    setTimeout(() => setAnimated(true), 200);
  }, []);

  if (!data || data.length === 0) return null;

  const scores = data.map(d => d.score);
  const minY = Math.max(0, Math.min(...scores) - 5);
  const maxY = Math.min(100, Math.max(...scores) + 5);

  const x = (i: number) => padL + (i / (data.length - 1)) * chartW;
  const y = (score: number) => padT + chartH - ((score - minY) / (maxY - minY)) * chartH;

  // Build path strings
  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d.score)}`).join(' ');
  const areaPath = `${linePath} L ${x(data.length - 1)} ${padT + chartH} L ${padL} ${padT + chartH} Z`;

  // Score color based on average
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const lineColor = avg >= 70 ? 'var(--success)' : avg >= 50 ? 'var(--warning)' : 'var(--danger)';

  const pathRef = useRef<SVGPathElement>(null);
  const [pathLen, setPathLen] = useState(0);

  useEffect(() => {
    if (pathRef.current) setPathLen(pathRef.current.getTotalLength());
  }, [data]);

  // Y-axis labels
  const yLabels = [minY, Math.round((minY + maxY) / 2), maxY];

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        style={{ width: '100%', height: 'auto', overflow: 'visible' }}
        onMouseLeave={() => setHovered(null)}
      >
        <defs>
          <linearGradient id="chart-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.15" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yLabels.map((val, i) => (
          <g key={i}>
            <line
              x1={padL}
              y1={y(val)}
              x2={padL + chartW}
              y2={y(val)}
              stroke="var(--border-subtle)"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            <text
              x={padL - 8}
              y={y(val)}
              textAnchor="end"
              dominantBaseline="middle"
              style={{ fontSize: 9, fill: 'var(--text-tertiary)', fontFamily: 'JetBrains Mono, monospace' }}
            >
              {Math.round(val)}
            </text>
          </g>
        ))}

        {/* Area fill */}
        <path d={areaPath} fill="url(#chart-area)" />

        {/* Line */}
        <path
          ref={pathRef}
          d={linePath}
          fill="none"
          stroke={lineColor}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={pathLen}
          strokeDashoffset={animated ? 0 : pathLen}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.76, 0, 0.24, 1)' }}
        />

        {/* Data points and hover areas */}
        {data.map((d, i) => (
          <g key={i} onMouseEnter={() => setHovered(i)}>
            <circle
              cx={x(i)}
              cy={y(d.score)}
              r={hovered === i ? 5 : 3}
              fill={lineColor}
              stroke="var(--bg-base)"
              strokeWidth={2}
              style={{ transition: 'r 150ms ease' }}
            />
            {/* Larger invisible hover target */}
            <circle cx={x(i)} cy={y(d.score)} r={16} fill="transparent" />
          </g>
        ))}

        {/* Tooltip */}
        {hovered !== null && (
          <g>
            <rect
              x={Math.min(x(hovered) - 35, w - 80)}
              y={y(data[hovered].score) - 40}
              width={70}
              height={28}
              rx={6}
              fill="var(--bg-elevated)"
              stroke="var(--border-default)"
            />
            <text
              x={Math.min(x(hovered) - 35, w - 80) + 35}
              y={y(data[hovered].score) - 26}
              textAnchor="middle"
              style={{ fontSize: 11, fill: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}
            >
              {data[hovered].score}
            </text>
            <text
              x={Math.min(x(hovered) - 35, w - 80) + 35}
              y={y(data[hovered].score) - 14}
              textAnchor="middle"
              style={{ fontSize: 9, fill: 'var(--text-tertiary)', fontFamily: 'Satoshi, sans-serif' }}
            >
              {new Date(data[hovered].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </text>
          </g>
        )}

        {/* X-axis labels (first, last, and a few intermediate) */}
        {data.map((d, i) => {
          if (i !== 0 && i !== data.length - 1 && i % Math.ceil(data.length / 5) !== 0) return null;
          return (
            <text
              key={i}
              x={x(i)}
              y={h - 8}
              textAnchor="middle"
              style={{ fontSize: 9, fill: 'var(--text-tertiary)', fontFamily: 'Satoshi, sans-serif' }}
            >
              {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<7 | 14 | 30>(30);
  const [scores, setScores] = useState<ScorePoint[]>([]);
  const [weeklyInsight, setWeeklyInsight] = useState<any>(null);
  const [timeMachine, setTimeMachine] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [scoresRes, insightRes] = await Promise.all([
        reportsApi.getScores(period),
        reportsApi.getWeeklyInsight(),
      ]);
      setScores(scoresRes.data);
      setWeeklyInsight(insightRes.data);

      try {
        const tmRes = await reportsApi.getTimeMachine();
        setTimeMachine(tmRes.data);
      } catch {}
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [period]);

  const downloadPDF = async () => {
    setExportLoading(true);
    try {
      const res = await reportsApi.downloadPDF();
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `health-report-${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
    setExportLoading(false);
  };

  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b.score, 0) / scores.length) : 0;
  const trend = scores.length >= 2 ? scores[scores.length - 1].score - scores[0].score : 0;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-8)' }}>
        <div>
          <h1 style={{ fontFamily: 'Cabinet Grotesk', fontWeight: 800, fontSize: 'var(--text-3xl)', color: 'var(--text-primary)', letterSpacing: '-0.04em', margin: '0 0 4px' }}>
            Your Reports
          </h1>
          <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)', margin: 0, fontFamily: 'Satoshi' }}>
            {period}-day health overview
          </p>
        </div>
        <button
          onClick={downloadPDF}
          className="btn-secondary"
          disabled={exportLoading}
          style={{ fontSize: 'var(--text-sm)' }}
        >
          {exportLoading ? 'Generating...' : '↓ Export PDF'}
        </button>
      </div>

      {/* Period selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--space-6)' }}>
        {([7, 14, 30] as const).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: period === p ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
              background: period === p ? 'var(--accent-subtle)' : 'transparent',
              color: period === p ? 'var(--accent-primary)' : 'var(--text-secondary)',
              fontFamily: 'Satoshi',
              fontWeight: 500,
              fontSize: 'var(--text-sm)',
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
          >
            {p}d
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: i === 1 ? 200 : 100 }} />)}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Summary stats */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)' }}
          >
            {[
              { label: 'Avg Score', value: avg, unit: '/100', color: avg >= 70 ? 'var(--success)' : avg >= 50 ? 'var(--warning)' : 'var(--danger)' },
              { label: 'Total Days', value: scores.length, unit: ' tracked', color: 'var(--accent-primary)' },
              { label: `${period}d Trend`, value: trend >= 0 ? `+${trend}` : trend, unit: ' pts', color: trend >= 0 ? 'var(--success)' : 'var(--danger)' },
            ].map(stat => (
              <div key={stat.label} className="card-l1" style={{ padding: 'var(--space-5)' }}>
                <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 'var(--text-2xl)', color: stat.color }}>
                  {stat.value}<span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', fontFamily: 'Satoshi', fontWeight: 400 }}>{stat.unit}</span>
                </div>
                <div style={{ fontFamily: 'Satoshi', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4 }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>

          {/* Score trend chart */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card-l1"
            style={{ padding: 'var(--space-6)' }}
          >
            <h2 style={{ fontFamily: 'Cabinet Grotesk', fontWeight: 700, fontSize: 'var(--text-xl)', color: 'var(--text-primary)', letterSpacing: '-0.03em', margin: '0 0 var(--space-5)' }}>
              Score Trend
            </h2>
            <ScoreChart data={scores} />
          </motion.div>

          {/* Weekly AI Insight */}
          {weeklyInsight && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card-l2"
              style={{ padding: 'var(--space-6)' }}
            >
              <h2 style={{ fontFamily: 'Cabinet Grotesk', fontWeight: 700, fontSize: 'var(--text-xl)', color: 'var(--text-primary)', letterSpacing: '-0.03em', margin: '0 0 var(--space-4)' }}>
                🧠 Weekly AI Insight
              </h2>
              <p style={{ fontFamily: 'Satoshi', fontSize: 'var(--text-base)', color: 'var(--text-secondary)', margin: '0 0 16px', lineHeight: 1.7 }}>
                {weeklyInsight.summary_text}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {weeklyInsight.top_win && (
                  <div style={{
                    padding: 'var(--space-4)',
                    borderRadius: 10,
                    background: 'rgba(0,224,150,0.08)',
                    border: '1px solid rgba(0,224,150,0.2)',
                  }}>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Satoshi', marginBottom: 6 }}>✅ Top Win</div>
                    <p style={{ fontFamily: 'Satoshi', fontSize: 'var(--text-sm)', color: 'var(--text-primary)', margin: 0 }}>{weeklyInsight.top_win}</p>
                  </div>
                )}
                {weeklyInsight.top_risk && (
                  <div style={{
                    padding: 'var(--space-4)',
                    borderRadius: 10,
                    background: 'rgba(255,181,71,0.08)',
                    border: '1px solid rgba(255,181,71,0.2)',
                  }}>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Satoshi', marginBottom: 6 }}>⚠ Top Risk</div>
                    <p style={{ fontFamily: 'Satoshi', fontSize: 'var(--text-sm)', color: 'var(--text-primary)', margin: 0 }}>{weeklyInsight.top_risk}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
