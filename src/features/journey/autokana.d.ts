// vanilla-autokana's own source (its published bundle, dist/autokana.js, predates its types: it binds element IDs only and
// reads `window` as it loads), as useNameReading.ts imports it: the class of the package's own types (types/autokana.d.ts),
// with initializeValues, the reset its source runs when the field is emptied (marked private there; the version is pinned).
declare module "vanilla-autokana/src/AutoKana.js" {
  import type { bind } from "vanilla-autokana";
  const AutoKana: new (...args: Parameters<typeof bind>) => ReturnType<typeof bind> & { initializeValues(): void };
  export default AutoKana;
}
