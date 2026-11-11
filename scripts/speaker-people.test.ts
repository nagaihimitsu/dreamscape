import { describe, expect, it } from "vitest";
import { checkSpeakerPeople } from "./speaker-people";

// A line's # speaker: names narrator, heroine, player, enemy or a declared person (2026-11-11).

const people = new Set(["smp_mihon_lili"]);
const source = (line: string) => `INCLUDE modules.ink\n-> DONE\n\n=== smp_mihon_talk ===\n# scene: talk\n# speaker: narrator\n広場。\n${line}\n今日は。\n-> END\n`;

describe("the people who speak", () => {
  it("accepts the reserved speakers and a declared person, on their own tag line or with other tags", () => {
    for (const line of ["# speaker: heroine", "# speaker: player # emotion: smile", "# speaker: enemy", "# speaker: smp_mihon_lili"])
      expect(() => checkSpeakerPeople(source(line), people)).not.toThrow();
  });

  it("stops at an undeclared person, naming the knot, the line and the ID", () => {
    expect(() => checkSpeakerPeople(source("    # reaction: heroine,smile # speaker: smp_mihon_nobody"), people))
      .toThrow("Undeclared person in # speaker: of the knot smp_mihon_talk (line 8): smp_mihon_nobody");
  });

  it("reads no commented-out tag", () => {
    expect(() => checkSpeakerPeople(source("// # speaker: smp_mihon_nobody"), people)).not.toThrow();
  });
});
