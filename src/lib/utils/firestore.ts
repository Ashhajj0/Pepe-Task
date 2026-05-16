/**
 * Sanitizes data for Firestore by removing undefined values
 * and ensuring only valid Firestore types are passed.
 */
export function sanitizeFirestoreData<T extends object>(data: T): T {
  return removeUndefined(data);
}

function removeUndefined(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefined(item));
  } else if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    // Check for Firestore specifics
    if (obj.constructor && (obj.constructor.name === 'FieldValue' || obj.constructor.name === 'Timestamp')) {
      return obj;
    }
    
    // Check for the keys reported in the error {Fc, _methodName}
    if ('Fc' in obj && '_methodName' in obj) {
      return obj;
    }

    const newObj: any = {};
    Object.keys(obj).forEach(key => {
      const val = obj[key];
      if (val !== undefined) {
        newObj[key] = removeUndefined(val);
      }
    });
    return newObj;
  }
  return obj;
}

/**
 * Ensures a value is a number, handling Firestore FieldValue/Timestamp objects
 * that might leak into local state during pending writes.
 */
export function safeNumber(val: any, fallback = 0): number {
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  if (typeof val === 'string') {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? fallback : parsed;
  }
  
  // Explicitly check for Firestore FieldValue objects {Fc, _methodName}
  if (val && typeof val === 'object' && ('Fc' in val || '_methodName' in val)) {
    return fallback;
  }
  
  return fallback;
}

/**
 * Ensures a value is a string, preventing React from crashing on objects.
 */
export function safeString(val: any, fallback = ''): string {
  if (typeof val === 'string') return val;
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'object') {
    return safeDate(val).toISOString();
  }
  return String(val);
}

export function safeDate(val: any): Date {
  if (!val) return new Date(0);
  if (val instanceof Date) return val;
  
  // Firestore Timestamp instance
  if (typeof val.toDate === 'function') {
    try {
      return val.toDate();
    } catch (e) {
      // Fall through to other checks
    }
  }

  // Handle plain objects that look like Timestamps { seconds, nanoseconds }
  if (typeof val.seconds === 'number') {
    return new Date(val.seconds * 1000 + (val.nanoseconds || 0) / 1000000);
  }

  // Handle strings or numbers
  const d = new Date(val);
  return isNaN(d.getTime()) ? new Date(0) : d;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString() || null,
      email: null, // Telegram users don't necessarily have emails in initData
      emailVerified: null,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
