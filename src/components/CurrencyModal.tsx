import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, Check, Globe, Zap } from 'lucide-react';
import { POPULAR_CURRENCIES, Currency } from '../services/currencyService';

interface CurrencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCurrency: string;
  onSelect: (currencyId: string) => void;
}

export function CurrencyModal({ isOpen, onClose, selectedCurrency, onSelect }: CurrencyModalProps) {
  const [search, setSearch] = useState('');
  const [currencies, setCurrencies] = useState<Currency[]>(POPULAR_CURRENCIES);

  const filtered = currencies.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
          />
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[40px] border-t border-slate-100 z-[101] max-h-[85vh] flex flex-col shadow-2xl"
          >
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">Display Currency</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Select balance unit</p>
                </div>
                <button 
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 active:scale-90 transition-transform"
                >
                  <X size={18} className="text-slate-400" />
                </button>
              </div>

              <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input 
                  type="text"
                  placeholder="Search currency..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-slate-900 text-sm font-bold focus:outline-none focus:border-slate-300 transition-all placeholder:text-slate-300"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-12 space-y-2 no-scrollbar">
              {filtered.map((currency) => (
                <button
                  key={currency.id}
                  onClick={() => {
                    onSelect(currency.id);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all active:scale-[0.98] ${
                    selectedCurrency === currency.id 
                    ? 'bg-slate-900 border-slate-900' 
                    : 'bg-white border-slate-100 hover:bg-slate-50 shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black border ${
                      selectedCurrency === currency.id 
                      ? 'bg-white/10 text-white border-white/10' 
                      : 'bg-slate-50 text-slate-400 border-slate-100'
                    }`}>
                      {currency.symbol}
                    </div>
                    <div className="text-left">
                      <div className={`text-sm font-black leading-none ${selectedCurrency === currency.id ? 'text-white' : 'text-slate-900'}`}>{currency.name}</div>
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5 flex items-center gap-2">
                        {currency.id.toUpperCase()}
                        <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                        {currency.type === 'fiat' ? (
                          <span className="flex items-center gap-1">Global Fiat</span>
                        ) : (
                          <span className="flex items-center gap-1 text-emerald-600">Digital Asset</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {selectedCurrency === currency.id && (
                    <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
                      <Check size={14} className="text-slate-900" strokeWidth={3} />
                    </div>
                  )}
                </button>
              ))}

              {filtered.length === 0 && (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 mx-auto">
                    <Search size={20} className="text-slate-200" />
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Currency not found</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
