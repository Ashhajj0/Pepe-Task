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

    const logData: any = {
      adminId: adminUid,
      action,
      timestamp: serverTimestamp()
    };

    if (targetUserId !== undefined) logData.targetUserId = targetUserId;
    if (details !== undefined) logData.details = details;

    await addDoc(collection(db, 'adminLogs'), logData);
  },

  // Users Management
  subscribeToUsers(callback: (users: UserProfile[]) => void) {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'asc'), limit(500));
    return onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as UserProfile));
      callback(users);
    });
  },

  async updateUser(userId: string, data: Partial<UserProfile>) {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, data);
    await this.logAction('UPDATE_USER_DATA', userId, data);
  },

  async deleteUser(userId: string) {
    const userRef = doc(db, 'users', userId);
    // Note: In a real app, you might want to delete subcollections too
    // For now, simple delete of the user document
    const { deleteDoc: firestoreDeleteDoc } = await import('firebase/firestore');
    await firestoreDeleteDoc(userRef);
    await this.logAction('DELETE_USER', userId);
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

  async processWithdrawal(withdrawalId: string, status: 'approved' | 'rejected' | 'completed') {
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
          processedAt: serverTimestamp()
        });
      });
      
      await this.logAction(`WITHDRAWAL_${status.toUpperCase()}`, undefined, { withdrawalId });
    } catch (e) {
      console.error("Error processing withdrawal:", e);
      throw e;
    }
  },

  // Stats
  subscribeToDashboardStats(callback: (stats: any) => void) {
    const usersQuery = collection(db, 'users');
    const withdrawalsQuery = collection(db, 'withdrawals');
    const configQuery = doc(db, 'system', 'config');

    let users: UserProfile[] = [];
    let withdrawals: WithdrawalRequest[] = [];
    let config: any = {};

    const emit = () => {
      let pendingWithdrawalsAmount = 0;
      let totalWithdrawnAmount = 0;
      let completedWithdrawalsCount = 0;
      let totalAdsWatched = 0;

      users.forEach(u => {
        totalAdsWatched += (u.tasksCompleted || 0);
      });

      withdrawals.forEach(w => {
        if (w.status === 'pending') pendingWithdrawalsAmount += w.amount;
        if (w.status === 'completed') {
          totalWithdrawnAmount += w.amount;
          completedWithdrawalsCount++;
        }
      });

      // Apply overrides if present
      const finalTotalWithdrawn = config.manualTotalWithdrawn !== undefined ? config.manualTotalWithdrawn : totalWithdrawnAmount;
      const finalTotalAdsWatched = config.manualTotalAdsWatched !== undefined ? config.manualTotalAdsWatched : totalAdsWatched;

      callback({
        totalUsers: users.length,
        pendingWithdrawalsAmount,
        totalWithdrawnAmount: finalTotalWithdrawn,
        completedWithdrawalsCount,
        totalAdsWatched: finalTotalAdsWatched,
        totalWithdrawalsCount: withdrawals.length
      });
    };

    const unsubUsers = onSnapshot(usersQuery, (snap) => {
      users = snap.docs.map(d => d.data() as UserProfile);
      emit();
    });

    const unsubWithdrawals = onSnapshot(withdrawalsQuery, (snap) => {
      withdrawals = snap.docs.map(d => d.data() as WithdrawalRequest);
      emit();
    });

    const unsubConfig = onSnapshot(configQuery, (snap) => {
      if (snap.exists()) {
        config = snap.data();
      }
      emit();
    });

    return () => {
      unsubUsers();
      unsubWithdrawals();
      unsubConfig();
    };
  },

  async updateGlobalStats(data: { manualTotalWithdrawn?: number, manualTotalAdsWatched?: number }) {
    const configRef = doc(db, 'system', 'config');
    const snap = await getDoc(configRef);
    if (!snap.exists()) {
      const { setDoc } = await import('firebase/firestore');
      await setDoc(configRef, data);
    } else {
      await updateDoc(configRef, data);
    }
    await this.logAction('UPDATE_GLOBAL_STATS', undefined, data);
  },

  subscribeToRecentActivity(callback: (logs: AdminLog[]) => void) {
    const q = query(collection(db, 'adminLogs'), orderBy('timestamp', 'desc'), limit(10));
    return onSnapshot(q, (snap) => {
      const logs = snap.docs.map(d => ({ id: d.id, ...d.data() } as AdminLog));
      callback(logs);
    });
  },

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
