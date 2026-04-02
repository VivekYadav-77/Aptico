export default function Gauge({ value = 0 }) {
  const normalizedValue = Math.max(0, Math.min(100, Math.round(value)));
  const radius = 88;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (normalizedValue / 100) * circumference;
  const toneClass =
    normalizedValue >= 75 ? 'text-emerald-400' : normalizedValue >= 50 ? 'text-amber-300' : 'text-rose-400';

  return (
    <div className="relative flex h-56 w-56 items-center justify-center">
      <svg viewBox="0 0 220 220" className="h-full w-full -rotate-90">
        <circle cx="110" cy="110" r={radius} stroke="currentColor" strokeWidth="16" className="text-white/10 fill-none" />
        <circle
          cx="110"
          cy="110"
          r={radius}
          stroke="currentColor"
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeOffset}
          className={`${toneClass} fill-none transition-all duration-700`}
        />
      </svg>
      <div className="absolute text-center">
        <div className={`text-5xl font-semibold ${toneClass}`}>{normalizedValue}</div>
        <div className="mt-2 text-xs uppercase tracking-[0.28em] text-slate-400">Resume Confidence</div>
      </div>
    </div>
  );
}
