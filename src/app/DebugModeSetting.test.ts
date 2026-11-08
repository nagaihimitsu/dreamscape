import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DebugModeSetting } from "./DebugModeSetting";

// 設定 → Debugモード: the status that says 「Debugモードをオフにしました。」 is on the page, empty, before
// the switch is turned off, so screen readers announce the text put into it.
describe("Debug mode setting", () => {
  const debugMode = (on: boolean) => ({ on, message: "", refresh: () => {}, turnOn: () => "wrong" as const, turnOff: () => "ok" as const });
  const announcement = '<p class="debug-mode-announcement" role="status"></p>';

  it.each([false, true])("keeps an empty status for the off confirmation (Debug mode on: %s)", (on) => {
    const html = renderToStaticMarkup(createElement(DebugModeSetting, { debugMode: debugMode(on) }));
    expect(html).toContain(announcement);
    expect(html).not.toContain("Debugモードをオフにしました。");
  });
});
