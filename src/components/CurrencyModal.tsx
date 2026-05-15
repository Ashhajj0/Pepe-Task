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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 glass rounded-t-[40px] border-t border-white/10 z-[101] max-h-[85vh] flex flex-col"
          >
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-white tracking-tight">Display Currency</h2>
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-1">Select balance unit</p>
                </div>
                <button 
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/5 active:scale-90 transition-transform"
                >
                  <X size={18} className="text-zinc-400" />
                </button>
              </div>

              <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input 
                  type="text"
                  placeholder="Search currency..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder:text-zinc-600"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-12 space-y-2">
              {filtered.map((currency) => (
                <button
                  key={currency.id}
                  onClick={() => {
                    onSelect(currency.id);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all active:scale-[0.98] ${
                    selectedCurrency === currency.id 
                    ? 'bg-emerald-500/10 border-emerald-500/20' 
                    : 'bg-white/5 border-transparent hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black border ${
                      selectedCurrency === currency.id 
                      ? 'bg-emerald-500 text-white border-emerald-400' 
                      : 'bg-zinc-900 text-zinc-400 border-white/5 shadow-inner'
                    }`}>
                      {currency.symbol}
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-black text-white leading-none">{currency.name}</div>
                      <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mt-1.5 flex items-center gap-2">
                        {currency.id.toUpperCase()}
                        <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                        {currency.type === 'fiat' ? (
                          <span className="flex items-center gap-1"><Globe size={8} /> Global Fiat</span>
                        ) : (
                          <span className="flex items-center gap-1 text-emerald-500/80"><Zap size={8} /> Digital Asset</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {selectedCurrency === currency.id && (
                    <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                      <Check size={14} className="text-white" strokeWidth={3} />
                    </div>
                  )}
                </button>
              ))}

              {filtered.length === 0 && (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center border border-white/5 mx-auto">
                    <Search size={20} className="text-zinc-600" />
                  </div>
                  <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Protocol error: Currency not found</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
