import React, { useEffect, useState } from 'react';
import { AdminService } from './adminService';
import { safeDate } from '../lib/utils/firestore';
import { WithdrawalRequest, WithdrawalStatus } from '../types';
import { 
  Clock, CheckCircle2, XCircle, ChevronRight, 
  Wallet, CreditCard, MessageSquare, ExternalLink,
  History, AlertCircle, Loader2
} from 'lucide-react';

export const WithdrawalManagement: React.FC = () => {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = AdminService.subscribeToWithdrawals((data) => {
      setWithdrawals(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleStatusChange = async (id: string, currentStatus: WithdrawalStatus, newStatus: WithdrawalStatus) => {
    if (currentStatus === newStatus) return;
    if (newStatus === 'pending') return; // Cannot go back to pending via this UI

    setProcessingId(id);
    try {
      await AdminService.processWithdrawal(id, newStatus);
    } catch (e) {
      alert('Failed to update status');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Payout Queue</h2>
        <p className="text-slate-400 font-medium tracking-tight">Review and initialize user fund transfers</p>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">User Details</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Payout Amount</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Protocol Address</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Method</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-32 text-center">
                    <History size={48} className="mx-auto mb-4 opacity-10" />
                    <p className="text-xs font-bold text-slate-300 uppercase tracking-[0.2em]">Queue Empty</p>
                  </td>
                </tr>
              ) : (
                withdrawals.map((req) => (
                  <tr key={req.id} className="border-t border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="p-6">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">@{req.telegramUsername}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">ID: {req.userId}</span>
                      </div>
                    </td>
                    <td className="p-6">
                      <span className="text-lg font-black text-emerald-600 tabular-nums tracking-tight">
                        {req.amount?.toLocaleString()} PEPE
                      </span>
                    </td>
                    <td className="p-6">
                      <div 
                        onClick={() => {
                          navigator.clipboard.writeText(req.walletAddressOrBinanceId);
                          alert('Address copied to clipboard!');
                        }}
                        className="max-w-[200px] truncate bg-slate-50 px-3 py-2 rounded-lg text-xs font-mono font-medium text-slate-500 border border-slate-100 shadow-inner cursor-pointer hover:bg-slate-100 transition-colors" 
                        title="Click to copy address"
                      >
                        {req.walletAddressOrBinanceId}
                      </div>
                    </td>
                    <td className="p-6">
                      <span className="px-3 py-1 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest">
                        {req.withdrawalMethod}
                      </span>
                    </td>
                    <td className="p-6 text-right">
                      {processingId === req.id ? (
                        <Loader2 size={18} className="animate-spin text-slate-300 ml-auto" />
                      ) : (
                        <select 
                          value={req.status}
                          onChange={(e) => handleStatusChange(req.id!, req.status, e.target.value as WithdrawalStatus)}
                          disabled={req.status === 'completed' || req.status === 'rejected'}
                          className={`appearance-none px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all cursor-pointer outline-none shadow-sm ${
                            req.status === 'completed' 
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100 cursor-default' 
                              : req.status === 'rejected'
                                ? 'bg-red-50 text-red-500 border-red-100 cursor-default'
                                : 'bg-amber-50 text-amber-500 border-amber-100 hover:bg-black hover:text-white hover:border-black'
                          }`}
                        >
                          <option value="pending" disabled>Pending</option>
                          <option value="completed">Done</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
