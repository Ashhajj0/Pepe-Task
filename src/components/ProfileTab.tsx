import { motion } from 'motion/react';
import { memo } from 'react';
import { UserProfile, TelegramUser } from '../types';
import { ProfileRow } from './UIElements';
import { Settings, Globe } from 'lucide-react';
import { safeNumber } from '../lib/utils/firestore';
import * as currencyService from '../services/currencyService';

interface ProfileTabProps {
  user: TelegramUser | null;
  profile: UserProfile | null;
  setIsCurrencyModalOpen: (open: boolean) => void;
}

export const ProfileTab = memo(({ user, profile, setIsCurrencyModalOpen }: ProfileTabProps) => {
  return (
    <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-5 pt-4 space-y-6">
       <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight mb-1 font-display">Operator</h2>
        <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">System Identity</p>
      </div>
      
      <div className="space-y-6">
         <div className="flex flex-col items-center py-4">
          <div className="w-24 h-24 rounded-full border border-white/5 p-1.5 bg-zinc-900 overflow-hidden mb-4 shadow-2xl relative group">
             <div className="absolute inset-0 bg-emerald-500/5 group-hover:bg-emerald-500/10 transition-colors animate-pulse"></div>
             <img 
                src={user?.photo_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user?.id}`} 
                alt="Operator" 
                className="rounded-full w-full h-full object-cover relative z-10 grayscale hover:grayscale-0 transition-all duration-500" 
              />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-black tracking-tight">{user?.first_name} {user?.last_name}</h3>
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1">Certified Node Operator</p>
          </div>
        </div>

        <div className="glass rounded-[32px] border-white/5 overflow-hidden flex flex-col divide-y divide-white/5">
          <ProfileRow label="Oper_UID" value={user?.id.toString() || '0'} mono />
          <ProfileRow label="Alias_Protocol" value={`@${user?.username || 'ANON'}`} highlight />
          <ProfileRow label="Node_Integrity" value={`${safeNumber(profile?.trustScore, 100)}% Verified`} highlight />
          <ProfileRow label="Current_Level" value={`LVL ${safeNumber(profile?.level, 1)}`} />
        </div>

        <div className="glass p-5 rounded-[28px] border-white/5 bg-zinc-950/20">
           <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center">
                 <Settings size={14} className="text-zinc-600" />
              </div>
              <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Protocol Settings</span>
           </div>
           <div className="space-y-3">
              <button 
                onClick={() => setIsCurrencyModalOpen(true)}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 active:scale-[0.98] transition-all"
              >
                <div className="flex items-center gap-3">
                  <Globe size={14} className="text-emerald-500" />
                  <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">Display Currency</span>
                </div>
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                  {currencyService.POPULAR_CURRENCIES.find(c => c.id === profile?.preferredCurrency)?.id.toUpperCase() || 'PEPE'}
                </span>
              </button>
              <button className="w-full py-4 text-red-500/40 font-black text-[9px] uppercase tracking-widest hover:text-red-500 transition-colors active:scale-95">
                 Purge Session Data
              </button>
           </div>
        </div>
      </div>
    </motion.div>
  );
});

ProfileTab.displayName = 'ProfileTab';
