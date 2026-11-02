import { useState, type FormEvent } from "react";
import App from "../app/App";
import { battles, city, getCities, dates, dateDestinations, landmarks, getCityContent } from "../content";
import { encounters } from "../content/encounters";
import { battleCityId } from "../domain/chapter";
import { saveGame } from "../persistence";
import { createDebugState, type DebugScene, type DebugSettings } from "./debug-state";
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
function cityOptions(cityId: string): Record<DebugScene, { id: string; name: string }[]> {
  const { travel } = getCityContent(cityId);
  return {
    tourism: landmarks.filter((item) => item.cityId === cityId).map((item) => ({ id: item.id, name: item.nameJa })),
    battle: battles.filter((item) => battleCityId(item.id) === cityId).map((item) => ({ id: item.id, name: item.titleJa })),
    encounter: encounters.encounters.filter((item) => item.cityId === cityId && item.availability !== "dormant").map((item) => ({ id: item.id, name: item.titleJa })),
    date: dates.filter((item) => item.kind === "normal" && !item.legacyOnly && travel.events.some((event) => event.id === item.id)).map((item) => ({ id: item.id, name: item.titleJa })),
  };
}

export default function DebugMode() {
  const [settings, setSettings] = useState<DebugSettings>({ cityId: city.id, scene: "tourism", id: cityOptions(city.id).tourism[0]?.id ?? "", progress: "completed", ap: 12, affection: 0, trust: 0, spark: 0, roll: "positive" });
  const options = cityOptions(settings.cityId ?? city.id);
  const [session, setSession] = useState<{ storage: MemoryStorage; roll: () => number; key: number; location: string } | null>(null);
  const [message, setMessage] = useState("");
  function open(event: FormEvent) {
    event.preventDefault();
    try {
      const state = createDebugState(settings);
      const storage = newStorage();
      const result = saveGame(storage, state);
      if (!result.ok) throw new Error(result.message);
      const ticket = settings.roll === "positive" ? 0 : 9999;
      const landmarkId = settings.scene === "tourism" ? settings.id
        : settings.scene === "battle" ? battles.find((item) => item.id === settings.id)?.landmarkId
        : settings.scene === "encounter" ? encounters.encounters.find((item) => item.id === settings.id)?.landmarkId
        : undefined;
      const destinationId = settings.scene === "date" ? dates.find((item) => item.id === settings.id)?.destinationId : undefined;
      const location = landmarks.find((item) => item.id === landmarkId)?.nameJa ?? dateDestinations.find((item) => item.id === destinationId)?.nameJa ?? getCityContent(state.currentCityId).city.nameJa;
      setSession({ storage, roll: () => ticket, key: Date.now(), location });
      setMessage("");
      window.scrollTo(0, 0);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "場面を開けませんでした。");
    }
  }
  if (session) return (
    <div className="debug-session" data-testid="debug-session">
      <header className="debug-session-bar"><div><strong>Debug · 通常セーブとは別</strong><span data-testid="debug-place">開始地点: {session.location}</span></div><button type="button" onClick={() => setSession(null)}>設定へ戻る</button></header>
      <App key={session.key} storage={session.storage} nextRomanceRoll={session.roll} debug />
    </div>
  );
  return (
    <main className="debug-panel" data-testid="debug-panel">
      <h1>場面の確認</h1>
      <p>開発用の一時データです。通常のセーブ・英語ノート・設定は変更しません。再読み込みや終了で一時データは消えます。</p>
      <form onSubmit={open}>
        <label>都市
          <select data-testid="debug-city" value={settings.cityId ?? city.id} onChange={(event) => {
            const cityId = event.target.value;
            const next = cityOptions(cityId);
            setSettings({ ...settings, cityId, id: next[settings.scene][0]?.id ?? "" });
          }}>
            {getCities().map((item) => <option key={item.id} value={item.id}>{item.nameJa}</option>)}
          </select>
        </label>
        <label>場面
          <select data-testid="debug-scene" value={settings.scene} onChange={(event) => {
            const scene = event.target.value as DebugScene;
            setSettings({ ...settings, scene, id: options[scene][0]?.id ?? "" });
          }}>
            <option value="tourism">観光・場所</option><option value="battle">バトル</option><option value="encounter">人物との交流</option><option value="date">デート</option>
          </select>
        </label>
        <label>対象
          <select data-testid="debug-target" value={settings.id} onChange={(event) => setSettings({ ...settings, id: event.target.value })}>
            {options[settings.scene].map((item) => <option key={item.id} value={item.id}>{item.name} ({item.id})</option>)}
          </select>
        </label>
        <label>旅の進行
          <select data-testid="debug-progress" value={settings.progress} onChange={(event) => setSettings({ ...settings, progress: event.target.value as DebugSettings["progress"] })}>
            <option value="completed">都市クリア後</option><option value="initial">旅の開始時</option>
          </select>
        </label>
        <div className="debug-values">
          {([ ["ap", "AP", 0, 12], ["affection", "親しさ", -20, 20], ["trust", "信頼", -20, 20], ["spark", "恋愛の意識", -20, 20] ] as const).map(([key, label, min, max]) => (
            <label key={key}>{label}<input data-testid={`debug-${key}`} type="number" min={min} max={max} step="1" value={settings[key]} onChange={(event) => setSettings({ ...settings, [key]: Number(event.target.value) })} /></label>
          ))}
        </div>
        <label>デートの反応
          <select data-testid="debug-roll" value={settings.roll} onChange={(event) => setSettings({ ...settings, roll: event.target.value as DebugSettings["roll"] })}>
            <option value="positive">成功寄り（抽選値 0）</option><option value="negative">失敗寄り（抽選値 9999）</option>
          </select>
        </label>
        {message && <p role="alert">{message}</p>}
        <button type="submit" className="primary">この場面を開く</button>
      </form>
      <p><a href="?character-preview">背景・人物・表情を確認</a></p>
      <a href={import.meta.env.BASE_URL}>通常プレイに戻る</a>
    </main>
  );
}
