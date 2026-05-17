import { motion, AnimatePresence } from 'motion/react';
import { memo } from 'react';
import { UserProfile } from '../types';
import { SocialTask, TimerDisplay } from './UIElements';
import { PlayCircle, Timer, Users, ArrowUpRight, Zap, Trophy } from 'lucide-react';
import { safeNumber } from '../lib/utils/firestore';

interface EarnTabProps {
  profile: UserProfile | null;
  adState: string;
  isLimitReached: boolean;
  cooldownRemaining: number;
  handleWatchAd: () => void;
  resetCountdown: { hours: string, minutes: string, seconds: string } | null;
  onClaimLevelBonus: () => void;
  onHandleSocialTask: (taskId: string, url: string, reward: number) => void;
}

export const EarnTab = memo(({ profile, adState, isLimitReached, cooldownRemaining, handleWatchAd, resetCountdown, onHandleSocialTask }: EarnTabProps) => {
  const isTaskCompleted = (taskId: string) => {
    return (profile as any)?.completedTasks?.includes(taskId);
  };

  return (
    <div className="px-6 py-6 space-y-6 pb-32 min-h-full ambient-glow no-scrollbar overflow-y-auto">
      <div className="flex flex-col gap-1 mb-2">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em]">Earn Credits</h2>
        <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest opacity-60 italic">Extraction Protocol</p>
      </div>

      {/* Protocol Efficiency / Level Progress */}
      <div className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm group">
        <div className="flex items-center justify-between mb-8">
           <div className="space-y-1">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Protocol Efficiency</h3>
              <p className="text-sm font-black text-slate-900 uppercase">Level {profile?.level || 1} Neural Node</p>
           </div>
           <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-slate-900 group-hover:text-white transition-colors duration-500">
              <Zap size={18} />
           </div>
        </div>

        <div className="space-y-4">
          <div className="h-4 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100 p-1 shadow-inner">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${profile?.levelProgress || 0}%` }}
              className="h-full bg-slate-900 rounded-full shadow-sm relative"
            >
               <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
            </motion.div>
          </div>
          <div className="flex justify-between items-center px-1">
             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{profile?.levelProgress || 0}% SYNCHRONIZED</span>
             <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest">NEXT LEVEL: 100%</span>
          </div>
        </div>
      </div>
      
      <div className="space-y-6">
        <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-900 border border-slate-100 group-hover:bg-slate-900 group-hover:text-white transition-colors duration-500">
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
            title="Pepe Task Channel" 
            reward="+100" 
            actionLabel={isTaskCompleted('tg_channel') ? 'Claimed' : 'Join'}
            disabled={isTaskCompleted('tg_channel')}
            onClick={() => onHandleSocialTask('tg_channel', 'https://t.me/mypepetask', 100)}
           />
        </div>
      </div>
    </div>
  );
});

EarnTab.displayName = 'EarnTab';
