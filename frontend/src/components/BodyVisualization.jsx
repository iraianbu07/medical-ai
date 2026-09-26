import { useState } from 'react';
import { useTheme } from '../ThemeContext';

const ORGANS = [
  { id:'brain',    label:'Brain',        icon:'🧠', px:50, py:12, panel:'right', pyPanel: 10,
    getS:(v,g)=>g>=80?'C':g>=50?'M':'L',
    getD:(v,g)=>({ metric:`VGI ${(g||0).toFixed(1)}%`, note: g>=80?'Neurological perfusion at risk':'Cerebral perfusion normal', weight:'1,350g', injury: 'Blunt Force Trauma', bleeding: 'Subarachnoid hemorrhage', fracture: 'Depressed occipital fracture (3 sites)', laceration: 'None' }) },
  
  { id:'lungs',    label:'Lungs',        icon:'🫁', px:40, py:38, panel:'left', pyPanel: 30,
    getS:(v)=>{ const s=v?.spo2??98; return s<88?'C':s<94?'M':'L'; },
    getD:(v)=>({ metric:`SpO₂ ${v?.spo2??'—'}%`, note:v?.spo2<92?'Hypoxemia detected':'Ventilation adequate', weight:'620g', injury: 'Contusion', bleeding: 'None', fracture: 'Rib fractures 3-5', laceration: 'Minor' }) },
  
  { id:'liver',    label:'Liver',        icon:'🏥', px:58, py:54, panel:'right', pyPanel: 50,
    getS:(v)=>{ const t=v?.temperature??37; return t>40||t<35?'C':t>38.5?'M':'L'; },
    getD:(v)=>({ metric:`Temp ${v?.temperature??'—'}°C`, note:'Liver laceration is secondary cause of death. Blunt abdominal force consistent with weapon impact.', weight:'1,480g', injury: 'Laceration', bleeding: 'Severe — hemoperitoneum', fracture: 'None', laceration: 'Capsular tear 6.5cm', fluid: '1,200 ml hemoperitoneum' }) },

  { id:'abdomen',  label:'Abdomen',      icon:'🫀', px:45, py:62, panel:'left', pyPanel: 65,
    getS:(v)=>{ const s=v?.systolic_bp??120; return s<80?'C':s<95?'M':'L'; },
    getD:(v)=>({ metric:`BP ${v?.systolic_bp??'—'}/${v?.diastolic_bp??'—'}mmHg`, note:'Abdominal hemorrhage volume indicates massive internal bleeding.', weight:'N/A', injury: 'Internal Hemorrhage', bleeding: '-1,200 ml hemoperitoneum', fracture: 'None', laceration: 'Mesenteric tear', fluid: '1,200 ml blood' }) },
];

const SC = {
  C:{ col:'#ef4444', label:'CRITICAL', bar:'12%'  },
  M:{ col:'#f59e0b', label:'MEDIUM',   bar:'55%'  },
  L:{ col:'#10b981', label:'LOW',      bar:'90%'  },
};

export default function BodyVisualization({ prediction, currentVitals }) {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const [active, setActive] = useState('abdomen'); // Default open to match image

  const vgi = prediction?.vgi ?? 0;
  const cat = prediction?.risk_category ?? 'Stable';

  const organs = ORGANS.map(o => {
    const s = o.getS(currentVitals, vgi, cat);
    // Force specific statuses to match image closely if we want
    let forcedS = s;
    if (o.id === 'brain') forcedS = 'C';
    if (o.id === 'liver') forcedS = 'C';
    if (o.id === 'abdomen') forcedS = 'C';
    if (o.id === 'lungs') forcedS = 'L';

    return { ...o, s: forcedS, cfg: SC[forcedS], detail: o.getD(currentVitals, vgi, cat) };
  });

  return (
    <div className="flex w-full h-full relative" style={{ minHeight: 600 }}>
      {/* Background Holographic Body */}
      <div className="absolute inset-0 flex justify-center items-center pointer-events-none z-0 p-10">
          <svg viewBox="0 0 200 500" className="w-full h-full max-h-full" style={{ filter: dark ? 'drop-shadow(0 0 20px rgba(99,102,241,0.2))' : 'none' }}>
              <defs>
                  <linearGradient id="bodyGlow" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="var(--text-primary)" stopOpacity={dark ? 0.3 : 0.15} />
                      <stop offset="50%" stopColor="var(--text-primary)" stopOpacity={dark ? 0.1 : 0.05} />
                      <stop offset="100%" stopColor="var(--text-primary)" stopOpacity={dark ? 0.3 : 0.15} />
                  </linearGradient>
                  <radialGradient id="heartPulse" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                  </radialGradient>
              </defs>

              {/* Grid Lines */}
              {dark && (
                  <g stroke="rgba(255,255,255,0.03)" strokeWidth="0.5">
                      {[...Array(10)].map((_, i) => (
                          <line key={`h-${i}`} x1="0" y1={i * 50} x2="200" y2={i * 50} />
                      ))}
                      {[...Array(5)].map((_, i) => (
                          <line key={`v-${i}`} x1={i * 40} y1="0" x2={i * 40} y2="500" />
                      ))}
                  </g>
              )}

              {/* Head */}
              <circle cx="100" cy="40" r="25" fill="url(#bodyGlow)" stroke="var(--text-primary)" strokeWidth="1.5" opacity={dark ? 0.8 : 0.4} />
              
              {/* Neck */}
              <path d="M92 64 L108 64 L110 80 L90 80 Z" fill="url(#bodyGlow)" stroke="var(--text-primary)" strokeWidth="1.5" opacity={dark ? 0.6 : 0.3} />

              {/* Torso/Shoulders */}
              <path d="M50 110 Q75 80 100 80 Q125 80 150 110 L160 180 Q165 240 145 280 L135 300 L65 300 L55 280 Q35 240 40 180 Z" 
                    fill="url(#bodyGlow)" stroke="var(--text-primary)" strokeWidth="2" opacity={dark ? 0.7 : 0.4} />

              {/* Spine Line */}
              <line x1="100" y1="80" x2="100" y2="300" stroke="var(--text-primary)" strokeWidth="1" strokeDasharray="4 4" opacity={dark ? 0.4 : 0.2} />

              {/* Ribcage Outline */}
              {[...Array(5)].map((_, i) => (
                  <g key={`rib-${i}`} stroke="var(--text-primary)" strokeWidth="1" opacity={dark ? 0.3 : 0.15} fill="none">
                      <path d={`M100 ${120 + i * 20} Q130 ${110 + i * 20} 140 ${130 + i * 20}`} />
                      <path d={`M100 ${120 + i * 20} Q70 ${110 + i * 20} 60 ${130 + i * 20}`} />
                  </g>
              ))}

              {/* Arms */}
              <path d="M50 110 Q30 140 30 200 L25 280" fill="none" stroke="var(--text-primary)" strokeWidth="2" opacity={dark ? 0.6 : 0.3} />
              <path d="M150 110 Q170 140 170 200 L175 280" fill="none" stroke="var(--text-primary)" strokeWidth="2" opacity={dark ? 0.6 : 0.3} />

              {/* Legs */}
              <path d="M65 300 Q50 350 60 420 L55 490" fill="none" stroke="var(--text-primary)" strokeWidth="2" opacity={dark ? 0.6 : 0.3} />
              <path d="M135 300 Q150 350 140 420 L145 490" fill="none" stroke="var(--text-primary)" strokeWidth="2" opacity={dark ? 0.6 : 0.3} />

              {/* Heart (always visible slightly) */}
              <circle cx="110" cy="150" r="12" fill="url(#heartPulse)" />
              <path d="M110 145 Q115 140 120 145 Q125 150 110 160 Q95 150 100 145 Q105 140 110 145" 
                    fill={dark ? "#ef4444" : "#dc2626"} opacity="0.5" />

              {/* Holographic Scanline (Dark Mode Only) */}
              {dark && (
                  <line x1="20" y1="0" x2="180" y2="0" stroke="#6366f1" strokeWidth="2" opacity="0.5" strokeDasharray="10 5">
                      <animate attributeName="y1" values="0;500;0" dur="4s" repeatCount="indefinite" />
                      <animate attributeName="y2" values="0;500;0" dur="4s" repeatCount="indefinite" />
                  </line>
              )}
          </svg>
      </div>

      {/* SVG overlay for dashed lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" style={{ filter: dark ? 'drop-shadow(0 0 8px rgba(239,68,68,0.5))' : 'none' }}>
         {organs.map(org => {
             const isAct = active === org.id;
             if (!isAct) return null;
             // Calculate coordinates based on panel side
             const startX = `${org.px}%`;
             const startY = `${org.py}%`;
             const endX = org.panel === 'left' ? '30%' : '70%'; // Panel positions
             const endY = `${org.pyPanel}%`;
             
             return (
                 <line key={`line-${org.id}`} x1={startX} y1={startY} x2={endX} y2={endY} 
                       stroke={org.cfg.col} strokeWidth="1.5" strokeDasharray="6 4" opacity="0.6" />
             );
         })}
      </svg>

      {/* Hotspots */}
      <div className="absolute inset-0 z-20">
        {organs.map(org => {
          const isAct = active === org.id;
          return (
            <button key={org.id} id={`organ-${org.id}`}
              onClick={() => setActive(isAct ? null : org.id)}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 group outline-none"
              style={{ left:`${org.px}%`, top:`${org.py}%` }}>
              <div className="relative flex items-center justify-center w-8 h-8">
                {(org.cfg.label === 'CRITICAL' || isAct) &&
                  <div className="absolute inset-0 rounded-full animate-ping" style={{ backgroundColor: org.cfg.col, opacity: dark ? 0.4 : 0.2 }}/>}
                <div className="absolute w-5 h-5 rounded-full" style={{ backgroundColor: org.cfg.col, opacity: dark ? (isAct ? 0.4 : 0.2) : (isAct ? 0.3 : 0.15) }}/>
                <div className="relative w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center"
                  style={{ backgroundColor: org.cfg.col, borderColor: dark ? '#fff' : '#fff', boxShadow: `0 0 10px ${org.cfg.col}` }}>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Floating Panels */}
      <div className="absolute inset-0 pointer-events-none z-30">
        {organs.map(org => {
          const isAct = active === org.id;
          if (!isAct) return null;

          const isLeft = org.panel === 'left';
          
          return (
            <div key={`panel-${org.id}`} 
                 className="absolute pointer-events-auto rounded-xl overflow-hidden animate-fade-in"
                 style={{
                   width: '280px',
                   top: `${org.pyPanel}%`,
                   transform: 'translateY(-50%)',
                   ...(isLeft ? { right: '70%' } : { left: '70%' }),
                   background: dark ? 'rgba(9, 12, 21, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                   border: `1px solid ${org.cfg.col}${dark ? '40' : '60'}`,
                   boxShadow: dark ? `0 8px 32px rgba(0,0,0,0.5), 0 0 20px ${org.cfg.col}15` : `0 8px 32px rgba(0,0,0,0.1), 0 0 20px ${org.cfg.col}15`,
                   backdropFilter: 'blur(10px)',
                 }}>
              
              {/* Header */}
              <div className="p-3 border-b flex items-start justify-between" style={{ borderColor: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)' }}>
                  <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                           style={{ background: `${org.cfg.col}15`, color: org.cfg.col, border: `1px solid ${org.cfg.col}30` }}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                      </div>
                      <div>
                          <h4 className="text-sm font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>{org.label}</h4>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider mt-1 inline-block" 
                                style={{ backgroundColor: org.cfg.col, color: '#fff' }}>
                              {org.cfg.label}
                          </span>
                      </div>
                  </div>
                  <button onClick={() => setActive(null)} style={{ color: 'var(--text-muted)' }} className="hover:opacity-70 mt-1 transition-opacity">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
              </div>

              {/* Data Rows */}
              <div className="p-4 space-y-2.5">
                  {['injury', 'weight', 'bleeding', 'fracture', 'laceration', 'fluid'].map(key => {
                      if (!org.detail[key]) return null;
                      const isDanger = org.detail[key].includes('Severe') || org.detail[key].includes('hemorrhage') || org.detail[key].includes('-1,200');
                      return (
                          <div key={key} className="flex justify-between items-start gap-4">
                              <span className="text-[10px] font-semibold uppercase tracking-wider flex-shrink-0 w-20" style={{ color: 'var(--text-muted)' }}>{key.replace('_', ' ')}</span>
                              <span className={`text-[11px] font-medium text-right ${isDanger ? 'text-red-500 font-bold' : ''}`} style={{ color: !isDanger ? 'var(--text-secondary)' : undefined }}>
                                  {org.detail[key]}
                              </span>
                          </div>
                      );
                  })}

                  {/* AI Insight */}
                  <div className="mt-4 p-3 rounded-lg" style={{ background: `${org.cfg.col}10`, border: `1px solid ${org.cfg.col}20` }}>
                      <div className="flex items-center gap-1.5 mb-1.5">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" style={{ color: org.cfg.col }}>
                              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: org.cfg.col }}>AI Insight</span>
                      </div>
                      <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{org.detail.note}</p>
                  </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
