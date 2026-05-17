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
  const [adState, setAdState] = useState<'idle' | 'loading' | 'cooldown'>('idle');
  const [referralParam, setReferralParam] = useState<string | null>(null);
  const [rewardToast, setRewardToast] = useState<{ show: boolean, amount: number }>({ show: false, amount: 0 });
  const [levelUpData, setLevelUpData] = useState<{ show: boolean, level: number, bonus: number }>({ show: false, level: 0, bonus: 0 });
  const [socialTaskVerify, setSocialTaskVerify] = useState<{ show: boolean, taskId: string, url: string, reward: number, status: 'idle' | 'opening' | 'verifying' | 'failed' | 'success' }>({ show: false, taskId: '', url: '', reward: 0, status: 'idle' });
  const hasOpenedLinkRef = useRef<Record<string, boolean>>({});

  const adStateRef = useRef(adState);
  useEffect(() => { adStateRef.current = adState; }, [adState]);

  const initialSyncRef = useRef(true);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
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

  const lastOptimisticUpdateRef = useRef<number>(0);
  const isProcessingRewardRef = useRef(false);

  const startSync = (tgUser: TelegramUser) => {
    logger.log('Sync', 'Establishing Real-time listener...');
    const userRef = doc(db, 'users', tgUser.id.toString());
    
    return onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        
        // Update state and cache - Optimized equality check
        setProfile((prev) => {
          if (!prev) return data;

          // Optimization: check if we should strictly follow the server or trust our optimistic state
          const nowMs = Date.now();
          const isRecentUpdate = nowMs - lastOptimisticUpdateRef.current < 8000;
          
          let adsWatchedToday = data.adsWatchedToday;
          let balance = data.balance;
          let tasksCompleted = data.tasksCompleted;
          let level: number;
          let xp: number;
          let levelProgress: number;

          if (isRecentUpdate) {
            // Keep the higher value if we just updated locally to prevent flickering/reverting
            adsWatchedToday = Math.max(data.adsWatchedToday || 0, prev.adsWatchedToday || 0);
            balance = Math.max(data.balance || 0, prev.balance || 0);
            tasksCompleted = Math.max(data.tasksCompleted || 0, prev.tasksCompleted || 0);
            
            // Level and XP protection
            // If local level is higher, trust local. If level same, trust higher XP.
            const serverLevel = data.level || 1;
            const localLevel = prev.level || 1;
            if (localLevel > serverLevel) {
              level = localLevel;
              xp = prev.xp || 0;
              levelProgress = prev.levelProgress || 0;
            } else if (localLevel === serverLevel) {
              level = serverLevel;
              xp = Math.max(data.xp || 0, prev.xp || 0);
              levelProgress = Math.max(data.levelProgress || 0, prev.levelProgress || 0);
            } else {
              level = serverLevel;
              xp = data.xp || 0;
              levelProgress = data.levelProgress || 0;
            }

            logger.log('Sync', 'Optimistic merge', { serverAds: data.adsWatchedToday, localAds: prev.adsWatchedToday, level, xp });
          } else {
            level = data.level;
            xp = data.xp;
            levelProgress = data.levelProgress;
          }

          if (
            prev.balance === balance && 
            prev.referCount === data.referCount && 
            prev.totalReferrals === data.totalReferrals &&
            prev.level === level &&
            prev.preferredCurrency === data.preferredCurrency &&
            prev.xp === xp &&
            prev.adsWatchedToday === adsWatchedToday &&
            prev.tasksCompleted === tasksCompleted &&
            prev.pendingWithdrawalBalance === data.pendingWithdrawalBalance &&
            prev.lastWithdrawalAt === data.lastWithdrawalAt
          ) {
            return prev;
          }
          
          return { ...data, adsWatchedToday, balance, tasksCompleted, level, xp, levelProgress };
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
    if (!user || !profile || isProcessingRewardRef.current) return;
    
    if (adState === 'cooldown' || adState === 'loading') {
      logger.log('Ads', 'Blocked: state is ' + adState);
      return;
    }

    const check = adService.canWatchAd(profile);
    if (!check.canWatch) {
      if (check.reason?.includes('limit')) setIsLimitReached(true);
      if (window.Telegram?.WebApp?.showAlert) {
        window.Telegram.WebApp.showAlert(check.reason || 'Ad limit reached');
      }
      return;
    }

    setAdState('loading');
    logger.log('Ads', 'Launching GigaPub ad...');

    try {
      if (typeof window.showGiga === 'function') {
        window.showGiga()
          .then(async () => {
            logger.log('Ads', 'GigaPub ad completed successfully');
            await completeAd();
          })
          .catch((err) => {
            logger.error('Ads', 'GigaPub ad failed/closed', err);
            setAdState('idle');
            if (window.Telegram?.WebApp?.showAlert) {
              window.Telegram.WebApp.showAlert('Advertisement closed or failed to load. Please try again.');
            }
          });
      } else {
        logger.error('Ads', 'GigaPub SDK not found');
        setAdState('idle');
        if (window.Telegram?.WebApp?.showAlert) {
          window.Telegram.WebApp.showAlert('Ad service unavailable. Please check your connection or ad-blocker.');
        } else {
          // Fallback simulation for development if requested or just alert
          alert('Ad service unavailable.');
        }
      }
    } catch (err) {
      logger.error('Ads', 'Fatal error launching ad', err);
      setAdState('idle');
    }
  };

  const completeAd = async () => {
    if (!user || isProcessingRewardRef.current) return;
    
    isProcessingRewardRef.current = true;
    const reward = adService.getSimulatedReward();
    
    setAdState('cooldown');
    setCooldownRemaining(adService.AD_CONFIG.COOLDOWN_SECONDS);
    lastOptimisticUpdateRef.current = Date.now();

    // Show success toast
    setRewardToast({ show: true, amount: reward });
    setTimeout(() => setRewardToast({ show: false, amount: 0 }), 3000);

    logger.log('Ads', 'Processing reward', { reward });

    // Optimistic UI update for ad reward only
    setProfile(prev => {
      if (!prev) return prev;
      const now = new Date();
      const lastReset = safeDate(prev.lastDailyReset);
      const isNewDay = now.toDateString() !== lastReset.toDateString();

      const xpGain = 4;
      let newXp = (prev.xp || 0) + xpGain;
      let newLevel = prev.level || 1;
      
      const xpForNextLevel = 100;
      if (newXp >= xpForNextLevel) {
        const levelsGained = Math.floor(newXp / xpForNextLevel);
        newLevel += levelsGained;
        newXp = newXp % xpForNextLevel;
      }
      
      const levelProgress = Math.floor((newXp / xpForNextLevel) * 100);

      return {
        ...prev,
        balance: (prev.balance || 0) + reward,
        adsWatchedToday: isNewDay ? 1 : (prev.adsWatchedToday || 0) + 1,
        tasksCompleted: (prev.tasksCompleted || 0) + 1,
        totalEarned: (prev.totalEarned || 0) + reward,
        lastDailyReset: isNewDay ? now : prev.lastDailyReset,
        adCooldownUntil: new Date(now.getTime() + adService.AD_CONFIG.COOLDOWN_SECONDS * 1000),
        level: newLevel,
        xp: newXp,
        levelProgress: levelProgress
      };
    });

    try {
      await adService.claimAdReward(user.id.toString(), reward, profile!);
      logger.log('Ads', 'Reward claimed on server');
    } catch (err) {
      logger.error('Ads', 'Reward claim failed', err);
    } finally {
      isProcessingRewardRef.current = false;
    }
  };

  const handleClaimLevelBonus = async () => {
    if (!user || !profile || isProcessingRewardRef.current) return;
    
    const unclaimedLevels = (profile.level || 1) - (profile.lastClaimedLevel || 1);
    if (unclaimedLevels <= 0) return;

    const bonusAmount = unclaimedLevels * 500;
    isProcessingRewardRef.current = true;

    // Optimistic update
    setProfile(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        balance: (prev.balance || 0) + bonusAmount,
        totalEarned: (prev.totalEarned || 0) + bonusAmount,
        lastClaimedLevel: prev.level
      };
    });

    // Show success toast
    setRewardToast({ show: true, amount: bonusAmount });
    setTimeout(() => setRewardToast({ show: false, amount: 0 }), 3000);

    try {
      await adService.claimLevelBonus(user.id.toString(), profile);
      logger.log('Ads', 'Level bonus claimed successfully');
    } catch (err) {
      logger.error('Ads', 'Level bonus claim failed', err);
    } finally {
      isProcessingRewardRef.current = false;
    }
  };

  const handleHandleSocialTask = (taskId: string, url: string, reward: number) => {
    logger.log('Social', `Starting task ${taskId}`, { url });
    if ((profile as any)?.completedTasks?.includes(taskId)) {
      logger.log('Social', 'Task already completed');
      return;
    }
    
    // Immediately open the link to satisfy browser requirements for user-initiated actions
    try {
      if (window.Telegram?.WebApp?.openTelegramLink) {
        logger.log('Social', 'Opening via Telegram openTelegramLink');
        window.Telegram.WebApp.openTelegramLink(url);
      } else if (window.Telegram?.WebApp?.openLink) {
        logger.log('Social', 'Opening via Telegram openLink');
        window.Telegram.WebApp.openLink(url);
      } else {
        logger.log('Social', 'Opening via window.open');
        const win = window.open(url, '_blank', 'noopener,noreferrer');
        if (!win) {
          logger.log('Social', 'window.open failed, trying location.href');
          // Fallback if window.open is blocked, though not ideal
          // window.location.href = url; 
        }
      }
      hasOpenedLinkRef.current[taskId] = true;
    } catch (e) {
      logger.error('Social', 'Link opening error', e);
    }

    // Show verification modal starting at "verifying" status
    setSocialTaskVerify({ show: true, taskId, url, reward, status: 'verifying' });

    // Auto-start verification process after transition
    setTimeout(() => {
      verifySocialTask(taskId, reward);
    }, 4000);
  };

  const verifySocialTask = async (taskId: string, reward: number) => {
    try {
      const result = await adService.claimSocialTask(user!.id.toString(), taskId, reward);
      if (result.success) {
        setSocialTaskVerify(prev => ({ ...prev, status: 'success' }));
        setRewardToast({ show: true, amount: reward });
        setTimeout(() => setRewardToast({ show: false, amount: 0 }), 3000);
        setTimeout(() => setSocialTaskVerify(prev => ({ ...prev, show: false })), 2000);
      }
    } catch (e) {
      setSocialTaskVerify(prev => ({ ...prev, status: 'failed' }));
    }
  };

  const startSocialTaskVerification = async () => {
    // This is now used as a "Try Again" trigger from modal
    if (socialTaskVerify.status === 'success') return;
    
    setSocialTaskVerify(prev => ({ ...prev, status: 'verifying' }));
    
    // Attempt to open link again if they say they didn't join
    if (!hasOpenedLinkRef.current[socialTaskVerify.taskId]) {
      if (window.Telegram?.WebApp?.openTelegramLink) {
        window.Telegram.WebApp.openTelegramLink(socialTaskVerify.url);
      } else {
        window.open(socialTaskVerify.url, '_blank');
      }
      hasOpenedLinkRef.current[socialTaskVerify.taskId] = true;
    }

    setTimeout(() => {
      verifySocialTask(socialTaskVerify.taskId, socialTaskVerify.reward);
    }, 5000);
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
          const timeSinceLastLogin = now - lastLoginTime;
          
          const isValidReferralId = (id: any) => id && id !== 'null' && id !== 'undefined' && id !== '';
          let currentReferredBy = isValidReferralId(data.referredBy) ? data.referredBy : null;
          const canBeReferred = !currentReferredBy && !data.referralProcessed && isValidReferralId(referralId) && referralId !== userId;

          // 2. Determine if metadata update is needed
          let metadataNeedsUpdate = false;
          if (timeSinceLastLogin > 300000) metadataNeedsUpdate = true;
          if (!data.referralCode) metadataNeedsUpdate = true;
          if (canBeReferred) metadataNeedsUpdate = true;
          
          // Additional checks for structural missing fields (from previous versions)
          if (data.totalAdRewards === undefined) metadataNeedsUpdate = true;
          if (data.adCooldownUntil === undefined) metadataNeedsUpdate = true;
          if (data.lastDailyReset === undefined) metadataNeedsUpdate = true;
          if (data.adsWatchedToday === undefined) metadataNeedsUpdate = true;
          if (data.tasksCompleted === undefined) metadataNeedsUpdate = true;

          if (metadataNeedsUpdate) {
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

            if (data.totalAdRewards === undefined) updates.totalAdRewards = 0;
            if (data.adCooldownUntil === undefined) updates.adCooldownUntil = null;
            if (data.lastDailyReset === undefined) updates.lastDailyReset = serverTimestamp();
            if (data.adsWatchedToday === undefined) updates.adsWatchedToday = 0;
            if (data.tasksCompleted === undefined) updates.tasksCompleted = 0;

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
            pendingWithdrawalBalance: 0,
            totalEarned: 0,
            adsWatchedToday: 0,
            tasksCompleted: 0,
            xp: 0,
            level: 1,
            levelProgress: 0,
            lastClaimedLevel: 1,
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
        <main className="flex-1 overflow-y-auto pb-36 pt-4 touch-pan-y overscroll-contain relative scroll-smooth bg-slate-50/[0.15]">
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
              onHandleSocialTask={handleHandleSocialTask}
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

        {/* Social Task Verification Modal */}
        <AnimatePresence>
          {socialTaskVerify.show && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[250] bg-white/60 backdrop-blur-3xl flex items-center justify-center p-8 active:scale-[1.01] transition-transform"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 40, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.9, y: 40, opacity: 0 }}
                className="w-full max-w-[320px] bg-white rounded-[40px] border border-slate-100 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)] p-10 flex flex-col items-center text-center relative overflow-hidden group"
              >
                <button 
                  onClick={() => setSocialTaskVerify({ ...socialTaskVerify, show: false })}
                  className="absolute top-6 right-6 w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"
                >
                  <X size={18} />
                </button>

                <div className="relative mb-8 mt-4">
                  <div className="w-20 h-20 rounded-[28px] bg-slate-900 flex items-center justify-center relative z-10 shadow-xl">
                    <Users size={32} className="text-white" />
                  </div>
                  {socialTaskVerify.status === 'success' && (
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg border-4 border-white z-20">
                      <CheckCircle2 size={16} strokeWidth={3} />
                    </div>
                  )}
                </div>

                <div className="space-y-2 mb-10">
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">Verify Mission</h3>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] leading-relaxed">
                    Extraction Protocol Requires <br /> Channel Synchronization
                  </p>
                </div>

                <div className="w-full bg-slate-50 rounded-[24px] border border-slate-100 p-6 mb-8">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${socialTaskVerify.status !== 'idle' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200'}`}>
                        {socialTaskVerify.status !== 'idle' ? <CheckCircle2 size={12} strokeWidth={3} /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />}
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${socialTaskVerify.status !== 'idle' ? 'text-slate-900' : 'text-slate-400'}`}>Join Channel</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${['verifying', 'success', 'failed'].includes(socialTaskVerify.status) ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200'}`}>
                        {['verifying', 'success', 'failed'].includes(socialTaskVerify.status) ? <CheckCircle2 size={12} strokeWidth={3} /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />}
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${['verifying', 'success', 'failed'].includes(socialTaskVerify.status) ? 'text-slate-900' : 'text-slate-400'}`}>Verify Protocol</span>
                    </div>
                  </div>
                </div>

                {socialTaskVerify.status === 'idle' ? (
                  <button 
                    onClick={startSocialTaskVerification}
                    className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest active:scale-95 transition-all shadow-xl shadow-slate-200"
                  >
                    Start Verification
                  </button>
                ) : socialTaskVerify.status === 'success' ? (
                   <div className="text-emerald-600 text-[10px] font-black uppercase tracking-widest animate-pulse">
                      Synchronization Complete
                   </div>
                ) : socialTaskVerify.status === 'failed' ? (
                  <div className="space-y-4 w-full">
                    <div className="text-rose-500 text-[9px] font-black uppercase tracking-[0.2em]">Verification Failed. Please join first.</div>
                    <button 
                      onClick={() => setSocialTaskVerify({ ...socialTaskVerify, status: 'idle' })}
                      className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest active:scale-95 transition-all"
                    >
                      Try Again
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 size={24} className="text-slate-900 animate-spin" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Processing Node...</span>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reward Success Toast */}
        <AnimatePresence>
          {rewardToast.show && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[200] bg-slate-900 text-white px-6 py-4 rounded-[24px] shadow-2xl flex items-center gap-4 border border-white/10 backdrop-blur-md"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <CheckCircle2 size={24} className="text-white" strokeWidth={3} />
              </div>
              <div className="flex flex-col pr-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Earned</span>
                <span className="text-xl font-black italic tracking-tight italic">+{rewardToast.amount} PEPE</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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

