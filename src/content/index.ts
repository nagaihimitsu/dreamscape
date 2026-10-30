import dateData from "../../content/romance/date_catalog.json";
import effectData from "../../content/romance/effect_catalog.json";
import cityData from "../../content/cities/milano.json";
import balanceData from "../../content/romance/balance.json";
import presentationData from "../../content/romance/presentation.json";
import generatedStories from "./generated/stories.json";
import {
  balanceSchema,
  citySchema,
  dateCatalogSchema,
  effectCatalogSchema,
  presentationSchema,
} from "./schemas";

export const dates = dateCatalogSchema.parse(dateData).dates;
export const effects = effectCatalogSchema.parse(effectData).effects;
export const city = citySchema.parse(cityData);
export const balance = balanceSchema.parse(balanceData);
export const presentation = presentationSchema.parse(presentationData);
export const stories: Record<string, string> = generatedStories;
export const tagContext = {
  effectIds: effects.map((effect) => effect.id),
  backgroundIds: Object.keys(presentation.backgrounds),
  emotionIds: Object.keys(presentation.emotions),
};
export type { DateDefinition, EffectDefinition } from "./schemas";
