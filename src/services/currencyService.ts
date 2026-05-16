import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { sanitizeFirestoreData, safeNumber } from '../lib/utils/firestore';

export interface Currency {
  id: string;
  symbol: string;
  name: string;
  type: 'fiat' | 'crypto';
}

export const POPULAR_CURRENCIES: Currency[] = [
  { id: 'eur', symbol: '€', name: 'Euro', type: 'fiat' },
  { id: 'gbp', symbol: '£', name: 'British Pound', type: 'fiat' },
  { id: 'inr', symbol: '₹', name: 'Indian Rupee', type: 'fiat' },
  { id: 'bdt', symbol: '৳', name: 'Bangladeshi Taka', type: 'fiat' },
  { id: 'pkr', symbol: '₨', name: 'Pakistani Rupee', type: 'fiat' },
  { id: 'idr', symbol: 'Rp', name: 'Indonesian Rupiah', type: 'fiat' },
  { id: 'rub', symbol: '₽', name: 'Russian Ruble', type: 'fiat' },
  { id: 'pepe', symbol: 'PP', name: 'Pepe Coin', type: 'crypto' },
];

let cachedRates: Record<string, number> = {};
let cached24hChange: number | null = null;
let lastFetch = 0;

const FETCH_RETRY_COUNT = 3;
const FETCH_RETRY_DELAY = 1000;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url: string, retries = FETCH_RETRY_COUNT): Promise<any> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      const contentType = response.headers.get("content-type");
      
      if (!response.ok) {
        // Even if not ok, try to parse JSON error if possible
        if (contentType && contentType.includes("application/json")) {
           const errJson = await response.json();
           throw new Error(errJson.error || `HTTP ${response.status}`);
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (contentType && contentType.includes("application/json")) {
        return await response.json();
      }
      throw new Error("Response was not JSON");
    } catch (err) {
      lastError = err;
      if (i === retries - 1) throw lastError;
      await delay(FETCH_RETRY_DELAY * (i + 1));
    }
  }
}

export interface MarketData {
  pepe: Record<string, number>;
  usd_24h_change: number;
}

export const getLatestMarketData = async (): Promise<MarketData | null> => {
  const now = Date.now();
  
  // Use cache if less than 5 seconds old
  if (Object.keys(cachedRates).length > 0 && now - lastFetch < 5000) {
    return {
      pepe: cachedRates,
      usd_24h_change: cached24hChange || 0
    };
  }

  try {
    const response = await fetch(`/api/pepe-price?t=${now}`, {
      cache: 'no-store',
      headers: {
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache'
      }
    });
    if (!response.ok) throw new Error(`Server responded with ${response.status}`);
    
    const data = await response.json();
    if (data && data.pepe) {
      const newRates: Record<string, number> = {};
      Object.keys(data.pepe).forEach(key => {
        if (!key.endsWith('_24h_change')) {
          newRates[key.toLowerCase()] = data.pepe[key];
        }
      });

      cachedRates = newRates;
      if (data.pepe.usd_24h_change !== undefined) {
        cached24hChange = data.pepe.usd_24h_change;
      }
      
      lastFetch = now;
      return {
        pepe: cachedRates,
        usd_24h_change: cached24hChange || 0
      };
    }
    return null;
  } catch (error) {
    console.warn('Currency fetch failed:', error);
    return null;
  }
};

export const getPepePriceIn = async (targetCurrency: string): Promise<number | null> => {
  const cacheKey = targetCurrency.toLowerCase();
  if (cacheKey === 'pepe') return 1;

  const data = await getLatestMarketData();
  
  const FALLBACK_TO_USD: Record<string, number> = {
    eur: 0.92, gbp: 0.79, inr: 83.3, bdt: 117.0, 
    pkr: 278.5, idr: 16000, rub: 91.0, usd: 1
  };

  if (data && data.pepe[cacheKey]) {
    return data.pepe[cacheKey];
  }

  const FAIR_PRICE = 0.0000105;
  const baseUSD = data?.pepe['usd'] || cachedRates['usd'] || FAIR_PRICE;
  const factor = FALLBACK_TO_USD[cacheKey] || 1;
  return baseUSD * factor;
};

export const getFullPepeMarketData = async () => {
  const data = await getLatestMarketData();
  const FAIR_PRICE = 0.0000105;
  return {
    usd: data?.pepe['usd'] || cachedRates['usd'] || FAIR_PRICE,
    usd_24h_change: data?.usd_24h_change ?? cached24hChange ?? 0
  };
};

export const updatePreferredCurrency = async (userId: string, currency: string) => {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, sanitizeFirestoreData({
    preferredCurrency: currency
  }));
};

export const formatBalance = (amountArg: any, currencyId: string, rate: number | null): string => {
  const amount = safeNumber(amountArg);
  if (currencyId === 'pepe' || !rate) {
    return `${amount.toLocaleString()} PEPE`;
  }
  
  const converted = amount * rate;
  
  // Find currency symbol
  const currency = POPULAR_CURRENCIES.find(c => c.id === currencyId);
  const symbol = currency?.symbol || currencyId.toUpperCase();

  if (currency?.type === 'crypto') {
    return `${symbol} ${converted.toFixed(6)}`;
  }

  return `${symbol}${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
