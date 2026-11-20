// Which file a moving standing picture reads from where (LivePortrait.tsx, 2026-11-20): an outfit's own layers from its
// folder (characters.json `avatar`) and the face drawings it shares with the character's other outfits from the face
// folder (`avatarFace`). The names are mesh-avatar's (createMeshAvatar `assets`).

/** mesh-avatar's asset names → URLs. `folder` and `face` are URLs ending in "/"; the names come from the folder's
 * built/layers.json and the face folder's sprites.json. */
export function sharedFaceAssets(
  folder: string,
  face: string,
  layerNames: readonly string[],
  spriteNames: readonly string[],
): Record<string, string> {
  const assets: Record<string, string> = {
    "layers.json": `${folder}built/layers.json`,
    "base.png": `${folder}built/base.png`,
    "hairmask.png": `${folder}built/hairmask.png`,
    "sprites/sprites.json": `${face}sprites.json`,
  };
  for (const name of layerNames) assets[`${name}.png`] = `${folder}built/${name}.png`;
  for (const name of spriteNames) assets[`sprites/${name}.png`] = `${face}${name}.png`;
  return assets;
}
