import type { SceneEntry } from "../src/content/scene-schemas";

// Build checks of a shop's scenes and of `# outfit:` (2026-11-26; pure, on the scene table). Stops only what would break the
// game or the save: an outfit no shop of the scene's journey sells (the save check keeps an outfit only when one does,
// src/domain/outfits.ts validateOutfits), a shop of another city, and a `# then:` in a shop's scene (free time's shop has no
// move or epilogue to run after it yet).

export type ShopSceneContent = {
  shops: readonly { id: string; cityId: string; outfitIds: readonly string[] }[];
  outfits: readonly string[];
  /** The journey of a city (undefined: none). */
  journeyOf: (cityId: string) => string | undefined;
};

/** The errors of the shops' scenes and of the scenes' `# outfit:` (empty when none). */
export function shopSceneErrors(scenes: readonly SceneEntry[], content: ShopSceneContent): string[] {
  const errors: string[] = [];
  for (const scene of scenes) {
    const journey = content.journeyOf(scene.cityId);
    for (const option of scene.options) {
      if (!option.outfit) continue;
      const sold = content.shops.some((shop) => shop.outfitIds.includes(option.outfit!) && content.journeyOf(shop.cityId) === journey);
      if (!content.outfits.includes(option.outfit) || !sold)
        errors.push(`# outfit: ${option.outfit}（${scene.id} の選択肢 ${option.id}）は、この旅行編のどのお店も売っていない服です。shop/catalog.json の ` +
          `outfits に書き、その旅行編のお店の outfitIds に入れてください（an outfit a scene gives is one a shop of its journey sells）。`);
    }
    for (const moment of scene.at) {
      if (!("shop" in moment)) continue;
      const shop = content.shops.find((item) => item.id === moment.shop);
      if (shop && shop.cityId !== scene.cityId)
        errors.push(`# at: shop ${moment.shop}（${scene.id}）は ${shop.cityId} のお店です。場面は ${scene.cityId} の場面です（a shop's scenes are of its city）。`);
      if (scene.then || scene.options.some((option) => option.then))
        errors.push(`お店の場面（${scene.id}、# at: shop ${moment.shop}）には # then: を書けません。お店を出ると街歩きに戻ります` +
          `（a shop's scene takes no # then: yet）。`);
    }
  }
  return errors;
}
