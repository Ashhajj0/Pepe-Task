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
    <motion.div key="earn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-5 pt-4 space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight mb-1 font-display">Hub</h2>
        <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em]">Rewards & Social</p>
      </div>
      
      <div className="space-y-6">
        <div className="space-y-3">
          <span className="text-[9px] font-black text-zinc-700 uppercase tracking-[0.25em]">Visual Protocol</span>
          <motion.button
            whileTap={(!isLimitReached && adState === 'idle') ? { scale: 0.98 } : {}}
            onClick={handleWatchAd}
            disabled={isLimitReached || adState !== 'idle'}
            className={`w-full rounded-[24px] p-6 flex items-center justify-between shadow-[0_20px_40px_rgba(16,185,129,0.2)] relative overflow-hidden group transition-all duration-300 ${
              isLimitReached 
              ? 'bg-zinc-800 opacity-50 cursor-not-allowed' 
              : adState === 'cooldown'
                ? 'bg-zinc-900 border border-emerald-500/10'
                : 'bg-gradient-to-br from-emerald-500 to-emerald-600'
            }`}
          >
            <div className="flex items-center gap-4 relative z-10">
              <div className={`w-12 h-12 glass rounded-2xl flex items-center justify-center ${adState === 'cooldown' ? 'text-emerald-500' : 'bg-black/20 text-white'}`}>
                {adState === 'cooldown' ? <Timer size={24} /> : <PlayCircle size={24} />}
              </div>
              <div className="text-left">
                <span className={`text-[10px] font-black uppercase tracking-widest block mb-0.5 ${adState === 'cooldown' ? 'text-zinc-500' : 'text-black/40'}`}>
                  {adState === 'cooldown' ? 'Cooldown Active' : 'Stream Bonus'}
                </span>
                <span className={`text-lg font-black tracking-tight leading-none uppercase ${adState === 'cooldown' ? 'text-zinc-300' : 'text-black'}`}>
                  {adState === 'cooldown' ? `${cooldownRemaining}s Wait` : '+0-100 PEPE'}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end relative z-10">
              <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg ${
                isLimitReached 
                ? 'bg-zinc-900 text-zinc-600' 
                : adState === 'cooldown'
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : 'bg-black/10 text-black'
              }`}>
                {isLimitReached ? 'Locked' : adState === 'cooldown' ? 'Wait' : 'Watch Now'}
              </span>
            </div>
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </motion.button>
          <div className="flex justify-between items-center px-1">
            <span className={`text-[9px] font-bold uppercase tracking-widest ${isLimitReached ? 'text-red-500' : 'text-zinc-600'}`}>
              {isLimitReached ? 'Daily Limit Reached' : 'Daily Consensus Limit'}
            </span>
            <span className={`text-[10px] font-black ${isLimitReached ? 'text-red-500' : 'text-emerald-500/80'}`}>{safeNumber(profile?.adsWatchedToday)} / 15</span>
          </div>

          {isLimitReached && resetCountdown && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 glass p-4 rounded-[20px] border-emerald-500/10 flex flex-col items-center gap-2"
            >
              <span className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.3em]">Protocol Reset Window</span>
              <div className="flex gap-3">
                <TimerDisplay label="HH" value={resetCountdown.hours} />
                <TimerDisplay label="MM" value={resetCountdown.minutes} />
                <TimerDisplay label="SS" value={resetCountdown.seconds} />
              </div>
            </motion.div>
          )}
        </div>

        <div className="space-y-3">
          <span className="text-[9px] font-black text-zinc-700 uppercase tracking-[0.25em]">Network Expansion</span>
          <div className="space-y-3">
             <SocialTask 
              icon={<Users size={18} />} 
              title="Main Telegram Channel" 
              reward="+50.00" 
              actionLabel="Join"
             />
             <SocialTask 
              icon={<Users size={18} />} 
              title="Community Group" 
              reward="+50.00" 
              actionLabel="Link"
             />
             <SocialTask 
              icon={<ArrowUpRight size={18} />} 
              title="X News Terminal" 
              reward="+35.00" 
              actionLabel="Follow"
             />
          </div>
        </div>
      </div>
    </motion.div>
  );
});

EarnTab.displayName = 'EarnTab';
