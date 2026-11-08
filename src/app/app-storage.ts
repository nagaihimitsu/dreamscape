import type { KeyedStorage } from "../persistence/old-data";

export const browserStorage = {
  getItem: (key: string) => window.localStorage.getItem(key),
  setItem: (key: string, value: string) =>
    window.localStorage.setItem(key, value),
  removeItem: (key: string) => window.localStorage.removeItem(key),
};
/** This site's whole browser storage, read by 「古い保存データの整理」 (it looks only at `dreamscape.` keys). */
export const browserKeyedStorage: KeyedStorage = {
  keys: () => Array.from({ length: window.localStorage.length }, (_, index) => window.localStorage.key(index))
    .filter((key): key is string => key !== null),
  getItem: browserStorage.getItem,
  removeItem: browserStorage.removeItem,
};
export type AppProps = {
  storage?: typeof browserStorage;
  nextRomanceRoll?: () => number;
  debug?: boolean;
};

