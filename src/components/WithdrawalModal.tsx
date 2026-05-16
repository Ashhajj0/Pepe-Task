import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Wallet, CreditCard, ChevronRight, AlertCircle, CheckCircle2, History, Clock, Info } from 'lucide-react';
import { UserProfile, WithdrawalRequest, WithdrawalStatus } from '../types';
import { WithdrawalService } from '../services/withdrawalService';
import { Counter } from './UIElements';
import { safeNumber } from '../lib/utils/firestore';

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile | null;
  onSuccess: () => void;
}

export const WithdrawalModal: React.FC<WithdrawalModalProps> = ({ isOpen, onClose, profile, onSuccess }) => {
  const [amount, setAmount] = useState<string>('');
  const [method, setMethod] = useState<'BEP20' | 'BinanceID'>('BEP20');
  const [walletInfo, setWalletInfo] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [history, setHistory] = useState<WithdrawalRequest[]>([]);
  const [view, setView] = useState<'form' | 'history'>('form');

  useEffect(() => {
    if (isOpen && profile?.telegramId) {
      fetchHistory();
    }
  }, [isOpen, profile?.telegramId]);

  const fetchHistory = async () => {
    if (!profile?.telegramId) return;
    const data = await WithdrawalService.getHistory(profile.telegramId.toString());
    setHistory(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.telegramId) return;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 8000) {
      setError('Minimum withdrawal is 8,000 PEPE');
      return;
    }

    if (numAmount > (profile.balance || 0)) {
      setError('Insufficient balance');
      return;
    }

    if (!walletInfo.trim()) {
      setError('Wallet information is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await WithdrawalService.submitRequest(profile.telegramId.toString(), {
        telegramUsername: profile.username || 'unknown',
        withdrawalMethod: method,
        walletAddressOrBinanceId: walletInfo,
        amount: numAmount
      });
      setSuccess(true);
      onSuccess();
      fetchHistory();
      setTimeout(() => {
        setSuccess(false);
        setAmount('');
        setWalletInfo('');
        setView('history');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: WithdrawalStatus) => {
    switch (status) {
      case 'pending': return 'text-amber-500 bg-amber-50';
      case 'approved': return 'text-blue-500 bg-blue-50';
      case 'completed': return 'text-emerald-500 bg-emerald-50';
      case 'rejected': return 'text-red-500 bg-red-50';
      default: return 'text-slate-500 bg-slate-50';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md bg-white rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-50">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setView('form')}
                  className={`text-sm font-bold uppercase tracking-tight py-2 px-3 rounded-lg transition-colors ${view === 'form' ? 'text-black bg-slate-50' : 'text-slate-400'}`}
                >
                  Withdraw
                </button>
                <button 
                  onClick={() => setView('history')}
                  className={`text-sm font-bold uppercase tracking-tight py-2 px-3 rounded-lg transition-colors ${view === 'history' ? 'text-black bg-slate-50' : 'text-slate-400'}`}
                >
                  History
                </button>
              </div>
              <button 
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {view === 'form' ? (
                <>
                  <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 flex items-start gap-3">
                    <Info size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                    <p className="text-[10px] text-emerald-800 font-medium leading-relaxed uppercase tracking-wider">
                      Withdrawals are manually reviewed and processed within 24 hours. Minimum amount: 8,000 PEPE.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Withdrawal Amount</label>
                      <div className="relative">
                        <input 
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="Min 8000"
                          className="w-full h-14 bg-slate-50 border-none rounded-2xl px-6 text-lg font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-black transition-all"
                        />
                        <button 
                          type="button"
                          onClick={() => setAmount(profile?.balance?.toString() || '0')}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-600 uppercase bg-emerald-50 px-2 py-1 rounded"
                        >
                          Max
                        </button>
                      </div>
                      <div className="flex justify-between px-1">
                        <span className="text-[9px] text-slate-400 font-bold uppercase">Available: {profile?.balance?.toLocaleString()} PEPE</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Withdrawal Method</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          type="button"
                          onClick={() => setMethod('BEP20')}
                          className={`h-14 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all ${method === 'BEP20' ? 'border-black bg-black text-white' : 'border-slate-100 bg-slate-50 text-slate-400'}`}
                        >
                          <Wallet size={16} />
                          <span className="text-[9px] font-bold uppercase tracking-tight">BEP20 Wallet</span>
                        </button>
                        <button 
                          type="button"
                          onClick={() => setMethod('BinanceID')}
                          className={`h-14 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all ${method === 'BinanceID' ? 'border-black bg-black text-white' : 'border-slate-100 bg-slate-50 text-slate-400'}`}
                        >
                          <CreditCard size={16} />
                          <span className="text-[9px] font-bold uppercase tracking-tight">Binance ID</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                        {method === 'BEP20' ? 'Wallet Address' : 'Binance UID'}
                      </label>
                      <input 
                        type="text"
                        value={walletInfo}
                        onChange={(e) => setWalletInfo(e.target.value)}
                        placeholder={method === 'BEP20' ? '0x...' : 'Binance ID'}
                        className="w-full h-14 bg-slate-50 border-none rounded-2xl px-6 text-sm font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-black transition-all"
                      />
                    </div>

                    {error && (
                      <div className="p-3 bg-red-50 rounded-xl flex items-center gap-3 text-red-600">
                        <AlertCircle size={16} />
                        <span className="text-[10px] font-bold uppercase tracking-tight">{error}</span>
                      </div>
                    )}

                    {success && (
                      <div className="p-3 bg-emerald-50 rounded-xl flex items-center gap-3 text-emerald-600">
                        <CheckCircle2 size={16} />
                        <span className="text-[10px] font-bold uppercase tracking-tight">Request Submitted!</span>
                      </div>
                    )}

                    <button 
                      type="submit"
                      disabled={loading || success}
                      className="w-full h-14 bg-black text-white rounded-2xl font-bold uppercase tracking-widest disabled:opacity-50 active:scale-[0.98] transition-all shadow-xl shadow-slate-200"
                    >
                      {loading ? 'Processing...' : 'Submit Request'}
                    </button>
                  </form>
                </>
              ) : (
                <div className="space-y-4">
                  {history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 opacity-30">
                      <History size={48} className="mb-4" />
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em]">No history found</p>
                    </div>
                  ) : (
                    history.map((req) => (
                      <div key={req.id} className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
                        <div className="flex justify-between items-start">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-black">{req.amount.toLocaleString()} PEPE</span>
                            <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">{req.withdrawalMethod} • {req.walletAddressOrBinanceId.slice(0, 6)}...{req.walletAddressOrBinanceId.slice(-4)}</span>
                          </div>
                          <span className={`text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded-md ${getStatusColor(req.status)}`}>
                            {req.status === 'pending' ? 'Pending Review' : req.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                          <div className="flex items-center gap-1.5">
                            <Clock size={10} className="text-slate-300" />
                            <span className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">
                              {req.createdAt?.toDate ? req.createdAt.toDate().toLocaleString() : new Date(req.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <span className="text-[8px] text-slate-300 font-bold uppercase italic">Processed within 24h</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
