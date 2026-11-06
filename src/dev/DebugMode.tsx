import { useEffect, useRef, useState, type FormEvent } from "react";
import App from "../app/App";
import { getCities, getCityContent } from "../content";
import { loadGame, saveGame } from "../persistence";
import { installPreparingJourneyTestCities } from "../domain/multi-city-test-fixture";
import { installDebugHook, type DebugSceneInfo } from "./debug-hook";
import {
  debugQueryString, debugSceneLabels, debugScenes, debugValueRanges, parseDebugQuery, settingsQuery,
  type DebugDataMode, type DebugQuery,
} from "./debug-query";
import {
  createDebugState, debugSceneLocation, debugTargets, defaultDebugCityId, defaultDebugSettings, resolveDebugLaunch,
  type DebugScene, type DebugSettings,
} from "./debug-state";
import { rollTickets } from "./scenario-builders";
import { PrototypePreview } from "./PrototypePreview";
import "./debug-mode.css";

type MemoryStorage = { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void };
function newStorage(): MemoryStorage {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => { data.set(key, value); },
    removeItem: (key) => { data.delete(key); },
  };
}
type Session = { storage: MemoryStorage; roll: () => number; key: number; info: DebugSceneInfo };

const errorText = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;
/** The address bar shows what a reload opens: the open scene's launch URL, or the settings screen. */
const showInAddressBar = (search: string) => window.history.replaceState(null, "", search);
const mapQuery = (dataMode: DebugDataMode, cityId: string): DebugQuery => ({ dataMode, cityId, scene: "map" });

export default function DebugMode() {
  // A URL with more than ?debug opens its scene directly (see debug-query.ts).
  const [launch] = useState(() => parseDebugQuery(window.location.search));
  const [launching, setLaunching] = useState(launch.kind === "launch");
  const [launchError, setLaunchError] = useState(launch.kind === "error" ? launch.message : "");
  const [dataMode, setDataMode] = useState<DebugDataMode>("real");
  const fixtureCleanup = useRef<(() => void) | null>(null);
  useEffect(() => () => { fixtureCleanup.current?.(); fixtureCleanup.current = null; }, []);
  const [settings, setSettings] = useState<DebugSettings>(() => defaultDebugSettings());
  const cityId = settings.cityId ?? defaultDebugCityId;
  const options = debugTargets(cityId);
  const [session, setSession] = useState<Session | null>(null);
  const [prototype, setPrototype] = useState<DebugSceneInfo | null>(null);
  const [message, setMessage] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const urlField = useRef<HTMLInputElement>(null);
  const isPrototype = getCityContent(cityId).city.productionStatus === "prototype";
  const sceneUrl = new URL(debugQueryString(isPrototype ? mapQuery(dataMode, cityId) : settingsQuery(dataMode, settings)), window.location.href).href;

  // Development-only, read-only view of the open scene for tests; removed with this screen.
  const shown = useRef({ session, prototype });
  useEffect(() => { shown.current = { session, prototype }; });
  useEffect(() => installDebugHook(window, {
    state: () => {
      const current = shown.current.session;
      const loaded = current ? loadGame(current.storage) : null;
      return loaded?.status === "loaded" ? loaded.state : null;
    },
    scene: () => shown.current.session?.info ?? shown.current.prototype,
  }), []);

  function update(next: DebugSettings) {
    setSettings(next);
    setCopyMessage("");
  }
  /** Open `next` (a prototype city's map, else its scene in fresh memory storage); throws a message. */
  function openScene(mode: DebugDataMode, next: DebugSettings) {
    const target = next.cityId ?? defaultDebugCityId;
    const city = getCityContent(target).city;
    if (city.productionStatus === "prototype") {
      const search = debugQueryString(mapQuery(mode, target));
      setPrototype({ dataMode: mode, settings: null, cityId: target, url: search, location: city.nameJa });
      showInAddressBar(search);
      return;
    }
    const state = createDebugState(next);
    const storage = newStorage();
    const result = saveGame(storage, state);
    if (!result.ok) throw new Error(result.message);
    const search = debugQueryString(settingsQuery(mode, next));
    const ticket = rollTickets[next.roll];
    setSession({ storage, roll: () => ticket, key: Date.now(),
      info: { dataMode: mode, settings: next, cityId: target, url: search, location: debugSceneLocation(next, state) } });
    showInAddressBar(search);
    window.scrollTo(0, 0);
  }
  useEffect(() => {
    if (launch.kind !== "launch") return;
    const { query } = launch;
    try {
      // Installed here (not while rendering) so React's development double run removes and re-adds it once.
      if (query.dataMode === "fixture") fixtureCleanup.current = installPreparingJourneyTestCities();
      setDataMode(query.dataMode);
      const resolved = resolveDebugLaunch(query);
      const next = resolved.kind === "map" ? defaultDebugSettings(resolved.cityId) : resolved.settings;
      setSettings(next);
      openScene(query.dataMode, next);
    } catch (error) {
      setLaunchError(errorText(error, "場面を開けませんでした。"));
    }
    setLaunching(false);
  }, [launch]);

  function selectDataMode(next: DebugDataMode) {
    if (next === dataMode) return;
    try {
      if (next === "fixture") fixtureCleanup.current = installPreparingJourneyTestCities();
      else { fixtureCleanup.current?.(); fixtureCleanup.current = null; }
      update({ ...settings, id: debugTargets(cityId)[settings.scene][0]?.id ?? "" });
      setDataMode(next);
      setMessage("");
    } catch (error) {
      setMessage(errorText(error, "データを切り替えられませんでした。"));
    }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    try {
      openScene(dataMode, settings);
      setMessage("");
    } catch (error) {
      setMessage(errorText(error, "場面を開けませんでした。"));
    }
  }
  async function copyUrl() {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(sceneUrl);
      setCopyMessage("この場面のURLをコピーしました。");
    } catch {
      // Not offered on an http:// address other than localhost (e.g. a phone on the LAN).
      setCopyMessage("自動でコピーできませんでした。選択したURLを長押し（またはCtrl+C）でコピーしてください。");
      urlField.current?.select();
    }
  }
  function backToSettings() {
    setSession(null);
    setPrototype(null);
    showInAddressBar("?debug");
  }

  if (launching) return <main className="debug-panel"><p role="status">場面を準備しています…</p></main>;
  if (launchError) return (
    <main className="debug-panel debug-launch-error" data-testid="debug-launch-error">
      <h1>場面を開けませんでした</h1>
      <p role="alert">{launchError}</p>
      <p>使えるURLの項目は docs/10_DEVELOPMENT_CHECKS.md の「Debug起動URL」にあります。設定画面で場面を選び直すこともできます。</p>
      <p><a href="?debug">場面の確認（設定画面）へ</a></p>
      <a href={import.meta.env.BASE_URL}>通常プレイに戻る</a>
    </main>
  );
  if (prototype) return <PrototypePreview key={prototype.cityId} cityId={prototype.cityId} onClose={backToSettings} />;
  if (session) return (
    <div className="debug-session" data-testid="debug-session">
      <header className="debug-session-bar"><div><strong>Debug · 通常セーブとは別</strong><span data-testid="debug-place">開始地点: {session.info.location}</span></div><button type="button" onClick={backToSettings}>設定へ戻る</button></header>
      <App key={session.key} storage={session.storage} nextRomanceRoll={session.roll} debug />
    </div>
  );
  return (
    <main className="debug-panel" data-testid="debug-panel">
      <h1>場面の確認</h1>
      <p>開発用の一時データです。制作中の都市は実際の候補地点・推定経路を確認できます。仮の場面はミラノを元にしたテストデータであり、その都市の物語ではありません。通常のセーブ・英語ノート・設定は変更しません。</p>
      <form onSubmit={submit}>
        <label>確認データ
          <select data-testid="debug-data-mode" value={dataMode} onChange={(event) => selectDataMode(event.target.value as DebugDataMode)}>
            <option value="real">都市データ</option><option value="fixture">仮の場面</option>
          </select>
        </label>
        <label>都市
          <select data-testid="debug-city" value={cityId} onChange={(event) => {
            const next = event.target.value;
            update({ ...settings, cityId: next, id: debugTargets(next)[settings.scene][0]?.id ?? "" });
          }}>
            {getCities().map((item) => <option key={item.id} value={item.id}>{item.nameJa}{item.productionStatus === "prototype" ? "（制作中）" : ""}</option>)}
          </select>
        </label>
        {isPrototype ? <p>物語・クイズは未制作です。候補地点と登録された交通手段を確認できます。</p> : <>
        <label>場面
          <select data-testid="debug-scene" value={settings.scene} onChange={(event) => {
            const scene = event.target.value as DebugScene;
            update({ ...settings, scene, id: options[scene][0]?.id ?? "" });
          }}>
            {debugScenes.map((scene) => <option key={scene} value={scene}>{debugSceneLabels[scene]}</option>)}
          </select>
        </label>
        <label>対象
          <select data-testid="debug-target" value={settings.id} onChange={(event) => update({ ...settings, id: event.target.value })}>
            {options[settings.scene].map((item) => <option key={item.id} value={item.id}>{item.name} ({item.id})</option>)}
          </select>
        </label>
        <label>旅の進行
          <select data-testid="debug-progress" value={settings.progress} onChange={(event) => update({ ...settings, progress: event.target.value as DebugSettings["progress"] })}>
            <option value="completed">都市クリア後</option><option value="initial">旅の開始時</option>
          </select>
        </label>
        <div className="debug-values">
          {([["ap", "AP"], ["affection", "親しさ"], ["trust", "信頼"], ["spark", "恋愛の意識"]] as const).map(([key, label]) => {
            const [min, max] = debugValueRanges[key];
            return <label key={key}>{label}<input data-testid={`debug-${key}`} type="number" min={min} max={max} step="1" value={settings[key]}
              onChange={(event) => update({ ...settings, [key]: Math.min(max, Math.max(min, Math.trunc(Number(event.target.value)) || 0)) })} /></label>;
          })}
        </div>
        <label>デートの反応
          <select data-testid="debug-roll" value={settings.roll} onChange={(event) => update({ ...settings, roll: event.target.value as DebugSettings["roll"] })}>
            <option value="positive">成功寄り（抽選値 0）</option><option value="negative">失敗寄り（抽選値 9999）</option>
          </select>
        </label>
        </>}
        {message && <p role="alert">{message}</p>}
        <button type="submit" className="primary">{isPrototype ? "地図・交通を確認" : "この場面を開く"}</button>
      </form>
      <section className="debug-url" aria-labelledby="debug-url-title">
        <h2 id="debug-url-title">この場面のURL</h2>
        <p>開くと上の設定のまま、この場面から始まります。画面の確認や共有に使えます。</p>
        <input ref={urlField} data-testid="debug-url" aria-labelledby="debug-url-title" readOnly value={sceneUrl} onFocus={(event) => event.currentTarget.select()} />
        <button type="button" className="secondary" data-testid="debug-copy-url" onClick={copyUrl}>この場面のURLをコピー</button>
        <p role="status">{copyMessage}</p>
      </section>
      <p><a href="?character-preview">背景・人物・表情を確認</a></p>
      <a href={import.meta.env.BASE_URL}>通常プレイに戻る</a>
    </main>
  );
}
