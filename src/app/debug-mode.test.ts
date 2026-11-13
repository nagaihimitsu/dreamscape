import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DEBUG_MODE_KEY, DEBUG_MODE_PASSWORD, DEBUG_VOICE_RATE_KEY, isDebugModePassword, readDebugMode, readDebugVoiceRate, writeDebugMode,
  writeDebugVoiceRate,
} from "./debug-mode";

// User decision 2026-11-08: Debug mode for everyone from 設定, with the password 「adminmode」,
// which is not a secret; a per-device preference with its own key.
const memory = (entries: Record<string, string> = {}) => {
  const values = new Map(Object.entries(entries));
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
};
const refusing = (entries: Record<string, string> = {}) => {
  const store = memory(entries);
  return {
    values: store.values,
    getItem: (): string | null => { throw new DOMException("The operation is insecure.", "SecurityError"); },
    setItem: () => { throw new DOMException("The quota has been exceeded.", "QuotaExceededError"); },
    removeItem: () => { throw new DOMException("The operation is insecure.", "SecurityError"); },
  };
};

describe("Debug mode switch", () => {
  it("is a device preference under its own versioned key", () => {
    expect(DEBUG_MODE_KEY).toBe("dreamscape.debug-mode.v1");
  });

  it("is on only for the stored value \"on\"", () => {
    expect(readDebugMode(memory({ [DEBUG_MODE_KEY]: "on" }))).toBe(true);
    expect(readDebugMode(memory())).toBe(false);
    for (const value of ["", "true", "ON", "off", "{\"on\":true}"]) expect(readDebugMode(memory({ [DEBUG_MODE_KEY]: value })), value).toBe(false);
  });

  it("reads as off when the storage cannot be read", () => {
    expect(readDebugMode(refusing())).toBe(false);
  });

  it("turns on and off by writing and removing its key only", () => {
    const store = memory({ "dreamscape.presentation.v1": "{}", "dreamscape.journey.milano.save.v1": "{}" });
    expect(writeDebugMode(store, true)).toEqual({ ok: true });
    expect(Object.fromEntries(store.values)).toEqual({
      "dreamscape.presentation.v1": "{}", "dreamscape.journey.milano.save.v1": "{}", [DEBUG_MODE_KEY]: "on",
    });
    expect(readDebugMode(store)).toBe(true);
    expect(writeDebugMode(store, false)).toEqual({ ok: true });
    expect(Object.fromEntries(store.values)).toEqual({ "dreamscape.presentation.v1": "{}", "dreamscape.journey.milano.save.v1": "{}" });
    // Turning it off or on twice changes nothing more.
    expect(writeDebugMode(store, false)).toEqual({ ok: true });
    expect(store.values.has(DEBUG_MODE_KEY)).toBe(false);
  });

  it("reports a storage that refuses, and changes nothing", () => {
    const off = refusing();
    expect(writeDebugMode(off, true)).toEqual({ ok: false, message: "この端末に保存できなかったため、Debugモードをオンにできませんでした。" });
    expect(off.values.size).toBe(0);
    const on = refusing({ [DEBUG_MODE_KEY]: "on" });
    expect(writeDebugMode(on, false)).toEqual({ ok: false, message: "この端末の保存領域を変更できなかったため、Debugモードをオフにできませんでした。" });
    expect(Object.fromEntries(on.values)).toEqual({ [DEBUG_MODE_KEY]: "on" });
  });
});

describe("Debug mode password", () => {
  it("is the plain constant 「adminmode」, documented next to it as not a secret", () => {
    expect(DEBUG_MODE_PASSWORD).toBe("adminmode");
    const source = readFileSync(new URL("./debug-mode.ts", import.meta.url), "utf8");
    expect(source).toContain('export const DEBUG_MODE_PASSWORD = "adminmode";');
    expect(source).toContain("NOT a secret");
    expect(source).toContain("見られても構わないパスワードです。");
  });

  it("accepts the password with surrounding spaces, capital letters or full-width letters (decision D2)", () => {
    for (const input of ["adminmode", " adminmode ", "Adminmode", "ADMINMODE", "ａｄｍｉｎｍｏｄｅ", "ＡＤＭＩＮＭＯＤＥ", "　adminmode　", "adminmode\n"])
      expect(isDebugModePassword(input), JSON.stringify(input)).toBe(true);
  });

  it("refuses anything else", () => {
    for (const input of ["", "admin", "adminmode1", "admin mode", "admin_mode", "adminnode", "パスワード"])
      expect(isDebugModePassword(input), JSON.stringify(input)).toBe(false);
  });
});

// Debug's speed of the voices (2026-11-13 user request; the rule: src/audio/voice-rate.test.ts).
describe("Debug's speed of the voices", () => {
  it("is a device preference under its own versioned key, beside the switch", () => {
    expect(DEBUG_VOICE_RATE_KEY).toBe("dreamscape.debug-voice-rate.v1");
    expect(DEBUG_VOICE_RATE_KEY).not.toBe(DEBUG_MODE_KEY);
  });

  it("reads 1 when nothing, no number or an unreadable storage is there, and keeps a stored rate on its scale", () => {
    expect(readDebugVoiceRate(memory())).toBe(1);
    expect(readDebugVoiceRate(refusing())).toBe(1);
    expect(readDebugVoiceRate(memory({ [DEBUG_VOICE_RATE_KEY]: "fast" }))).toBe(1);
    expect(readDebugVoiceRate(memory({ [DEBUG_VOICE_RATE_KEY]: "1.25" }))).toBe(1.25);
    expect(readDebugVoiceRate(memory({ [DEBUG_VOICE_RATE_KEY]: "3" }))).toBe(1.5);
    expect(readDebugVoiceRate(memory({ [DEBUG_VOICE_RATE_KEY]: "0.71" }))).toBe(0.75);
  });

  it("writes its key only, and stores 1× as no key", () => {
    const others = { "dreamscape.presentation.v1": "{}", [DEBUG_MODE_KEY]: "on", "dreamscape.journey.milano.save.v1": "{}" };
    const store = memory(others);
    expect(writeDebugVoiceRate(store, 1.2)).toEqual({ ok: true });
    expect(Object.fromEntries(store.values)).toEqual({ ...others, [DEBUG_VOICE_RATE_KEY]: "1.2" });
    expect(readDebugVoiceRate(store)).toBe(1.2);
    // Off the scale: kept on it.
    expect(writeDebugVoiceRate(store, 9)).toEqual({ ok: true });
    expect(store.values.get(DEBUG_VOICE_RATE_KEY)).toBe("1.5");
    expect(writeDebugVoiceRate(store, 1)).toEqual({ ok: true });
    expect(Object.fromEntries(store.values)).toEqual(others);
  });

  it("stays when Debug mode is turned off (it counts only while Debug mode is on: voice-rate.ts)", () => {
    const store = memory({ [DEBUG_MODE_KEY]: "on", [DEBUG_VOICE_RATE_KEY]: "0.8" });
    expect(writeDebugMode(store, false)).toEqual({ ok: true });
    expect(Object.fromEntries(store.values)).toEqual({ [DEBUG_VOICE_RATE_KEY]: "0.8" });
  });

  it("reports a storage that refuses, and changes nothing", () => {
    const store = refusing({ [DEBUG_VOICE_RATE_KEY]: "1.1" });
    const refused = { ok: false, message: "この端末に保存できなかったため、この声の速さはページを開き直すと元に戻ります。" };
    expect(writeDebugVoiceRate(store, 1.3)).toEqual(refused);
    expect(writeDebugVoiceRate(store, 1)).toEqual(refused);
    expect(Object.fromEntries(store.values)).toEqual({ [DEBUG_VOICE_RATE_KEY]: "1.1" });
  });
});
