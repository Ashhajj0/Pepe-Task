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

import { sanitizeFirestoreData, safeNumber, safeString, safeDate } from './lib/utils/firestore';
import { PepePriceTicker } from './components/PepePriceTicker';
import { CurrencyModal } from './components/CurrencyModal';
import { ReferralPanel } from './components/ReferralPanel';
import { Currency } from './services/currencyService';
import { Counter, TimerDisplay, SocialTask, ProfileRow, NavItem } from './components/UIElements';
import { HomeTab } from './components/HomeTab';
import { EarnTab } from './components/EarnTab';
import { WalletTab } from './components/WalletTab';
import { ProfileTab } from './components/ProfileTab';

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

export default function UserApp() {
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
    }, 5000); // 5 seconds for realtime feel
    return () => clearInterval(interval);
  }, [profile?.preferredCurrency]);

  // Memoized derived values for performance
  const currencyDisplay = useMemo(() => {
    if (!profile) return { symbol: '$', rate: 0.000004, formatted: '$0.00' };
    const curr = profile.preferredCurrency || 'pepe';
    const isPepe = curr === 'pepe';
    
    if (isPepe) {
      return { 
        symbol: '$', 
        rate: pepePrice || 0.000004, 
        formatted: `≈ $${((safeNumber(profile.balance)) * (pepePrice || 0.000004)).toFixed(4)} USD` 
      };
    }

    const currencyInfo = currencyService.POPULAR_CURRENCIES.find(c => c.id === curr);
    const symbol = currencyInfo?.symbol || curr.toUpperCase();
    const rate = pepePrice || 0;
    const converted = (safeNumber(profile.balance)) * rate;
    
    return {
      symbol,
      rate,
      formatted: `≈ ${symbol}${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${curr.toUpperCase()}`
    };
  }, [profile?.balance, profile?.preferredCurrency, pepePrice]);

  const dailyProgress = useMemo(() => {
    return (safeNumber(profile?.adsWatchedToday) / 15) * 100;
  }, [profile?.adsWatchedToday]);

  const levelProgress = useMemo(() => {
    return safeNumber(profile?.levelProgress);
  }, [profile?.levelProgress]);

  const userRank = useMemo(() => {
    return Math.max(1, 2000 - safeNumber(profile?.totalEarned) / 100).toLocaleString();
  }, [profile?.totalEarned]);

  useEffect(() => {
    const initApp = async () => {
      logger.log('Init', 'Starting application bootstrap...');
      setInitStep('Connecting to Telegram...');
      
      const tg = window.Telegram?.WebApp;
      
      // Safety timeout for loading screen
      const loadingTimeout = setTimeout(() => {
        if (loadingRef.current) {
          logger.error('Init', 'Startup timed out after 15s. For bypass.');
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
        
        // Update state and cache - Optimized equality check
        setProfile((prev) => {
          if (
            prev && 
            prev.balance === data.balance && 
            prev.referCount === data.referCount && 
            prev.totalReferrals === data.totalReferrals &&
            prev.level === data.level &&
            prev.preferredCurrency === data.preferredCurrency &&
            prev.xp === data.xp &&
            prev.adsWatchedToday === data.adsWatchedToday &&
            prev.pendingWithdrawalBalance === data.pendingWithdrawalBalance &&
            prev.lastWithdrawalAt === data.lastWithdrawalAt
          ) {
            return prev;
          }
          return data;
        });
        localStorage.setItem('pepe_profile_cache', JSON.stringify(data));
        setLoading(false);
        logger.log('Sync', 'Profile updated', { balance: data.balance });
        
        // Handle ad state
        if (data.adCooldownUntil && (initialSyncRef.current || adStateRef.current === 'idle' || adStateRef.current === 'cooldown')) {
          const now = Date.now();
          const cooldownUntil = safeDate(data.adCooldownUntil).getTime();
          const remaining = Math.ceil((cooldownUntil - now) / 1000);
          
          if (remaining > 0) {
            setAdState('cooldown');
            setCooldownRemaining(remaining);
          } else if (adStateRef.current === 'cooldown') {
            setAdState('idle');
            setCooldownRemaining(0);
          }
          initialSyncRef.current = false;
        }

        const now = new Date();
        const lastReset = safeDate(data.lastDailyReset);
        const isNewDay = now.toDateString() !== lastReset.toDateString();

        if (!isNewDay && data.adsWatchedToday >= adService.AD_CONFIG.DAILY_LIMIT) {
          setIsLimitReached(true);
        } else {
          setIsLimitReached(false);
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
    
    try {
      if (typeof window.showGiga === 'function') {
        logger.log('Ads', 'Triggering Gigapub ad...');
        await window.showGiga();
        logger.log('Ads', 'Ad completed successfully');
        await completeAd();
      } else {
        // Fallback if script is not available (mostly for local testing if blocked by adblocker)
        logger.log('Ads', 'Giga script not found, using simulation');
        setAdProgress(0);
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const duration = adService.getSimulatedDuration() + 5;
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
      }
    } catch (err) {
      logger.error('Ads', 'Ad display failed', err);
      setAdState('idle');
      // Use Telegram's alert if possible, or just standard alert
      if (window.Telegram?.WebApp?.showAlert) {
        window.Telegram.WebApp.showAlert('Failed to load advertisement. Please check your connection or turn off your ad-blocker.');
      } else {
        alert('Failed to load advertisement. Please try again.');
      }
    }
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

            // Initialize missing upgrade fields ONLY if they are truly missing to avoid redundant writes
            let needsUpdate = false;
            
            if (data.totalAdRewards === undefined) { updates.totalAdRewards = 0; needsUpdate = true; }
            if (data.adCooldownUntil === undefined) { updates.adCooldownUntil = null; needsUpdate = true; }
            if (data.lastDailyReset === undefined) { updates.lastDailyReset = serverTimestamp(); needsUpdate = true; }
            if (!data.taskHistory) { updates.taskHistory = []; needsUpdate = true; }

            if (Object.keys(updates).length > 0 && needsUpdate) {
              await updateDoc(userRef, sanitizeFirestoreData(updates));
              logger.log('Sync', 'Profile update complete');
            } else {
              logger.log('Sync', 'Profile already up to date');
            }
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
            pendingWithdrawalBalance: 0,
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
            totalAdRewards: 0,
            adCooldownUntil: null,
            lastDailyReset: serverTimestamp(),
            taskHistory: [],
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
        balance: increment(500),
        totalEarned: increment(500)
      });
      
      // Process the referral logic (creates record, updates referrer stats)
      await processReferralWithRetry(user.id.toString(), cleanCode);
      
      logger.log('Sync', 'Code redemption successful', { cleanCode });
      return { success: true, message: '500 PEPE credited!' };
    } catch (err) {
      logger.error('Sync', 'Redemption failed', err);
      return { success: false, message: 'Protocol error.' };
    }
  };

  if (isInitializing || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center border border-slate-100 shadow-sm">
            <Loader2 className="w-8 h-8 text-slate-900 animate-spin" />
          </div>
        </div>
        <div>
          <h2 className="text-sm font-black tracking-widest text-slate-900 uppercase">Syncing Protocol</h2>
          <p className="mt-1 text-slate-400 font-bold uppercase tracking-widest text-[8px]">
            {initStep}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white p-8 text-center">
        <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-8 border border-slate-100">
          <ShieldCheck className="w-10 h-10 text-slate-300" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-3">Connection Lost</h2>
        <p className="text-slate-400 mb-10 max-w-[280px] mx-auto text-[10px] font-bold tracking-widest leading-relaxed uppercase">
          {error}
        </p>
        <button 
          onClick={() => window.location.reload()} 
          className="w-full max-w-[200px] h-12 bg-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white active:scale-95 transition-all"
        >
          Retry Link
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-slate-50 text-slate-900 font-sans flex items-center justify-center overflow-hidden relative">
      {/* App Container */}
      <div className="relative w-full h-full sm:w-[390px] sm:h-[844px] sm:max-h-[95vh] bg-white sm:border border-slate-100 sm:rounded-[40px] shadow-sm flex flex-col overflow-hidden">
        
        {/* Header */}
        <header 
          onClick={handleDebugToggle}
          className="shrink-0 pt-3 px-6 pb-2.5 flex justify-between items-center z-[60] bg-white/80 backdrop-blur-md border-b border-slate-100 relative"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden bg-white border border-slate-100 shadow-sm p-0.5">
              <img 
                src="/logo.png" 
                alt="Logo" 
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/identicon/svg?seed=pepe';
                }}
              />
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm font-bold tracking-tight text-slate-900 leading-none uppercase">Pepe Earn</h1>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                <span className="text-[7px] font-bold text-slate-400 tracking-widest uppercase leading-none">NODE ACTIVE</span>
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => setIsCurrencyModalOpen(true)}
            className="w-8 h-8 rounded-lg border border-slate-100 bg-white flex items-center justify-center text-slate-400 active:scale-90 transition-all shadow-sm hover:text-slate-900"
          >
            <Settings size={14} />
          </button>
        </header>

        {/* content */}
        <main className="flex-1 overflow-y-auto no-scrollbar pb-36 pt-4 touch-pan-y overscroll-contain relative scroll-smooth bg-slate-50/[0.15]">
          {/* Subtle Ambient light for content area */}
          <div className="fixed inset-x-0 top-32 h-[500px] bg-emerald-500/[0.03] blur-[150px] rounded-full -z-10 pointer-events-none"></div>
          
          {activeTab === 'home' && (
            <HomeTab 
              user={user}
              profile={profile}
              currencyDisplay={currencyDisplay}
              levelProgress={levelProgress}
              dailyProgress={dailyProgress}
              userRank={userRank}
              handleClaimLevelBonus={handleClaimLevelBonus}
            />
          )}

          {activeTab === 'earn' && (
            <EarnTab 
              profile={profile}
              adState={adState}
              isLimitReached={isLimitReached}
              cooldownRemaining={cooldownRemaining}
              handleWatchAd={handleWatchAd}
              resetCountdown={resetCountdown}
            />
          )}

          {activeTab === 'wallet' && (
            <WalletTab 
              profile={profile}
              currencyDisplay={currencyDisplay}
              updateProfile={() => {}}
            />
          )}

          {activeTab === 'friends' && profile && (
            <ReferralPanel 
              profile={profile} 
              onRedeemCode={redeemReferralCode}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileTab 
              user={user}
              profile={profile}
              setIsCurrencyModalOpen={setIsCurrencyModalOpen}
            />
          )}

          {activeTab === 'home' && <PepePriceTicker preferredCurrency={profile?.preferredCurrency} />}
        </main>

        {/* Ad Overlay */}
        <AnimatePresence>
          {(adState === 'loading' || adState === 'watching') && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[200] bg-white/95 backdrop-blur-2xl flex flex-col items-center justify-center p-12 text-center"
            >
              <div className="relative mb-20 scale-125">
                <div className="absolute -inset-10 bg-emerald-500/[0.15] blur-3xl rounded-full animate-pulse"></div>
                <div className="w-28 h-28 rounded-[40px] bg-white border border-slate-100 flex items-center justify-center relative z-10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)]">
                  {adState === 'loading' ? (
                     <Loader2 size={48} className="text-slate-900 animate-spin" strokeWidth={3} />
                  ) : (
                     <PlayCircle size={48} className="text-slate-900 animate-pulse" strokeWidth={3} />
                  )}
                </div>
              </div>

              <div className="space-y-4 mb-20">
                <h3 className="text-2xl font-black tracking-[0.25em] text-slate-900 uppercase italic font-display">
                  {adState === 'loading' ? 'Syncing...' : 'Mined Link'}
                </h3>
                <div className="flex items-center justify-center gap-3">
                  <Timer size={16} className="text-emerald-500" />
                  <p className="text-[12px] font-black text-slate-500 uppercase tracking-[0.3em]">
                    {adTimer}S Remaining
                  </p>
                </div>
              </div>

              <div className="w-full max-w-[260px] space-y-6">
                <div className="h-2.5 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100 p-0.5 shadow-inner">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${adProgress}%` }}
                    className="h-full bg-slate-900 rounded-full shadow-sm relative overflow-hidden"
                    transition={{ type: "tween", ease: "linear" }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                  </motion.div>
                </div>
                <div className="flex justify-between items-center px-1">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{Math.round(adProgress)}% SYNC</span>
                   <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest animate-pulse">Securing...</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reward Success */}
        <AnimatePresence>
          {adState === 'reward' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-x-0 top-1/3 z-[210] flex flex-col items-center justify-center p-6 pointer-events-none"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 10 }}
                className="bg-white/95 backdrop-blur-xl rounded-[32px] p-6 border border-slate-100 text-center relative z-10 flex flex-col items-center w-[260px] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] pointer-events-auto"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4 border border-emerald-100/50 shadow-inner relative group">
                  <CheckCircle2 size={24} className="text-emerald-600 relative z-10" strokeWidth={3} />
                </div>
                
                <h3 className="text-sm font-black tracking-widest text-slate-900 mb-1 uppercase">Protocol Synced</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-4">Mined Reward Found</p>
                
                <div className="bg-slate-50/50 rounded-2xl py-3 px-4 border border-slate-100/50 mb-5 w-full text-center relative overflow-hidden group">
                  <div className="text-2xl font-black text-slate-900 tabular-nums tracking-tight relative z-10 font-display italic">+{lastReward} PEPE</div>
                </div>

                <button 
                  onClick={() => {
                    setAdState('cooldown');
                    setCooldownRemaining(adService.AD_CONFIG.COOLDOWN_SECONDS);
                  }}
                  className="w-full h-10 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-[0.96] transition-all shadow-lg shadow-slate-200 hover:bg-slate-800"
                >
                  Accept Reward
                </button>
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
          <div className="absolute inset-0 z-[300] bg-white p-8 overflow-y-auto text-[11px] font-mono">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <span className="text-slate-900 font-bold uppercase tracking-widest">Protocol Debugger</span>
              <button onClick={() => setShowDebug(false)} className="text-slate-400 hover:text-slate-900 p-2 bg-slate-50 rounded-xl"><X size={18} /></button>
            </div>
            <div className="space-y-6">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <p className="text-slate-400 mb-3 uppercase text-[9px] font-black tracking-widest">System Internals</p>
                <div className="space-y-2">
                  <p className="flex justify-between"><span>Tab:</span> <span className="text-slate-900 font-bold">{activeTab}</span></p>
                  <p className="flex justify-between"><span>Ad State:</span> <span className="text-slate-900 font-bold">{adState}</span></p>
                  <p className="flex justify-between"><span>Cooldown:</span> <span className="text-slate-900 font-bold">{cooldownRemaining}s</span></p>
                  <p className="flex justify-between"><span>Daily Limit:</span> <span className="text-slate-900 font-bold">{String(isLimitReached)}</span></p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Global Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 z-[100] px-6 pb-8 pointer-events-none sm:absolute">
          <div className="bg-white rounded-[32px] p-2 grid grid-cols-5 shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-100 pointer-events-auto">
            <NavItem icon={<LayoutDashboard size={20} />} active={activeTab === 'home'} label="Dash" onClick={() => setActiveTab('home')} />
            <NavItem icon={<Zap size={20} />} active={activeTab === 'earn'} label="Earn" onClick={() => setActiveTab('earn')} />
            <NavItem icon={<Wallet size={20} />} active={activeTab === 'wallet'} label="Asset" onClick={() => setActiveTab('wallet')} />
            <NavItem icon={<Users size={20} />} active={activeTab === 'friends'} label="Peers" onClick={() => setActiveTab('friends')} />
            <NavItem icon={<UserIcon size={20} />} active={activeTab === 'profile'} label="Node" onClick={() => setActiveTab('profile')} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-components moved to UIElements.tsx

