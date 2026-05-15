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
    <div className="px-6 py-10 space-y-10 min-h-full ambient-glow pb-36 no-scrollbar overflow-y-auto">
      <div>
        <h2 className="text-3xl font-black tracking-tighter text-slate-900 font-display uppercase italic">Wallet</h2>
        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mt-2 opacity-60">Digital Custody Protocol</p>
      </div>
      
      <div className="card rounded-[48px] p-12 text-center flex flex-col items-center relative overflow-hidden border-white/10 group">
        <div className="absolute top-0 right-0 p-12 opacity-[0.02] group-hover:opacity-[0.05] transition-all duration-1000 scale-150 rotate-12">
          <Wallet size={160} />
        </div>
        
        <div className="w-24 h-24 rounded-[36px] bg-slate-50 flex items-center justify-center mb-10 border border-slate-100/50 text-slate-300 shadow-inner-soft relative z-10 transition-transform group-hover:scale-105 duration-500">
          <Wallet size={42} />
        </div>
        
        <div className="flex flex-col mb-12 relative z-10">
          <span className="text-[12px] font-black text-slate-400 uppercase tracking-[0.4em] mb-6 text-center opacity-70">Secured Assets</span>
          <h2 className="text-6xl font-black tracking-tighter text-slate-900 mb-3 font-display">
            <Counter value={safeNumber(profile?.balance)} />
          </h2>
          <span className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.3em] bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100/50">
             {currencyDisplay.formatted}
          </span>
        </div>
        
        <button className="w-full h-18 bg-slate-900 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] active:scale-[0.97] transition-all shadow-2xl shadow-slate-300 hover:bg-slate-800">
          Sync Withdrawal
        </button>
      </div>
      
      <div className="glass p-7 rounded-[36px] border-white/70 shadow-xl shadow-slate-200/40 flex gap-8">
         <div className="flex-1 flex flex-col items-center">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em] mb-2 opacity-60">Network</span>
            <span className="text-[12px] font-black text-slate-900 uppercase font-display tracking-tight">Mainnet Protocol</span>
         </div>
         <div className="w-px h-12 bg-slate-200/40 self-center"></div>
         <div className="flex-1 flex flex-col items-center">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em] mb-2 opacity-60">Standard</span>
            <span className="text-[12px] font-black text-slate-900 uppercase font-display tracking-tight">BEP-20 / EVM</span>
         </div>
      </div>
      
      <div className="flex items-center justify-center gap-3.5 px-8 py-5 rounded-[24px] bg-white border-2 border-slate-50 border-dashed transition-colors hover:border-slate-100">
        <Info size={16} className="text-slate-300" />
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest opacity-80">Withdrawal min: 50,000 units</span>
      </div>

      <div className="space-y-6 pt-4">
         <div className="flex items-center gap-4 px-1">
           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Protocol Log</h4>
           <div className="h-px flex-1 bg-slate-100"></div>
         </div>
         <div className="space-y-4">
            <div className="card rounded-[32px] p-7 border-slate-50/50 flex items-center justify-between opacity-50 grayscale group hover:grayscale-0 hover:opacity-100 transition-all cursor-not-allowed">
               <div className="flex items-center gap-6">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 border border-slate-100/50">
                     <ArrowUpRight size={20} />
                  </div>
                  <div className="flex flex-col">
                     <span className="text-sm font-black text-slate-900 uppercase tracking-tight">External Dispatch</span>
                     <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Awaiting Verification</span>
                  </div>
               </div>
               <div className="text-right">
                 <span className="text-sm font-black text-slate-300 font-display">0.00</span>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
});

WalletTab.displayName = 'WalletTab';
