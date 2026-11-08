import { useState } from "react";
import type { StorageLike } from "../persistence";

/**
 * Debug mode (user decision 2026-11-08): anyone can turn it on in 設定 with the
 * password below. While it is on, this device's production build opens Debug's
 * 「場面の確認」 (`?debug`, src/main.tsx) and the game shows each choice's
 * relationship changes (src/domain/relationship-change.ts). It is this device's
 * preference, like the display settings and the remembered journey: never part
 * of a save, a backup, the English notes or Debug's own memory storage, and
 * neither 「保存データの消去」 nor 「古い保存データの整理」 touches it.
 */
export const DEBUG_MODE_KEY = "dreamscape.debug-mode.v1";
const ON = "on";

/**
 * The password that turns Debug mode on. NOT a secret: anyone may see it (here, in
 * the built game, in the docs and the pull request), as the user decided
 * (「見られても全然構わない」). It only keeps a player from turning Debug mode on by
 * accident; it protects nothing, so it is compared as plain text (no hash).
 * 見られても構わないパスワードです。誤ってオンにしないための確認で、守るための仕組みではありません。
 */
export const DEBUG_MODE_PASSWORD = "adminmode";

/**
 * Whether `input` is the password. Lenient (user decision D2): surrounding spaces,
 * capital letters and full-width letters are accepted (NFKC, trim, lower case), as
 * phones capitalise the first letter and Japanese input often gives full-width letters.
 */
export function isDebugModePassword(input: string): boolean {
  return input.normalize("NFKC").trim().toLowerCase() === DEBUG_MODE_PASSWORD;
}

/** Whether Debug mode is on: only the stored value "on" is; nothing stored, another value or a storage that cannot be read is off. */
export function readDebugMode(storage: Pick<StorageLike, "getItem">): boolean {
  try {
    return storage.getItem(DEBUG_MODE_KEY) === ON;
  } catch {
    return false;
  }
}

type DebugModeStorage = Pick<StorageLike, "getItem" | "setItem"> & { removeItem(key: string): void };
export type DebugModeWrite = { ok: true } | { ok: false; message: string };

/**
 * Turn Debug mode on (store "on") or off (remove the key). A storage that refuses
 * leaves it as it was and says so; nothing else is written. A stored value other
 * than "on" reads as off and stays until the player turns the switch on.
 */
export function writeDebugMode(storage: DebugModeStorage, on: boolean): DebugModeWrite {
  try {
    if (on) storage.setItem(DEBUG_MODE_KEY, ON);
    else storage.removeItem(DEBUG_MODE_KEY);
    return { ok: true };
  } catch {
    return {
      ok: false,
      message: on
        ? "この端末に保存できなかったため、Debugモードをオンにできませんでした。"
        : "この端末の保存領域を変更できなかったため、Debugモードをオフにできませんでした。",
    };
  }
}

/**
 * The switch for 設定. `refresh` reads the stored value again (when the dialog
 * opens, so a change made in another tab shows; there is no live sync between tabs).
 */
export function useDebugMode(storage: DebugModeStorage) {
  const [on, setOn] = useState(() => readDebugMode(storage));
  const [message, setMessage] = useState("");
  function refresh() {
    setOn(readDebugMode(storage));
    setMessage("");
  }
  function change(next: boolean): "ok" | "failed" {
    const result = writeDebugMode(storage, next);
    if (!result.ok) {
      setMessage(result.message);
      return "failed";
    }
    setOn(next);
    setMessage("");
    return "ok";
  }
  return {
    on,
    /** A storage failure of the last change, or "". */
    message,
    refresh,
    turnOn: (password: string): "ok" | "wrong" | "failed" => isDebugModePassword(password) ? change(true) : "wrong",
    turnOff: () => change(false),
  };
}
