import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, Info, Loader2, AlertCircle } from 'lucide-react';
import * as currencyService from '../services/currencyService';

import { POPULAR_CURRENCIES } from '../services/currencyService';

interface PepePrice {
  usd: number;
  usd_24h_change: number;
  targetPrice?: number;
  targetId?: string;
  targetSymbol?: string;
}

export function PepePriceTicker({ preferredCurrency = 'usd' }: { preferredCurrency?: string }) {
  const [priceData, setPriceData] = useState<PepePrice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const marketData = await currencyService.getLatestMarketData();
        
        // Use a more realistic fallback if the API is currently throttled
        const FAIR_PRICE = 0.0000105;
        
        let targetPrice = marketData?.pepe['usd'] || FAIR_PRICE;
        let targetId = 'usd';
        let targetSymbol = '$';

        if (preferredCurrency !== 'pepe' && marketData) {
           const p = marketData.pepe[preferredCurrency.toLowerCase()];
           if (p) {
             targetPrice = p;
             targetId = preferredCurrency;
             const currency = POPULAR_CURRENCIES.find(c => c.id === preferredCurrency);
             targetSymbol = currency?.symbol || preferredCurrency.toUpperCase();
           } else {
             // Fallback calculation
             const baseUSD = marketData.pepe['usd'] || FAIR_PRICE;
             targetPrice = await currencyService.getPepePriceIn(preferredCurrency) || baseUSD;
             targetId = preferredCurrency;
             const currency = POPULAR_CURRENCIES.find(c => c.id === preferredCurrency);
             targetSymbol = currency?.symbol || preferredCurrency.toUpperCase();
           }
        }

        setPriceData({
          usd: marketData?.pepe['usd'] || FAIR_PRICE,
          usd_24h_change: marketData?.usd_24h_change || 0,
          targetPrice,
          targetId,
          targetSymbol
        });
      } catch (err) {
        console.error('Failed to update PEPE price ticker:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, 5000); // 5s update for background ticker
    return () => clearInterval(interval);
  }, [preferredCurrency]);

  if (loading && !priceData) {
    return (
      <div className="px-5 py-8">
        <div className="glass rounded-[32px] p-8 border-white/5 flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">Synching Market Data...</span>
        </div>
      </div>
    );
  }

  if (!priceData && !loading) {
     return (
       <div className="px-5 py-8">
         <div className="glass rounded-[32px] p-8 border-white/5 flex flex-col items-center justify-center gap-2">
           <AlertCircle className="w-6 h-6 text-red-500/50" />
           <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest text-center px-4">Market feed temporarily offline. Retrying...</span>
         </div>
       </div>
     );
  }

  const isPositive = (priceData?.usd_24h_change ?? 0) >= 0;

  return (
    <div className="px-5 py-8 space-y-6">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">Market Intelligence</h3>
        <div className="h-px flex-1 bg-zinc-900/50 ml-4"></div>
      </div>

      <div className="card bg-white rounded-[32px] p-6 border-slate-100 relative overflow-hidden shadow-sm">
        <div className="absolute inset-0 bg-emerald-500/[0.02] pointer-events-none"></div>
        
        <div className="flex items-center justify-between mb-6 relative z-10">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base font-bold text-black leading-none">PEPE</h4>
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-100/50">
                  <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[8px] font-black text-emerald-500 uppercase tracking-tighter">Live Feed</span>
                </div>
              </div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 block font-mono">NET_ORACLE_V2</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-black font-sans tabular-nums leading-none tracking-tighter">
              {priceData?.targetSymbol ?? ''}{priceData?.targetPrice?.toFixed(8) ?? '0.00'}
            </div>
            <div className={`flex items-center justify-end gap-1 mt-1.5 ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
              {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              <span className="text-[9px] font-black font-mono">
                {isPositive ? '+' : ''}{(priceData?.usd_24h_change ?? 0).toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-4 relative z-10">
          <div className="h-px bg-slate-50 w-full"></div>
          
          <div className="flex gap-3">
            <div className="shrink-0 mt-0.5">
              <Info size={14} className="text-slate-300" />
            </div>
            <div className="space-y-2">
              <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                Global extraction benchmark. Market data synchronized with major liquidity pools.
              </p>
              <div className="flex gap-2">
                <span className="text-[8px] font-black text-slate-400 uppercase border border-slate-50 bg-slate-50 px-2 py-0.5 rounded-md">MAINNET</span>
                <span className="text-[8px] font-black text-emerald-600/60 uppercase border border-emerald-50 bg-emerald-50/50 px-2 py-0.5 rounded-md">VERIFIED</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="text-center pb-4 opacity-20">
         <span className="text-[8px] font-black text-zinc-700 uppercase tracking-[0.5em]">End of Protocol Feed</span>
      </div>
    </div>
  );
}
