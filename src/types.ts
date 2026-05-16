export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export interface UserProfile {
  telegramId: number;
  username: string;
  first_name: string;
  last_name: string;
  photo_url: string;
  balance: number;
  pendingWithdrawalBalance: number;
  totalEarned: number;
  adsWatchedToday: number;
  tasksCompleted: number;
  lastAdWatchTime?: any;
  lastResetDate?: string;
  lastWithdrawalAt?: any;
  trustScore: number;
  level: number;
  xp: number;
  levelProgress: number;
  lastClaimedLevel?: number;
  preferredCurrency?: string;
  referCount: number;
  referralCode: string;
  referralLink: string;
  referredBy?: string;
  referralProcessed?: boolean;
  totalReferrals: number;
  activeReferrals: number;
  referralEarnings: number;
  createdAt: any; 
  lastLogin: any;
}

export type WithdrawalStatus = 'pending' | 'approved' | 'rejected' | 'completed';

export interface WithdrawalRequest {
  id?: string;
  userId: string;
  telegramUsername: string;
  withdrawalMethod: 'BEP20' | 'BinanceID';
  walletAddressOrBinanceId: string;
  amount: number;
  status: WithdrawalStatus;
  createdAt: any;
  processedAt?: any;
  adminNote?: string;
}

export interface ReferralRecord {
  referrerId: string;
  referredId: string;
  joinedAt: any;
  totalGenerated: number;
  totalCommissionPaid: number;
}

declare global {
  interface Window {
    Telegram: {
      WebApp: any;
    };
  }
}
