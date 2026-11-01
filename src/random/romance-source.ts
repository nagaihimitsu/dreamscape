/** A small adapter for unpredictable, unbiased 0–9999 tickets. */
export function secureRomanceRoll(): number {
  const source = globalThis.crypto;
  if (!source?.getRandomValues) throw new Error("乱数を生成できません。ブラウザの設定を確認してください。");
  const sample = new Uint32Array(1);
  // Reject the incomplete upper bucket to avoid modulo bias.
  do source.getRandomValues(sample); while (sample[0] >= 4294960000);
  return sample[0] % 10000;
}
