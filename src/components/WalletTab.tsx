import { motion } from 'motion/react';
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
    <motion.div key="wallet" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-5 pt-4 space-y-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight mb-1 font-display">Vault</h2>
        <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Asset Management</p>
      </div>
      
      <div className="relative group">
        <div className="absolute inset-0 bg-emerald-500/2 blur-[40px] rounded-full pointer-events-none"></div>
        <div className="relative glass rounded-[36px] p-8 border-white/5 text-center flex flex-col items-center shimmer bg-gradient-to-b from-white/[0.02] to-transparent">
          <div className="w-16 h-16 rounded-3xl glass flex items-center justify-center mb-6 border border-white/5 text-emerald-500 shadow-2xl">
            <Wallet size={32} />
          </div>
          <span className="text-[9px] text-zinc-600 font-black uppercase tracking-[0.4em] mb-3">Available Balance</span>
          <div className="flex flex-col mb-8">
            <span className="text-4xl font-black font-display tracking-tight text-white mb-2 block">
              <Counter value={safeNumber(profile?.balance)} />
            </span>
            <span className="text-[11px] font-bold text-zinc-500 mt-2 uppercase tracking-widest">
               {currencyDisplay.formatted}
            </span>
          </div>
          
          <button className="w-full h-14 bg-emerald-500 text-black rounded-[20px] font-black text-[11px] uppercase tracking-[0.2em] shadow-[0_15px_30px_rgba(16,185,129,0.15)] active:scale-95 transition-all mb-4">
            Withdraw Assets
          </button>
          
          <div className="flex gap-4 w-full px-2">
             <div className="flex-1 flex flex-col items-center">
                <span className="text-[7px] font-black text-zinc-700 uppercase tracking-widest mb-1">Method_Alpha</span>
                <span className="text-[9px] font-bold text-zinc-500">BSC Network</span>
             </div>
             <div className="w-px h-6 bg-white/5"></div>
             <div className="flex-1 flex flex-col items-center">
                <span className="text-[7px] font-black text-zinc-700 uppercase tracking-widest mb-1">Method_Beta</span>
                <span className="text-[9px] font-bold text-zinc-500">Binance ID</span>
             </div>
          </div>
        </div>
        <div className="mt-4 px-6 flex items-center justify-center gap-2">
          <Info size={10} className="text-zinc-700" />
          <span className="text-[8px] text-zinc-700 font-black uppercase tracking-widest">Minimum Threshold: 50,000 PEPE</span>
        </div>
      </div>

      <div className="space-y-4">
         <div className="flex items-center justify-between px-2">
           <h4 className="text-[9px] font-black text-zinc-700 uppercase tracking-[0.3em]">History</h4>
           <div className="h-px flex-1 bg-zinc-900/50 mx-4"></div>
         </div>
         <div className="flex flex-col gap-2">
           {[1,2].map(i => (
             <div key={i} className="glass rounded-[20px] p-4 border-white/5 flex items-center justify-between opacity-30">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center text-zinc-600">
                      <ArrowUpRight size={14} />
                   </div>
                   <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-zinc-500">PEPE_DISPATCH</span>
                      <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest">Processing...</span>
                   </div>
                </div>
                <span className="text-[10px] font-black text-zinc-600">0.00</span>
             </div>
           ))}
         </div>
      </div>
    </motion.div>
  );
});

WalletTab.displayName = 'WalletTab';
