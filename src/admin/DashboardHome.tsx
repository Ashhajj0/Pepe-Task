import React, { useEffect, useState } from 'react';
import { AdminService } from './adminService';
import { 
  Users, TrendingUp, CreditCard, Clock, 
  ArrowUpRight, ArrowDownRight, Gem, Activity,
  Edit2
} from 'lucide-react';
import { motion } from 'motion/react';

interface Stats {
  totalUsers: number;
  pendingWithdrawalsAmount: number;
  totalWithdrawnAmount: number;
  completedWithdrawalsCount: number;
  totalAdsWatched: number;
}

export const DashboardHome: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubStats = AdminService.subscribeToDashboardStats((data) => {
      setStats(data);
      setLoading(false);
    });

    return () => unsubStats();
  }, []);

  const handleEditStat = async (title: string, currentValue: string) => {
    if (title === "Total Withdrawn" || title === "Total Ads Watched") {
      const field = title === "Total Withdrawn" ? "manualTotalWithdrawn" : "manualTotalAdsWatched";
      const newValStr = prompt(`Enter new value for ${title}:`, currentValue.replace(/,/g, '').replace(' PEPE', ''));
      if (newValStr !== null) {
        const newVal = parseFloat(newValStr);
        if (!isNaN(newVal)) {
          await AdminService.updateGlobalStats({ [field]: newVal });
        }
      }
    }
  };

  const StatCard = ({ title, value, icon, color }: any) => {
    const isEditable = title === "Total Withdrawn" || title === "Total Ads Watched";
    
    return (
      <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-100 transition-all group relative">
        <div className="flex justify-between items-start mb-6">
          <div className={`w-14 h-14 ${color} rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110`}>
            {icon}
          </div>
          {isEditable && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleEditStat(title, value);
              }}
              className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:bg-black hover:text-white transition-all shadow-sm"
              title={`Edit ${title}`}
            >
              <Edit2 size={14} />
            </button>
          )}
        </div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-slate-900 tracking-tight">{value}</h3>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-slate-300 font-bold uppercase tracking-widest">Loading Analytics...</div>
      </div>
    );
  }

  // GigaPub estimation: $0.002 per ad watch as a placeholder
  const estimatedGigaPubRevenue = (stats?.totalAdsWatched || 0) * 0.002;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-black tracking-tighter uppercase">Dashboard Overview</h2>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em] mt-1">Real-time Performance Monitor</p>
        </div>
        <div className="flex gap-3">
          <div className="px-4 py-2 bg-white border border-slate-200 rounded-xl flex items-center gap-2 text-xs font-bold text-emerald-500 shadow-sm">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span>REALTIME SYNC</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Users" 
          value={stats?.totalUsers.toLocaleString()} 
          icon={<Users size={24} />} 
          color="bg-blue-600"
        />
        <StatCard 
          title="Pending Payouts" 
          value={`${stats?.pendingWithdrawalsAmount.toLocaleString()} PEPE`} 
          icon={<Clock size={24} />} 
          color="bg-amber-500"
        />
        <StatCard 
          title="Total Withdrawn" 
          value={`${stats?.totalWithdrawnAmount.toLocaleString()} PEPE`} 
          icon={<CreditCard size={24} />} 
          color="bg-emerald-600"
        />
        <StatCard 
          title="Total Ads Watched" 
          value={stats?.totalAdsWatched.toLocaleString()} 
          icon={<Activity size={24} />} 
          color="bg-slate-900"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-900 rounded-[32px] p-10 text-white flex flex-col relative overflow-hidden shadow-2xl shadow-slate-200">
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl -mr-40 -mt-40" />
            
            <div className="flex items-center justify-between mb-12">
              <div className="p-3 bg-white/10 w-fit rounded-xl backdrop-blur-md border border-white/5">
                  <TrendingUp size={24} className="text-emerald-400" />
              </div>
              <div className="px-4 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-[10px] font-black tracking-widest text-emerald-400">
                GIGAPUB PARTNER
              </div>
            </div>
            
            <h3 className="text-4xl font-black mb-2 tracking-tighter uppercase italic">GigaPub Stats</h3>
            <p className="text-slate-400 text-sm mb-12 font-medium">Estimated ad revenue based on network impressions.</p>
            
            <div className="grid grid-cols-2 gap-10">
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Est. Earnings</p>
                <h4 className="text-5xl font-black text-emerald-400 tracking-tighter italic">
                  ${estimatedGigaPubRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h4>
              </div>
              <div className="border-l border-white/5 pl-10">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Total Impressions</p>
                <h4 className="text-3xl font-bold text-white tracking-tight">
                  {stats?.totalAdsWatched.toLocaleString()}
                </h4>
              </div>
            </div>

            <div className="mt-12 pt-8 border-t border-white/5">
               <div className="flex items-center gap-3">
                 <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Traffic Stream: Active</span>
               </div>
            </div>
        </div>

        <div className="bg-white rounded-[32px] border border-slate-100 p-10 shadow-sm flex flex-col justify-center">
            <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">Network Health</h3>
            <p className="text-slate-400 mb-10 font-medium">System performance and load distribution logs.</p>
            
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Active Database Connections</span>
                    <span className="text-sm font-black text-slate-900">100%</span>
                </div>
                <div className="h-2 bg-slate-50 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} className="h-full bg-emerald-500" />
                </div>
                
                <div className="flex justify-between items-center pt-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Ad Propagation Delay</span>
                    <span className="text-sm font-black text-slate-900">0.4ms</span>
                </div>
                <div className="h-2 bg-slate-50 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: '15%' }} className="h-full bg-blue-500" />
                </div>

                <div className="mt-8 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 leading-relaxed italic">
                    Note: Stats shown above represent all-time cumulative data aggregated from all nodes in the cloud protocol.
                  </p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

const ShieldIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
  </svg>
);
