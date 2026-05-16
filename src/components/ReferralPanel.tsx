import { useState, useEffect, ReactNode } from 'react';
import { 
  Users, Copy, Share2, TrendingUp, Activity, 
  CheckCircle2, AlertCircle, Zap, Gem, Clock,
  ShieldCheck, Loader2, HelpCircle, Smartphone, UserPlus
} from 'lucide-react';
import { db } from '../lib/firebase';
import { 
  collection, query, where, orderBy, 
  limit, onSnapshot, doc, getDoc 
} from 'firebase/firestore';
import { UserProfile, ReferralRecord } from '../types';
import { safeNumber, safeString } from '../lib/utils/firestore';

interface ReferralPanelProps {
  profile: UserProfile;
  onRedeemCode?: (code: string) => Promise<{ success: boolean; message: string }>;
}

export function ReferralPanel({ profile, onRedeemCode }: ReferralPanelProps) {
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);
  const [copyCodeSuccess, setCopyCodeSuccess] = useState(false);
  
  const [inputCode, setInputCode] = useState('');
  const [redeemStatus, setRedeemStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error', message: string }>({ type: 'idle', message: '' });

  const handleRedeem = async () => {
    if (!inputCode.trim() || !onRedeemCode) return;
    setRedeemStatus({ type: 'loading', message: 'Sync' });
    const result = await onRedeemCode(inputCode);
    if (result.success) {
      setRedeemStatus({ type: 'success', message: result.message });
      setInputCode('');
    } else {
      setRedeemStatus({ type: 'error', message: result.message });
      setTimeout(() => setRedeemStatus({ type: 'idle', message: '' }), 3000);
    }
  };

  const activeNodesCount = referrals.filter(ref => (ref.totalGenerated || 0) > 0).length;
  const estimatedDailyIncome = (profile.totalReferrals || 0) * 500 * 0.1;

  useEffect(() => {
    if (!profile.telegramId) return;
    const q = query(
      collection(db, 'referrals'),
      where('referrerId', '==', profile.telegramId.toString()),
      limit(20)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => doc.data() as ReferralRecord);
      records.sort((a, b) => (b.joinedAt?.seconds || 0) - (a.joinedAt?.seconds || 0));
      setReferrals(records);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [profile.telegramId]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(profile.referralLink);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleCopyCode = () => {
    const code = profile.telegramId?.toString() || '';
    navigator.clipboard.writeText(code);
    setCopyCodeSuccess(true);
    setTimeout(() => setCopyCodeSuccess(false), 2000);
  };

  const handleShare = () => {
    const text = `Join Pepe Earn and grow your network!`;
    const url = `https://t.me/share/url?url=${encodeURIComponent(profile.referralLink)}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="px-6 py-6 space-y-8 min-h-full ambient-glow pb-32 no-scrollbar overflow-y-auto">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em]">Peers & Friends</h2>
        <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest opacity-60 italic">Network Protocol</p>
      </div>

      <div className="card rounded-[32px] p-8 border-white/20 relative overflow-hidden group">
        <div className="flex flex-col items-center text-center space-y-4 mb-8 relative z-10">
          <div className="w-12 h-12 rounded-[18px] bg-white flex items-center justify-center text-emerald-600 border border-slate-100 shadow-xl group-hover:scale-110 transition-transform duration-500">
            <Share2 size={20} />
          </div>
          <div className="space-y-1">
            <h3 className="text-[14px] font-black text-slate-900 uppercase tracking-tight">Expand Network</h3>
            <p className="text-[9px] text-slate-400 font-bold max-w-[200px] mx-auto uppercase tracking-wide leading-relaxed">
              Unlock <span className="text-emerald-600 font-black">10% commission</span> on all peer activity.
            </p>
          </div>
        </div>

        <div className="space-y-3 relative z-10">
          <div className="relative">
            <input 
              readOnly 
              value={profile.referralLink || ''}
              className="w-full bg-slate-50 border border-slate-100/50 rounded-xl px-4 py-4 text-[9px] font-bold text-slate-400 focus:outline-none pr-12"
            />
            <button onClick={handleCopyLink} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-white rounded-lg transition-all">
              {copySuccess ? <CheckCircle2 size={16} className="text-emerald-600" /> : <Copy size={16} className="text-slate-400" />}
            </button>
          </div>
          
          <button 
            onClick={handleShare}
            className="w-full h-14 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-200"
          >
            Share Link
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard 
          label="Peers" 
          value={<Counter value={profile.totalReferrals || 0} />} 
          subValue={`${activeNodesCount} Active`} 
          icon={<Users size={16} />} 
        />
        <StatCard 
          label="Earned" 
          value={<Counter value={profile.referralEarnings || 0} />} 
          subValue={`Daily +${estimatedDailyIncome.toFixed(0)}`} 
          icon={<Gem size={16} />} 
          highlight 
        />
      </div>

      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <ShieldCheck size={12} className="text-emerald-500" />
            <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Node Authentication</h3>
          </div>
          <span className="text-[8px] font-bold text-slate-200 uppercase tracking-widest">v2.0.4</span>
        </div>

        <div className="bg-white rounded-[28px] p-1.5 border border-slate-100 shadow-sm relative group overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          
          {profile.referralProcessed || profile.referredBy ? (
            <div className="flex items-center justify-between px-5 py-4 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100/50">
                  <CheckCircle2 size={18} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-black text-slate-900 uppercase">Protocol Sync Active</span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase mt-0.5 tracking-widest">Network Node {safeString(profile.referredBy).slice(0, 8)}...</span>
                </div>
              </div>
              <div className="bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                <span className="text-[8px] font-black text-emerald-600 uppercase">VERIFIED</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 relative z-10">
              <div className="relative">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300">
                  <UserPlus size={16} />
                </div>
                <input 
                  type="text"
                  placeholder="INPUT CODE FOR 500 PEPE"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  disabled={redeemStatus.type === 'loading'}
                  className="w-full bg-slate-50/50 rounded-[22px] pl-12 pr-4 py-5 text-[10px] font-black text-slate-900 focus:outline-none placeholder:text-slate-400 transition-all focus:bg-white border border-transparent focus:border-slate-100 uppercase tracking-widest"
                />
                {redeemStatus.type !== 'idle' && (
                  <div className={`absolute right-5 top-1/2 -translate-y-1/2 text-[8px] font-black uppercase ${redeemStatus.type === 'error' ? 'text-red-500' : 'text-emerald-500'} bg-white px-2 py-1 rounded-md shadow-sm border border-slate-50`}>
                    {redeemStatus.message}
                  </div>
                )}
              </div>
              <button 
                onClick={handleRedeem}
                disabled={!inputCode.trim() || redeemStatus.type === 'loading'}
                className="w-full h-14 bg-slate-900 text-white rounded-[22px] font-black text-[10px] uppercase tracking-widest active:scale-[0.97] transition-all flex items-center justify-center gap-3 shadow-lg shadow-slate-200 group/btn overflow-hidden relative disabled:opacity-50 disabled:grayscale"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000"></div>
                {redeemStatus.type === 'loading' ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Zap size={14} className="text-emerald-400 group-hover/btn:scale-110 transition-transform" />
                )}
                <span>Initialize Referral Sync</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {referrals.length > 0 && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-3 px-1">
            <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-400">Activity</h3>
            <div className="h-px flex-1 bg-slate-100"></div>
          </div>
          <div className="space-y-2">
            {referrals.map((record, i) => <ActivityRow key={i} record={record} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function Counter({ value: valueArg, decimals = 0 }: { value: any, decimals?: number }) {
  const value = safeNumber(valueArg);
  const [displayValue, setDisplayValue] = useState(value);
  useEffect(() => {
    let start = displayValue;
    const end = value;
    const duration = 1000;
    const startTime = Date.now();
    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutExpo = (x: number) => x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
      setDisplayValue(start + (end - start) * easeOutExpo(progress));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);
  return <>{displayValue.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</>;
}

function StatCard({ label, value, subValue, icon, highlight }: { label: string, value: ReactNode, subValue: string, icon: any, highlight?: boolean }) {
  return (
    <div className="bg-white p-5 rounded-3xl border border-slate-100 relative overflow-hidden shadow-sm">
      <div className={`absolute top-0 right-0 p-3 opacity-10 ${highlight ? 'text-emerald-600' : 'text-slate-400'}`}>
        {icon}
      </div>
      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">{label}</span>
      <div className="flex flex-col">
        <span className={`text-lg font-black tracking-tight ${highlight ? 'text-emerald-600' : 'text-slate-900'}`}>{value}</span>
        <span className="text-[7px] font-bold text-slate-400 uppercase mt-0.5">{subValue}</span>
      </div>
    </div>
  );
}

const userCache: Record<string, string> = {};

function ActivityRow({ record }: { record: ReferralRecord, key?: string }) {
  const [referredUser, setReferredUser] = useState<string>(() => userCache[record.referredId] || 'PEPE_NODE');
  useEffect(() => {
    if (userCache[record.referredId]) return;
    getDoc(doc(db, 'users', record.referredId)).then(snap => {
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        const name = (data.username || data.first_name || 'Anonymous').slice(0, 15);
        userCache[record.referredId] = name;
        setReferredUser(name);
      }
    });
  }, [record.referredId]);
  return (
    <div className="flex items-center justify-between p-4 px-5 bg-white rounded-2xl border border-slate-100 shadow-sm transition-all hover:border-emerald-100 group">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
          <Activity size={12} className="text-emerald-500" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-slate-900">@{safeString(referredUser)}</span>
          <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">MINING ACTIVITY</span>
        </div>
      </div>
      <div className="flex flex-col items-end">
        <span className="text-[10px] font-black text-emerald-600">+{safeNumber(record.totalCommissionPaid).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
        <span className="text-[7px] font-bold text-emerald-500/60 uppercase italic tracking-tighter">COMMISSION</span>
      </div>
    </div>
  );
}
