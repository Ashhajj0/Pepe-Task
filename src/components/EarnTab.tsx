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
    <div className="px-6 py-10 space-y-10 pb-36 min-h-full ambient-glow no-scrollbar overflow-y-auto">
      <div>
        <h2 className="text-3xl font-black tracking-tighter text-slate-900 font-display italic uppercase">Earn</h2>
        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mt-2 opacity-60">Extraction Protocol Active</p>
      </div>
      
      <div className="space-y-10">
        <div className="space-y-5">
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Main Node</span>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100/50 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Active Link</span>
            </div>
          </div>

          <button
            onClick={handleWatchAd}
            disabled={isLimitReached || adState !== 'idle'}
            className={`w-full relative group rounded-[40px] p-10 flex flex-col items-center gap-8 transition-all duration-500 border-2 ${
              isLimitReached 
              ? 'bg-slate-50 border-slate-100' 
              : adState === 'cooldown'
                ? 'bg-slate-50 border-emerald-50'
                : 'bg-slate-900 border-slate-800 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15)] active:scale-[0.96]'
            }`}
          >
            {adState === 'idle' && !isLimitReached && (
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-[40px]"></div>
            )}
            
            <div className={`w-20 h-20 rounded-[32px] flex items-center justify-center transition-all duration-500 relative ${
              adState === 'cooldown' || isLimitReached 
              ? 'bg-slate-200 text-slate-400' 
              : 'bg-white/10 text-emerald-400 border border-white/5 shadow-inner'
            }`}>
              {adState === 'cooldown' ? (
                <Timer size={32} className="opacity-60" />
              ) : (
                <>
                  <PlayCircle size={32} className="relative z-10" />
                  {!isLimitReached && <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full animate-pulse"></div>}
                </>
              )}
            </div>

            <div className="text-center space-y-2">
              <span className={`text-[11px] font-black uppercase tracking-[0.3em] block ${
                adState === 'cooldown' || isLimitReached ? 'text-slate-400' : 'text-emerald-500/80'
              }`}>
                {adState === 'cooldown' ? 'Syncing...' : 'Direct Allocation'}
              </span>
              <span className={`text-4xl font-black leading-none font-display tracking-tighter ${
                adState === 'cooldown' || isLimitReached ? 'text-slate-500' : 'text-white'
              }`}>
                {adState === 'cooldown' ? `${cooldownRemaining}s` : '100 PEPE'}
              </span>
            </div>
            
            <div className={`text-[11px] font-black uppercase tracking-[0.2em] px-8 py-3.5 rounded-2xl relative z-10 transition-all ${
              isLimitReached 
              ? 'bg-slate-200 text-slate-400' 
              : adState === 'cooldown'
                ? 'bg-slate-200 text-slate-400'
                : 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20 group-hover:scale-105'
            }`}>
              {isLimitReached ? 'Daily Limit' : adState === 'cooldown' ? 'Buffer' : 'Initiate Extract'}
            </div>
          </button>
          
          {isLimitReached && resetCountdown && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="card p-8 rounded-[40px] flex flex-col items-center gap-6 bg-slate-50/30 border-white/10 shadow-inner-soft"
            >
              <div className="flex items-center gap-3">
                <Timer size={14} className="text-slate-400" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Node Refresh In</span>
              </div>
              <div className="flex gap-8">
                <TimerDisplay label="H" value={resetCountdown.hours} />
                <TimerDisplay label="M" value={resetCountdown.minutes} />
                <TimerDisplay label="S" value={resetCountdown.seconds} />
              </div>
            </motion.div>
          )}
        </div>

        <div className="space-y-6 pt-2">
          <div className="flex items-center gap-3 px-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Protocol Bounties</span>
            <div className="h-px flex-1 bg-slate-100"></div>
          </div>
          <div className="space-y-4">
             <SocialTask 
              icon={<Users size={20} />} 
              title="Official Network" 
              reward="+50" 
              actionLabel="Sync"
             />
             <SocialTask 
              icon={<ArrowUpRight size={20} />} 
              title="X / Twitter Feed" 
              reward="+25" 
              actionLabel="Sync"
             />
          </div>
        </div>
      </div>
    </div>
  );
});

EarnTab.displayName = 'EarnTab';
