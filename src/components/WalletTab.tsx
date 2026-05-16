import { memo } from 'react';
import { UserProfile } from '../types';
import { Counter } from './UIElements';
import { Wallet, Info, ArrowUpRight } from 'lucide-react';
import { safeNumber } from '../lib/utils/firestore';

interface WalletTabProps {
  profile: UserProfile | null;
  currencyDisplay: { formatted: string };
}

export const WalletTab = memo(({ profile, currencyDisplay }: WalletTabProps) => {
  return (
    <div className="px-6 py-6 space-y-8 min-h-full ambient-glow pb-32 no-scrollbar overflow-y-auto">
      <div>
        <h2 className="text-2xl font-black tracking-tight text-slate-900 font-display uppercase italic">Wallet</h2>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 opacity-60">Digital Assets</p>
      </div>
      
      <div className="card rounded-[32px] p-8 text-center flex flex-col items-center relative overflow-hidden border-white/20">
        <div className="w-16 h-16 rounded-[24px] bg-slate-50 flex items-center justify-center mb-6 border border-slate-100 text-slate-300 shadow-inner-soft">
          <Wallet size={28} />
        </div>
        
        <div className="flex flex-col mb-8 relative z-10 text-center">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3">Balance</span>
          <h2 className="text-4xl font-black text-slate-900 mb-2 font-display">
            <Counter value={safeNumber(profile?.balance)} />
          </h2>
          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100/30 w-fit mx-auto">
             {currencyDisplay.formatted}
          </span>
        </div>
        
        <button className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-[0.98] transition-all shadow-lg shadow-slate-200">
          Sync Withdrawal
        </button>
      </div>
      
      <div className="glass p-6 rounded-[28px] border-white/60 shadow-sm flex gap-6">
         <div className="flex-1 flex flex-col items-center">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 opacity-60">Network</span>
            <span className="text-[11px] font-black text-slate-900 uppercase font-display">Mainnet</span>
         </div>
         <div className="w-px h-10 bg-slate-200/50 self-center"></div>
         <div className="flex-1 flex flex-col items-center">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 opacity-60">Standard</span>
            <span className="text-[11px] font-black text-slate-900 uppercase font-display">BEP-20</span>
         </div>
      </div>
      
      <div className="flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-white border border-slate-100 border-dashed">
        <Info size={14} className="text-slate-200" />
        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Min. Withdrawal 50,000 units</span>
      </div>

      <div className="space-y-4 pt-2">
         <div className="flex items-center gap-3 px-1">
           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recent Activity</h4>
           <div className="h-px flex-1 bg-slate-100"></div>
         </div>
         <div className="space-y-3">
            <div className="card rounded-[24px] p-5 border-slate-50/50 flex items-center justify-between opacity-50 grayscale group">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100/50">
                     <ArrowUpRight size={18} />
                  </div>
                  <div className="flex flex-col">
                     <span className="text-xs font-black text-slate-900 uppercase">External Withdrawal</span>
                     <span className="text-[8px] font-bold text-slate-400 uppercase mt-0.5 tracking-widest">No History</span>
                  </div>
               </div>
               <span className="text-xs font-black text-slate-300 font-display">0.00</span>
            </div>
         </div>
      </div>
    </div>
  );
});

WalletTab.displayName = 'WalletTab';
