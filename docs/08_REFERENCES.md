# 08 開発・史実の公式資料（閲覧用）

## Ink / inkjs
- Ink公式: https://www.inklestudios.com/ink/
- Inkプロジェクト・コンパイラ情報: https://github.com/inkle/ink
- Ink言語仕様: https://github.com/inkle/ink/blob/master/Documentation/WritingWithInk.md
- Inkランタイム・タグ/保存仕様: https://github.com/inkle/ink/blob/master/Documentation/RunningYourInk.md
- inkjs: https://github.com/y-lohse/inkjs
- npm inkjs: https://www.npmjs.com/package/inkjs

## ゲーム基盤
- Vite: https://vite.dev/guide/ （セットアップとNodeの要件）
- React: https://react.dev/
- TypeScript: https://www.typescriptlang.org/docs/
- Leaflet（大きな地図）: https://leafletjs.com/
- sharp（画像の変換。生成と制作ツールで使い、ゲームには入らない）: https://sharp.pixelplumbing.com/

### 採用している版
依存関係は `package-lock.json` で固定している。動作を確かめた版：Vite 8.3.5（Nodeの要件 `^20.19.0 || >=22.12.0`）、React 19.3.1、TypeScript 7.0.2、inkjs 2.4.0、Zod 4.6.7、Vitest 5.0.5、Playwright 1.64.1、Leaflet 1.9.4、sharp 0.35.5。ライセンスは、inkjs・Vite・React・Zod・Vitest が MIT、TypeScript・Playwright・sharp が Apache-2.0、Leaflet が BSD-2-Clause。inkjs の公式 README で、コンパイラと互換性を確かめている。

## ミラノ『最後の晩餐』 — 史実の検証先
- 最後の晩餐美術館公式: https://cenacolovinciano.org/en/
- 美術館公式・乾式技法と保存問題: https://cenacolovinciano.org/en/museum/backstage/
- 美術館公式・遠近法の解説: https://cenacolovinciano.org/en/story/a-powerful-theatrical-machine/

## ミラノ編の史実の照合
ミラノ編の史実は、ドゥオモの運営団体、ミラノ市、ロンバルディア州の文化財、YesMilano、美術館、イタリア文化省などの公式資料と照らし合わせた。全文を取れない公式ページは、公式の検索索引で確かめられる記述とほかの公式資料を組み合わせ、確かめられた限られた事実だけを使った。ガッレリアの雄牛にまつわる幸運の作法は `legend`、『最後の晩餐』の空間の効果は `interpretation` として区別している。

**注意:** 出典の記録は画像の利用権を意味しない。ゲームに画像を組み込む前に、所蔵元や権利者の利用規約を確認する。歴史的な意図の解釈は確認済み事実とは区別する。
