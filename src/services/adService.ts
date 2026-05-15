import { db } from '../lib/firebase';
import { doc, writeBatch, increment, serverTimestamp, getDoc, updateDoc, runTransaction } from 'firebase/firestore';
import { UserProfile } from '../types';
import { sanitizeFirestoreData } from '../lib/utils/firestore';

export const AD_CONFIG = {
  DAILY_LIMIT: 15,
  COOLDOWN_SECONDS: 10,
  REWARD_MIN: 0,
  REWARD_MAX: 100,
  AD_DURATION_MIN: 1,
  AD_DURATION_MAX: 2,
};

export const canWatchAd = (profile: UserProfile | null): { canWatch: boolean; reason?: string; remainingCooldown?: number } => {
  if (!profile) return { canWatch: false, reason: 'Profile not loaded' };

  // Check Daily Limit
  const today = new Date().toISOString().split('T')[0];
  if (profile.lastResetDate === today && profile.adsWatchedToday >= AD_CONFIG.DAILY_LIMIT) {
    return { canWatch: false, reason: 'Daily limit reached. Come back tomorrow.' };
  }

  // Check Cooldown
  if (profile.lastAdWatchTime) {
    const lastWatch = profile.lastAdWatchTime.seconds ? profile.lastAdWatchTime.seconds * 1000 : new Date(profile.lastAdWatchTime).getTime();
    const now = Date.now();
    const elapsed = (now - lastWatch) / 1000;
    
    if (elapsed < AD_CONFIG.COOLDOWN_SECONDS) {
      return { 
        canWatch: false, 
        reason: 'Cooldown active', 
        remainingCooldown: Math.ceil(AD_CONFIG.COOLDOWN_SECONDS - elapsed) 
      };
    }
  }

  return { canWatch: true };
};

export const getSimulatedReward = () => {
  return Math.floor(Math.random() * (AD_CONFIG.REWARD_MAX - AD_CONFIG.REWARD_MIN + 1)) + AD_CONFIG.REWARD_MIN;
};

export const getSimulatedDuration = () => {
  return Math.floor(Math.random() * (AD_CONFIG.AD_DURATION_MAX - AD_CONFIG.AD_DURATION_MIN + 1)) + AD_CONFIG.AD_DURATION_MIN;
};

export const claimAdReward = async (userId: string, reward: number, currentProfile: UserProfile) => {
  const userRef = doc(db, 'users', userId);
  const today = new Date().toISOString().split('T')[0];

  try {
    const result = await runTransaction(db, async (transaction) => {
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists()) throw new Error('User not found');
      
      const userData = userSnap.data() as UserProfile;
      
      // Calculate XP and level
      const xpGain = 10;
      let newXp = (userData.xp || 0) + xpGain;
      let newLevel = userData.level || 1;
      
      // Level progression logic: 100 XP per level
      const xpForNextLevel = 100;
      if (newXp >= xpForNextLevel) {
        newLevel += Math.floor(newXp / xpForNextLevel);
        newXp = newXp % xpForNextLevel;
      }
      
      const levelProgress = Math.floor((newXp / xpForNextLevel) * 100);

      const updateData = sanitizeFirestoreData({
        balance: increment(reward),
        totalEarned: increment(reward),
        adsWatchedToday: increment(1),
        tasksCompleted: increment(1),
        lastAdWatchTime: serverTimestamp(),
        lastResetDate: today,
        level: newLevel,
        xp: newXp,
        levelProgress: levelProgress
      });

      transaction.update(userRef, updateData);

      // Handle referral commission (10%)
      const referredBy = userData.referredBy;
      const isValidReferrer = referredBy && referredBy !== 'null' && referredBy !== 'undefined' && referredBy !== '';
      
      if (isValidReferrer) {
        // Calculate 10% commission, floor to avoid fractional PEPE if they used decimals, 
        // but PEPE is usually integer-based here.
        const commission = Math.floor(reward * 0.1);
        
        const referrerRef = doc(db, 'users', referredBy);
        const referralId = `${referredBy}_${userId}`;
        const referralRef = doc(db, 'referrals', referralId);

        if (commission > 0) {
          transaction.update(referrerRef, {
            balance: increment(commission),
            referralEarnings: increment(commission),
            totalEarned: increment(commission)
          });
        }
        
        // Always update referral record stats to show activity
        transaction.update(referralRef, {
          totalGenerated: increment(reward),
          totalCommissionPaid: increment(commission)
        });
      }

      return { reward, leveledUp: newLevel > userData.level };
    });

    return { success: true, ...result };
  } catch (error) {
    console.error('Error claiming reward:', error);
    throw error;
  }
};

export const claimLevelBonus = async (userId: string, currentProfile: UserProfile) => {
  const userRef = doc(db, 'users', userId);
  const bonus = 500;

  try {
    await runTransaction(db, async (transaction) => {
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists()) throw new Error('User not found');
      const userData = userSnap.data() as UserProfile;

      if (userData.level < 2) throw new Error('Level bonuses start from level 2');
      if ((userData.lastClaimedLevel || 0) >= userData.level) {
        throw new Error('Level bonus already claimed for current level');
      }

      transaction.update(userRef, sanitizeFirestoreData({
        balance: increment(bonus),
        totalEarned: increment(bonus),
        lastClaimedLevel: userData.level
      }));
    });
    return { success: true, bonus };
  } catch (error) {
    console.error('Error claiming level bonus:', error);
    throw error;
  }
};

export const checkAndResetDailyLimit = async (userId: string, profile: UserProfile) => {
  const today = new Date().toISOString().split('T')[0];
  if (profile.lastResetDate !== today) {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      adsWatchedToday: 0,
      lastResetDate: today
    });
  }
};

export const getTimeUntilNextReset = () => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const diff = tomorrow.getTime() - now.getTime();
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return {
    hours: hours.toString().padStart(2, '0'),
    minutes: minutes.toString().padStart(2, '0'),
    seconds: seconds.toString().padStart(2, '0'),
    totalSeconds: Math.floor(diff / 1000)
  };
};
