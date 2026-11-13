import { useEffect, useState } from "react";

/** The map library (Leaflet), loaded with the first map that is shown (leaflet-library.ts, its own file in the build). */
export type Leaflet = typeof import("leaflet");

let loaded: Leaflet | undefined;
let loading: Promise<Leaflet> | undefined;

/** Load Leaflet and its stylesheet once (a failed load is tried again by the next map). */
export function loadLeaflet(): Promise<Leaflet> {
  loading ??= import("./leaflet-library").then((module) => (loaded = module.default));
  loading.catch(() => { loading = undefined; });
  return loading;
}

/**
 * Leaflet for a map component: undefined until it is loaded (the component shows its empty frame, and renders again
 * when it comes). Without it (offline) the frame stays empty; the lists beside the maps stay usable.
 */
export function useLeaflet(): Leaflet | undefined {
  const [leaflet, setLeaflet] = useState(loaded);
  useEffect(() => {
    if (leaflet) return;
    let current = true;
    loadLeaflet().then((module) => { if (current) setLeaflet(module); }, () => undefined);
    return () => { current = false; };
  }, [leaflet]);
  return leaflet;
}
