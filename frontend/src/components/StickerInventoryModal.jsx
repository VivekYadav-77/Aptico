import { useState, useMemo } from 'react';
import { STICKER_REGISTRY, STICKER_CATEGORIES, RARITY_CONFIG } from '../utils/stickerRegistry.js';
import StickerVisual from './StickerVisual.jsx';

/**
 * StickerInventoryModal — Displays all unlocked stickers for a user in a premium gallery view.
 */
export default function StickerInventoryModal({ isOpen, onClose, unlockedStickers = [], userName = 'User' }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [hoveredSticker, setHoveredSticker] = useState(null);

  const filteredStickers = useMemo(() => {
    // Only show stickers that are in the unlockedStickers list
    const unlocked = STICKER_REGISTRY.filter(s => unlockedStickers.includes(s.id));
    
    if (activeCategory === 'all') return unlocked;
    return unlocked.filter(s => s.category === activeCategory);
  }, [unlockedStickers, activeCategory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 p-4 backdrop-blur-xl animate-fade-in" onClick={onClose}>
      <div 
        className="relative w-full max-w-6xl h-[85vh] overflow-hidden rounded-[3rem] border border-white/10 bg-[#0a0b0e] shadow-[0_0_80px_rgba(0,0,0,0.8)] flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[var(--accent)] via-[#ec4899] to-[var(--accent-strong)]" />
        
        {/* Main Body */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* LEFT: Gallery Section */}
          <div className="flex-[1.4] flex flex-col border-r border-white/5 bg-[#0d0f14]">
            {/* Header Area */}
            <div className="p-10 pb-6">
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h2 className="text-4xl font-black text-white tracking-tighter mb-1">Sticker Vault</h2>
                  <p className="text-[10px] font-black text-[var(--muted-strong)] uppercase tracking-[0.4em] opacity-50">
                    {userName}'s Digital Collection
                  </p>
                </div>
                <div className="flex items-center gap-3 bg-white/[0.03] px-5 py-2.5 rounded-2xl border border-white/5 shadow-inner">
                   <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e] animate-pulse" />
                   <span className="text-xs font-black text-white/80">{unlockedStickers.length} Unlocked</span>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveCategory('all')}
                  className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                    activeCategory === 'all' 
                    ? 'bg-white text-black border-white shadow-xl shadow-white/10' 
                    : 'bg-white/5 text-[var(--muted-strong)] border-white/5 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  All
                </button>
                {STICKER_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                      activeCategory === cat.id 
                      ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-xl shadow-[var(--accent)]/20' 
                      : 'bg-white/5 text-[var(--muted-strong)] border-white/5 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {cat.emoji} {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid Container */}
            <div className="flex-1 overflow-y-auto p-10 pt-2 custom-scrollbar">
              {filteredStickers.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
                  {filteredStickers.map(sticker => {
                    const rc = RARITY_CONFIG[sticker.rarity];
                    const isActive = hoveredSticker?.id === sticker.id;

                    return (
                      <div 
                        key={sticker.id}
                        className={`
                          relative aspect-square rounded-[2.5rem] border transition-all duration-500 cursor-pointer group
                          ${isActive ? 'scale-95 border-white/30' : 'hover:scale-[1.03] border-white/5'}
                          ${rc.bg} ${rc.glow}
                        `}
                        onMouseEnter={() => setHoveredSticker(sticker)}
                      >
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                          <StickerVisual 
                            id={sticker.id}
                            visualId={sticker.visualId}
                            subVariant={sticker.subVariant}
                            color={sticker.color}
                            size={72}
                            rarity={sticker.rarity}
                            tier={sticker.tier || 1}
                          />
                        </div>
                        {isActive && <div className="absolute inset-0 rounded-[2.5rem] shadow-[inset_0_0_20px_rgba(255,255,255,0.1)]" />}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                   <div className="w-20 h-20 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center mb-6">
                      <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                   </div>
                  <p className="text-sm font-black text-white uppercase tracking-[0.3em]">No Assets Found</p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Inspector Section */}
          <div className="flex-1 bg-[#0a0b0e] flex flex-col relative overflow-hidden">
            {/* Close Button */}
            <button 
              onClick={onClose}
              className="absolute top-8 right-8 z-50 h-12 w-12 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 flex items-center justify-center text-white/40 hover:text-white transition-all hover:rotate-90 active:scale-95"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {hoveredSticker ? (
              <div className="flex-1 flex flex-col p-12 items-center justify-center text-center animate-fade-in" key={hoveredSticker.id}>
                {/* Large Preview */}
                <div className="relative mb-14 group">
                   <div className={`absolute inset-0 blur-[100px] opacity-30 transition-opacity duration-1000 ${RARITY_CONFIG[hoveredSticker.rarity].bg}`} />
                   <div className="relative transform group-hover:scale-110 transition-transform duration-1000 ease-out">
                      <StickerVisual 
                        id={hoveredSticker.id}
                        visualId={hoveredSticker.visualId}
                        subVariant={hoveredSticker.subVariant}
                        color={hoveredSticker.color}
                        size={200}
                        rarity={hoveredSticker.rarity}
                        tier={hoveredSticker.tier || 1}
                      />
                   </div>
                </div>

                {/* Badge & Category */}
                <div className="flex items-center gap-4 mb-8">
                   <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg ${RARITY_CONFIG[hoveredSticker.rarity].badgeColor}`}>
                      {RARITY_CONFIG[hoveredSticker.rarity].label}
                   </span>
                   <div className="w-1 h-1 rounded-full bg-white/20" />
                   <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">
                      {STICKER_CATEGORIES.find(c => c.id === hoveredSticker.category)?.name}
                   </span>
                </div>

                <h3 className="text-5xl font-black text-white tracking-tighter mb-5">
                  {hoveredSticker.name}
                </h3>
                
                <p className="text-lg text-white/50 leading-relaxed max-w-sm mb-12 font-medium">
                  {hoveredSticker.description}
                </p>

                {/* Requirement Met Card */}
                {hoveredSticker.requirement && (
                  <div className="w-full max-w-xs p-8 rounded-[2rem] bg-white/[0.02] border border-white/[0.05] text-left relative overflow-hidden group hover:border-white/10 transition-colors">
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[var(--accent)] to-transparent opacity-60" />
                    <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.4em] mb-4">Milestone Cleared</p>
                    <div className="flex items-center gap-4">
                       <div className="h-12 w-12 rounded-2xl bg-white/[0.03] flex items-center justify-center text-2xl shadow-inner">
                          {hoveredSticker.requirement.type === 'xp' && '⭐'}
                          {hoveredSticker.requirement.type === 'streak' && '🔥'}
                          {hoveredSticker.requirement.type === 'skill' && '⚔️'}
                          {!['xp', 'streak', 'skill'].includes(hoveredSticker.requirement.type) && '🏆'}
                       </div>
                       <div>
                          <p className="text-base font-black text-white tracking-tight">
                            {hoveredSticker.requirement.type === 'xp' && `${hoveredSticker.requirement.value.toLocaleString()} XP`}
                            {hoveredSticker.requirement.type === 'streak' && `${hoveredSticker.requirement.value} Day Streak`}
                            {hoveredSticker.requirement.type === 'skill' && `${hoveredSticker.requirement.value} Mastery`}
                            {!['xp', 'streak', 'skill'].includes(hoveredSticker.requirement.type) && 'Target Reached'}
                          </p>
                          <p className="text-[10px] font-bold text-white/20 uppercase mt-1 tracking-wider">Aptico Verified</p>
                       </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-10">
                <div className="w-32 h-32 rounded-full border-4 border-dashed border-white/10 flex items-center justify-center mb-8">
                   <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                   </svg>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white">Selection Required</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scale-in { 
          from { opacity: 0; transform: scale(0.97) translateY(20px); } 
          to { opacity: 1; transform: scale(1) translateY(0); } 
        }
        @keyframes pulse-subtle {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(0.98); }
        }
        .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
        .animate-scale-in { animation: scale-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-pulse-subtle { animation: pulse-subtle 3s ease-in-out infinite; }
        
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { 
          background: rgba(255, 255, 255, 0.05); 
          border-radius: 10px; 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.1); }
      `}</style>
    </div>
  );
}
