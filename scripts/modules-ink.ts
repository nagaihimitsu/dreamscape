import { readFileSync } from "node:fs";

/** The game's module every place file includes (src/story/modules.ink), as content:build compiles it. */
export const MODULES_INK = readFileSync(new URL("../src/story/modules.ink", import.meta.url), "utf8");
/** The name a place file includes it by. */
export const MODULES_FILE = "modules.ink";
