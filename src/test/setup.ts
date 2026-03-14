/**
 * Jest setup file for client-side tests.
 * Mocks native modules unavailable in the Node test environment.
 */

// react-native platform mock
jest.mock('react-native', () => ({
  Platform: { OS: 'ios', select: (opts: Record<string, unknown>) => opts.ios },
}));

// react-native-mmkv mock
jest.mock('react-native-mmkv', () => {
  const store = new Map<string, string>();
  return {
    createMMKV: () => ({
      getString: (key: string) => store.get(key),
      set: (key: string, value: string) => store.set(key, value),
      remove: (key: string) => store.delete(key),
    }),
  };
});

// @react-native-async-storage/async-storage mock
const asyncStore = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key: string) => Promise.resolve(asyncStore.get(key) ?? null)),
    setItem: jest.fn((key: string, value: string) => {
      asyncStore.set(key, value);
      return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
      asyncStore.delete(key);
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      asyncStore.clear();
      return Promise.resolve();
    }),
  },
}));

// expo-secure-store mock
const secureStore = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn((key: string) => Promise.resolve(secureStore.get(key) ?? null)),
  setItemAsync: jest.fn((key: string, value: string) => {
    secureStore.set(key, value);
    return Promise.resolve();
  }),
  deleteItemAsync: jest.fn((key: string) => {
    secureStore.delete(key);
    return Promise.resolve();
  }),
}));

// expo-haptics mock
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));
