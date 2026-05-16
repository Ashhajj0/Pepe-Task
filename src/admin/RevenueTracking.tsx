import React, { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types';
import { 
  TrendingUp, Activity, DollarSign, 
  BarChart3, Globe, Zap, Target
} from 'lucide-react';
import { motion } from 'motion/react';

export const RevenueTracking: React.FC = () => {
  const [totalAds, setTotalAds] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      let count = 0;
      snap.docs.forEach(doc => {
        const data = doc.data() as UserProfile;
        count += (data.tasksCompleted || 0);
      });
      setTotalAds(count);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const epm = 2.00; // Expected Earnings per 1000 views
  const estimatedRevenue = (totalAds / 1000) * epm;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-slate-300 font-bold uppercase tracking-widest text-xs italic">Syncing Revenue Data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-black tracking-tighter uppercase italic">Earnings Overview</h2>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-1">GigaPub Real-time Monetization</p>
        </div>
        <div className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-emerald-100 shadow-sm shadow-emerald-100">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          Live Network Active
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-slate-900 rounded-[40px] p-12 text-white relative overflow-hidden shadow-2xl shadow-slate-200">
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -mr-48 -mt-48" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-12">
                <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md">
                  <DollarSign size={32} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Total Estimated Revenue</p>
                  <h3 className="text-6xl font-black tracking-tighter text-white italic">
                    ${estimatedRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-12 pt-12 border-t border-white/5">
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Network impressions</p>
                  <p className="text-3xl font-bold tabular-nums">{totalAds.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Avg. ePM Rate</p>
                  <p className="text-3xl font-bold tabular-nums text-emerald-400">${epm.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Device Distribution</h4>
              <div className="space-y-4">
                <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-600">
                  <span>Telegram Desktop</span>
                  <span>14%</span>
                </div>
                <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-[14%]" />
                </div>
                <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-600 pt-2">
                  <span>Telegram Mobile</span>
                  <span>86%</span>
                </div>
                <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[86%]" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm flex flex-col justify-between">
               <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Real-time Load</h4>
                  <p className="text-2xl font-black text-slate-900 tracking-tighter">99.9% UPTIME</p>
               </div>
               <div className="flex items-center gap-1.5 h-8">
                  {[...Array(20)].map((_, i) => (
                    <motion.div 
                      key={i}
                      animate={{ height: [10, 20, 15, 25, 10] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.05 }}
                      className="w-1 bg-emerald-100 rounded-full"
                    />
                  ))}
               </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm">
            <div className="p-3 bg-blue-50 text-blue-500 w-fit rounded-xl mb-6">
              <Globe size={20} />
            </div>
            <h4 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight italic">Traffic Source</h4>
            <p className="text-slate-400 text-xs font-medium leading-relaxed mb-6">
              Your revenue is primarily driven by direct organic traffic within the Telegram ecosystem.
            </p>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 italic text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Top Region: Worldwide (Mixed)
            </div>
          </div>

          <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm relative overflow-hidden group hover:border-emerald-200 transition-all">
             <motion.div 
               whileHover={{ scale: 1.1 }}
               className="absolute -right-10 -bottom-10 opacity-5 text-slate-900"
             >
                <Zap size={120} />
             </motion.div>
             <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-4">Pro Tip</h4>
             <p className="text-sm font-bold text-slate-900 leading-tight">
               Increase user engagement with "Power-ups" to boost impressions by 35% weekly.
             </p>
          </div>
          
          <div className="bg-emerald-600 rounded-[32px] p-8 text-white shadow-xl shadow-emerald-100">
             <Target size={32} className="mb-6 opacity-40 text-white" />
             <h4 className="text-lg font-black uppercase tracking-tight mb-2 italic">Next Milestone</h4>
             <p className="text-emerald-100 text-xs font-medium mb-8">Reach $100.00 estimated earnings for VIP network status.</p>
             <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-2">
                <div className="h-full bg-white" style={{ width: `${Math.min(estimatedRevenue, 100)}%` }} />
             </div>
             <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Status: {Math.max(0, 100 - estimatedRevenue).toFixed(2)} to go</p>
          </div>
        </div>
      </div>
    </div>
  );
};
