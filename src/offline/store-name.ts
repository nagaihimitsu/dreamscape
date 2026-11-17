/**
 * The name of the cache that holds what 「オフラインで遊ぶ」 keeps (src/offline/state.ts says what is in it). Its dot keeps
 * it apart from the service worker's own caches (`dreamscape-…`), so no worker's cleanup removes it. In a file of its
 * own: the title page asks whether this cache exists (offline-status.ts) and loads nothing else of the work for it.
 */
export const OFFLINE_CACHE = "dreamscape.offline";
/** Where the state is stored in that cache, under index.html's folder: an address the site never serves (state.ts stateKey). */
export const OFFLINE_STATE_PATH = "__offline__/state.json";
