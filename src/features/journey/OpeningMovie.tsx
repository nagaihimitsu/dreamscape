import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./opening-movie.css";

/**
 * A journey's opening movie (2026-11-13; manifest `openingMovie`), played full screen once when a new journey starts,
 * before its first scene (GameApp starts the game when it ends). It plays with sound as the start tap allows; a browser
 * that refuses sound without a fresh gesture (iOS) gets it muted with 「音を出す」, and one that refuses any playback
 * (Low Power Mode) gets a play button. 「スキップ」 (or Escape) ends it at once; so does a file that cannot load or play.
 * The background music is silent meanwhile (scene-music.ts). Nothing is saved: a reload before its end starts nothing.
 */

/** How long after it appears 「スキップ」 takes a press (the start tap's second touch must not skip it). */
const SKIP_READY_MS = 600;

export function OpeningMovie({ src, muted: startMuted, onEnd }: {
  /** The served URL of the MP4. */
  src: string;
  /** Start without sound (「BGMを流す」 is off). */
  muted: boolean;
  onEnd: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const skip = useRef<HTMLButtonElement>(null);
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;
  const ended = useRef(false);
  const [muted, setMuted] = useState(startMuted);
  const [blocked, setBlocked] = useState(false);
  const [ready, setReady] = useState(false);

  const finish = () => {
    if (ended.current) return;
    ended.current = true;
    video.current?.pause();
    onEndRef.current();
  };

  useEffect(() => {
    const element = video.current;
    if (!element) return;
    element.muted = startMuted;
    element.play().catch(() => {
      // Sound refused without a fresh gesture: play muted (always allowed for an inline video) and offer the sound.
      element.muted = true;
      setMuted(true);
      element.play().catch(() => setBlocked(true));
    });
    const timer = window.setTimeout(() => setReady(true), SKIP_READY_MS);
    const onVisibility = () => {
      if (document.hidden) element.pause();
      else if (!ended.current) element.play().catch(() => undefined);
    };
    document.addEventListener("visibilitychange", onVisibility);
    skip.current?.focus();
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      element.pause();
    };
  // Once a movie (GameApp mounts one per start).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleSound = () => {
    const element = video.current;
    if (!element) return;
    element.muted = !muted;
    setMuted(!muted);
    if (element.paused && !ended.current) element.play().catch(() => undefined);
  };
  const playBlocked = () => {
    const element = video.current;
    if (!element) return;
    element.muted = false;
    setMuted(false);
    setBlocked(false);
    element.play().catch(() => finish());
  };

  return createPortal(<div className="opening-movie" role="dialog" aria-modal="true" aria-label="オープニングムービー"
    data-testid="opening-movie" onKeyDown={(event) => {
      if (event.key === "Escape") finish();
      // The keyboard stays on the movie's buttons (the title under it is not reachable meanwhile).
      if (event.key !== "Tab") return;
      const buttons = [...event.currentTarget.querySelectorAll("button")];
      if (!buttons.length) return;
      const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
      const next = buttons[(at + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length];
      event.preventDefault();
      next.focus();
    }}>
    <video ref={video} className="opening-movie-video" src={src} playsInline preload="auto"
      onEnded={finish} onError={finish} aria-hidden="true" />
    <div className="opening-movie-controls">
      {!blocked && <button type="button" className="opening-movie-button" aria-pressed={!muted} onClick={toggleSound}>
        {muted ? "音を出す" : "音を消す"}
      </button>}
      <button ref={skip} type="button" className="opening-movie-button" data-testid="opening-movie-skip"
        aria-disabled={!ready} onClick={() => {
          if (ready) finish();
        }}>
        スキップ
      </button>
    </div>
    {blocked && <button type="button" className="opening-movie-button opening-movie-play" onClick={playBlocked}>
      ▶ 再生する
    </button>}
  </div>, document.body);
}
