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
    <div className="px-6 py-6 space-y-8 min-h-full ambient-glow pb-32 no-scrollbar overflow-y-auto">
      <div>
        <h2 className="text-2xl font-black tracking-tight text-slate-900 font-display uppercase italic text-center sm:text-left">Profile</h2>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 text-center sm:text-left opacity-60">Identity Management</p>
      </div>
      
      <div className="space-y-6">
         <div className="card rounded-[32px] p-8 border-white/20 flex flex-col sm:flex-row items-center gap-6 relative overflow-hidden group">
          <div className="w-20 h-20 rounded-[24px] bg-white flex items-center justify-center border border-slate-100 overflow-hidden shadow-xl relative z-10 p-1 group-hover:scale-105 transition-transform duration-500">
             <img 
                src={user?.photo_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user?.id}`} 
                alt="Profile" 
                className="w-full h-full object-cover rounded-[20px]" 
              />
          </div>
          <div className="flex-1 text-center sm:text-left relative z-10">
            <h3 className="text-xl font-black text-slate-900 leading-tight font-display tracking-tight">{user?.first_name} {user?.last_name}</h3>
            <div className="flex items-center justify-center sm:justify-start gap-2 mt-3">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg">@{user?.username || 'pepe_operator'}</span>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-100/30">
                <BadgeCheck size={10} className="text-emerald-500" />
                <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Verified</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Network Identity</span>
          <div className="card rounded-[24px] overflow-hidden border-white/10 shadow-sm">
            <ProfileRow label="Node ID" value={`#${user?.id}`} mono />
            <ProfileRow label="Tier" value={`LVL ${safeNumber(profile?.level, 1)}`} />
            <ProfileRow label="Status" value="Synchronized" highlight />
          </div>
        </div>

        <div className="space-y-3">
           <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Settings</span>
           <div className="card rounded-[24px] overflow-hidden border-white/10 shadow-sm">
              <button 
                onClick={() => setIsCurrencyModalOpen(true)}
                className="w-full flex items-center justify-between px-6 py-5 hover:bg-slate-50 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-slate-900 transition-all">
                    <Globe size={18} />
                  </div>
                  <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight">Display Currency</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100/30">
                    {currencyService.POPULAR_CURRENCIES.find(c => c.id === profile?.preferredCurrency)?.id.toUpperCase() || 'PEPE'}
                  </span>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-900 transition-colors" />
                </div>
              </button>
              
              <div className="h-px bg-slate-50 w-full px-6"></div>

              <button className="w-full px-6 py-5 flex items-center justify-between hover:bg-slate-50 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-slate-900 transition-all">
                    <Settings size={18} />
                  </div>
                  <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight">System Security</span>
                </div>
                <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-900 transition-colors" />
              </button>
           </div>
        </div>

        <button className="w-full py-5 rounded-2xl bg-slate-50 text-slate-400 font-black text-[9px] uppercase tracking-[0.3em] border border-slate-100 hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all">
           Log Out Profile
        </button>
      </div>
    </div>
  );
});

ProfileTab.displayName = 'ProfileTab';
