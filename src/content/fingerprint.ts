/** The 32-bit FNV-1a hash of a text, in hex: the saved fingerprints of stories and scenes. */
export function fnvHash(text: string): string {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index++) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
  return (hash >>> 0).toString(16);
}
