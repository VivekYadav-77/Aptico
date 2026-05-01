import { useMemo } from 'react';

// Define the architecture nodes
const NODES = [
  // Inputs (X: 160)
  { id: 'resume', label: 'Resume Data', x: 160, y: 150, type: 'input', icon: 'description' },
  { id: 'job', label: 'Target Role', x: 160, y: 300, type: 'input', icon: 'work' },
  { id: 'profile', label: 'User Profile', x: 160, y: 450, type: 'input', icon: 'person' },

  // Pre-processing (X: 400)
  { id: 'parser', label: 'Vector DB', x: 400, y: 225, type: 'node' },
  { id: 'matcher', label: 'Semantic Matcher', x: 400, y: 375, type: 'node' },

  // Central Hub (X: 640)
  { id: 'engine', label: 'APTICO AI ENGINE', x: 640, y: 300, type: 'hub' },

  // Post-processing (X: 880)
  { id: 'insights', label: 'Insight Generator', x: 880, y: 225, type: 'node' },
  { id: 'gamification', label: 'Reward Engine', x: 880, y: 375, type: 'node' },

  // Outputs (X: 1120)
  { id: 'analysis', label: 'Match Analysis', x: 1120, y: 150, type: 'output', icon: 'analytics' },
  { id: 'shadow', label: 'Shadow Resume', x: 1120, y: 250, type: 'output', icon: 'shield_with_heart' },
  { id: 'squad', label: 'Squad Network', x: 1120, y: 350, type: 'output', icon: 'groups' },
  { id: 'prep', label: 'Interview Prep', x: 1120, y: 450, type: 'output', icon: 'psychology' },
];

// Define the data flow paths
const LINKS = [
  // Inputs to Pre
  { from: 'resume', to: 'parser' },
  { from: 'job', to: 'parser' },
  { from: 'job', to: 'matcher' },
  { from: 'profile', to: 'matcher' },
  // Pre to Hub
  { from: 'parser', to: 'engine' },
  { from: 'matcher', to: 'engine' },
  // Hub to Post
  { from: 'engine', to: 'insights' },
  { from: 'engine', to: 'gamification' },
  // Post to Outputs
  { from: 'insights', to: 'analysis' },
  { from: 'insights', to: 'prep' },
  { from: 'gamification', to: 'shadow' },
  { from: 'gamification', to: 'squad' },
];

function getNodeBounds(type) {
  if (type === 'input' || type === 'output') return { w: 180, h: 48 };
  if (type === 'node') return { w: 48, h: 48 };
  if (type === 'hub') return { w: 220, h: 80 };
  return { w: 0, h: 0 };
}

// Generates a path with perfectly rounded corners
function getStepPath(startX, startY, endX, endY) {
  if (startY === endY) return `M ${startX} ${startY} H ${endX}`;
  
  const midX = startX + (endX - startX) / 2;
  const dir = endY > startY ? 1 : -1;
  const radius = Math.min(16, Math.abs(endY - startY) / 2, Math.abs(endX - startX) / 2);
  
  return `M ${startX} ${startY} H ${midX - radius} Q ${midX} ${startY} ${midX} ${startY + dir * radius} V ${endY - dir * radius} Q ${midX} ${endY} ${midX + radius} ${endY} H ${endX}`;
}

export default function ApticoArchitectureDiagram() {
  const renderedLinks = useMemo(() => {
    return LINKS.map((link, idx) => {
      const source = NODES.find((n) => n.id === link.from);
      const target = NODES.find((n) => n.id === link.to);
      if (!source || !target) return null;

      const sourceBounds = getNodeBounds(source.type);
      const targetBounds = getNodeBounds(target.type);

      const startX = source.x + sourceBounds.w / 2;
      const startY = source.y;
      const endX = target.x - targetBounds.w / 2;
      const endY = target.y;

      const pathD = getStepPath(startX, startY, endX, endY);
      
      // We assign random durations to make the animation feel organic
      const dur = (Math.random() * 2 + 2).toFixed(1); // 2s to 4s
      const delay = (Math.random() * 2).toFixed(1);

      return (
        <g key={`${link.from}-${link.to}-${idx}`}>
          {/* Base dotted line */}
          <path
            d={pathD}
            fill="none"
            stroke="rgba(134, 148, 138, 0.25)"
            strokeWidth="2"
            strokeDasharray="4 4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Animated glowing dot */}
          <circle r="4" fill="var(--accent)" style={{ filter: 'drop-shadow(0 0 8px var(--accent))' }}>
            <animateMotion dur={`${dur}s`} begin={`${delay}s`} repeatCount="indefinite">
              <mpath href={`#path-${idx}`} />
            </animateMotion>
          </circle>
          {/* Hidden path for the animateMotion reference */}
          <path id={`path-${idx}`} d={pathD} fill="none" stroke="none" />
        </g>
      );
    });
  }, []);

  return (
    <div className="relative w-full max-w-6xl mx-auto aspect-[16/10] md:aspect-[21/9] lg:aspect-[2.2/1] overflow-hidden rounded-3xl border border-[var(--border)] bg-[#0a0a0c] shadow-[0_30px_60px_rgba(0,0,0,0.4)]">
      {/* Dark dotted background pattern */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none" 
        style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.4) 1px, transparent 0)',
          backgroundSize: '24px 24px'
        }}
      />
      
      <div className="absolute inset-0 h-full w-full pointer-events-none">
        <svg viewBox="0 0 1280 600" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
          <defs>
            {/* Glow filter for nodes */}
            <filter id="node-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            
            {/* Soft gradient for the central hub */}
            <linearGradient id="hub-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
               <stop offset="0%" stopColor="#ffffff" />
               <stop offset="100%" stopColor="#e5e1e4" />
            </linearGradient>
          </defs>

          {/* Render Connections */}
          {renderedLinks}

          {/* Render Nodes (Using SVG foreignObject for perfect scaling) */}
          {NODES.map((node) => {
            const bounds = getNodeBounds(node.type);
            const { x, y, type, label, icon } = node;

            if (type === 'input' || type === 'output') {
              return (
                <foreignObject key={node.id} x={x - bounds.w / 2} y={y - bounds.h / 2} width={bounds.w} height={bounds.h}>
                  <div className="flex h-full w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--panel)] px-4 shadow-lg transition-transform hover:scale-105">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-[var(--accent-soft)]">
                       <span className="material-symbols-outlined text-[14px] text-[var(--accent-strong)]">{icon}</span>
                    </div>
                    <span className="text-xs font-bold text-[var(--text)] tracking-wide">{label}</span>
                  </div>
                </foreignObject>
              );
            }

            if (type === 'node') {
              return (
                <g key={node.id} className="transition-transform hover:scale-110" style={{ transformOrigin: `${x}px ${y}px` }}>
                  {/* Glowing aura */}
                  <circle cx={x} cy={y} r="28" fill="var(--accent-soft)" filter="url(#node-glow)" />
                  {/* Central Node */}
                  <circle cx={x} cy={y} r="20" fill="var(--accent)" stroke="#003824" strokeWidth="2" />
                  {/* Inner A symbol */}
                  <text x={x} y={y + 5} textAnchor="middle" fontSize="18" fontWeight="900" fill="#003824" fontFamily="Inter, sans-serif">
                    A
                  </text>
                  {/* Label below */}
                  <text x={x} y={y + 44} textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--muted-strong)" letterSpacing="1">
                    {label.toUpperCase()}
                  </text>
                </g>
              );
            }

            if (type === 'hub') {
              return (
                <foreignObject key={node.id} x={x - bounds.w / 2} y={y - bounds.h / 2} width={bounds.w} height={bounds.h}>
                  <div className="flex h-full w-full flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-white shadow-[0_0_40px_rgba(78,222,163,0.15)] transition-transform hover:scale-105 dark:bg-[#18181b]">
                    <div className="flex items-center gap-2">
                       <div className="flex h-8 w-8 items-center justify-center rounded bg-[var(--accent)] shadow-[0_0_15px_var(--accent)]">
                          <span className="text-sm font-black text-[#003824]">A</span>
                       </div>
                       <span className="text-sm font-black tracking-widest text-[#131315] dark:text-white">
                         {label}
                       </span>
                    </div>
                  </div>
                </foreignObject>
              );
            }

            return null;
          })}
        </svg>
      </div>
    </div>
  );
}
