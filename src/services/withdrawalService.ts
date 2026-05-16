import { 
  collection, 
  doc, 
  runTransaction, 
  serverTimestamp, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  limit,
  Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { WithdrawalRequest, WithdrawalStatus } from '../types';
import { handleFirestoreError, OperationType } from '../lib/utils/firestore';

const WITHDRAWALS_COLLECTION = 'withdrawals';
const USERS_COLLECTION = 'users';
const MIN_WITHDRAWAL = 8000;

export const WithdrawalService = {
  /**
   * Submit a new withdrawal request
   */
  async submitRequest(userId: string, data: {
    telegramUsername: string;
    withdrawalMethod: 'BEP20' | 'BinanceID';
    walletAddressOrBinanceId: string;
    amount: number;
  }): Promise<void> {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const withdrawalCol = collection(db, WITHDRAWALS_COLLECTION);
    const newWithdrawalRef = doc(withdrawalCol);

    try {
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) {
          throw new Error('User does not exist');
        }

        const userData = userDoc.data();
        const currentBalance = userData.balance || 0;
        const lastWithdrawalAt = userData.lastWithdrawalAt;

        // 1. Minimum balance check
        if (data.amount < MIN_WITHDRAWAL) {
          throw new Error(`Minimum withdrawal is ${MIN_WITHDRAWAL} PEPE`);
        }

        // 2. Sufficient balance check
        if (currentBalance < data.amount) {
          throw new Error('Insufficient balance');
        }

        // 3. 24h Cooldown check
        if (lastWithdrawalAt) {
          const lastTime = lastWithdrawalAt instanceof Timestamp ? lastWithdrawalAt.toDate().getTime() : lastWithdrawalAt;
          const now = Date.now();
          const daylight = 24 * 60 * 60 * 1000;
          if (now - lastTime < daylight) {
            const remaining = daylight - (now - lastTime);
            const hours = Math.floor(remaining / (60 * 60 * 1000));
            const mins = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
            throw new Error(`Cooldown active. Try again in ${hours}h ${mins}m`);
          }
        }

        // 4. Create withdrawal record
        const withdrawal: WithdrawalRequest = {
          userId,
          telegramUsername: data.telegramUsername,
          withdrawalMethod: data.withdrawalMethod,
          walletAddressOrBinanceId: data.walletAddressOrBinanceId,
          amount: data.amount,
          status: 'pending',
          createdAt: serverTimestamp()
        };

        transaction.set(newWithdrawalRef, withdrawal);

        // 5. Update user balance (deduct) and pending balance (increment)
        transaction.update(userRef, {
          balance: currentBalance - data.amount,
          pendingWithdrawalBalance: (userData.pendingWithdrawalBalance || 0) + data.amount,
          lastWithdrawalAt: serverTimestamp()
        });
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, WITHDRAWALS_COLLECTION);
    }
  },

  /**
   * Fetch withdrawal history for a user
   */
  async getHistory(userId: string): Promise<WithdrawalRequest[]> {
    const q = query(
      collection(db, WITHDRAWALS_COLLECTION),
      where('userId', '==', userId),
      limit(50)
    );

    try {
      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as WithdrawalRequest));

      // Sort in memory to avoid "The query requires an index" error
      return docs.sort((a, b) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt || 0);
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt || 0);
        return timeB - timeA;
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, WITHDRAWALS_COLLECTION);
      return [];
    }
  }
};
