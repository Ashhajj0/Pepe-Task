import { useState, useEffect, ReactNode } from 'react';
import { 
  Users, Copy, Share2, TrendingUp, Activity, 
  CheckCircle2, AlertCircle, Zap, Gem, Clock,
  ShieldCheck, Loader2, HelpCircle, Smartphone, UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
  
  // Redeem state
  const [inputCode, setInputCode] = useState('');
  const [redeemStatus, setRedeemStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error', message: string }>({ type: 'idle', message: '' });

  const handleRedeem = async () => {
    if (!inputCode.trim() || !onRedeemCode) return;
    
    setRedeemStatus({ type: 'loading', message: 'Verifying handshake...' });
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
  const estimatedDailyIncome = (profile.totalReferrals || 0) * 250 * 0.1; // Estimate 250 PEPE per user per day

  useEffect(() => {
    if (!profile.telegramId) return;

    const q = query(
      collection(db, 'referrals'),
      where('referrerId', '==', profile.telegramId.toString()),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => doc.data() as ReferralRecord);
      // Sort in memory to avoid needing composite index
      records.sort((a, b) => {
        const timeA = a.joinedAt?.seconds || 0;
        const timeB = b.joinedAt?.seconds || 0;
        return timeB - timeA;
      });
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
    const text = `🚀 Join me on PepeTask and earn PEPE protocol units daily! Use my link to get started:`;
    const url = `https://t.me/share/url?url=${encodeURIComponent(profile.referralLink)}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight mb-1 font-display">Peers</h2>
        <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Network Expansion Protocol</p>
      </div>

      {/* Referral Link Card */}
      <div className="glass rounded-[32px] p-6 border-white/5 relative overflow-hidden bg-gradient-to-br from-emerald-500/[0.03] to-transparent">
        <div className="flex flex-col items-center text-center space-y-4 mb-6">
          <div className="w-14 h-14 rounded-2xl glass-neon flex items-center justify-center text-emerald-500 border border-emerald-500/20">
            <Share2 size={24} />
          </div>
          <div>
            <h3 className="text-base font-black text-white uppercase tracking-tight">Invite to Earn</h3>
            <p className="text-[9px] text-zinc-500 font-medium max-w-[220px] mx-auto mt-1">
              Earn <span className="text-emerald-500">10% commission</span> on every ad reward your peers collect.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="relative group">
            <input 
              readOnly 
              value={profile.referralLink || ''}
              className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-[10px] font-mono text-zinc-400 focus:outline-none pr-12"
            />
            <button 
              onClick={handleCopyLink}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:text-emerald-500 transition-colors text-zinc-600"
            >
              {copySuccess ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Copy size={16} />}
            </button>
          </div>
          
          <motion.button 
            whileTap={{ scale: 0.97 }}
            onClick={handleShare}
            className="w-full h-14 bg-emerald-500 text-black rounded-[20px] font-black text-[11px] uppercase tracking-[0.2em] shadow-[0_15px_30px_rgba(16,185,129,0.15)] flex items-center justify-center gap-2"
          >
            <Zap size={14} fill="black" />
            Share With Friends
          </motion.button>

          <button 
            onClick={handleCopyCode}
            className="w-full h-12 glass rounded-2xl border-white/5 flex items-center justify-center gap-3 text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors"
          >
            {copyCodeSuccess ? (
              <>
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span className="text-emerald-500">Code Copied</span>
              </>
            ) : (
              <>
                <div className="px-2 py-1 bg-white/5 rounded-md text-white">ID: {profile.telegramId}</div>
                <span>Copy Refer Code</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard 
          label="Total Referrals" 
          value={<Counter value={profile.totalReferrals || 0} />} 
          subValue={`${activeNodesCount} Active Nodes`} 
          icon={<Users size={14} />} 
        />
        <StatCard 
          label="Referral Earnings" 
          value={<Counter value={profile.referralEarnings || 0} />} 
          subValue={`Est. +${estimatedDailyIncome.toFixed(0)} / Day`} 
          icon={<Gem size={14} />} 
          highlight 
        />
      </div>

      {/* Redeem Code Section */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">Secure Handshake</h3>
          <ShieldCheck size={12} className="text-zinc-700" />
        </div>

        <div className="glass rounded-[28px] p-6 border-white/5 bg-zinc-950/20">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
              <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Input Refer Code</h4>
            </div>
            
            {profile.referralProcessed || profile.referredBy ? (
              <div className="flex items-center gap-3 p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-tight">Identity Verified</span>
                  <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mt-0.5">Protocol Link Established</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <input 
                    type="text"
                    placeholder="Enter Protocol ID (e.g. 123456)"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    disabled={redeemStatus.type === 'loading'}
                    className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-xs font-bold text-white placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500/30 transition-all"
                  />
                  {redeemStatus.type !== 'idle' && (
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`absolute right-4 top-1/2 -translate-y-1/2 text-[8px] font-black uppercase tracking-widest ${
                        redeemStatus.type === 'error' ? 'text-red-500' : 
                        redeemStatus.type === 'success' ? 'text-emerald-500' : 'text-blue-500'
                      }`}
                    >
                      {redeemStatus.type === 'loading' ? 'Syncing...' : redeemStatus.message}
                    </motion.div>
                  )}
                </div>
                
                <button 
                  onClick={handleRedeem}
                  disabled={!inputCode.trim() || redeemStatus.type === 'loading'}
                  className={`w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${
                    !inputCode.trim() || redeemStatus.type === 'loading' 
                      ? 'bg-zinc-900 text-zinc-600 cursor-not-allowed'
                      : 'bg-white text-black shadow-xl shadow-white/5 active:scale-95'
                  }`}
                >
                  {redeemStatus.type === 'loading' ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck size={14} />
                      Verify Link & Claim 250 PEPE
                    </>
                  )}
                </button>
              </div>
            )}
            
            <p className="text-[8px] text-zinc-700 font-bold uppercase tracking-widest leading-relaxed text-center px-4">
              Enter a valid node ID to receive a one-time 250 PEPE protocol bonus. Self-linking is prohibited.
            </p>
          </div>
        </div>
      </div>

      {/* How it Works */}
      <div className="space-y-4 pt-4 pb-8">
        <div className="flex items-center gap-2 px-1">
          <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">Protocol Manual</h3>
          <HelpCircle size={10} className="text-zinc-700" />
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div className="glass p-4 rounded-3xl border-white/5 flex gap-4 items-center">
            <div className="w-10 h-10 rounded-2xl bg-white/[0.03] flex items-center justify-center text-zinc-400">
              <Share2 size={16} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-zinc-300 uppercase tracking-tight">1. Share Your Link</span>
              <span className="text-[8px] font-medium text-zinc-500 mt-0.5">Invite peers to join the PepeTask extraction network.</span>
            </div>
          </div>

          <div className="glass p-4 rounded-3xl border-white/5 flex gap-4 items-center">
            <div className="w-10 h-10 rounded-2xl bg-white/[0.03] flex items-center justify-center text-zinc-400">
              <UserPlus size={16} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-zinc-300 uppercase tracking-tight">2. Peer Verification</span>
              <span className="text-[8px] font-medium text-zinc-500 mt-0.5">When they join or input your code, they get 250 PEPE instantly.</span>
            </div>
          </div>

          <div className="glass p-4 rounded-3xl border-white/5 flex gap-4 items-center">
            <div className="w-10 h-10 rounded-2xl bg-white/[0.03] flex items-center justify-center text-zinc-400">
              <TrendingUp size={16} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-tight">3. Earn 10% Lifetime</span>
              <span className="text-[8px] font-medium text-zinc-500 mt-0.5">Receive 10% of every reward your peers earn, credited instantly.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Add ShieldCheck and Loader2 to imports

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
      const current = start + (end - start) * easeOutExpo(progress);
      
      setDisplayValue(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value]);

  return <>{displayValue.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</>;
}

function StatCard({ label, value, subValue, icon, highlight }: { label: string, value: ReactNode, subValue: string, icon: any, highlight?: boolean }) {
  return (
    <div className="glass p-5 rounded-[28px] border-white/5 relative overflow-hidden">
      <div className={`absolute top-0 right-0 p-3 opacity-10 ${highlight ? 'text-emerald-500' : 'text-zinc-500'}`}>
        {icon}
      </div>
      <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest block mb-1">{label}</span>
      <div className="flex flex-col">
        <span className={`text-xl font-black font-display tracking-tight ${highlight ? 'text-emerald-500' : 'text-white'}`}>
          {value}
        </span>
        <span className="text-[7px] font-bold text-zinc-500 uppercase tracking-tighter mt-0.5">{subValue}</span>
      </div>
    </div>
  );
}

const userCache: Record<string, string> = {};

function ActivityRow({ record }: { record: ReferralRecord, key?: string }) {
  const [referredUser, setReferredUser] = useState<string>(() => userCache[record.referredId] || 'PEPE_OPER');
  
  useEffect(() => {
    if (userCache[record.referredId]) return;

    const fetchUser = async () => {
      try {
        const userSnap = await getDoc(doc(db, 'users', record.referredId));
        if (userSnap.exists()) {
          const data = userSnap.data() as UserProfile;
          const name = data.username || data.first_name;
          userCache[record.referredId] = name;
          setReferredUser(name);
        }
      } catch (err) {
        console.error('Error fetching referred user:', err);
      }
    };
    fetchUser();
  }, [record.referredId]);

  return (
    <div className="flex items-center justify-between p-4 px-5 bg-white/[0.01]">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/5 flex items-center justify-center">
          <CheckCircle2 size={12} className="text-emerald-500" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-zinc-300">@{safeString(referredUser)} Linked</span>
          <span className="text-[7px] font-black text-zinc-600 uppercase tracking-widest">
            {record.joinedAt?.toDate ? record.joinedAt.toDate().toLocaleDateString() : 'RECENTLY'}
          </span>
        </div>
      </div>
      <div className="flex flex-col items-end">
        <span className="text-[10px] font-black text-emerald-500">+{safeNumber(record.totalCommissionPaid).toFixed(2)}</span>
        <span className="text-[7px] font-bold text-zinc-700 uppercase tracking-widest italic">Commission</span>
      </div>
    </div>
  );
}
