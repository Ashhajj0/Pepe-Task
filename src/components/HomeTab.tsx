import { motion } from 'motion/react';
import { memo, useMemo } from 'react';
import { UserProfile, TelegramUser } from '../types';
import { Counter, ProfileRow } from './UIElements';
import { safeNumber, safeString } from '../lib/utils/firestore';
import { Trophy, Users, TrendingUp, Gem, Info } from 'lucide-react';
import * as currencyService from '../services/currencyService';

interface HomeTabProps {
  user: TelegramUser | null;
  profile: UserProfile | null;
  currencyDisplay: { symbol: string; rate: number; formatted: string };
  levelProgress: number;
  dailyProgress: number;
  userRank: string;
  handleClaimLevelBonus: () => void;
}

export const HomeTab = memo(({ user, profile, currencyDisplay, levelProgress, dailyProgress, userRank, handleClaimLevelBonus }: HomeTabProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="px-5 pt-2 space-y-5"
    >
      {/* User Identity */}
      <div className="glass p-4 rounded-[28px] flex items-center gap-4 border-white/5">
        <div className="w-12 h-12 rounded-[14px] border border-white/10 p-0.5 bg-zinc-900 overflow-hidden">
          <img 
            src={user?.photo_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user?.id}`} 
            alt="Operator" 
            className="rounded-[12px] w-full h-full object-cover" 
          />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold truncate tracking-tight">{user?.first_name}</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">{safeNumber(profile?.trustScore)}% Trust</span>
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest truncate">@{safeString(user?.username) || 'pepe_user'}</span>
          </div>
        </div>
      </div>

      {/* Balance Card */}
      <div className="relative">
        <div className="absolute inset-0 bg-emerald-500/[0.03] blur-[40px] rounded-full pointer-events-none"></div>
        <div className="relative glass-neon rounded-[36px] p-6 shimmer overflow-hidden border-white/5">
          <div className="flex justify-between items-start mb-6">
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-600 mb-1">Balance</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black tracking-tight tabular-nums font-display leading-none text-white">
                  <Counter value={profile?.balance ?? 0} />
                </span>
                <span className="text-[10px] font-black text-emerald-500 tracking-widest uppercase">PEPE</span>
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-xs font-bold text-zinc-400">{currencyDisplay.formatted}</span>
                <span className="text-[8px] font-black text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">LIVE</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl glass-neon flex items-center justify-center border border-emerald-500/20">
              <TrendingUp size={16} className="text-emerald-500" />
            </div>
          </div>
          
          <div className="h-px bg-white/5 w-full mb-6"></div>

          <div className="grid grid-cols-2 gap-y-5 gap-x-4">
            <div className="flex flex-col space-y-1">
              <span className="text-[7px] font-black text-zinc-600 uppercase tracking-[0.15em]">User Level</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-200 shrink-0">LVL {safeNumber(profile?.level, 1)}</span>
                <div className="flex-1 h-1 bg-zinc-900 rounded-full overflow-hidden mt-0.5">
                  <motion.div 
                    className="h-full bg-blue-500"
                    initial={false}
                    animate={{ width: `${levelProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-col space-y-1 pl-4 border-l border-white/5">
              <span className="text-[7px] font-black text-zinc-600 uppercase tracking-[0.15em]">Daily Load</span>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1 bg-zinc-900 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${dailyProgress}%` }}></div>
                </div>
                <span className="text-[9px] font-black text-zinc-400">{safeNumber(profile?.adsWatchedToday)}/15</span>
              </div>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-[7px] font-black text-zinc-600 uppercase tracking-[0.15em]">Total Refers</span>
              <span className="text-xs font-bold text-zinc-200">{safeNumber(profile?.referCount)}</span>
            </div>
            <div className="flex flex-col space-y-1 pl-4 border-l border-white/5">
              <span className="text-[7px] font-black text-zinc-600 uppercase tracking-[0.15em]">Total Earning</span>
              <div className="flex items-center gap-1 text-xs font-bold text-emerald-500">
                <span>{safeNumber(profile?.totalEarned).toLocaleString()}</span>
                <Gem size={8} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Level Rewards Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">Level Progression</h3>
          <div className="h-px w-10 bg-zinc-900/50"></div>
        </div>
        <div className="glass rounded-[24px] p-5 border-white/5 relative overflow-hidden bg-gradient-to-br from-emerald-500/[0.03] to-transparent">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl glass-neon flex items-center justify-center border border-emerald-500/20">
                <Trophy size={18} className="text-emerald-500" />
              </div>
              <div>
                <h4 className="text-[11px] font-black text-white uppercase tracking-tight">Level {profile?.level} Rewards</h4>
                <p className="text-[9px] font-medium text-zinc-500">Reach levels to unlock bonuses</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black text-emerald-500 block">+500 PEPE</span>
              <span className="text-[7px] font-bold text-zinc-600 uppercase tracking-widest">Per Level</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="glass bg-black/20 rounded-2xl p-4 border border-white/5">
              <div className="flex items-center justify-between mb-2">
                 <span className="text-[10px] font-bold text-zinc-400 italic">
                   { (profile?.level || 1) < 2
                     ? "Unlocks at Level 2"
                     : (profile?.lastClaimedLevel || 0) < (profile?.level || 1) 
                       ? "New Level Bonus Ready!" 
                       : `Next Bonus: Level ${(profile?.level || 1) + 1}` }
                 </span>
                 <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                   { (profile?.level || 1) >= 2 && (profile?.lastClaimedLevel || 0) < (profile?.level || 1) 
                     ? "Unlocked" 
                     : "Locked" }
                 </span>
              </div>
              
              <button 
                onClick={handleClaimLevelBonus}
                disabled={(profile?.level || 1) < 2 || (profile?.lastClaimedLevel || 0) >= (profile?.level || 1)}
                className={`w-full py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-300 ${
                  (profile?.level || 1) >= 2 && (profile?.lastClaimedLevel || 0) < (profile?.level || 1)
                  ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20 active:scale-95'
                  : 'bg-zinc-800 text-zinc-600 opacity-50 cursor-not-allowed'
                }`}
              >
                { (profile?.level || 1) < 2 
                  ? 'Locked' 
                  : (profile?.lastClaimedLevel || 0) < (profile?.level || 1) 
                    ? 'Claim 500 Bonus' 
                    : 'Bonus Claimed' }
              </button>
            </div>

            <div className="flex items-center gap-2 px-1">
              <Info size={10} className="text-zinc-700" />
              <span className="text-[8px] text-zinc-700 font-black uppercase tracking-widest leading-none">
                Earn 500 PEPE bonus every time you advance to a new level (Starts from Level 2).
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="glass p-5 rounded-[28px] border-white/5 flex flex-col items-center text-center">
          <Trophy size={16} className="text-zinc-500 mb-3" />
          <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest block mb-1">Rank_Score</span>
          <span className="text-base font-black text-zinc-200 font-display">#{userRank}</span>
        </div>
        <div className="glass p-5 rounded-[28px] border-white/5 flex flex-col items-center text-center">
          <Users size={16} className="text-zinc-500 mb-3" />
          <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest block mb-1">Active_Nodes</span>
          <span className="text-base font-black text-zinc-200 font-display">{safeNumber(profile?.referCount).toLocaleString()}</span>
        </div>
      </div>
    </motion.div>
  );
});

HomeTab.displayName = 'HomeTab';
