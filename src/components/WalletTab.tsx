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
        <h2 className="text-xl font-black tracking-tighter text-slate-900 font-sans uppercase italic">Asset Wallet</h2>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 opacity-60">Digital Custody</p>
      </div>
      
      <div className="card rounded-[32px] p-6 relative overflow-hidden border-white/40 shadow-sm bg-gradient-to-br from-white via-slate-50 to-emerald-50/10">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] rotate-12">
          <Wallet size={120} />
        </div>
        
        <div className="flex flex-col relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-slate-100 text-slate-400 shadow-sm">
              <Wallet size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Net Worth</span>
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-tight mt-1">{currencyDisplay.formatted}</span>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-4xl font-black text-slate-900 font-sans tracking-tighter mb-1">
              <Counter value={safeNumber(profile?.balance)} />
            </h2>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">PEPE Credits</span>
          </div>
          
          <button className="w-full h-12 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-[0.98] transition-all shadow-md shadow-slate-100 hover:bg-slate-800">
            Request Sync
          </button>
        </div>
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
