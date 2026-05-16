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

  const handleAction = async (id: string, status: WithdrawalStatus) => {
    // Note: status 'pending' is start state, 'approved', 'rejected', 'completed' are actions
    if (status === 'pending') return; 

    let note = '';
    if (status === 'rejected') {
      note = prompt('Reason for rejection:') || 'Rejected by admin';
    } else if (status === 'approved') {
      note = 'Request approved for processing';
    } else if (status === 'completed') {
      note = 'Withdrawal amount sent to wallet';
    }

    setProcessingId(id);
    try {
      if (status === 'approved' || status === 'rejected' || status === 'completed') {
        await AdminService.processWithdrawal(id, status, note);
      }
    } catch (e) {
      alert('Failed to process withdrawal');
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusColor = (status: WithdrawalStatus) => {
    switch (status) {
      case 'pending': return 'bg-amber-50 text-amber-500 border-amber-100';
      case 'approved': return 'bg-blue-50 text-blue-500 border-blue-100';
      case 'completed': return 'bg-emerald-50 text-emerald-500 border-emerald-100';
      case 'rejected': return 'bg-red-50 text-red-500 border-red-100';
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Withdrawal Requests</h2>
        <p className="text-slate-400 font-medium">Verify and process payout requests</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {withdrawals.length === 0 ? (
          <div className="col-span-full py-32 flex flex-col items-center justify-center opacity-20">
            <History size={64} className="mb-4" />
            <p className="text-xl font-bold uppercase tracking-widest">No requests found</p>
          </div>
        ) : (
          withdrawals.map((req) => (
            <div key={req.id} className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm hover:shadow-xl hover:shadow-slate-100 transition-all flex flex-col gap-6 group">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                    {req.withdrawalMethod === 'BEP20' ? <Wallet size={24} /> : <CreditCard size={24} />}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                        @{req.telegramUsername}
                        {req.status === 'completed' && <CheckCircle2 size={16} className="text-emerald-500" />}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID: {req.userId}</p>
                  </div>
                </div>
                <div className={`px-4 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest ${getStatusColor(req.status)}`}>
                  {req.status}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex flex-col gap-1">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Requested Amount</p>
                  <p className="text-lg font-bold text-black">{req.amount?.toLocaleString()} PEPE</p>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Method</p>
                  <p className="text-sm font-bold text-slate-700">{req.withdrawalMethod}</p>
                </div>
                <div className="col-span-2 flex flex-col gap-1 mt-2">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{req.withdrawalMethod === 'BEP20' ? 'Wallet Address' : 'Binance ID'}</p>
                  <p className="text-xs font-mono font-bold text-slate-500 break-all bg-white p-3 rounded-lg border border-slate-100">{req.walletAddressOrBinanceId}</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-300">
                  <Clock size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-tight">
                    {safeDate(req.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="flex gap-2">
                  {req.status === 'pending' && (
                    <>
                      <button 
                        disabled={processingId === req.id}
                        onClick={() => handleAction(req.id!, 'rejected')}
                        className="h-10 px-4 bg-white border border-red-100 text-red-500 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
                      >
                        Reject
                      </button>
                      <button 
                        disabled={processingId === req.id}
                        onClick={() => handleAction(req.id!, 'approved')}
                        className="h-10 px-4 bg-blue-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
                      >
                        Approve
                      </button>
                    </>
                  )}

                  {req.status === 'approved' && (
                    <button 
                      disabled={processingId === req.id}
                      onClick={() => handleAction(req.id!, 'completed')}
                      className="h-10 px-6 bg-emerald-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      {processingId === req.id ? <Loader2 size={14} className="animate-spin" /> : <ChevronRight size={14} />}
                      Mark Completed
                    </button>
                  )}
                </div>
              </div>

              {req.adminNote && (
                <div className="pt-4 border-t border-slate-50 flex items-start gap-2">
                    <MessageSquare size={14} className="text-slate-300 mt-0.5" />
                    <p className="text-[10px] font-medium text-slate-500 italic">"{req.adminNote}"</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
