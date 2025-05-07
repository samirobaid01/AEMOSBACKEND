const APP_PREFIX = 'aemos_';

export const localStorageService = {
  /**
   * Set a value in localStorage with the app prefix
   */
  set: <T>(key: string, value: T): void => {
    try {
      const serializedValue = JSON.stringify(value);
      localStorage.setItem(`${APP_PREFIX}${key}`, serializedValue);
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  },

  /**
   * Get a value from localStorage with the app prefix
   */
  get: <T>(key: string, defaultValue?: T): T | null => {
    try {
      const item = localStorage.getItem(`${APP_PREFIX}${key}`);
      if (item === null) {
        return defaultValue ?? null;
      }
      return JSON.parse(item);
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return defaultValue ?? null;
    }
  },

  /**
   * Remove a value from localStorage with the app prefix
   */
  remove: (key: string): void => {
    localStorage.removeItem(`${APP_PREFIX}${key}`);
  },

  /**
   * Clear all app-specific items from localStorage
   */
  clearAll: (): void => {
    Object.keys(localStorage)
      .filter(key => key.startsWith(APP_PREFIX))
      .forEach(key => localStorage.removeItem(key));
  },

  /**
   * Check if a key exists in localStorage
   */
  exists: (key: string): boolean => {
    return localStorage.getItem(`${APP_PREFIX}${key}`) !== null;
  },

  /**
   * Get all app-specific items from localStorage
   */
  getAllItems: (): Record<string, unknown> => {
    return Object.keys(localStorage)
      .filter(key => key.startsWith(APP_PREFIX))
      .reduce((acc, key) => {
        const value = localStorage.getItem(key);
        if (value) {
          try {
            acc[key.replace(APP_PREFIX, '')] = JSON.parse(value);
          } catch {
            acc[key.replace(APP_PREFIX, '')] = value;
          }
        }
        return acc;
      }, {} as Record<string, unknown>);
  },
}; 