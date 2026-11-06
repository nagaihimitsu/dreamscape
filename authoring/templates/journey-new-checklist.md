# {{nameJa}}（{{journeyId}}）の置き換えチェックリスト

この旅行編は `npm run journey:new` が見本の編（`authoring/templates/sample_trip/`）を複製して作りました。ID・旅行編名・都市名のほかは、見本の架空の街の内容のままです。下の項目を、実在する観光地・実際に確認した出典・権利を確認した画像・新しい文章に置き換えてから公開してください。このファイルはゲームに読み込まれません（`.md`）。置き換えが終わったら消してかまいません。

- 旅行編ID `{{journeyId}}`、都市ID `{{cityId}}`（{{cityNameJa}}）、IDの接頭辞 `{{prefix}}_`（`manifest.json` の `authoring.eventPrefix`）、並び順 `order: {{order}}`
- 状態：準備中（`manifest.json` の `status: "preparing"`、都市の `productionStatus: "prototype"`）。画像はすべて仮の扱い（`tourism/catalog.json` の `isPlaceholder: true`）です。
- 見本の出典（`https://example.com/…`）、見本と同じ画像、見本の文章が残っているうちは、`npm run journey:readiness -- --journey {{journeyId}}` が「見本の…が残っています」と一覧し、`npm run journey:release` は公開を止めます。

## 全体で置き換えるもの

- [ ] 舞台：実在する著名な観光地にする（`AGENTS.md` の「観光と学習」）。地点・観光地・デートの行き先の名前（`nameJa`・`nameEn`。見本は「見本の…」「Mihon …」）、座標（見本は海上の 0,0 付近）、徒歩時間とその出典。
- [ ] 出典：すべての `sources` と画像の `sourceUrl` を、実際に確認した資料の発行者・題名・URL・確認日に置き換え、`claimType` で事実・解釈・仮説・伝説を区別し、`claimJa` に資料が支える主張を書く。見本の「見本用の架空の…」は残さない。
- [ ] 画像：`public/assets/tourism/{{journeyId}}/` の見本の画像を、権利を確認した画像に差し替える。`tourism/catalog.json` の幅・高さ・説明・ライセンス・クレジット・加工内容を直し、`isPlaceholder` を `false` にする。
- [ ] 文章：観光案内・対決・デート・都市フィナーレ・エピローグ（含めた場合は特殊戦・道中交流）の会話と、カタログの表示文、クイズと和訳を書き直す。ヒロインの台詞・デートは `docs/09_HEROINE_CHARACTER_BIBLE.md` を読んでから書く。各Inkの冒頭の `//` コメントは書き方の規則なので残してよい。
- [ ] 英単語：`learning/word-meanings.json` を新しい英文に合わせる（共通の辞書 `content/learning/word-meanings.json` にない語だけを置く。どの英文も使わない語は `npm run content:build -- --verbose` で一覧できる）。
- [ ] 旅行編と都市の設定：`manifest.json` の通貨・開始資金・`cityPlan`、都市の国コード `countryCode`（見本は `XX`）と `themeJa`、`travel/{{cityId}}-settings.json` の宿泊費・メモ。

## ファイル

{{files}}

任意の部分（特殊戦B・特殊戦C・道中交流と品物）は `--with-optional` を付けたときだけ複製されます。仕組みと外し方は見本の `authoring/templates/sample_trip/README.md` の「任意の部分」にあります。

## 次の手順

1. `npm run content:build` で検証する。`npm run dev` のタイトル画面には「準備中」として並ぶ。
2. `npm run journey:readiness -- --journey {{journeyId}}` で、残っている見本の内容と未完成の項目を確かめる。
3. 上の項目を置き換える。観光地やデートを増やすときは `authoring/JOURNEY_AUTHORING.md` の `journey:scaffold` や `authoring/CITY_BUNDLES.md` の `city:bundle` を使える。
4. `npm run content:build` と `npm run journey:readiness -- --journey {{journeyId}}` を繰り返し、準備中であること（「旅行編は準備中です。」）以外の問題がなくなったら `npm run journey:release -- --check --journey {{journeyId}}`、続けて `--apply` で公開の状態にする。
5. 公開前に `npm run verify` とE2E一式を実行する。
