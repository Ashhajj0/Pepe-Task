import { ReactNode, memo, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight, ShieldCheck, Timer } from 'lucide-react';
import { safeNumber } from '../lib/utils/firestore';

export const Counter = memo(({ value: valueArg, decimals = 0 }: { value: any, decimals?: number }) => {
  const value = safeNumber(valueArg);
  const [displayValue, setDisplayValue] = useState(value);
  
  useEffect(() => {
    let start = displayValue;
    const end = value;
    const duration = 800; // Faster animation
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
      <div className="w-10 h-10 glass rounded-lg flex items-center justify-center border border-white/5 shadow-inner">
        <span className="text-xs font-black tracking-tighter tabular-nums font-mono text-emerald-500">{value}</span>
      </div>
      <span className="text-[6px] font-bold text-zinc-600 mt-1 uppercase tracking-tighter">{label}</span>
    </div>
  );
});

TimerDisplay.displayName = 'TimerDisplay';

export const SocialTask = memo(({ icon, title, reward, actionLabel }: { icon: ReactNode, title: string, reward: string, actionLabel: string }) => {
  return (
    <div className="glass p-3 rounded-2xl flex items-center justify-between border-white/5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-zinc-500">
          {icon}
        </div>
        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-zinc-300 leading-none mb-1">{title}</span>
          <span className="text-[10px] font-black text-emerald-500 leading-none tracking-tight">{reward} PEPE</span>
        </div>
      </div>
      <button className="px-4 py-2 glass-neon rounded-lg font-black text-[9px] uppercase tracking-widest text-emerald-500 transition-all active:scale-95">
        {actionLabel}
      </button>
    </div>
  );
});

SocialTask.displayName = 'SocialTask';

export const EarnCard = memo(({ icon, title, reward, desc, actionLabel, disabled }: { icon: ReactNode, title: string, reward: string, desc: string, actionLabel: string, disabled?: boolean }) => {
  return (
    <div className={`glass relative p-5 rounded-[28px] border-white/5 transition-all ${disabled ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
      <div className="flex items-center gap-4 mb-3">
        <div className="w-11 h-11 glass-neon rounded-xl flex items-center justify-center text-emerald-500 shadow-neon">
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-bold tracking-tight text-white">{title}</h3>
          <span className="text-[11px] font-black text-emerald-500 uppercase tracking-widest">{reward} PEPE</span>
        </div>
      </div>
      <p className="text-[10px] text-zinc-500 mb-4 leading-relaxed font-medium">{desc}</p>
      <button 
        disabled={disabled}
        className={`w-full py-3.5 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95 ${
          disabled 
            ? 'glass text-zinc-700 border-white/5' 
            : 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/10'
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
    <div className="flex items-center justify-between p-4 px-5">
      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">{label}</span>
      <span className={`text-[10px] font-bold ${highlight ? 'text-emerald-500' : 'text-zinc-300'} ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
});

ProfileRow.displayName = 'ProfileRow';

export const NavItem = memo(({ icon, active, label, onClick }: { icon: ReactNode, active?: boolean, label: string, onClick: () => void }) => {
  return (
    <button 
      onClick={onClick} 
      className={`flex flex-col items-center gap-1.5 transition-all outline-none relative ${active ? 'text-emerald-500' : 'text-zinc-700 hover:text-zinc-500'}`}
    >
      <motion.div
        whileTap={{ scale: 0.8 }}
        className={`p-1 ${active ? 'bg-emerald-500/10 rounded-xl' : ''}`}
      >
        {icon}
      </motion.div>
      <span className={`text-[8px] font-black uppercase tracking-[0.1em] shrink-0 transition-all ${active ? 'opacity-100' : 'opacity-40'}`}>
        {label}
      </span>
    </button>
  );
});

NavItem.displayName = 'NavItem';
