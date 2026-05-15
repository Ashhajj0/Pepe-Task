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

  // Memoized derived values for performance
  const currencyDisplay = useMemo(() => {
    if (!profile) return { symbol: '$', rate: 0.000008, formatted: '$0.00' };
    const curr = profile.preferredCurrency || 'pepe';
    const isPepe = curr === 'pepe';
    
    if (isPepe) {
      return { 
        symbol: '$', 
        rate: pepePrice || 0.000008, 
        formatted: `≈ $${((safeNumber(profile.balance)) * (pepePrice || 0.000008)).toFixed(4)} USD` 
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
            prev.adsWatchedToday === data.adsWatchedToday
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
              />
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
              <ProfileTab 
                user={user}
                profile={profile}
                setIsCurrencyModalOpen={setIsCurrencyModalOpen}
              />
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

// Sub-components moved to UIElements.tsx

