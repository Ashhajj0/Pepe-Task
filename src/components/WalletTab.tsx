import { memo, useState } from 'react';
import { UserProfile } from '../types';
import { Counter } from './UIElements';
import { Wallet, Info, ArrowUpRight, Gem, History } from 'lucide-react';
import { safeNumber } from '../lib/utils/firestore';
import { WithdrawalModal } from './WithdrawalModal';

interface WalletTabProps {
  profile: UserProfile | null;
  currencyDisplay: { formatted: string };
  updateProfile: () => void;
}

export const WalletTab = memo(({ profile, currencyDisplay, updateProfile }: WalletTabProps) => {
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);

  return (
    <div className="px-6 py-6 space-y-6 bg-slate-50/30">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em]">Portfolio Overview</h2>
        <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest opacity-60 italic">Secured Data Node</p>
      </div>
      
      <div className="bg-white rounded-[24px] p-8 border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="flex flex-col relative z-10">
          <div className="flex justify-between items-start mb-10">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Assets</span>
              <h2 className="text-4xl font-bold text-black tracking-tighter">
                <Counter value={safeNumber(profile?.balance)} />
              </h2>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 text-slate-900 shadow-sm">
              <Wallet size={18} />
            </div>
          </div>

          <div className="flex items-center justify-between mb-8 pb-8 border-b border-slate-50">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Estimated Value</span>
              <span className="text-sm font-bold text-emerald-600 tracking-tight">{currencyDisplay.formatted}</span>
            </div>
            <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100/50">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[9px] font-bold text-emerald-700 uppercase">Live Rates</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => setIsWithdrawalModalOpen(true)}
              className="flex-1 h-12 bg-black text-white rounded-xl font-bold text-[10px] uppercase tracking-widest active:scale-[0.98] transition-all shadow-md shadow-slate-100 hover:bg-slate-800"
            >
              Withdraw
            </button>
            <button 
              onClick={() => setIsWithdrawalModalOpen(true)}
              className="flex-1 h-12 bg-white text-slate-900 border border-slate-200 rounded-xl font-bold text-[10px] uppercase tracking-widest active:scale-[0.98] transition-all hover:bg-slate-50"
            >
              History
            </button>
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Digital Assets</h4>
        </div>
        <div className="bg-white rounded-[20px] border border-slate-100 divide-y divide-slate-50 overflow-hidden">
          <div className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100/50">
                <Gem size={14} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-900">PEPE Credits</span>
                <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Mainnet Token</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold text-slate-900"><Counter value={safeNumber(profile?.balance)} /></div>
              <div className="text-[8px] text-emerald-500 font-bold uppercase">{currencyDisplay.formatted}</div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 border-dashed flex items-center gap-3">
        <Info size={14} className="text-slate-300" />
        <p className="text-[8px] text-slate-500 font-medium leading-relaxed uppercase tracking-wider">
          Node synchronized with blockchain data. Minimum withdrawal threshold: 8,000 PEPE. Withdrawals are processed manually within 24 hours.
        </p>
      </div>

      <WithdrawalModal 
        isOpen={isWithdrawalModalOpen}
        onClose={() => setIsWithdrawalModalOpen(false)}
        profile={profile}
        onSuccess={updateProfile}
      />
    </div>
  );
});

WalletTab.displayName = 'WalletTab';
