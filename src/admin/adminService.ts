import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  query, 
  orderBy, 
  limit, 
  onSnapshot,
  where,
  runTransaction,
  serverTimestamp,
  addDoc,
  Timestamp,
  queryEqual
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { UserProfile, WithdrawalRequest } from '../types';

export interface AdminLog {
  id?: string;
  adminId: string;
  action: string;
  targetUserId?: string;
  details?: any;
  timestamp: any;
}

export const AdminService = {
  async isAdmin(uid: string): Promise<boolean> {
    const adminRef = doc(db, 'admins', uid);
    const adminSnap = await getDoc(adminRef);
    return adminSnap.exists();
  },

  async logAction(action: string, targetUserId?: string, details?: any) {
    const adminUid = auth.currentUser?.uid;
    if (!adminUid) return;

    await addDoc(collection(db, 'adminLogs'), {
      adminId: adminUid,
      action,
      targetUserId,
      details,
      timestamp: serverTimestamp()
    });
  },

  // Users Management
  subscribeToUsers(callback: (users: UserProfile[]) => void) {
    const q = query(collection(db, 'users'), orderBy('lastLogin', 'desc'), limit(100));
    return onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as UserProfile));
      callback(users);
    });
  },

  async updateUserBalance(userId: string, newBalance: number) {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { balance: newBalance });
    await this.logAction('UPDATE_BALANCE', userId, { newBalance });
  },

  async setBanStatus(userId: string, isBanned: boolean) {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { isBanned });
    await this.logAction(isBanned ? 'BAN_USER' : 'UNBAN_USER', userId);
  },

  // Withdrawal Management
  subscribeToWithdrawals(callback: (withdrawals: WithdrawalRequest[]) => void) {
    const q = query(collection(db, 'withdrawals'), orderBy('createdAt', 'desc'), limit(100));
    return onSnapshot(q, (snapshot) => {
      const withdrawals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WithdrawalRequest));
      callback(withdrawals);
    });
  },

  async processWithdrawal(withdrawalId: string, status: 'approved' | 'rejected' | 'completed', adminNote: string = '') {
    const withdrawalRef = doc(db, 'withdrawals', withdrawalId);
    
    try {
      await runTransaction(db, async (transaction) => {
        const withdrawalDoc = await transaction.get(withdrawalRef);
        if (!withdrawalDoc.exists()) throw new Error("Withdrawal not found");
        
        const data = withdrawalDoc.data() as WithdrawalRequest;
        const userId = data.userId;
        const amount = data.amount;

        if (status === 'rejected' && data.status === 'pending') {
          // Refund user balance
          const userRef = doc(db, 'users', userId);
          const userDoc = await transaction.get(userRef);
          if (userDoc.exists()) {
            const userData = userDoc.data() as UserProfile;
            transaction.update(userRef, {
              balance: (userData.balance || 0) + amount,
              pendingWithdrawalBalance: Math.max(0, (userData.pendingWithdrawalBalance || 0) - amount)
            });
          }
        } else if (status === 'completed' && (data.status === 'pending' || data.status === 'approved')) {
          // Deduct from pending balance
          const userRef = doc(db, 'users', userId);
          const userDoc = await transaction.get(userRef);
          if (userDoc.exists()) {
            const userData = userDoc.data() as UserProfile;
            transaction.update(userRef, {
              pendingWithdrawalBalance: Math.max(0, (userData.pendingWithdrawalBalance || 0) - amount),
              totalWithdrawalsCount: (userData.totalWithdrawalsCount || 0) + 1,
              totalWithdrawnAmount: (userData.totalWithdrawnAmount || 0) + amount
            });
          }
        }

        transaction.update(withdrawalRef, { 
          status, 
          processedAt: serverTimestamp(),
          adminNote
        });
      });
      
      await this.logAction(`WITHDRAWAL_${status.toUpperCase()}`, undefined, { withdrawalId, adminNote });
    } catch (e) {
      console.error("Error processing withdrawal:", e);
      throw e;
    }
  },

  // Stats
  async getDashboardStats() {
    const usersSnap = await getDocs(collection(db, 'users'));
    const withdrawalsSnap = await getDocs(collection(db, 'withdrawals'));
    
    let totalBalance = 0;
    let pendingWithdrawals = 0;
    let totalWithdrawn = 0;
    
    usersSnap.forEach(doc => {
      const data = doc.data() as UserProfile;
      totalBalance += (data.balance || 0);
    });

    withdrawalsSnap.forEach(doc => {
      const data = doc.data() as WithdrawalRequest;
      if (data.status === 'pending') pendingWithdrawals += data.amount;
      if (data.status === 'completed') totalWithdrawn += data.amount;
    });

    return {
      totalUsers: usersSnap.size,
      totalBalance,
      pendingWithdrawalsAmount: pendingWithdrawals,
      totalWithdrawn,
      totalWithdrawalsCount: withdrawalsSnap.size
    };
  }
};
