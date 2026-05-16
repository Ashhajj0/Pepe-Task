import { ReactNode, memo, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { safeNumber } from '../lib/utils/firestore';

export const Counter = memo(({ value: valueArg, decimals = 0 }: { value: any, decimals?: number }) => {
  const value = safeNumber(valueArg);
  const [displayValue, setDisplayValue] = useState(value);
  
  useEffect(() => {
    let start = displayValue;
    const end = value;
    const duration = 400; // Even faster for performance feel
    const startTime = Date.now();
    
    let frameId: number;
    
    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeOutExpo = (x: number) => x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
      const current = start + (end - start) * easeOutExpo(progress);
      
      setDisplayValue(current);
      
      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    };
    
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [value]);

  return <>{displayValue.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</>;
});

Counter.displayName = 'Counter';

export const TimerDisplay = memo(({ label, value }: { label: string, value: string }) => {
  return (
    <div className="flex flex-col items-center">
      <div className="w-12 h-12 glass flex items-center justify-center rounded-[14px] border-white/50 shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent pointer-events-none"></div>
        <span className="text-lg font-black text-slate-900 font-display relative z-10 tabular-nums">{value}</span>
      </div>
      <span className="text-[7px] font-black text-slate-400 mt-2 tracking-[0.15em] uppercase">{label}</span>
    </div>
  );
});

TimerDisplay.displayName = 'TimerDisplay';

export const SocialTask = memo(({ icon, title, reward, actionLabel }: { icon: ReactNode, title: string, reward: string, actionLabel: string }) => {
  return (
    <div className="card h-16 rounded-[24px] flex items-center justify-between pl-5 pr-4 hover:bg-slate-50/50 transition-all group active:scale-[0.98] border-white/10">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 group-hover:bg-white transition-colors">
          {icon}
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{title}</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest">{reward} PEPE</span>
          </div>
        </div>
      </div>
      <button className="h-9 px-5 bg-slate-900 text-white rounded-lg font-black text-[9px] uppercase tracking-widest active:scale-95 transition-all shadow-md shadow-slate-100">
        {actionLabel}
      </button>
    </div>
  );
});

SocialTask.displayName = 'SocialTask';

export const EarnCard = memo(({ icon, title, reward, desc, actionLabel, disabled }: { icon: ReactNode, title: string, reward: string, desc: string, actionLabel: string, disabled?: boolean }) => {
  return (
    <div className={`card relative p-6 rounded-[28px] border-white/10 transition-all ${disabled ? 'opacity-40 grayscale pointer-events-none' : 'hover:bg-slate-50/30'}`}>
      <div className="flex items-center gap-4 mb-4">
        <div className="w-11 h-11 bg-emerald-50 rounded-[16px] flex items-center justify-center text-emerald-600 border border-emerald-100/50 shadow-inner-soft">
          {icon}
        </div>
        <div>
          <h3 className="text-[13px] font-black tracking-tight text-slate-900 uppercase leading-none mb-1.5">{title}</h3>
          <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-md">{reward} PEPE</span>
        </div>
      </div>
      <p className="text-[9px] text-slate-400 mb-5 leading-relaxed font-bold uppercase tracking-wider opacity-80">{desc}</p>
      <button 
        disabled={disabled}
        className={`w-full py-3.5 rounded-xl font-black text-[9px] uppercase tracking-[0.2em] transition-all active:scale-95 shadow-sm ${
          disabled 
            ? 'bg-slate-100 text-slate-400' 
            : 'bg-slate-900 text-white shadow-slate-100'
        }`}
      >
        {actionLabel}
      </button>
    </div>
  );
});

EarnCard.displayName = 'EarnCard';

export const ProfileRow = memo(({ label, value, highlight, mono }: { label: string, value: string, highlight?: boolean, mono?: boolean }) => {
  return (
    <div className="flex items-center justify-between p-5 px-7 border-b border-slate-50/50 last:border-0 hover:bg-slate-50/30 transition-colors">
      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 opacity-70">{label}</span>
      <span className={`text-[10px] font-black ${highlight ? 'text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100/50' : 'text-slate-900'} ${mono ? 'font-mono' : 'font-display uppercase tracking-widest'}`}>{value}</span>
    </div>
  );
});

ProfileRow.displayName = 'ProfileRow';

export const NavItem = memo(({ icon, active, label, onClick }: { icon: ReactNode, active?: boolean, label: string, onClick: () => void }) => {
  return (
    <button 
      onClick={onClick} 
      className={`flex flex-col items-center justify-center gap-1.5 transition-all outline-none relative px-6 py-3 rounded-[24px] ${active ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50/50'}`}
    >
      {active && (
        <motion.div 
          layoutId="activeNav"
          className="absolute inset-0 bg-white shadow-soft-xl rounded-[24px] -z-10 border border-slate-100/50"
          initial={false}
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
      <div className={`transition-transform duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) ${active ? 'scale-110 -translate-y-0.5' : 'scale-100'}`}>
        {icon}
      </div>
      <span className={`text-[8px] font-black uppercase tracking-[0.15em] shrink-0 transition-all duration-300 ${active ? 'opacity-100 translate-y-0' : 'opacity-40 translate-y-0.5'}`}>
        {label}
      </span>
    </button>
  );
});

NavItem.displayName = 'NavItem';
