import React, { useEffect, useState } from 'react';
import { AdminService } from './adminService';
import { UserProfile } from '../types';
import { 
  Search, Filter, Edit2, Ban, ShieldCheck, 
  ChevronLeft, ChevronRight, MoreHorizontal,
  Mail, MessageSquare, ExternalLink
} from 'lucide-react';

export const UsersManagement: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = AdminService.subscribeToUsers((data) => {
      setUsers(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredUsers = users.filter(u => 
    u.username?.toLowerCase().includes(search.toLowerCase()) || 
    u.telegramId?.toString().includes(search)
  );

  const handleUpdateBalance = (userId: string, current: number) => {
    const val = prompt('Enter new balance:', current.toString());
    if (val !== null) {
      const num = parseFloat(val);
      if (!isNaN(num)) {
        AdminService.updateUserBalance(userId, num);
      }
    }
  };

  const handleToggleBan = (user: UserProfile) => {
    if (confirm(`Are you sure you want to ${user.isBanned ? 'unban' : 'ban'} @${user.username}?`)) {
      AdminService.setBanStatus(user.telegramId!.toString(), !user.isBanned);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Users Management</h2>
          <p className="text-slate-400 font-medium">Manage player accounts and balances</p>
        </div>
        
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input 
              type="text"
              placeholder="Search by username or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-12 bg-white border border-slate-200 rounded-xl pl-12 pr-6 text-sm font-medium w-full sm:w-64 focus:ring-2 focus:ring-black outline-none transition-all"
            />
          </div>
          <button className="h-12 w-12 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-colors">
            <Filter size={18} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-50">
                <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">User Profile</th>
                <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Balance</th>
                <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stats</th>
                <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-20 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-20">
                      <Search size={48} />
                      <p className="text-sm font-bold uppercase tracking-widest">No users found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 border border-slate-100 shadow-sm">
                          {user.photo_url ? (
                            <img src={user.photo_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-400">
                              <Search size={20} />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">@{user.username || 'unknown'}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">ID: {user.telegramId}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-black">{user.balance?.toLocaleString()} PEPE</span>
                        <span className="text-[9px] font-bold text-amber-500 uppercase">Pending: {user.pendingWithdrawalBalance?.toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex gap-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Referrals</span>
                          <span className="text-xs font-bold text-slate-900">{user.totalReferrals || 0}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Lvl</span>
                          <span className="text-xs font-bold text-slate-900">{user.level || 1}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <span className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider ${
                        user.isBanned 
                          ? 'bg-red-50 text-red-500 border border-red-100' 
                          : 'bg-emerald-50 text-emerald-500 border border-emerald-100'
                      }`}>
                        {user.isBanned ? 'Banned' : 'Active'}
                      </span>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleUpdateBalance(user.telegramId!.toString(), user.balance || 0)}
                          className="p-2 hover:bg-black hover:text-white rounded-lg transition-all text-slate-400"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleToggleBan(user)}
                          className={`p-2 rounded-lg transition-all ${user.isBanned ? 'text-emerald-500 hover:bg-emerald-50' : 'text-red-400 hover:bg-red-50'}`}
                        >
                          <Ban size={16} />
                        </button>
                        <button className="p-2 hover:bg-slate-100 rounded-lg transition-all text-slate-400">
                          <MoreHorizontal size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-6 flex items-center justify-between border-t border-slate-50 bg-slate-50/30">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Showing {filteredUsers.length} of {users.length} users
          </p>
          <div className="flex gap-2">
            <button className="h-10 w-10 border border-slate-200 rounded-xl flex items-center justify-center text-slate-300 hover:text-black transition-colors">
              <ChevronLeft size={18} />
            </button>
            <button className="h-10 w-10 border border-slate-200 rounded-xl flex items-center justify-center text-slate-300 hover:text-black transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
