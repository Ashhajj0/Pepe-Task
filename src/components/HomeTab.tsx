import { motion } from 'motion/react';
import { memo } from 'react';
import { UserProfile, TelegramUser } from '../types';
import { Counter } from './UIElements';
import { safeNumber, safeString } from '../lib/utils/firestore';
import { Trophy, Activity, Gem, ChevronRight } from 'lucide-react';

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
    <div className="px-6 py-10 space-y-10 min-h-full ambient-glow no-scrollbar overflow-y-auto">
      {/* Hero Balance Section */}
      <div className="flex flex-col items-center justify-center pt-6 pb-2 space-y-4">
        <motion.span 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 0.5, y: 0 }}
          className="text-[10px] font-black tracking-[0.5em] text-slate-400 uppercase"
        >
          System Liquidity
        </motion.span>
        
        <div className="relative group text-center py-4">
          <div className="absolute -inset-16 bg-emerald-500/10 blur-[100px] rounded-full scale-150 group-hover:bg-emerald-500/15 transition-all duration-1000"></div>
          <div className="flex items-baseline justify-center gap-1.5 relative">
            <h2 className="text-8xl font-black tracking-tighter text-slate-900 drop-shadow-xl font-display selection:bg-emerald-100">
              <Counter value={profile?.balance || 0} />
            </h2>
          </div>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-center justify-center gap-2 mt-2"
          >
            <span className="text-[10px] font-black text-emerald-500/80 font-display tracking-[0.3em] uppercase">PEPE TOTAL UNITS</span>
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl glass border-white/60 shadow-xl shadow-slate-200/50 mt-6"
        >
          <div className="relative">
            <span className="block w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-40"></span>
          </div>
          <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest tabular-nums">
            {currencyDisplay?.rate ? (
              `${currencyDisplay.symbol}${(profile?.balance || 0) * (currencyDisplay?.rate || 0)}`
            ) : currencyDisplay.formatted} 
            <span className="ml-1.5 text-slate-400 opacity-60">VALUATION</span>
          </span>
        </motion.div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-2 gap-5">
        <motion.div 
          whileHover={{ y: -5 }}
          className="card rounded-[32px] p-7 relative overflow-hidden group border-white/10"
        >
          <div className="absolute -top-2 -right-2 p-6 opacity-[0.04] group-hover:opacity-[0.08] transition-all duration-500 rotate-12 group-hover:rotate-0">
            <Trophy size={56} className="text-slate-900" />
          </div>
          <div className="flex flex-col relative z-10">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 leading-none opacity-70">Global Rank</span>
            <span className="text-3xl font-black text-slate-900 font-display tracking-tight">#{userRank}</span>
          </div>
        </motion.div>
        
        <motion.div 
          whileHover={{ y: -5 }}
          className="card rounded-[32px] p-7 relative overflow-hidden group border-white/10"
        >
          <div className="absolute -top-2 -right-2 p-6 opacity-[0.04] group-hover:opacity-[0.08] transition-all duration-500 -rotate-12 group-hover:rotate-0">
            <Gem size={56} className="text-slate-900" />
          </div>
          <div className="flex flex-col relative z-10">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 leading-none opacity-70">Node Tier</span>
            <span className="text-3xl font-black text-slate-900 font-display tracking-tight">LVL {profile?.level || 1}</span>
          </div>
        </motion.div>
      </div>

      {/* Progress Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card rounded-[40px] p-8 space-y-7 relative overflow-hidden border-white/10"
      >
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.15em]">Extraction Efficiency</h3>
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 opacity-60">Protocol Health Status</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shadow-inner-soft">
            <Activity size={20} />
          </div>
        </div>

        <div className="space-y-7">
          <div className="space-y-3">
            <div className="flex justify-between items-end px-1">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Daily Quota</span>
              <span className="text-[10px] font-black text-slate-900 tabular-nums">
                {safeNumber(profile?.adsWatchedToday, 0)} <span className="text-slate-200 mx-1">|</span> 15
              </span>
            </div>
            <div className="h-3 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100 shadow-inner-soft p-0.5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(safeNumber(profile?.adsWatchedToday, 0) / 15) * 100}%` }}
                className="h-full bg-slate-900 rounded-full shadow-sm"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-end px-1">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Next Milestone</span>
              <span className="text-[10px] font-black text-emerald-600 tabular-nums">{Math.round(levelProgress)}%</span>
            </div>
            <div className="h-3 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100 shadow-inner-soft p-0.5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${levelProgress}%` }}
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full shadow-sm"
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Action Button */}
      { (profile?.level || 1) >= 2 && (profile?.lastClaimedLevel || 0) < (profile?.level || 1) && (
        <div className="relative pt-2 pb-6">
          <div className="absolute -inset-2 bg-emerald-500/20 blur-2xl rounded-[40px] animate-pulse"></div>
          <button 
            onClick={handleClaimLevelBonus}
            className="w-full relative h-20 card hover:bg-slate-50 rounded-[28px] transition-all active:scale-[0.97] flex items-center justify-between px-8 group border-emerald-50"
          >
            <div className="flex items-center gap-5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-xl shadow-emerald-500/30">
                <Trophy size={22} fill="currentColor" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[12px] font-black text-slate-900 uppercase tracking-tight">Promotion Bonus</span>
                <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-[0.2em] mt-0.5">Reward Dispatch Pending</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-black text-emerald-600 text-[10px] tracking-[0.2em] uppercase">CLAIM</span>
              <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center">
                <ChevronRight size={14} className="text-emerald-500" />
              </div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
});

HomeTab.displayName = 'HomeTab';
