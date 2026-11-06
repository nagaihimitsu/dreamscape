# 旅行編ごとの制作資料

`authoring/journeys/<旅行編ID>/` には、その旅行編だけで使う制作資料を置きます。旅行編IDは `content/journeys/<旅行編ID>/` と同じです。ゲームはこのフォルダを読み込みません。

- `drafts/`：下書き・観察カードなどの作業資料
- `research/`：調査記録
- その他：旅行編専用の制作補助（例：インド編の `scaffold/`）や編集メモ

全旅行編で共有する手順書とテンプレートは `authoring/` 直下（[制作マニュアル](../CONTENT_GUIDE.md)、[テンプレート](../templates/) など）にあります。制作ツールが使う観察カードや交通判断の場所は、各旅行編の `content/journeys/<旅行編ID>/manifest.json` の `authoring` で指定します。

## 当時の配置と現在の配置

`research/` 以下の調査記録と、日付入りの作業記録（`REWRITE*.md`、`sources.json` など）は作成当時のまま保存しています。文中のパス・コマンド（例：`authoring/research/…`、`authoring/drafts/…`、`content/tourism/catalog.json`、`public/assets/tourism/…`）は当時の配置を指すため、次の表で現在の配置に読み替えてください。旧パスを含む記録には、冒頭（題名の下）にその旨の注記を1行入れています。リンクだけは現在の場所へ直してあり、`scripts/docs-links.test.ts` がGit管理下の全Markdownの相対リンクを検査します。

| 当時の配置 | 現在の配置 |
| --- | --- |
| `authoring/research/<調査名>/` | `authoring/journeys/<旅行編ID>/research/<調査名>/` |
| `authoring/drafts/<旅行編>/`（例：`golden-triangle`） | `authoring/journeys/<旅行編ID>/drafts/` |
| `authoring/india-scaffold/` | `authoring/journeys/golden_triangle/scaffold/` |
| `content/cities/`・`content/travel/`・`content/stories/`・`content/quizzes/` と、各カタログ（`content/tourism/catalog.json`・`content/progression/journey.json` など）の旅行編の項目 | `content/journeys/<旅行編ID>/` の同じ相対パス |
| `content/journeys/catalog.json`（旅行編の一覧） | 各旅行編の `content/journeys/<旅行編ID>/manifest.json` |
| `content/travel/research/`（ミラノの交通調査） | `authoring/journeys/milano/research/travel/` |
| `public/assets/tourism/<旅行編>/` などの旅行編の画像 | `content/journeys/<旅行編ID>/public/assets/` |
| インド編専用の `scripts/*.ts`（`inspect-india-transit.ts` など） | `scripts/journeys/golden_triangle/` |
| 削除したE2E（`tests/e2e/city-arrival.spec.ts` など） | 現在のE2Eは [開発時の確認](../../docs/10_DEVELOPMENT_CHECKS.md#e2eテスト) を参照 |

調査フォルダに残るPythonの取得・組み立てスクリプトは当時の書き込み先（`public/assets/…`、`content/…`）を使うため、実行すると冒頭の確認で停止します。
