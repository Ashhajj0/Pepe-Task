import React, { useEffect, useState } from 'react';
import { AdminService } from './adminService';
import { UserProfile } from '../types';
import { db } from '../lib/firebase';
import { doc } from 'firebase/firestore';
import { 
  Search, Filter, Edit2, Ban, ShieldCheck, 
  ChevronLeft, ChevronRight, MoreHorizontal,
  Mail, MessageSquare, ExternalLink, X
} from 'lucide-react';
import { motion } from 'motion/react';

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

  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  const handleEditUser = (user: UserProfile) => {
    setEditingUser({ ...user });
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    try {
      const { id, ...data } = editingUser;
      await AdminService.updateUser(id!, data);
      setEditingUser(null);
      alert('User updated successfully');
    } catch (e) {
      alert('Failed to update user: ' + (e instanceof Error ? e.message : String(e)));
    }
  };

  const UserEditModal = () => {
    if (!editingUser) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-white">
                <Edit2 size={20} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Edit User Details</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">@{editingUser.username || 'unknown member'}</p>
              </div>
            </div>
            <button 
              onClick={() => setEditingUser(null)}
              className="p-3 hover:bg-slate-100 rounded-2xl text-slate-400 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Username (without @)</label>
                <input 
                  type="text"
                  value={editingUser.username || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                  className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-black outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Balance (PEPE)</label>
                <input 
                  type="number"
                  value={editingUser.balance || 0}
                  onChange={(e) => setEditingUser({ ...editingUser, balance: parseFloat(e.target.value) || 0 })}
                  className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-black outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Total Earned (All-time)</label>
                <input 
                  type="number"
                  value={editingUser.totalEarned || 0}
                  onChange={(e) => setEditingUser({ ...editingUser, totalEarned: parseFloat(e.target.value) || 0 })}
                  className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-black outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Total Referrals</label>
                <input 
                   type="number"
                   value={editingUser.totalReferrals || 0}
                   onChange={(e) => setEditingUser({ ...editingUser, totalReferrals: parseInt(e.target.value) || 0 })}
                   className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-black outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Referral Earnings (PEPE)</label>
                <input 
                  type="number"
                  value={editingUser.referralEarnings || 0}
                  onChange={(e) => setEditingUser({ ...editingUser, referralEarnings: parseFloat(e.target.value) || 0 })}
                  className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-black outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Total Ads Watched</label>
                <input 
                  type="number"
                  value={editingUser.tasksCompleted || 0}
                  onChange={(e) => setEditingUser({ ...editingUser, tasksCompleted: parseInt(e.target.value) || 0 })}
                  className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-black outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Daily Ad Count (0-15)</label>
                <input 
                  type="number"
                  value={editingUser.adsWatchedToday || 0}
                  onChange={(e) => setEditingUser({ ...editingUser, adsWatchedToday: parseInt(e.target.value) || 0 })}
                  className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-black outline-none transition-all"
                  max="15"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">User Level</label>
                <input 
                  type="number"
                  value={editingUser.level || 1}
                  onChange={(e) => setEditingUser({ ...editingUser, level: parseInt(e.target.value) || 1 })}
                  className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-black outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">User XP</label>
                <input 
                  type="number"
                  value={editingUser.xp || 0}
                  onChange={(e) => setEditingUser({ ...editingUser, xp: parseInt(e.target.value) || 0 })}
                  className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-black outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Pending Withdrawal Balance</label>
                <input 
                  type="number"
                  value={editingUser.pendingWithdrawalBalance || 0}
                  onChange={(e) => setEditingUser({ ...editingUser, pendingWithdrawalBalance: parseFloat(e.target.value) || 0 })}
                  className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-black outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Trust Score</label>
                <input 
                  type="number"
                  value={editingUser.trustScore || 0}
                  onChange={(e) => setEditingUser({ ...editingUser, trustScore: parseInt(e.target.value) || 0 })}
                  className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-black outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Current Status</label>
                <select 
                  value={editingUser.isBanned ? 'banned' : 'active'}
                  onChange={(e) => setEditingUser({ ...editingUser, isBanned: e.target.value === 'banned' })}
                  className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-black outline-none transition-all"
                >
                  <option value="active">Active</option>
                  <option value="banned">Banned</option>
                </select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Payment Address / Wallet ID</label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={editingUser.walletAddressOrBinanceId || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, walletAddressOrBinanceId: e.target.value })}
                    className="flex-1 h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-black outline-none transition-all"
                    placeholder="Enter wallet address or Binance ID"
                  />
                  <button 
                    onClick={() => {
                      if (editingUser.walletAddressOrBinanceId) {
                        navigator.clipboard.writeText(editingUser.walletAddressOrBinanceId);
                        alert('Address copied!');
                      }
                    }}
                    className="px-4 bg-slate-100 rounded-xl text-slate-500 hover:bg-slate-200 transition-colors"
                    title="Copy to clipboard"
                    type="button"
                  >
                    <ExternalLink size={18} />
                  </button>
                </div>
              </div>

              <div className="md:col-span-2 pt-4">
                <button 
                  onClick={() => {
                    if (confirm(`CRITICAL: Are you sure you want to PERMANENTLY DELETE @${editingUser.username}? This data will be gone forever.`)) {
                      AdminService.deleteUser(editingUser.id!);
                      setEditingUser(null);
                    }
                  }}
                  className="w-full h-12 bg-red-50 text-red-500 border border-red-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-sm"
                >
                  Permanently Delete User
                </button>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 grid grid-cols-2 gap-4">
              <button 
                onClick={() => setEditingUser(null)}
                className="h-14 rounded-2xl border border-slate-200 text-xs font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveUser}
                className="h-14 rounded-2xl bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-slate-800 shadow-xl shadow-black/10 transition-all"
              >
                Save Changes
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  };

  const handleDeleteUser = (user: UserProfile) => {
    if (confirm(`CRITICAL: Are you sure you want to PERMANENTLY DELETE @${user.username}? This cannot be undone.`)) {
      AdminService.deleteUser(user.id!);
    }
  };

  const handleToggleBan = (user: UserProfile) => {
    if (confirm(`Are you sure you want to ${user.isBanned ? 'unban' : 'ban'} @${user.username}?`)) {
      AdminService.setBanStatus(user.id!, !user.isBanned);
    }
  };

  const handleAddUser = async () => {
    const telegramId = prompt('Enter Telegram ID:');
    if (!telegramId) return;
    const username = prompt('Enter Username (without @):');
    if (!username) return;
    const balance = parseFloat(prompt('Enter initial balance:', '0') || '0');
    
    try {
      // In AdminService we should have an addUser or similar
      const userRef = doc(db, 'users', telegramId);
      const { setDoc, serverTimestamp } = await import('firebase/firestore');
      await setDoc(userRef, {
        telegramId: parseInt(telegramId),
        username,
        balance,
        totalReferrals: 0,
        level: 1,
        tasksCompleted: 0,
        lastLogin: serverTimestamp(),
        createdAt: serverTimestamp(),
        isBanned: false
      });
      alert('User added successfully');
      AdminService.logAction('ADD_USER_MANUAL', telegramId, { username, balance });
    } catch (e) {
      alert('Failed to add user: ' + (e instanceof Error ? e.message : String(e)));
    }
  };

  return (
    <div className="space-y-8">
      <UserEditModal />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Users Management</h2>
          <p className="text-slate-400 font-medium">Manage player accounts and balances</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleAddUser}
            className="h-12 px-6 bg-black text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2"
          >
            <ShieldCheck size={18} />
            Add User
          </button>
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
                  <tr 
                    key={user.id} 
                    onClick={() => handleEditUser(user)}
                    className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group cursor-pointer"
                  >
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
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleEditUser(user)}
                          className="p-2 bg-slate-900 text-white rounded-lg transition-all hover:bg-black shadow-sm"
                          title="Edit User"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleToggleBan(user)}
                          className={`p-2 rounded-lg transition-all border ${user.isBanned ? 'text-emerald-500 border-emerald-100 hover:bg-emerald-50' : 'text-red-400 border-red-100 hover:bg-red-50'}`}
                          title={user.isBanned ? 'Unban' : 'Ban'}
                        >
                          <Ban size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user)}
                          className="p-2 border border-red-100 hover:bg-red-500 hover:text-white rounded-lg transition-all text-red-300"
                          title="Delete Permanently"
                        >
                          <X size={16} />
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
