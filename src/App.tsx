import { ReactNode, useEffect, useState, useRef, useMemo } from 'react';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, serverTimestamp, increment, runTransaction } from 'firebase/firestore';
import { 
  Wallet, Trophy, Target, LayoutDashboard, 
  Settings, Loader2, PlayCircle, ArrowUpRight, 
  ShieldCheck, Zap, User as UserIcon, Users,
  Gem, BadgeCheck, Activity, TrendingUp, Info, Globe,
  CheckCircle2, AlertCircle, X, Timer
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from './lib/firebase';
import { TelegramUser, UserProfile } from './types';
import * as adService from './services/adService';
import * as currencyService from './services/currencyService';

import { sanitizeFirestoreData, safeNumber, safeString } from './lib/utils/firestore';
import { PepePriceTicker } from './components/PepePriceTicker';
import { CurrencyModal } from './components/CurrencyModal';
import { ReferralPanel } from './components/ReferralPanel';
import { Currency } from './services/currencyService';

type Tab = 'home' | 'earn' | 'wallet' | 'friends' | 'profile';

const DEBUG = process.env.NODE_ENV === 'development';

const logger = {
  log: (module: string, message: string, data?: any) => {
    const timestamp = new Date().toISOString().split('T')[1];
    console.log(`[${timestamp}] [${module}] ${message}`, data || '');
  },
  error: (module: string, message: string, error?: any) => {
    console.error(`[${module}] ERROR: ${message}`, error || '');
  }
};

export default function App() {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    try {
      const cached = localStorage.getItem('pepe_profile_cache');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return null;
  });
  const [loading, setLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initStep, setInitStep] = useState<string>('Initializing...');
  const loadingRef = useRef(true);
  useEffect(() => { loadingRef.current = loading; }, [loading]);

  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [adState, setAdState] = useState<'idle' | 'loading' | 'watching' | 'cooldown' | 'reward'>('idle');
  const [referralParam, setReferralParam] = useState<string | null>(null);

  const adStateRef = useRef(adState);
  useEffect(() => { adStateRef.current = adState; }, [adState]);

  const initialSyncRef = useRef(true);
  const [adProgress, setAdProgress] = useState(0);
  const [adTimer, setAdTimer] = useState(0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [lastReward, setLastReward] = useState(0);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [resetCountdown, setResetCountdown] = useState<{ hours: string, minutes: string, seconds: string } | null>(null);
  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);
  const [pepePrice, setPepePrice] = useState<number | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  // Debug toggle: triple click header
  const debugCounter = useRef(0);
  const handleDebugToggle = () => {
    debugCounter.current++;
    if (debugCounter.current >= 5) {
      setShowDebug(!showDebug);
      debugCounter.current = 0;
    }
    setTimeout(() => { debugCounter.current = 0; }, 1000);
  };

  useEffect(() => {
    const updatePepePrice = async () => {
      const target = (profile?.preferredCurrency && profile.preferredCurrency !== 'pepe') 
        ? profile.preferredCurrency 
        : 'usd';
      
      const price = await currencyService.getPepePriceIn(target);
      if (price !== null) {
        setPepePrice(price);
      }
    };

    if (profile) {
      updatePepePrice();
    }
    const interval = setInterval(() => {
       if (profile) updatePepePrice();
    }, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [profile?.preferredCurrency]);

  useEffect(() => {
    const initApp = async () => {
      logger.log('Init', 'Starting application bootstrap...');
      setInitStep('Connecting to Telegram...');
      
      const tg = window.Telegram?.WebApp;
      
      // Safety timeout for loading screen
      const loadingTimeout = setTimeout(() => {
        if (loadingRef.current) {
          logger.error('Init', 'Startup timed out after 15s. Forcing bypass.');
          setLoading(false);
          setIsInitializing(false);
        }
      }, 15000);

      try {
        if (tg) {
          tg.ready();
          tg.expand();
          tg.enableClosingConfirmation();
          
          const userData = tg.initDataUnsafe?.user;
          let startParam = tg.initDataUnsafe?.start_param;
          
          // Enhanced fallback extraction for start_param
          if (!startParam) {
            const urlParams = new URLSearchParams(window.location.search);
            startParam = urlParams.get('tgWebAppStartParam') || urlParams.get('start_param') || urlParams.get('start') || undefined;
            
            // Check hash as well (Telegram sometimes puts it there)
            if (!startParam && window.location.hash) {
              try {
                const hashPart = window.location.hash.substring(1);
                const hashParams = new URLSearchParams(hashPart);
                startParam = hashParams.get('tgWebAppStartParam') || undefined;
              } catch (e) {}
            }
          }

          logger.log('TG', 'Bootstrap data', { 
            id: userData?.id, 
            startParam, 
            browserUrl: window.location.href,
            initDataUnsafe: tg.initDataUnsafe 
          });

          // Extract referral ID more robustly
          let referralIdFromParam: string | null = null;
          if (startParam) {
            logger.log('TG', 'Processing start_param', { startParam });
            if (startParam.startsWith('ref_')) {
              referralIdFromParam = startParam.replace('ref_', '');
            } else if (/^\d+$/.test(startParam)) {
              referralIdFromParam = startParam;
            }
          }

          if (referralIdFromParam) {
            setReferralParam(referralIdFromParam);
          }

          if (userData) {
            setUser(userData);
            setInitStep('Syncing Secure Protocol...');
            
            // 1. Ensure user exists in Firestore before proceeding
            // Pass the extracted referral ID directly
            await syncUser(userData, referralIdFromParam || undefined);
            
            // 2. Start real-time sync
            const unsubscribe = startSync(userData);
            
            setIsInitializing(false);
            clearTimeout(loadingTimeout);
            
            return () => {
              unsubscribe && unsubscribe();
            };
          } else {
            if (process.env.NODE_ENV === 'development') {
              logger.log('Dev', 'Using mock user');
              const mockUser = {
                id: 12345678,
                first_name: 'Pepe',
                last_name: 'The King',
                username: 'pepe_master',
                photo_url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Pepe'
              };
              setUser(mockUser);
              await syncUser(mockUser);
              const unsubscribe = startSync(mockUser);
              setIsInitializing(false);
              clearTimeout(loadingTimeout);
              return () => unsubscribe && unsubscribe();
            } else {
              setError('Mobile device required. Please open in Telegram.');
              setLoading(false);
              setIsInitializing(false);
            }
          }
        } else {
          setError('Telegram SDK not detected.');
          setLoading(false);
          setIsInitializing(false);
        }
      } catch (err) {
        logger.error('Init', 'Fatal error during init', err);
        setError('Failed to initialize protocol: ' + (err instanceof Error ? err.message : 'Unknown error'));
        setLoading(false);
        setIsInitializing(false);
      }
    };

    initApp();
  }, []);

  const startSync = (tgUser: TelegramUser) => {
    logger.log('Sync', 'Establishing Real-time listener...');
    const userRef = doc(db, 'users', tgUser.id.toString());
    
    return onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        
        // Update state and cache
        setProfile((prev) => {
          if (
            prev && 
            prev.balance === data.balance && 
            prev.referCount === data.referCount && 
            prev.totalReferrals === data.totalReferrals &&
            prev.level === data.level
          ) {
            return prev;
          }
          return data;
        });
        localStorage.setItem('pepe_profile_cache', JSON.stringify(data));
        setLoading(false);
        logger.log('Sync', 'Profile updated', { balance: data.balance });
        
        // Handle ad state
        if (data.lastAdWatchTime && (initialSyncRef.current || adStateRef.current === 'idle')) {
          const lastWatch = data.lastAdWatchTime.seconds ? data.lastAdWatchTime.seconds * 1000 : new Date(data.lastAdWatchTime).getTime();
          const now = Date.now();
          const elapsed = (now - lastWatch) / 1000;
          if (elapsed < adService.AD_CONFIG.COOLDOWN_SECONDS) {
            setAdState('cooldown');
            setCooldownRemaining(Math.ceil(adService.AD_CONFIG.COOLDOWN_SECONDS - elapsed));
          }
          initialSyncRef.current = false;
        }

        const today = new Date().toISOString().split('T')[0];
        if (data.lastResetDate === today && data.adsWatchedToday >= adService.AD_CONFIG.DAILY_LIMIT) {
          setIsLimitReached(true);
        } else if (data.lastResetDate !== today) {
           adService.checkAndResetDailyLimit(tgUser.id.toString(), data);
        }
      }
    }, (err) => {
      logger.error('Sync', 'Firestore listener failed', err);
    });
  };

  useEffect(() => {
    let interval: any;
    if (adState === 'cooldown' && cooldownRemaining > 0) {
      interval = setInterval(() => {
        setCooldownRemaining(prev => {
          if (prev <= 1) {
            setAdState('idle');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [adState, cooldownRemaining]);

  useEffect(() => {
    let interval: any;
    if (isLimitReached) {
      setResetCountdown(adService.getTimeUntilNextReset());
      interval = setInterval(() => {
        setResetCountdown(adService.getTimeUntilNextReset());
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isLimitReached]);

  const handleWatchAd = async () => {
    if (!user || !profile) return;
    
    const check = adService.canWatchAd(profile);
    if (!check.canWatch) {
      if (check.reason?.includes('limit')) setIsLimitReached(true);
      return;
    }

    setAdState('loading');
    setAdProgress(0);
    
    // Simulate connection
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Start watching
    const duration = adService.getSimulatedDuration() + 5; // 6-7 seconds
    setAdTimer(duration);
    setAdState('watching');
    
    const totalDuration = duration * 1000;
    const startTime = Date.now();
    
    const watchInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / totalDuration) * 100, 100);
      setAdProgress(progress);
      
      const remaining = Math.max(0, Math.ceil((totalDuration - elapsed) / 1000));
      setAdTimer(remaining);
      
      if (progress >= 100) {
        clearInterval(watchInterval);
        completeAd();
      }
    }, 100);
  };

  const completeAd = async () => {
    if (!user) return;
    const reward = adService.getSimulatedReward();
    setLastReward(reward);
    setAdState('reward');

    try {
      // Background write, not blocking the UI reward state
      adService.claimAdReward(user.id.toString(), reward, profile!).catch(err => {
        logger.error('Ads', 'Reward claim failed', err);
      });
    } catch (err) {
      logger.error('Ads', 'Fatal error during ad completion', err);
    }

    // Auto-close reward popup after 3 seconds
    setTimeout(() => {
      setAdState(prev => {
        if (prev === 'reward') {
          setCooldownRemaining(adService.AD_CONFIG.COOLDOWN_SECONDS);
          return 'cooldown';
        }
        return prev;
      });
    }, 3000);
  };

  const handleClaimLevelBonus = async () => {
    if (!user || !profile) return;
    try {
      await adService.claimLevelBonus(user.id.toString(), profile);
    } catch (err) {
      console.error('Failed to claim level bonus:', err);
    }
  };

  const processReferralWithRetry = async (newUserId: string, referrerId: string, retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        await processReferral(newUserId, referrerId);
        return;
      } catch (err) {
        if (i === retries - 1) throw err;
        const delay = Math.pow(2, i) * 1000;
        logger.log('Sync', `Retrying referral processing in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  };

  const syncUser = async (tgUser: TelegramUser, referralId?: string, retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        const userId = tgUser.id.toString();
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          logger.log('Sync', 'Existing user detected, checking session state...');
          const data = userSnap.data() as UserProfile;
          
          const now = Date.now();
          const lastLoginTime = data.lastLogin?.seconds ? data.lastLogin.seconds * 1000 : 0;
          const needsUpdate = (now - lastLoginTime) > 300000; // 5 minutes
          
          const isValid = (id: any) => id && id !== 'null' && id !== 'undefined' && id !== '';
          let currentReferredBy = isValid(data.referredBy) ? data.referredBy : null;
          const canBeReferred = !currentReferredBy && !data.referralProcessed && isValid(referralId) && referralId !== userId;

          if (needsUpdate || !data.referralCode || canBeReferred) {
            logger.log('Sync', 'Updating user profile metadata...', { canBeReferred, referralId });
            const updates: any = {
              lastLogin: serverTimestamp(),
              username: tgUser.username || '',
              first_name: tgUser.first_name || '',
              last_name: tgUser.last_name || '',
              photo_url: tgUser.photo_url || ''
            };

            if (!data.referralCode) {
              updates.referralCode = userId;
              updates.referralLink = `https://t.me/Mypepetaskbot?start=ref_${userId}`;
              updates.totalReferrals = data.totalReferrals ?? 0;
              updates.activeReferrals = data.activeReferrals ?? 0;
              updates.referralEarnings = data.referralEarnings ?? 0;
            }

            if (canBeReferred) {
              logger.log('Sync', 'Attaching referral to existing user profile', { referralId });
              updates.referredBy = referralId;
              currentReferredBy = referralId;
            }

            await updateDoc(userRef, sanitizeFirestoreData(updates));
            logger.log('Sync', 'Profile update complete');
          }

          // Important: use currentReferredBy which might have just been updated
          if (currentReferredBy && !data.referralProcessed) {
             logger.log('Sync', 'Triggering referral processing for existing user', { currentReferredBy });
             processReferralWithRetry(userId, currentReferredBy).catch(() => {});
          }
          return;
        } else {
          logger.log('Sync', 'New user detected, creating profile...');
          const refLink = `https://t.me/Mypepetaskbot?start=ref_${userId}`;
          
          let referredBy: string | null = null;
          if (referralId && referralId !== userId) {
            referredBy = referralId;
          }

          const newProfile: UserProfile = {
            telegramId: tgUser.id || 0,
            username: tgUser.username || '',
            first_name: tgUser.first_name || '',
            last_name: tgUser.last_name || '',
            photo_url: tgUser.photo_url || '',
            balance: 0,
            totalEarned: 0,
            adsWatchedToday: 0,
            tasksCompleted: 0,
            xp: 0,
            level: 1,
            levelProgress: 0,
            lastClaimedLevel: 0,
            preferredCurrency: 'pepe',
            lastResetDate: new Date().toISOString().split('T')[0],
            trustScore: 100,
            referCount: 0,
            referralCode: userId,
            referralLink: refLink,
            referredBy: referredBy,
            referralProcessed: false,
            totalReferrals: 0,
            activeReferrals: 0,
            referralEarnings: 0,
            lastAdWatchTime: null,
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp()
          };
          
          await setDoc(userRef, sanitizeFirestoreData(newProfile));
          logger.log('Sync', 'Profile created successfully');

          if (referredBy) {
            processReferralWithRetry(userId, referredBy).catch(err => {
              logger.error('Sync', 'Referral processing failed after retries', err);
            });
          }
          return; // Success
        }
      } catch (err) {
        logger.error('Sync', `Sync attempt ${i + 1} failed`, err);
        if (i === retries - 1) throw err;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  };

  const processReferral = async (newUserId: string, referrerId: string) => {
    try {
      logger.log('Sync', 'Initiating referral transaction...', { referrerId });
      
      await runTransaction(db, async (transaction) => {
        const referrerRef = doc(db, 'users', referrerId);
        const referrerSnap = await transaction.get(referrerRef);
        
        if (!referrerSnap.exists()) {
          logger.log('Sync', 'Referrer not found in transaction, aborting');
          return;
        }

        const referralId = `${referrerId}_${newUserId}`;
        const referralRef = doc(db, 'referrals', referralId);
        const referralSnap = await transaction.get(referralRef);

        if (referralSnap.exists()) {
          logger.log('Sync', 'Referral already processed, skipping duplicate');
          return;
        }

        // 1. Create Referral Record
        transaction.set(referralRef, {
          referrerId: referrerId,
          referredId: newUserId,
          joinedAt: serverTimestamp(),
          totalGenerated: 0,
          totalCommissionPaid: 0
        });

        // 2. Update Referred User (mark as processed and ensure referredBy is synced)
        transaction.update(doc(db, 'users', newUserId), {
          referralProcessed: true,
          referredBy: referrerId
        });
      });

      logger.log('Sync', 'Referral record created, updating stats...');
      await updateReferrerStats(referrerId, newUserId);
      
      logger.log('Sync', 'Referral process complete');
    } catch (err) {
      logger.error('Sync', 'Referral transaction failed', err);
      throw err;
    }
  };

  const updateReferrerStats = async (referrerId: string, referredUserId: string) => {
    try {
      logger.log('Sync', 'Updating referrer stats...', { referrerId, referredUserId });
      await runTransaction(db, async (transaction) => {
        const referrerRef = doc(db, 'users', referrerId);
        const referrerSnap = await transaction.get(referrerRef);
        
        if (!referrerSnap.exists()) {
          throw new Error('Referrer not found');
        }

        transaction.update(referrerRef, {
          referCount: increment(1),
          totalReferrals: increment(1)
        });
      });
      logger.log('Sync', 'Referrer stats updated successfully');
    } catch (err) {
      logger.error('Sync', 'Failed to update referrer stats', err);
      // We don't throw here to avoid failing the whole flow if just stats update fails 
      // (though in a transaction it shouldn't happen unless user doesn't exist)
    }
  };

  const redeemReferralCode = async (code: string) => {
    if (!user || !profile) return { success: false, message: 'Session syncing...' };
    if (profile.referralProcessed || profile.referredBy) return { success: false, message: 'Protocol already linked.' };
    
    // Clean code (remove ref_ prefix if added by user)
    const cleanCode = code.replace('ref_', '').trim();
    if (cleanCode === user.id.toString()) return { success: false, message: 'Self-link blocked.' };
    if (!/^\d+$/.test(cleanCode)) return { success: false, message: 'Invalid ID format.' };

    try {
      logger.log('Sync', 'Redeeming referral code', { cleanCode });
      const referrerRef = doc(db, 'users', cleanCode);
      const referrerSnap = await getDoc(referrerRef);
      
      if (!referrerSnap.exists()) {
        return { success: false, message: 'Node not found.' };
      }

      // Apply bonus to the REDEEMER (the user entering the code)
      // and set their referredBy field
      const userRef = doc(db, 'users', user.id.toString());
      await updateDoc(userRef, {
        referredBy: cleanCode,
        balance: increment(250),
        totalEarned: increment(250)
      });
      
      // Process the referral logic (creates record, updates referrer stats)
      await processReferralWithRetry(user.id.toString(), cleanCode);
      
      logger.log('Sync', 'Code redemption successful', { cleanCode });
      return { success: true, message: '250 PEPE credited!' };
    } catch (err) {
      logger.error('Sync', 'Redemption failed', err);
      return { success: false, message: 'Protocol error.' };
    }
  };

  if (isInitializing || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] relative overflow-hidden text-center">
        <div className="absolute inset-0 ambient-glow opacity-30"></div>
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-emerald-500/10 blur-xl rounded-full scale-125"></div>
          <div className="relative z-10 w-24 h-24 rounded-[32px] bg-[#1a1a1a] p-3 shadow-2xl flex items-center justify-center">
            <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
            <img 
              src="/logo.png" 
              alt="PepeTask" 
              className="absolute w-12 h-12 object-contain opacity-50"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Pepe&backgroundColor=c0ebaf';
              }}
            />
          </div>
        </div>
        <div>
          <h2 className="text-lg font-black font-display tracking-[0.2em] text-white">PEPETASK</h2>
          <p className="mt-1 text-emerald-500/60 font-display font-medium tracking-[0.2em] uppercase text-[7px] animate-pulse">
            {initStep}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] p-8 text-center">
        <div className="w-24 h-24 glass-neon rounded-[32px] flex items-center justify-center mb-8 ring-1 ring-emerald-500/10">
          <ShieldCheck className="w-12 h-12 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3 font-display">System Protocol Error</h2>
        <p className="text-emerald-500/60 mb-10 max-w-[280px] mx-auto text-xs font-medium tracking-wide leading-relaxed uppercase">
          {error}
        </p>
        <button 
          onClick={() => window.location.reload()} 
          className="glass-neon px-12 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] text-white hover:scale-105 transition-transform active:scale-95"
        >
          Re-establish Link
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-[#050505] text-white font-sans flex items-center justify-center overflow-hidden relative">
      {/* Background Visual Depth */}
      <div className="absolute inset-0 ambient-glow opacity-20"></div>
      <div className="absolute w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-[160px] -top-96 -left-48 pointer-events-none"></div>
      <div className="absolute w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[140px] -bottom-64 -right-32 pointer-events-none"></div>

      {/* App Container */}
      <div className="relative w-full h-full sm:w-[390px] sm:h-[844px] sm:max-h-[95vh] bg-[#0c0c0c] border-x sm:border border-white/5 sm:rounded-[56px] shadow-[0_0_80px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden ring-1 ring-white/5">
        
        {/* Dynamic Background Elements - Optimized for Performance */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden sm:rounded-[56px]">
          <div className="absolute w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[80px] -top-40 -left-20"></div>
          <div className="absolute w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[70px] -bottom-32 -right-16"></div>
        </div>

        {/* Dynamic Header - Minimalist */}
        <header 
          onClick={handleDebugToggle}
          className="shrink-0 pt-8 px-5 pb-4 flex justify-between items-center z-[60] bg-[#0c0c0c]"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.15)] bg-white">
              <img 
                src="/logo.png" 
                alt="PepeTask Logo" 
                className="w-full h-full object-contain"
                onLoad={(e) => {
                  (e.target as HTMLImageElement).parentElement?.classList.remove('bg-white');
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Pepe&backgroundColor=c0ebaf';
                }}
              />
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm font-black tracking-[0.1em] font-display text-white leading-tight">PEPETASK</h1>
              <span className="text-[7px] font-bold text-zinc-500 uppercase tracking-[0.1em]">Complete Tasks • Earn Pepe</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest leading-none">Net_Secure</span>
              </div>
            </div>
            <button 
              onClick={() => setIsCurrencyModalOpen(true)}
              className="w-8 h-8 rounded-lg border border-white/5 bg-white/5 flex items-center justify-center text-zinc-500 hover:text-white transition-all active:scale-90"
            >
              <Settings size={14} />
            </button>
          </div>
        </header>

        {/* Scrollable Context */}
        <main className="flex-1 overflow-y-auto no-scrollbar pb-24 touch-pan-y overscroll-contain">
          <AnimatePresence mode="wait">
            {activeTab === 'home' && (
              <motion.div 
                key="home" 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                className="px-5 pt-2 space-y-5"
              >
                {/* Compact User Identity */}
                <div className="glass p-4 rounded-[28px] flex items-center gap-4 border-white/5">
                  <div className="w-12 h-12 rounded-[14px] border border-white/10 p-0.5 bg-zinc-900 overflow-hidden">
                    <img 
                      src={user?.photo_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user?.id}`} 
                      alt="Operator" 
                      className="rounded-[12px] w-full h-full object-cover" 
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-bold truncate tracking-tight">{user?.first_name}</h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">{safeNumber(profile?.trustScore)}% Trust</span>
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest truncate">@{safeString(user?.username) || 'pepe_user'}</span>
                    </div>
                  </div>
                </div>

                {/* Concentrated Balance Card - Upgraded */}
                <div className="relative">
                  <div className="absolute inset-0 bg-emerald-500/[0.03] blur-[40px] rounded-full pointer-events-none"></div>
                  <div className="relative glass-neon rounded-[36px] p-6 shimmer overflow-hidden border-white/5">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-600 mb-1">Balance</span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-3xl font-black tracking-tight tabular-nums font-display leading-none text-white">
                            <Counter value={profile?.balance ?? 0} />
                          </span>
                          <span className="text-[10px] font-black text-emerald-500 tracking-widest uppercase">
                            PEPE
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-2">
                          <span className="text-xs font-bold text-zinc-400">
                             {profile?.preferredCurrency && profile.preferredCurrency !== 'pepe' 
                               ? `≈ ${currencyService.POPULAR_CURRENCIES.find(c => c.id === profile.preferredCurrency)?.symbol || ''}${((safeNumber(profile?.balance)) * (pepePrice || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${profile.preferredCurrency.toUpperCase()}`
                               : `≈ $${((safeNumber(profile?.balance)) * (pepePrice || 0.000008)).toFixed(4)} USD`}
                          </span>
                          <span className="text-[8px] font-black text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">LIVE</span>
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-xl glass-neon flex items-center justify-center border border-emerald-500/20">
                        <TrendingUp size={16} className="text-emerald-500" />
                      </div>
                    </div>
                    
                    <div className="h-px bg-white/5 w-full mb-6"></div>

                    <div className="grid grid-cols-2 gap-y-5 gap-x-4">
                      <div className="flex flex-col space-y-1">
                        <span className="text-[7px] font-black text-zinc-600 uppercase tracking-[0.15em]">User Level</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-zinc-200 shrink-0">LVL {safeNumber(profile?.level, 1)}</span>
                          <div className="flex-1 h-1 bg-zinc-900 rounded-full overflow-hidden mt-0.5">
                            <motion.div 
                              className="h-full bg-blue-500"
                              initial={{ width: 0 }}
                              animate={{ width: `${safeNumber(profile?.levelProgress)}%` }}
                              transition={{ duration: 0.5 }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col space-y-1 pl-4 border-l border-white/5">
                        <span className="text-[7px] font-black text-zinc-600 uppercase tracking-[0.15em]">Daily Load</span>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1 bg-zinc-900 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${(safeNumber(profile?.adsWatchedToday) / 15) * 100}%` }}></div>
                          </div>
                          <span className="text-[9px] font-black text-zinc-400">{safeNumber(profile?.adsWatchedToday)}/15</span>
                        </div>
                      </div>
                      <div className="flex flex-col space-y-1">
                        <span className="text-[7px] font-black text-zinc-600 uppercase tracking-[0.15em]">Total Refers</span>
                        <span className="text-xs font-bold text-zinc-200">{safeNumber(profile?.referCount)}</span>
                      </div>
                      <div className="flex flex-col space-y-1 pl-4 border-l border-white/5">
                        <span className="text-[7px] font-black text-zinc-600 uppercase tracking-[0.15em]">Total Earning</span>
                        <div className="flex items-center gap-1 text-xs font-bold text-emerald-500">
                          <span>{safeNumber(profile?.totalEarned).toLocaleString()}</span>
                          <Gem size={8} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* System Monitor (Replaces Earning on Main) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">Protocol Status</h3>
                    <div className="h-px w-24 bg-zinc-900/50"></div>
                  </div>
                  
                  <div className="glass p-4 rounded-[24px] border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/5 flex items-center justify-center">
                          <Activity size={14} className="text-emerald-500" />
                        </div>
                        <span className="text-[11px] font-bold text-zinc-300">Global Consensus</span>
                      </div>
                      <span className="text-[10px] font-black text-emerald-500">OPTIMIZED</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center">
                          <ShieldCheck size={14} className="text-zinc-500" />
                        </div>
                        <span className="text-[11px] font-bold text-zinc-300">Vault Defense</span>
                      </div>
                      <span className="text-[10px] font-black text-zinc-500 uppercase">Lvl_04 Active</span>
                    </div>
                  </div>
                </div>

                {/* Network Statistics Update */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="glass p-5 rounded-[28px] border-white/5 flex flex-col items-center text-center">
                    <Trophy size={16} className="text-zinc-500 mb-3" />
                    <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest block mb-1">Rank_Score</span>
                    <span className="text-base font-black text-zinc-200 font-display">#{Math.max(1, 2000 - safeNumber(profile?.totalEarned) / 100).toLocaleString()}</span>
                  </div>
                  <div className="glass p-5 rounded-[28px] border-white/5 flex flex-col items-center text-center">
                    <Users size={16} className="text-zinc-500 mb-3" />
                    <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest block mb-1">Active_Nodes</span>
                    <span className="text-base font-black text-zinc-200 font-display">{safeNumber(profile?.referCount).toLocaleString()}</span>
                  </div>
                </div>

                {/* Level Rewards Section */}
                <div className="space-y-3">
                   <div className="flex items-center justify-between px-1">
                    <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">Level Progression</h3>
                    <div className="h-px w-10 bg-zinc-900/50"></div>
                  </div>
                  <div className="glass rounded-[24px] p-5 border-white/5 relative overflow-hidden bg-gradient-to-br from-emerald-500/[0.03] to-transparent">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl glass-neon flex items-center justify-center border border-emerald-500/20">
                          <Trophy size={18} className="text-emerald-500" />
                        </div>
                        <div>
                          <h4 className="text-[11px] font-black text-white uppercase tracking-tight">Level {profile?.level} Rewards</h4>
                          <p className="text-[9px] font-medium text-zinc-500">Reach levels to unlock bonuses</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-black text-emerald-500 block">+500 PEPE</span>
                        <span className="text-[7px] font-bold text-zinc-600 uppercase tracking-widest">Per Level</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="glass bg-black/20 rounded-2xl p-4 border border-white/5">
                        <div className="flex items-center justify-between mb-2">
                           <span className="text-[10px] font-bold text-zinc-400 italic">
                             { (profile?.level || 1) < 2
                               ? "Unlocks at Level 2"
                               : (profile?.lastClaimedLevel || 0) < (profile?.level || 1) 
                                 ? "New Level Bonus Ready!" 
                                 : `Next Bonus: Level ${(profile?.level || 1) + 1}` }
                           </span>
                           <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                             { (profile?.level || 1) >= 2 && (profile?.lastClaimedLevel || 0) < (profile?.level || 1) 
                               ? "Unlocked" 
                               : "Locked" }
                           </span>
                        </div>
                        
                        <button 
                          onClick={handleClaimLevelBonus}
                          disabled={(profile?.level || 1) < 2 || (profile?.lastClaimedLevel || 0) >= (profile?.level || 1)}
                          className={`w-full py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-300 ${
                            (profile?.level || 1) >= 2 && (profile?.lastClaimedLevel || 0) < (profile?.level || 1)
                            ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20 active:scale-95'
                            : 'bg-zinc-800 text-zinc-600 opacity-50 cursor-not-allowed'
                          }`}
                        >
                          { (profile?.level || 1) < 2 
                            ? 'Locked' 
                            : (profile?.lastClaimedLevel || 0) < (profile?.level || 1) 
                              ? 'Claim 500 Bonus' 
                              : 'Bonus Claimed' }
                        </button>
                      </div>

                      <div className="flex items-center gap-2 px-1">
                        <Info size={10} className="text-zinc-700" />
                        <span className="text-[8px] text-zinc-700 font-black uppercase tracking-widest leading-none">
                          Earn 500 PEPE bonus every time you advance to a new level (Starts from Level 2).
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

              </motion.div>
            )}

            {activeTab === 'earn' && (
              <motion.div key="earn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-5 pt-4 space-y-6">
                <div>
                  <h2 className="text-xl font-bold tracking-tight mb-1 font-display">Hub</h2>
                  <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em]">Rewards & Social</p>
                </div>
                
                <div className="space-y-6">
                  {/* Reward Stream - Simplified */}
                  <div className="space-y-3">
                    <span className="text-[9px] font-black text-zinc-700 uppercase tracking-[0.25em]">Visual Protocol</span>
                    <motion.button
                      whileTap={(!isLimitReached && adState === 'idle') ? { scale: 0.98 } : {}}
                      onClick={handleWatchAd}
                      disabled={isLimitReached || adState !== 'idle'}
                      className={`w-full rounded-[24px] p-6 flex items-center justify-between shadow-[0_20px_40px_rgba(16,185,129,0.2)] relative overflow-hidden group transition-all duration-300 ${
                        isLimitReached 
                        ? 'bg-zinc-800 opacity-50 cursor-not-allowed' 
                        : adState === 'cooldown'
                          ? 'bg-zinc-900 border border-emerald-500/10'
                          : 'bg-gradient-to-br from-emerald-500 to-emerald-600'
                      }`}
                    >
                      <div className="flex items-center gap-4 relative z-10">
                        <div className={`w-12 h-12 glass rounded-2xl flex items-center justify-center ${adState === 'cooldown' ? 'text-emerald-500' : 'bg-black/20 text-white'}`}>
                          {adState === 'cooldown' ? <Timer size={24} /> : <PlayCircle size={24} />}
                        </div>
                        <div className="text-left">
                          <span className={`text-[10px] font-black uppercase tracking-widest block mb-0.5 ${adState === 'cooldown' ? 'text-zinc-500' : 'text-black/40'}`}>
                            {adState === 'cooldown' ? 'Cooldown Active' : 'Stream Bonus'}
                          </span>
                          <span className={`text-lg font-black tracking-tight leading-none uppercase ${adState === 'cooldown' ? 'text-zinc-300' : 'text-black'}`}>
                            {adState === 'cooldown' ? `${cooldownRemaining}s Wait` : '+0-100 PEPE'}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end relative z-10">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg ${
                          isLimitReached 
                          ? 'bg-zinc-900 text-zinc-600' 
                          : adState === 'cooldown'
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'bg-black/10 text-black'
                        }`}>
                          {isLimitReached ? 'Locked' : adState === 'cooldown' ? 'Wait' : 'Watch Now'}
                        </span>
                      </div>
                      <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </motion.button>
                    <div className="flex justify-between items-center px-1">
                      <span className={`text-[9px] font-bold uppercase tracking-widest ${isLimitReached ? 'text-red-500' : 'text-zinc-600'}`}>
                        {isLimitReached ? 'Daily Limit Reached' : 'Daily Consensus Limit'}
                      </span>
                      <span className={`text-[10px] font-black ${isLimitReached ? 'text-red-500' : 'text-emerald-500/80'}`}>{safeNumber(profile?.adsWatchedToday)} / 15</span>
                    </div>

                    {isLimitReached && resetCountdown && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 glass p-4 rounded-[20px] border-emerald-500/10 flex flex-col items-center gap-2"
                      >
                        <span className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.3em]">Protocol Reset Window</span>
                        <div className="flex gap-3">
                          <TimerDisplay label="HH" value={resetCountdown.hours} />
                          <TimerDisplay label="MM" value={resetCountdown.minutes} />
                          <TimerDisplay label="SS" value={resetCountdown.seconds} />
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Social Logic */}
                  <div className="space-y-3">
                    <span className="text-[9px] font-black text-zinc-700 uppercase tracking-[0.25em]">Network Expansion</span>
                    <div className="space-y-3">
                       <SocialTask 
                        icon={<Users size={18} />} 
                        title="Main Telegram Channel" 
                        reward="+50.00" 
                        actionLabel="Join"
                       />
                       <SocialTask 
                        icon={<Users size={18} />} 
                        title="Community Group" 
                        reward="+50.00" 
                        actionLabel="Link"
                       />
                       <SocialTask 
                        icon={<ArrowUpRight size={18} />} 
                        title="X News Terminal" 
                        reward="+35.00" 
                        actionLabel="Follow"
                       />
                    </div>
                  </div>

                  {/* How It Works Section */}
                  <div className="pt-4 space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">Protocol Intelligence</h3>
                      <div className="h-px flex-1 bg-zinc-900/50 ml-4"></div>
                    </div>
                    <div className="glass rounded-[28px] p-6 border-white/5 bg-zinc-950/20 space-y-6">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                          <h4 className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">How it Works</h4>
                        </div>
                        <p className="text-[10px] text-zinc-500 leading-relaxed font-medium">
                          PepeTask operates as a decentralized attention marketplace where user engagement is directly converted into protocol credits.
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                          <h4 className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">Sustainability</h4>
                        </div>
                        <p className="text-[10px] text-zinc-500 leading-relaxed font-medium">
                          The system is powered by verified visual feeds. Revenue generated from these feeds is redistributed to active node operators to ensure long-term ecosystem stability.
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                          <h4 className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">Operational Guide</h4>
                        </div>
                        <p className="text-[10px] text-zinc-500 leading-relaxed font-medium">
                          Watch streams, complete social handshakes, and grow your peer network to maximize your PEPE allocation. All credits are processed through the BSC network vault.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'wallet' && (
              <motion.div key="wallet" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-5 pt-4 space-y-6">
                <div className="mb-6">
                  <h2 className="text-xl font-bold tracking-tight mb-1 font-display">Vault</h2>
                  <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Asset Management</p>
                </div>
                
                <div className="relative group">
                  <div className="absolute inset-0 bg-emerald-500/2 blur-[40px] rounded-full pointer-events-none"></div>
                  <div className="relative glass rounded-[36px] p-8 border-white/5 text-center flex flex-col items-center shimmer bg-gradient-to-b from-white/[0.02] to-transparent">
                    <div className="w-16 h-16 rounded-3xl glass flex items-center justify-center mb-6 border border-white/5 text-emerald-500 shadow-2xl">
                      <Wallet size={32} />
                    </div>
                    <span className="text-[9px] text-zinc-600 font-black uppercase tracking-[0.4em] mb-3">Available Balance</span>
                    <div className="flex flex-col mb-8">
                      <span className="text-4xl font-black font-display tracking-tight text-white mb-2 block">
                        <Counter value={safeNumber(profile?.balance)} />
                      </span>
                      <span className="text-[11px] font-bold text-zinc-500 mt-2 uppercase tracking-widest">
                         {profile?.preferredCurrency && profile.preferredCurrency !== 'pepe' 
                           ? `≈ ${currencyService.POPULAR_CURRENCIES.find(c => c.id === profile.preferredCurrency)?.symbol || ''}${((safeNumber(profile?.balance)) * (pepePrice || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${profile.preferredCurrency.toUpperCase()}`
                           : `≈ $${((safeNumber(profile?.balance)) * (pepePrice || 0.000008)).toFixed(4)} USD`}
                      </span>
                    </div>
                    
                    <button className="w-full h-14 bg-emerald-500 text-black rounded-[20px] font-black text-[11px] uppercase tracking-[0.2em] shadow-[0_15px_30px_rgba(16,185,129,0.15)] active:scale-95 transition-all mb-4">
                      Withdraw Assets
                    </button>
                    
                    <div className="flex gap-4 w-full px-2">
                       <div className="flex-1 flex flex-col items-center">
                          <span className="text-[7px] font-black text-zinc-700 uppercase tracking-widest mb-1">Method_Alpha</span>
                          <span className="text-[9px] font-bold text-zinc-500">BSC Network</span>
                       </div>
                       <div className="w-px h-6 bg-white/5"></div>
                       <div className="flex-1 flex flex-col items-center">
                          <span className="text-[7px] font-black text-zinc-700 uppercase tracking-widest mb-1">Method_Beta</span>
                          <span className="text-[9px] font-bold text-zinc-500">Binance ID</span>
                       </div>
                    </div>
                  </div>
                  <div className="mt-4 px-6 flex items-center justify-center gap-2">
                    <Info size={10} className="text-zinc-700" />
                    <span className="text-[8px] text-zinc-700 font-black uppercase tracking-widest">Minimum Threshold: 50,000 PEPE</span>
                  </div>
                </div>

                <div className="space-y-4">
                   <div className="flex items-center justify-between px-2">
                     <h4 className="text-[9px] font-black text-zinc-700 uppercase tracking-[0.3em]">History</h4>
                     <div className="h-px flex-1 bg-zinc-900/50 mx-4"></div>
                   </div>
                   <div className="flex flex-col gap-2">
                     {[1,2].map(i => (
                       <div key={i} className="glass rounded-[20px] p-4 border-white/5 flex items-center justify-between opacity-30">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center text-zinc-600">
                                <ArrowUpRight size={14} />
                             </div>
                             <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-zinc-500">PEPE_DISPATCH</span>
                                <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest">Processing...</span>
                             </div>
                          </div>
                          <span className="text-[10px] font-black text-zinc-600">0.00</span>
                       </div>
                     ))}
                   </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'friends' && profile && (
              <motion.div key="friends" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-5 pt-4">
                 <ReferralPanel 
                   profile={profile} 
                   onRedeemCode={redeemReferralCode}
                 />
              </motion.div>
            )}

            {activeTab === 'profile' && (
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
            )}

          </AnimatePresence>
          {activeTab === 'home' && <PepePriceTicker preferredCurrency={profile?.preferredCurrency} />}
        </main>

        <AnimatePresence>
          {/* Ad Simulation Overlay */}
          {(adState === 'loading' || adState === 'watching') && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[100] bg-black/98 backdrop-blur-lg flex flex-col items-center justify-center p-8 text-center"
            >
              <div className="absolute top-12 left-0 w-full px-8 flex justify-between items-center opacity-40">
                <span className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.4em]">Visual Stream Connection</span>
                <div className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-emerald-500 animate-ping"></span>
                  <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Feed_Live</span>
                </div>
              </div>

              <div className="relative mb-12">
                <div className="absolute inset-0 bg-emerald-500/20 blur-[60px] rounded-full scale-150 animate-pulse"></div>
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="w-32 h-32 rounded-full border-2 border-emerald-500/10 border-t-emerald-500 flex items-center justify-center relative z-10"
                >
                  <PlayCircle size={48} className="text-emerald-500 animate-pulse" />
                </motion.div>
              </div>

              <div className="space-y-2 mb-12 relative z-10">
                <h3 className="text-xl font-black tracking-tight text-white uppercase font-display">
                  {adState === 'loading' ? 'Establishing Link...' : 'Syncing Content'}
                </h3>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">
                  {adState === 'loading' ? 'Connecting to Ad Node' : `Remaining: ${adTimer}S`}
                </p>
              </div>

              <div className="w-full max-w-[240px] space-y-4 relative z-10">
                <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-white/5 shadow-inner">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${adProgress}%` }}
                    className="h-full bg-gradient-to-r from-emerald-500 to-blue-500"
                  />
                </div>
                <div className="flex justify-between items-center px-1">
                  <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Integrity</span>
                  <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">{Math.round(adProgress)}% Verified</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Refined Reward Success Popup */}
          {adState === 'reward' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[110] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6"
            >
              <div className="absolute inset-0 bg-emerald-500/[0.03] ambient-glow"></div>
              
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="glass rounded-[32px] p-6 border-white/10 text-center relative z-10 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col items-center max-w-[280px] w-full"
              >
                {/* Minimalist Close */}
                <button 
                  onClick={() => {
                    setAdState('cooldown');
                    setCooldownRemaining(adService.AD_CONFIG.COOLDOWN_SECONDS);
                  }}
                  className="absolute top-4 right-4 text-zinc-600 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>

                 <div className="w-20 h-20 rounded-[28px] flex items-center justify-center mb-6 overflow-hidden shadow-[0_15px_30px_rgba(16,185,129,0.25)] bg-white p-3">
                   <img 
                     src="/logo.png" 
                     alt="PepeTask" 
                     className="w-full h-full object-contain"
                     onLoad={(e) => {
                       (e.target as HTMLImageElement).parentElement?.classList.remove('bg-white');
                     }}
                     onError={(e) => {
                       (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=PepeSuccess&backgroundColor=c0ebaf';
                     }}
                   />
                 </div>
                
                <h3 className="text-lg font-black tracking-tight text-white mb-1 font-display uppercase italic">Claim Success</h3>
                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-6">Protocol Allocation Verified</p>
                
                <div className="bg-zinc-900/50 rounded-2xl p-5 border border-white/5 mb-6 w-full text-center">
                  <div className="text-3xl font-black text-emerald-500 font-display tabular-nums">+{lastReward}</div>
                  <div className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mt-1">PEPE_UNITS</div>
                </div>

                <motion.button 
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    setAdState('cooldown');
                    setCooldownRemaining(adService.AD_CONFIG.COOLDOWN_SECONDS);
                  }}
                  className="w-full h-12 bg-white text-black rounded-[16px] font-black text-[10px] uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all"
                >
                  Accept Reward
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <CurrencyModal 
          isOpen={isCurrencyModalOpen}
          onClose={() => setIsCurrencyModalOpen(false)}
          selectedCurrency={profile?.preferredCurrency || 'pepe'}
          onSelect={(currencyId) => {
            if (user) {
              currencyService.updatePreferredCurrency(user.id.toString(), currencyId);
            }
          }}
        />

        {showDebug && (
          <div className="absolute inset-0 z-[200] bg-black/95 p-6 overflow-y-auto text-[10px] font-mono">
            <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
              <span className="text-emerald-500 font-bold uppercase">System Debug Console</span>
              <button onClick={() => setShowDebug(false)} className="text-zinc-500 hover:text-white"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-zinc-500 mb-1">REFERRAL_DECODER</p>
                <div className="bg-zinc-900 p-2 rounded-lg">
                  <p>Detected ID: {referralParam || 'NONE'}</p>
                  <p>Referred By: {profile?.referredBy || 'NULL'}</p>
                  <p>Processed: {String(profile?.referralProcessed)}</p>
                  <p>Source Param: {window.Telegram?.WebApp?.initDataUnsafe?.start_param || 'EMPTY'}</p>
                </div>
              </div>
              <div>
                <p className="text-zinc-500 mb-1">TELEGRAM_DATA</p>
                <div className="bg-zinc-900 p-2 rounded-lg break-all">
                  {JSON.stringify(user, null, 2)}
                </div>
              </div>
              <div>
                <p className="text-zinc-500 mb-1">FIRESTORE_PROFILE</p>
                <div className="bg-zinc-900 p-2 rounded-lg break-all">
                  {JSON.stringify(profile, null, 2)}
                </div>
              </div>
              <div>
                <p className="text-zinc-500 mb-1">APP_STATE</p>
                <div className="bg-zinc-900 p-2 rounded-lg">
                  <p>AdState: {adState}</p>
                  <p>Cooldown: {cooldownRemaining}s</p>
                  <p>Initializing: {String(isInitializing)}</p>
                  <p>Loading: {String(loading)}</p>
                  <p>Limit: {String(isLimitReached)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Minimalist Tab Navigation */}
        <nav className="shrink-0 pt-3 pb-8 px-6 bg-[#0c0c0c]/90 backdrop-blur-3xl border-t border-white/5 z-50">
          <div className="flex items-center justify-around">
            <NavItem icon={<LayoutDashboard size={20} />} active={activeTab === 'home'} label="Main" onClick={() => setActiveTab('home')} />
            <NavItem icon={<Zap size={20} />} active={activeTab === 'earn'} label="Earn" onClick={() => setActiveTab('earn')} />
            <NavItem icon={<Wallet size={20} />} active={activeTab === 'wallet'} label="Vault" onClick={() => setActiveTab('wallet')} />
            <NavItem icon={<Users size={20} />} active={activeTab === 'friends'} label="Peers" onClick={() => setActiveTab('friends')} />
            <NavItem icon={<UserIcon size={20} />} active={activeTab === 'profile'} label="Oper" onClick={() => setActiveTab('profile')} />
          </div>
        </nav>
      </div>
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

function TimerDisplay({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-10 h-10 glass rounded-lg flex items-center justify-center border border-white/5 shadow-inner">
        <span className="text-xs font-black tracking-tighter tabular-nums font-mono text-emerald-500">{value}</span>
      </div>
      <span className="text-[6px] font-bold text-zinc-600 mt-1 uppercase tracking-tighter">{label}</span>
    </div>
  );
}

function SocialTask({ icon, title, reward, actionLabel }: { icon: ReactNode, title: string, reward: string, actionLabel: string }) {
  return (
    <div className="glass p-3 rounded-2xl flex items-center justify-between border-white/5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-zinc-500">
          {icon}
        </div>
        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-zinc-300 leading-none mb-1">{title}</span>
          <span className="text-[10px] font-black text-emerald-500 leading-none tracking-tight">{reward} PEPE</span>
        </div>
      </div>
      <button className="px-4 py-2 glass-neon rounded-lg font-black text-[9px] uppercase tracking-widest text-emerald-500 transition-all active:scale-95">
        {actionLabel}
      </button>
    </div>
  );
}

function EarnCard({ icon, title, reward, desc, actionLabel, disabled }: { icon: ReactNode, title: string, reward: string, desc: string, actionLabel: string, disabled?: boolean }) {
  return (
    <div className={`glass relative p-5 rounded-[28px] border-white/5 transition-all ${disabled ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
      <div className="flex items-center gap-4 mb-3">
        <div className="w-11 h-11 glass-neon rounded-xl flex items-center justify-center text-emerald-500 shadow-neon">
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-bold tracking-tight text-white">{title}</h3>
          <span className="text-[11px] font-black text-emerald-500 uppercase tracking-widest">{reward} PEPE</span>
        </div>
      </div>
      <p className="text-[10px] text-zinc-500 mb-4 leading-relaxed font-medium">{desc}</p>
      <button 
        disabled={disabled}
        className={`w-full py-3.5 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95 ${
          disabled 
            ? 'glass text-zinc-700 border-white/5' 
            : 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/10'
        }`}
      >
        {actionLabel}
      </button>
    </div>
  );
}

function ProfileRow({ label, value, highlight, mono }: { label: string, value: string, highlight?: boolean, mono?: boolean }) {
  return (
    <div className="flex items-center justify-between p-4 px-5">
      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">{label}</span>
      <span className={`text-[10px] font-bold ${highlight ? 'text-emerald-500' : 'text-zinc-300'} ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

function NavItem({ icon, active, label, onClick }: { icon: ReactNode, active?: boolean, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick} 
      className={`flex flex-col items-center gap-1.5 transition-all outline-none relative ${active ? 'text-emerald-500' : 'text-zinc-700 hover:text-zinc-500'}`}
    >
      <motion.div
        whileTap={{ scale: 0.8 }}
        className={`p-1 ${active ? 'bg-emerald-500/10 rounded-xl' : ''}`}
      >
        {icon}
      </motion.div>
      <span className={`text-[8px] font-black uppercase tracking-[0.1em] shrink-0 transition-all ${active ? 'opacity-100' : 'opacity-40'}`}>
        {label}
      </span>
    </button>
  );
}

