import { motion } from 'motion/react';
import { memo } from 'react';
import { UserProfile } from '../types';
import { SocialTask, TimerDisplay } from './UIElements';
import { PlayCircle, Timer, Users, ArrowUpRight } from 'lucide-react';
import { safeNumber } from '../lib/utils/firestore';

interface EarnTabProps {
  profile: UserProfile | null;
  adState: string;
  isLimitReached: boolean;
  cooldownRemaining: number;
  handleWatchAd: () => void;
  resetCountdown: { hours: string, minutes: string, seconds: string } | null;
}

export const EarnTab = memo(({ profile, adState, isLimitReached, cooldownRemaining, handleWatchAd, resetCountdown }: EarnTabProps) => {
  return (
    <div className="px-6 py-6 space-y-8 pb-32 min-h-full ambient-glow no-scrollbar overflow-y-auto">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em]">Earn Credits</h2>
        <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest opacity-60 italic">Extraction Protocol</p>
      </div>
      
      <div className="space-y-6">
        <div className="card rounded-[32px] p-6 border-white/20">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100/50">
                <PlayCircle size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Available now</span>
                <span className="text-sm font-black text-slate-900">100 PEPE Reward</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Quota</span>
              <span className="text-xs font-black text-slate-900">{safeNumber(profile?.adsWatchedToday, 0)} / 15</span>
            </div>
          </div>

          <button 
            onClick={handleWatchAd}
            disabled={isLimitReached || adState !== 'idle'}
            className={`w-full h-14 rounded-2xl flex items-center justify-center font-black text-[11px] uppercase tracking-widest transition-all ${
              isLimitReached 
              ? 'bg-slate-100 text-slate-300 pointer-events-none' 
              : adState === 'idle'
                ? 'bg-slate-900 text-white shadow-lg shadow-slate-200 active:scale-[0.98]'
                : 'bg-slate-50 border border-slate-100 text-slate-400'
            }`}
          >
            {isLimitReached 
              ? 'Daily Limit Reached' 
              : adState === 'loading' 
                ? 'Loading Ad...' 
                : adState === 'cooldown' 
                  ? `Next In (${cooldownRemaining}s)` 
                  : 'Watch to Earn'}
          </button>
        </div>

        {isLimitReached && resetCountdown && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-6 rounded-[32px] flex flex-col items-center gap-4 bg-slate-50/50 border-white/10"
          >
            <div className="flex items-center gap-2">
              <Timer size={14} className="text-slate-400" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Protocol Reset In</span>
            </div>
            <div className="flex gap-4">
              <TimerDisplay label="H" value={resetCountdown.hours} />
              <TimerDisplay label="M" value={resetCountdown.minutes} />
              <TimerDisplay label="S" value={resetCountdown.seconds} />
            </div>
          </motion.div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Social Tasks</span>
          <div className="h-px flex-1 bg-slate-100"></div>
        </div>
        <div className="space-y-3">
           <SocialTask 
            icon={<Users size={18} />} 
            title="Pepe Network" 
            reward="+50" 
            actionLabel="Join"
           />
           <SocialTask 
            icon={<ArrowUpRight size={18} />} 
            title="Follow X" 
            reward="+25" 
            actionLabel="Follow"
           />
        </div>
      </div>
    </div>
  );
});

EarnTab.displayName = 'EarnTab';
