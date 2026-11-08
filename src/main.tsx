import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App";
import { browserStorage } from "./app/app-storage";
import { readDebugMode } from "./app/debug-mode";
import "./app/styles.css";

// Debug's 「場面の確認」 (?debug, launch URLs) and the asset preview (?character-preview)
// run on their own page and never mount beside a normal game. They are loaded only
// when opened: lazy chunks the title page does not load (scripts/check-dist.ts).
const CharacterPreview = React.lazy(() => import("./dev/CharacterPreview"));
const DebugMode = React.lazy(() => import("./dev/DebugMode"));
// The development server always offers Debug; a production build only on a device whose
// Debug mode is on (設定, password 「adminmode」, src/app/debug-mode.ts). With it off,
// ?debug… and ?character-preview open the normal title.
const debugAllowed = import.meta.env.DEV || readDebugMode(browserStorage);
const query = new URLSearchParams(window.location.search);
const showDebug = debugAllowed && query.has("debug");
const showCharacterPreview = debugAllowed && query.has("character-preview");
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {showDebug ? (
      <React.Suspense fallback={<p>読み込み中…</p>}>
        <DebugMode />
      </React.Suspense>
    ) : showCharacterPreview ? (
      <React.Suspense fallback={<p>読み込み中…</p>}>
        <CharacterPreview />
      </React.Suspense>
    ) : (
      <App />
    )}
  </React.StrictMode>,
);
