import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App";
import "./app/styles.css";

// The asset preview is available only from the local development server; it
// does not mount the game or read/write a player's save.
const CharacterPreview = import.meta.env.DEV
  ? React.lazy(() => import("./dev/CharacterPreview"))
  : null;
const DebugMode = import.meta.env.DEV
  ? React.lazy(() => import("./dev/DebugMode"))
  : null;
const showCharacterPreview = new URLSearchParams(window.location.search).has(
  "character-preview",
);
const showDebug = new URLSearchParams(window.location.search).has("debug");
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {DebugMode && showDebug ? (
      <React.Suspense fallback={<p>読み込み中…</p>}>
        <DebugMode />
      </React.Suspense>
    ) : CharacterPreview && showCharacterPreview ? (
      <React.Suspense fallback={<p>読み込み中…</p>}>
        <CharacterPreview />
      </React.Suspense>
    ) : (
      <App />
    )}
  </React.StrictMode>,
);
