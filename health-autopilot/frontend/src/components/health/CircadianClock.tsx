'use client';
import { useEffect, useRef, useState } from 'react';

interface CircadianData {
  sleepStart?: number; // hour (0-23)
  sleepEnd?: number;
  activityStart?: number;
  activityEnd?: number;
  screenStart?: number;
  screenEnd?: number;
}

interface Props {
  data?: CircadianData;
  size?: number;
}

function hourToAngle(hour: number): number {
  return (hour / 24) * 360 - 90; // -90 to start at top (midnight)
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angle = (angleDeg * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  };
}

function arcPath(cx: number, cy: number, r: number, startHour: number, endHour: number): string {
  const startAngle = hourToAngle(startHour);
  const endAngle = hourToAngle(endHour);
  const startPt = polarToCartesian(cx, cy, r, startAngle);
  const endPt = polarToCartesian(cx, cy, r, endAngle);

  const hours = endHour - startHour;
  const largeArc = hours > 12 ? 1 : 0;

  return `M ${startPt.x} ${startPt.y} A ${r} ${r} 0 ${largeArc} 1 ${endPt.x} ${endPt.y}`;
}

export default function CircadianClock({ data, size = 260 }: Props) {
  const [animated, setAnimated] = useState(false);
  const cx = size / 2;
  const cy = size / 2;

  // Ring radii
  const sleepR = size * 0.38;
  const activityR = size * 0.30;
  const screenR = size * 0.24;
  const idealR = size * 0.43;
  const dotR = size * 0.46;

  useEffect(() => {
    setTimeout(() => setAnimated(true), 100);
  }, []);

  // Default values for demo
  const d = {
    sleepStart:    data?.sleepStart   ?? 23,
    sleepEnd:      data?.sleepEnd     ?? 7,
    activityStart: data?.activityStart ?? 9,
    activityEnd:   data?.activityEnd   ?? 10,
    screenStart:   data?.screenStart  ?? 20,
    screenEnd:     data?.screenEnd    ?? 23,
  };

  // Build arc paths
  const sleepPath    = arcPath(cx, cy, sleepR, d.sleepStart, d.sleepEnd + 24 > 24 ? d.sleepEnd : d.sleepEnd);
  const activityPath = arcPath(cx, cy, activityR, d.activityStart, d.activityEnd);
  const screenPath   = arcPath(cx, cy, screenR, d.screenStart, d.screenEnd);

  // Ideal sleep arc (10 PM - 6 AM)
  const idealPath = arcPath(cx, cy, idealR, 22, 6);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-label="Circadian rhythm clock"
      >
        {/* Hour dots — 24 markers */}
        {Array.from({ length: 24 }, (_, i) => {
          const angle = hourToAngle(i);
          const isMajor = i === 0 || i === 6 || i === 12 || i === 18;
          const r = isMajor ? dotR + 4 : dotR;
          const pt = polarToCartesian(cx, cy, r, angle);
          return (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r={isMajor ? 3 : 1.5}
              fill="var(--border-default)"
            />
          );
        })}

        {/* Hour labels for 0, 6, 12, 18 */}
        {[{h:0,l:'0'}, {h:6,l:'6'}, {h:12,l:'12'}, {h:18,l:'18'}].map(({h, l}) => {
          const angle = hourToAngle(h);
          const pt = polarToCartesian(cx, cy, dotR + 14, angle);
          return (
            <text
              key={h}
              x={pt.x}
              y={pt.y}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 9,
                fill: 'var(--text-tertiary)',
              }}
            >
              {l}
            </text>
          );
        })}

        {/* Ideal sleep overlay (dashed) */}
        <path
          d={idealPath}
          fill="none"
          stroke="var(--border-default)"
          strokeWidth={2}
          strokeDasharray="4 4"
          strokeLinecap="round"
        />

        {/* Sleep arc */}
        <path
          d={sleepPath}
          fill="none"
          stroke="#818CF8"
          strokeWidth={18}
          strokeLinecap="round"
          style={{
            strokeDasharray: animated ? 'none' : '0 9999',
            transition: 'stroke-dasharray 800ms cubic-bezier(0.76, 0, 0.24, 1)',
          }}
        />

        {/* Activity arc */}
        <path
          d={activityPath}
          fill="none"
          stroke="#34D399"
          strokeWidth={14}
          strokeLinecap="round"
          style={{
            strokeDasharray: animated ? 'none' : '0 9999',
            transition: 'stroke-dasharray 800ms cubic-bezier(0.76, 0, 0.24, 1) 200ms',
          }}
        />

        {/* Screen time arc */}
        <path
          d={screenPath}
          fill="none"
          stroke="#FB923C"
          strokeWidth={10}
          strokeLinecap="round"
          style={{
            strokeDasharray: animated ? 'none' : '0 9999',
            transition: 'stroke-dasharray 800ms cubic-bezier(0.76, 0, 0.24, 1) 400ms',
          }}
        />

        {/* Center: current time dot */}
        <circle cx={cx} cy={cy} r={4} fill="var(--accent-primary)" />
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        {[
          { color: '#818CF8', label: 'Sleep' },
          { color: '#34D399', label: 'Activity' },
          { color: '#FB923C', label: 'Screen' },
          { color: 'var(--border-default)', label: 'Ideal', dashed: true },
        ].map(({ color, label, dashed }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 20,
              height: 3,
              background: dashed
                ? `repeating-linear-gradient(90deg, ${color} 0, ${color} 4px, transparent 4px, transparent 8px)`
                : color,
              borderRadius: 2,
            }} />
            <span style={{
              fontFamily: 'Satoshi, sans-serif',
              fontSize: 'var(--text-xs)',
              color: 'var(--text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
