import { memo } from 'react';
import { UserProfile, TelegramUser } from '../types';
import { ProfileRow } from './UIElements';
import { safeNumber } from '../lib/utils/firestore';
import { Settings, Globe, ChevronRight, BadgeCheck } from 'lucide-react';
import * as currencyService from '../services/currencyService';

interface ProfileTabProps {
  user: TelegramUser | null;
  profile: UserProfile | null;
  setIsCurrencyModalOpen: (open: boolean) => void;
}

export const ProfileTab = memo(({ user, profile, setIsCurrencyModalOpen }: ProfileTabProps) => {
  return (
    <div className="px-6 py-10 space-y-10 min-h-full ambient-glow pb-36 no-scrollbar overflow-y-auto">
      <div>
        <h2 className="text-3xl font-black tracking-tighter text-slate-900 font-display uppercase italic text-center sm:text-left">Profile</h2>
        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mt-2 opacity-60 text-center sm:text-left">Config & Identity Protocol</p>
      </div>
      
      <div className="space-y-8">
         <div className="card rounded-[48px] p-10 border-white/10 flex flex-col sm:flex-row items-center gap-8 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.02] to-transparent pointer-events-none"></div>
          <div className="w-28 h-28 rounded-[40px] bg-white flex items-center justify-center border border-slate-100 overflow-hidden shadow-2xl relative z-10 p-1 group-hover:scale-105 transition-transform duration-500">
             <img 
                src={user?.photo_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user?.id}`} 
                alt="Profile" 
                className="w-full h-full object-cover rounded-[36px]" 
              />
          </div>
          <div className="flex-1 text-center sm:text-left relative z-10">
            <h3 className="text-2xl font-black text-slate-900 leading-tight font-display tracking-tight">{user?.first_name} {user?.last_name}</h3>
            <div className="flex items-center justify-center sm:justify-start gap-2 mt-4">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-100/50 border border-slate-100 px-3 py-1.5 rounded-xl">@{user?.username || 'pepe_operator'}</span>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-100/50">
                <BadgeCheck size={12} className="text-emerald-500" />
                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Verified</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-2 opacity-60">Status Dashboard</span>
          <div className="card rounded-[40px] overflow-hidden border-white/10 shadow-xl shadow-slate-200/50">
            <ProfileRow label="Operator ID" value={`#${user?.id}`} mono />
            <ProfileRow label="Node Tier" value={`LVL ${safeNumber(profile?.level, 1)}`} />
            <ProfileRow label="Protocol Status" value="Active Sync" highlight />
          </div>
        </div>

        <div className="space-y-4">
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-2 opacity-60">System Config</span>
           <div className="card rounded-[40px] overflow-hidden border-white/10 shadow-xl shadow-slate-200/50">
              <button 
                onClick={() => setIsCurrencyModalOpen(true)}
                className="w-full flex items-center justify-between px-8 py-6 hover:bg-slate-50 transition-all group"
              >
                <div className="flex items-center gap-5">
                  <div className="w-11 h-11 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-slate-900 group-hover:shadow-md transition-all">
                    <Globe size={20} />
                  </div>
                  <span className="text-xs font-black text-slate-900 uppercase tracking-tight">Input Currency</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100/50 shadow-sm">
                    {currencyService.POPULAR_CURRENCIES.find(c => c.id === profile?.preferredCurrency)?.id.toUpperCase() || 'PEPE'}
                  </span>
                  <ChevronRight size={18} className="text-slate-300 group-hover:text-slate-900 transition-colors" />
                </div>
              </button>
              
              <div className="h-px bg-slate-50/50 w-full px-8">
                <div className="h-full w-full bg-slate-100/50"></div>
              </div>

              <button className="w-full px-8 py-6 flex items-center justify-between hover:bg-slate-50 transition-all group">
                <div className="flex items-center gap-5">
                  <div className="w-11 h-11 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-slate-900 group-hover:shadow-md transition-all">
                    <Settings size={20} />
                  </div>
                  <span className="text-xs font-black text-slate-900 uppercase tracking-tight">Protocol Security</span>
                </div>
                <ChevronRight size={18} className="text-slate-300 group-hover:text-slate-900 transition-colors" />
              </button>
           </div>
        </div>

        <button className="w-full py-6 rounded-[32px] bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-[0.4em] border border-slate-100 hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all active:scale-[0.98]">
           Disconnect Node
        </button>
      </div>
    </div>
  );
});

ProfileTab.displayName = 'ProfileTab';
