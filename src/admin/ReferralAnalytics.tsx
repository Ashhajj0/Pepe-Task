import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { UserProfile } from '../types';
import { safeDate } from '../lib/utils/firestore';
import { 
  Users, TrendingUp, Trophy, ArrowUpRight, 
  Share2, Gem, UserPlus, Award
} from 'lucide-react';

export const ReferralAnalytics: React.FC = () => {
  const [topReferrers, setTopReferrers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopReferrers = async () => {
      const q = query(collection(db, 'users'), orderBy('totalReferrals', 'desc'), limit(10));
      const snap = await getDocs(q);
      setTopReferrers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as UserProfile)));
      setLoading(false);
    };
    fetchTopReferrers();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Referral Analytics</h2>
        <p className="text-slate-400 font-medium">Monitoring growth and viral loops</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-[32px] border border-slate-100 p-8">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold text-slate-900">Leaderboard</h3>
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-lg text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <Trophy size={12} className="text-amber-500" />
              <span>Top 10 Performers</span>
            </div>
          </div>

          <div className="space-y-6">
            {topReferrers.map((user, i) => (
              <div key={user.id} className="flex items-center gap-6 group">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                    i === 0 ? 'bg-amber-100 text-amber-600' : 
                    i === 1 ? 'bg-slate-100 text-slate-600' : 
                    i === 2 ? 'bg-orange-100 text-orange-600' : 'bg-slate-50 text-slate-400'
                }`}>
                    {i + 1}
                </div>
                <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl overflow-hidden border border-slate-100">
                        {user.photo_url && <img src={user.photo_url} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-900">@{user.username || 'unknown'}</p>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-tight">Joined {safeDate(user.lastLogin).toLocaleDateString()}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-sm font-bold text-black">{user.totalReferrals || 0}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total Invites</p>
                </div>
                <div className="text-right w-24">
                    <p className="text-xs font-bold text-emerald-500">+{user.referralEarnings?.toLocaleString() || 0}</p>
                    <p className="text-[10px] text-slate-300 font-bold uppercase">Commission</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-8">
            <div className="bg-emerald-500 rounded-[32px] p-8 text-white relative overflow-hidden">
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/20 rounded-full blur-3xl" />
                <div className="mb-6 p-3 bg-white/20 w-fit rounded-xl backdrop-blur-md">
                    <UserPlus size={24} />
                </div>
                <h3 className="text-3xl font-bold mb-1">Growth</h3>
                <p className="text-emerald-100/70 text-xs font-bold uppercase tracking-widest mb-8">Monthly Momentum</p>
                <div className="flex items-end gap-1 mb-2">
                    <span className="text-4xl font-bold">+42%</span>
                    <TrendingUp size={24} className="mb-1" />
                </div>
                <p className="text-emerald-50 text-xs font-medium">Significant increase in organic invites this period.</p>
            </div>

            <div className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm">
                <h4 className="text-sm font-bold text-slate-900 mb-6 uppercase tracking-widest text-center">Reward Structure</h4>
                <div className="space-y-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Gem size={18} className="text-blue-500" />
                            <span className="text-xs font-bold text-slate-600 uppercase">Per Invite</span>
                        </div>
                        <span className="text-xs font-bold text-slate-900">2,500 PEPE</span>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Award size={18} className="text-amber-500" />
                            <span className="text-xs font-bold text-slate-600 uppercase">Commision</span>
                        </div>
                        <span className="text-xs font-bold text-slate-900">10% of Earned</span>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
