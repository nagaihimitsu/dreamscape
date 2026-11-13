import path from "node:path";
import { describe, expect, it } from "vitest";
import { contentSourcesFromTree, loadContentSources, selectJourneys } from "../../../scripts/content-sources";
import { validateContent } from "../../../scripts/content-validation";

// content:build's A21 on Milan's own files, changed in memory: a city whose then: epilogue is a catalog encounter's choice tag
// (written in the encounter's Ink) starts its epilogue itself only by that then:, as the game reads it, so its epilogue may spend.

const repository = path.resolve(".");
describe("an epilogue's spending # on_done: in a city whose then: epilogue is a catalog encounter's choice tag (A21)", () => {
  it("reads the catalog's then: epilogue as the game does: Milan's epilogue may then spend", () => {
    const milano = selectJourneys(loadContentSources(repository), ["milano"]);
    const files = new Map(milano.tree.files);
    const edit = (file: string, change: (text: string) => string) => files.set(file, Buffer.from(change(files.get(file)!.toString("utf8"))));
    // The epilogue is a knot of the Darsena's place file (the finale's knot before it has the same background): its head.
    edit("content/journeys/milano/stories/places/milano_darsena.ink", (text) => text.replace("=== milano_epilogue ===\n# scene: epilogue\n", "=== milano_epilogue ===\n# scene: epilogue\n# on_done: money -5\n"));
    expect(() => validateContent(contentSourcesFromTree({ ...milano.tree, files }))).toThrow(/An arrival or an epilogue the game starts by itself/u);
    edit("content/journeys/milano/stories/encounters/milano_duomo_string.ink", (text) => text.replace(
      "* [I'll give you some room. # option: leave # translation: 少し場所を空けます。]\n", "* [I'll give you some room. # option: leave # translation: 少し場所を空けます。]\n    # then: epilogue\n"));
    expect(() => validateContent(contentSourcesFromTree({ ...milano.tree, files }))).not.toThrow();
  });
});
