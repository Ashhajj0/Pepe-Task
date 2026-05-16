import React, { useEffect, useState } from 'react';
import { AdminService } from './adminService';
import { 
  Users, TrendingUp, CreditCard, Clock, 
  ArrowUpRight, ArrowDownRight, Gem, Activity 
} from 'lucide-react';
import { motion } from 'motion/react';

interface Stats {
  totalUsers: number;
  totalBalance: number;
  pendingWithdrawalsAmount: number;
  totalWithdrawn: number;
  totalWithdrawalsCount: number;
}

export const DashboardHome: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await AdminService.getDashboardStats();
        setStats(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const StatCard = ({ title, value, icon, color, trend }: any) => (
    <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-100 transition-all group">
      <div className="flex justify-between items-start mb-6">
        <div className={`w-14 h-14 ${color} rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110`}>
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 ${trend > 0 ? 'text-emerald-500' : 'text-red-500'} font-bold text-xs`}>
            {trend > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">{title}</p>
      <h3 className="text-3xl font-bold text-slate-900 tracking-tight">{value}</h3>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-slate-300 font-bold uppercase tracking-widest">Loading Analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard Overview</h2>
          <p className="text-slate-400 font-medium">Real-time platform performance monitoring</p>
        </div>
        <div className="flex gap-3">
          <div className="px-4 py-2 bg-white border border-slate-200 rounded-xl flex items-center gap-2 text-xs font-bold text-slate-600">
            <Clock size={14} className="text-slate-300" />
            <span>Last 24h</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Registered" 
          value={stats?.totalUsers.toLocaleString()} 
          icon={<Users size={24} />} 
          color="bg-blue-500"
          trend={12}
        />
        <StatCard 
          title="System Balance" 
          value={`${stats?.totalBalance.toLocaleString()} PEPE`} 
          icon={<Gem size={24} />} 
          color="bg-emerald-500"
          trend={8}
        />
        <StatCard 
          title="Pending Output" 
          value={`${stats?.pendingWithdrawalsAmount.toLocaleString()} PEPE`} 
          icon={<CreditCard size={24} />} 
          color="bg-amber-500"
          trend={-3}
        />
        <StatCard 
          title="Total Disbursed" 
          value={`${stats?.totalWithdrawn.toLocaleString()} PEPE`} 
          icon={<Activity size={24} />} 
          color="bg-slate-900"
          trend={24}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-[32px] border border-slate-100 p-8">
            <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-bold text-slate-900">Recent Activity</h3>
                <button className="text-[10px] font-bold text-blue-500 uppercase tracking-widest hover:underline">View All</button>
            </div>
            <div className="space-y-6">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 group">
                        <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                            <TrendingUp size={20} />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-bold text-slate-900">New User Registered</p>
                            <p className="text-xs text-slate-400 font-medium">Telegram ID: 82910293 • 2 minutes ago</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-bold text-emerald-500">+1.2k PEPE</p>
                            <p className="text-[10px] text-slate-300 font-bold uppercase">Reward</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        <div className="bg-slate-900 rounded-[32px] p-8 text-white flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32" />
            
            <div className="mb-8 p-3 bg-white/10 w-fit rounded-xl backdrop-blur-md">
                <ShieldIcon size={24} />
            </div>
            
            <h3 className="text-2xl font-bold mb-2">System Integrity</h3>
            <p className="text-slate-400 text-sm mb-12">All servers operational. Node synchronization complete with 99.9% uptime.</p>
            
            <div className="mt-auto space-y-4">
                <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-500">
                    <span>Processing Power</span>
                    <span className="text-emerald-400">Stable</span>
                </div>
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '85%' }}
                        className="h-full bg-emerald-500"
                    />
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
