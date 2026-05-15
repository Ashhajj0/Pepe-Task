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
    // If it's a timestamp, try to format it
    if (val.toDate && typeof val.toDate === 'function') {
      try {
        return val.toDate().toISOString();
      } catch (e) {
        return fallback;
      }
    }
    // Don't render raw objects
    return fallback;
  }
  return String(val);
}
