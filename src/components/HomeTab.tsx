import { motion } from 'motion/react';
import { memo } from 'react';
import { UserProfile, TelegramUser } from '../types';
import { Counter } from './UIElements';
import { safeNumber, safeString } from '../lib/utils/firestore';
import { Trophy, Activity, Gem, ChevronRight, Users, Loader2 } from 'lucide-react';
import { PepePriceTicker } from './PepePriceTicker';

interface HomeTabProps {
  user: TelegramUser | null;
  profile: UserProfile | null;
  currencyDisplay: { symbol: string; rate: number; formatted: string };
  levelProgress: number;
  dailyProgress: number;
  userRank: string;
  handleClaimLevelBonus: () => void;
  isProcessing?: boolean;
}

export const HomeTab = memo(({ user, profile, currencyDisplay, levelProgress, dailyProgress, userRank, handleClaimLevelBonus, isProcessing }: HomeTabProps) => {
  return (
    <div className="px-6 py-6 space-y-6 ambient-glow">
      {/* Balance Card Section */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card rounded-[32px] p-6 text-center relative overflow-hidden border-white shadow-sm bg-gradient-to-br from-white via-slate-50/50 to-emerald-50/20"
      >
        <div className="flex flex-col items-center relative z-10">
          <span className="text-[10px] font-bold tracking-[0.1em] text-slate-400 uppercase mb-3 opacity-60">Secured Balance</span>
          <h2 className="text-5xl font-bold text-black font-sans tracking-tighter">
            <Counter value={profile?.balance || 0} />
          </h2>
          <div className="mt-4 px-4 py-1.5 bg-white shadow-sm rounded-full border border-slate-100">
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight tabular-nums">
              {currencyDisplay?.rate ? (
                <div className="flex items-center gap-1">
                  <span>{currencyDisplay.symbol}</span>
                  <Counter value={(profile?.balance || 0) * (currencyDisplay?.rate || 0)} decimals={currencyDisplay.symbol === '$' ? 4 : 2} />
                  <span className="ml-1 opacity-40 text-[8px]">{profile?.preferredCurrency?.toUpperCase()}</span>
                </div>
              ) : currencyDisplay.formatted}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Grid Stats */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div 
          whileHover={{ y: -2 }}
          className="card rounded-[24px] p-5 relative overflow-hidden group border-white/10"
        >
          <div className="flex flex-col relative z-10">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 leading-none opacity-70">Total Refers</span>
            <div className="flex items-center gap-2">
              <Users size={14} className="text-blue-500" />
              <span className="text-xl font-black text-slate-900 font-sans tracking-tight">{safeNumber(profile?.totalReferrals, 0)}</span>
            </div>
          </div>
        </motion.div>
        
        <motion.div 
          whileHover={{ y: -2 }}
          className="card rounded-[24px] p-5 relative overflow-hidden group border-white/10"
        >
          <div className="flex flex-col relative z-10">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 leading-none opacity-70">Level</span>
            <div className="flex items-center gap-2">
              <Gem size={14} className="text-emerald-500" />
              <span className="text-xl font-bold text-slate-900 font-sans tracking-tight">LVL {profile?.level || 1}</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Progress Card */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card rounded-[32px] p-6 space-y-5 relative overflow-hidden border-white/10"
      >
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.1em]">Protocol Efficiency</h3>
          </div>
          <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shadow-inner-soft">
            <Activity size={16} />
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-end px-1">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Daily Limit</span>
              <span className="text-[10px] font-black text-slate-900 tabular-nums">
                {safeNumber(profile?.adsWatchedToday, 0)} <span className="text-slate-200 mx-1">/</span> 15
              </span>
            </div>
            <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100 shadow-inner-soft">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(safeNumber(profile?.adsWatchedToday, 0) / 15) * 100}%` }}
                className="h-full bg-slate-900 rounded-full shadow-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-end px-1">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Next LVL</span>
              <span className="text-[10px] font-black text-emerald-600 tabular-nums">{Math.round(levelProgress)}%</span>
            </div>
            <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100 shadow-inner-soft">
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
            disabled={isProcessing}
            className="w-full relative h-20 card hover:bg-slate-50 rounded-[28px] transition-all active:scale-[0.97] flex items-center justify-between px-8 group border-emerald-50 disabled:opacity-50 disabled:active:scale-100"
          >
            <div className="flex items-center gap-5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-xl shadow-emerald-500/30">
                {isProcessing ? <Loader2 size={22} className="animate-spin" /> : <Trophy size={22} fill="currentColor" />}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[12px] font-black text-slate-900 uppercase tracking-tight">Promotion Bonus</span>
                <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-[0.2em] mt-0.5">
                  {isProcessing ? 'Verifying Transaction...' : 'Reward Dispatch Pending'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-black text-emerald-600 text-[10px] tracking-[0.2em] uppercase">{isProcessing ? 'SYNCING' : 'CLAIM'}</span>
              <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center">
                {isProcessing ? <Loader2 size={12} className="text-emerald-500 animate-spin" /> : <ChevronRight size={14} className="text-emerald-500" />}
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Market Data */}
      <PepePriceTicker preferredCurrency={profile?.preferredCurrency} />
    </div>
  );
});

HomeTab.displayName = 'HomeTab';
