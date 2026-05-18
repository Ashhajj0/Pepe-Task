import React, { useEffect, useState } from 'react';
import { AdminService } from './adminService';
import { 
  Users, TrendingUp, CreditCard, Clock, 
  ArrowUpRight, ArrowDownRight, Gem, Activity,
  Edit2, Settings, Plus, Link as LinkIcon, Save,
  AlertCircle, ShieldCheck, Trash2, CheckCircle2,
  XCircle, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TaskProtocol } from '../types';

interface Stats {
  totalUsers: number;
  pendingWithdrawalsAmount: number;
  totalWithdrawnAmount: number;
  completedWithdrawalsCount: number;
  totalAdsWatched: number;
}

export const DashboardHome: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [tasks, setTasks] = useState<TaskProtocol[]>([]);
  const [systemConfig, setSystemConfig] = useState<any>({});
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [dailyLimitInput, setDailyLimitInput] = useState<string>('');
  const [isUpdatingLimit, setIsUpdatingLimit] = useState(false);
  
  const [newTask, setNewTask] = useState({ name: '', reward: '', link: '' });
  const [isDeploying, setIsDeploying] = useState(false);
  
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', reward: '', link: '', status: 'active' as 'active' | 'paused' });

  useEffect(() => {
    const unsubStats = AdminService.subscribeToDashboardStats((data) => {
      setStats(data);
      setLoading(false);
    });

    const unsubTasks = AdminService.subscribeToTasks((data) => {
      setTasks(data);
    });

    const unsubConfig = AdminService.subscribeToSystemConfig((data) => {
      setSystemConfig(data);
      if (data.dailyLimit !== undefined) {
        setDailyLimitInput(data.dailyLimit.toString());
      }
    });

    return () => {
      unsubStats();
      unsubTasks();
      unsubConfig();
    };
  }, []);

  const handleUpdateDailyLimit = async () => {
    const limit = parseInt(dailyLimitInput);
    if (isNaN(limit) || limit < 0) return;
    
    setIsUpdatingLimit(true);
    try {
      await AdminService.updateDailyLimit(limit);
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdatingLimit(false);
    }
  };

  const handleDeployTask = async () => {
    if (!newTask.name || !newTask.reward || !newTask.link) return;
    
    setIsDeploying(true);
    try {
      await AdminService.addTask({
        name: newTask.name,
        reward: parseFloat(newTask.reward),
        link: newTask.link,
        status: 'active'
      });
      setNewTask({ name: '', reward: '', link: '' });
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeploying(false);
    }
  };

  const startEditing = (task: TaskProtocol) => {
    setEditingTaskId(task.id);
    setEditForm({
      name: task.name,
      reward: task.reward.toString() as any,
      link: task.link,
      status: task.status
    });
  };

  const handleUpdateTask = async () => {
    if (!editingTaskId) return;
    
    try {
      await AdminService.updateTask(editingTaskId, {
        name: editForm.name,
        reward: parseFloat(editForm.reward as any),
        link: editForm.link,
        status: editForm.status
      });
      setEditingTaskId(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (confirm('Are you sure you want to delete this task protocol?')) {
      await AdminService.deleteTask(id);
    }
  };

  const handleEditStat = async (title: string, currentValue: string) => {
    if (title === "Total Withdrawals" || title === "Total Ads Watched") {
      const field = title === "Total Withdrawals" ? "manualTotalWithdrawn" : "manualTotalAdsWatched";
      const newValStr = prompt(`Enter new value for ${title}:`, currentValue.replace(/,/g, '').replace(' PEPE', ''));
      if (newValStr !== null) {
        const newVal = parseFloat(newValStr);
        if (!isNaN(newVal)) {
          await AdminService.updateGlobalStats({ [field]: newVal });
        }
      }
    }
  };

  const formatValue = (num: number) => {
    if (num < 1000) return num.toLocaleString();
    if (num < 1000000) {
      const k = num / 1000;
      return (Math.floor(k * 10) / 10).toString().replace(/\.0$/, '') + 'K';
    }
    const m = num / 1000000;
    return (Math.floor(m * 10) / 10).toString().replace(/\.0$/, '') + 'M';
  };

  const StatCard = ({ title, value, icon, color }: any) => {
    const isEditable = title === "Total Withdrawals" || title === "Total Ads Watched";
    
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
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-black hover:text-white transition-all shadow-sm group/btn"
              title={`Edit ${title}`}
            >
              <Edit2 size={12} className="group-hover/btn:scale-110 transition-transform" />
              <span className="text-[9px] font-black uppercase tracking-widest">Adjust</span>
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
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="animate-pulse text-slate-300 font-bold uppercase tracking-widest">Loading Analytics...</div>
      </div>
    );
  }

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
          value={formatValue(stats?.pendingWithdrawalsAmount || 0)} 
          icon={<Clock size={24} />} 
          color="bg-amber-500"
        />
        <StatCard 
          title="Total Withdrawals" 
          value={formatValue(stats?.totalWithdrawnAmount || 0)} 
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
        {/* System Configuration */}
        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg">
                <Settings size={22} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">System Configuration</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5">Extraction Parameters</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-6 bg-slate-50 rounded-[28px] border border-slate-100 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-slate-900 shadow-sm">
                    <ShieldCheck size={18} />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-widest text-slate-900">Daily Extraction Limit</span>
                </div>
                <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-widest">
                  {systemConfig.dailyLimit ?? 'Not Set'}
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <input 
                    type="number" 
                    value={dailyLimitInput}
                    onChange={(e) => setDailyLimitInput(e.target.value)}
                    placeholder="Ads per day (e.g. 15)" 
                    className="w-full h-14 bg-white border border-slate-200 rounded-2xl px-6 text-sm font-bold focus:ring-2 focus:ring-slate-900 focus:outline-none transition-all placeholder:text-slate-300"
                  />
                </div>
                <button 
                  onClick={handleUpdateDailyLimit}
                  disabled={isUpdatingLimit}
                  className="h-14 px-8 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black active:scale-95 transition-all shadow-xl shadow-slate-200 flex items-center gap-3 disabled:opacity-50"
                >
                  {isUpdatingLimit ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Update
                </button>
              </div>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest px-1">
                <AlertCircle size={10} className="inline mr-1" />
                This limit resets globally for all users at 00:00 UTC
              </p>
            </div>
          </div>
        </div>

        {/* Task Protocol Deployment */}
        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                <Plus size={22} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Task Deployment</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5">Protocol Mission Control</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 italic">Mission Name</label>
                <input 
                  type="text" 
                  value={newTask.name}
                  onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                  placeholder="e.g. Join Official X" 
                  className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-5 text-xs font-bold focus:bg-white transition-all placeholder:text-slate-300"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 italic">PEPE Reward</label>
                <input 
                  type="number" 
                  value={newTask.reward}
                  onChange={(e) => setNewTask({ ...newTask, reward: e.target.value })}
                  placeholder="e.g. 5000" 
                  className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-5 text-xs font-bold focus:bg-white transition-all placeholder:text-slate-300"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 italic">Protocol Link (URL)</label>
              <div className="relative">
                <LinkIcon size={14} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" />
                <input 
                  type="url" 
                  value={newTask.link}
                  onChange={(e) => setNewTask({ ...newTask, link: e.target.value })}
                  placeholder="https://t.me/pepe_extraction" 
                  className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl pl-12 pr-5 text-xs font-bold focus:bg-white transition-all placeholder:text-slate-300"
                />
              </div>
            </div>
            <button 
              onClick={handleDeployTask}
              disabled={isDeploying || !newTask.name || !newTask.reward || !newTask.link}
              className="w-full h-14 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 active:scale-[0.98] transition-all shadow-xl shadow-emerald-100 mt-2 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isDeploying ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Deploy Task Protocol
            </button>
          </div>
        </div>
      </div>

      {/* Active Task Protocols */}
      <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg">
              <Activity size={22} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Active Task Protocols</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5">Live Operation Status ({tasks.length})</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Syncing with Mainnet</span>
          </div>
        </div>

        <div className="overflow-x-auto -mx-2 px-2">
          {tasks.length === 0 ? (
            <div className="py-20 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
                <Activity size={32} />
              </div>
              <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">No active protocols detected</p>
            </div>
          ) : (
            <table className="w-full border-separate border-spacing-y-4">
              <thead>
                <tr className="text-left">
                  <th className="px-6 pb-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 italic">Protocol ID</th>
                  <th className="px-6 pb-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 italic">Mission Designation</th>
                  <th className="px-6 pb-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 italic">Reward (PEPE)</th>
                  <th className="px-6 pb-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 italic">Status</th>
                  <th className="px-6 pb-2 text-right text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 italic">Operations</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id} className="group">
                    <td className="px-6 py-5 bg-slate-50/50 rounded-l-2xl border-y border-l border-slate-100 first:border-l">
                      <span className="font-mono text-[8px] font-bold text-slate-400">{task.id.substring(0, 8).toUpperCase()}</span>
                    </td>
                    <td className="px-6 py-5 bg-slate-50/50 border-y border-slate-100">
                      {editingTaskId === task.id ? (
                        <div className="space-y-2">
                          <input 
                            type="text" 
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1 text-xs font-bold"
                          />
                          <input 
                            type="url" 
                            value={editForm.link}
                            onChange={(e) => setEditForm({ ...editForm, link: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1 text-[10px] font-mono text-slate-500"
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-900 group-hover:scale-110 transition-transform shadow-sm">
                              <LinkIcon size={14} />
                            </div>
                            <span className="text-xs font-black text-slate-900 uppercase tracking-tight">{task.name}</span>
                          </div>
                          <span className="text-[8px] text-slate-400 font-mono truncate max-w-[200px] ml-11">{task.link}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-5 bg-slate-50/50 border-y border-slate-100">
                      {editingTaskId === task.id ? (
                        <input 
                          type="number" 
                          value={editForm.reward}
                          onChange={(e) => setEditForm({ ...editForm, reward: e.target.value as any })}
                          className="w-24 bg-white border border-slate-200 rounded-lg px-3 py-1 text-xs font-bold"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <Gem size={12} className="text-emerald-500" />
                          <span className="text-xs font-black text-emerald-600 tracking-tighter">{task.reward.toLocaleString()}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-5 bg-slate-50/50 border-y border-slate-100">
                      {editingTaskId === task.id ? (
                        <select 
                          value={editForm.status}
                          onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                          className="bg-white border border-slate-200 rounded-lg px-3 py-1 text-[10px] font-black uppercase"
                        >
                          <option value="active">Active</option>
                          <option value="paused">Paused</option>
                        </select>
                      ) : (
                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                          task.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                        }`}>
                          {task.status}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-5 bg-slate-50/50 rounded-r-2xl border-y border-r border-slate-100 text-right">
                    <div className="flex items-center justify-end gap-2">
                        {editingTaskId === task.id ? (
                          <>
                            <button 
                              onClick={handleUpdateTask}
                              className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all shadow-sm"
                            >
                              <Save size={14} />
                            </button>
                            <button 
                              onClick={() => setEditingTaskId(null)}
                              className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition-all shadow-sm"
                            >
                              <XCircle size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              onClick={() => startEditing(task)}
                              className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-slate-900 transition-all border border-transparent hover:border-slate-100"
                            >
                              <Edit2 size={14} />
                            </button>
                          </>
                        )}
                    </div>
                  </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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
