import { expect, it } from "vitest";
import { getCities, getCityContent } from ".";

it("registers only authored cities and rejects unknown IDs", () => {
  expect(getCities().map((city) => city.id)).toEqual(["milano"]);
  expect(getCityContent("milano").travel.cityId).toBe("milano");
  expect(() => getCityContent("unknown_city")).toThrow(/Unknown city/);
  expect(() => getCityContent("constructor")).toThrow(/Unknown city/);
});
