import { useEffect, useState } from 'react';

export default function ApticoLogo({ className = '' }) {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          // Spin the outer HUD based on scroll position
          setRotation(window.scrollY / 3);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Initialize position
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg 
        viewBox="0 0 100 100" 
        className="h-full w-full text-[var(--accent)]" 
        fill="none" 
        stroke="currentColor" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        style={{ filter: 'drop-shadow(0px 0px 8px var(--accent-soft))' }}
      >
        
        {/* ── SPINNING HUD LAYER ── */}
        <g 
          style={{ 
            transform: `rotate(${rotation}deg)`, 
            transformOrigin: '50px 50px', 
            transition: 'transform 0.1s linear', 
            willChange: 'transform' 
          }}
        >
          {/* Outer asymmetrical tech ring */}
          <circle cx="50" cy="50" r="44" strokeWidth="3" strokeDasharray="15 8 4 8 30 15" opacity="0.8" />
          
          {/* Inner precise targeting ring */}
          <circle cx="50" cy="50" r="34" strokeWidth="1.5" strokeDasharray="2 6" opacity="0.5" />
          
          {/* Radar crosshair pips */}
          <path d="M 50 2 V 10" strokeWidth="4" />
          <path d="M 50 90 V 98" strokeWidth="4" />
          <path d="M 2 50 H 10" strokeWidth="4" />
          <path d="M 90 50 H 98" strokeWidth="4" />
        </g>

        {/* ── STATIC 'A' CORE ── */}
        <g opacity="0.95">
          {/* Main A Frame (Triangle) */}
          <path d="M 50 22 L 74 68 H 26 Z" strokeWidth="8" />
          {/* A Crossbar */}
          <path d="M 38 52 H 62" strokeWidth="8" />
          {/* AI / Intelligence Core Dot */}
          <circle cx="50" cy="38" r="4" fill="currentColor" stroke="none" />
        </g>

      </svg>
    </div>
  );
}

