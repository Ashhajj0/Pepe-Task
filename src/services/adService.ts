import { db } from '../lib/firebase';
import { doc, writeBatch, increment, serverTimestamp, getDoc, updateDoc, runTransaction, Timestamp } from 'firebase/firestore';
import { UserProfile } from '../types';
import { sanitizeFirestoreData, safeDate } from '../lib/utils/firestore';

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
  const now = new Date();
  const lastReset = safeDate(profile.lastDailyReset);
  const isNewDay = now.toDateString() !== lastReset.toDateString();
  
  if (!isNewDay && profile.adsWatchedToday >= AD_CONFIG.DAILY_LIMIT) {
    return { canWatch: false, reason: 'Daily limit reached. Come back tomorrow.' };
  }

  // Check Cooldown
  if (profile.adCooldownUntil) {
    const cooldownUntil = safeDate(profile.adCooldownUntil);
    const msLeft = cooldownUntil.getTime() - now.getTime();
    
    if (msLeft > 0) {
      return { 
        canWatch: false, 
        reason: 'Cooldown active', 
        remainingCooldown: Math.ceil(msLeft / 1000) 
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
  console.log(`[adService] Starting claimAdReward for user ${userId}, reward: ${reward}`);

  try {
    const result = await runTransaction(db, async (transaction) => {
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists()) throw new Error('User not found');
      
      const userData = userSnap.data() as UserProfile;
      const currentAdsCount = userData.adsWatchedToday || 0;
      
      // Daily Reset Logic check inside transaction
      const now = new Date();
      const todayStr = now.toDateString(); 
      const lastResetStr = safeDate(userData.lastDailyReset).toDateString();
      const isNewDay = todayStr !== lastResetStr;
      
      const nextAdsCount = isNewDay ? 1 : currentAdsCount + 1;
      
      console.log(`[adService] User ${userId}: currentAds: ${currentAdsCount}, nextAds: ${nextAdsCount}, isNewDay: ${isNewDay}`);

      if (nextAdsCount > AD_CONFIG.DAILY_LIMIT) {
        throw new Error('Daily limit reached');
      }

      // Check Cooldown
      const cooldownUntil = safeDate(userData.adCooldownUntil);
      if (now < cooldownUntil) {
        throw new Error('Cooldown active');
      }

      // Calculate XP and level
      const xpGain = 4;
      let newXp = (userData.xp || 0) + xpGain;
      let newLevel = userData.level || 1;
      let totalBonus = 0;
      
      const xpForNextLevel = 100;
      if (newXp >= xpForNextLevel) {
        const levelsGained = Math.floor(newXp / xpForNextLevel);
        newLevel += levelsGained;
        newXp = newXp % xpForNextLevel;
        
        // Level up reward: 500 PEPE per level
        totalBonus = levelsGained * 500;
      }
      
      const levelProgress = Math.floor((newXp / xpForNextLevel) * 100);

      const nextCooldown = new Date(now.getTime() + AD_CONFIG.COOLDOWN_SECONDS * 1000);

      const updateData: any = {
        balance: increment(reward),
        totalEarned: increment(reward),
        totalAdRewards: increment(reward),
        adsWatchedToday: isNewDay ? 1 : increment(1),
        tasksCompleted: increment(1),
        lastAdWatchTime: serverTimestamp(),
        adCooldownUntil: Timestamp.fromDate(nextCooldown),
        level: newLevel,
        xp: newXp,
        levelProgress: levelProgress
      };

      if (totalBonus > 0) {
        updateData.lastClaimedLevel = newLevel;
      }

      if (isNewDay || !userData.lastDailyReset) {
        // Use local now for immediate consistency in next transaction read
        updateData.lastDailyReset = Timestamp.fromDate(now);
      }

      transaction.update(userRef, sanitizeFirestoreData(updateData));

      // Handle referral commission (10%)
      const referredBy = userData.referredBy;
      const isValidReferrer = referredBy && referredBy !== 'null' && referredBy !== 'undefined' && referredBy !== '';
      
      if (isValidReferrer) {
        const commission = Math.floor(reward * 0.1);
        const referrerRef = doc(db, 'users', referredBy);
        const referralId = `${referredBy}_${userId}`;
        const referralRef = doc(db, 'referrals', referralId);
        
        if (commission > 0) {
          console.log(`[adService] Crediting commission ${commission} to referrer ${referredBy}`);
          transaction.update(referrerRef, {
            balance: increment(commission),
            referralEarnings: increment(commission),
            totalEarned: increment(commission)
          });

          // Update the referral tracking document to show in activity list
          transaction.update(referralRef, {
            totalGenerated: increment(reward),
            totalCommissionPaid: increment(commission)
          });
        }
      }

      return { reward, totalBonus, newLevel, leveledUp: newLevel > userData.level };
    });

    console.log(`[adService] Transaction success for user ${userId}. Reward: ${reward}`);
    return { success: true, ...result };
  } catch (error) {
    console.error('[adService] Error claiming reward:', error);
    throw error;
  }
};

export const claimSocialTask = async (userId: string, taskId: string, rewardValue: number) => {
  const userRef = doc(db, 'users', userId);
  
  try {
    const result = await runTransaction(db, async (transaction) => {
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists()) throw new Error('User not found');
      
      const userData = userSnap.data() as any;
      const completedTasks = userData.completedTasks || [];
      
      if (completedTasks.includes(taskId)) {
        throw new Error('Task already completed');
      }
      
      transaction.update(userRef, {
        balance: increment(rewardValue),
        totalEarned: increment(rewardValue),
        completedTasks: [...completedTasks, taskId]
      });
      
      return { success: true, reward: rewardValue };
    });
    
    return result;
  } catch (error) {
    console.error('[adService] Error claiming social task reward:', error);
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

// Daily reset is handled atomically in the claimAdReward transaction. 
// No standalone reset function is needed to prevent write conflicts.

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
