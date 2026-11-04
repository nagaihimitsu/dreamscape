export const browserStorage = {
  getItem: (key: string) => window.localStorage.getItem(key),
  setItem: (key: string, value: string) =>
    window.localStorage.setItem(key, value),
  removeItem: (key: string) => window.localStorage.removeItem(key),
};
export type AppProps = {
  storage?: typeof browserStorage;
  nextRomanceRoll?: () => number;
  debug?: boolean;
};

