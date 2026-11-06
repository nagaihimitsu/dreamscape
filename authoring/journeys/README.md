# 旅行編ごとの制作資料

`authoring/journeys/<旅行編ID>/` には、その旅行編だけで使う制作資料を置きます。旅行編IDは `content/journeys/<旅行編ID>/` と同じです。ゲームはこのフォルダを読み込みません。

- `drafts/`：下書き・観察カードなどの作業資料
- `research/`：調査記録
- その他：旅行編専用の制作補助（例：インド編の `scaffold/`）や編集メモ

全旅行編で共有する手順書とテンプレートは `authoring/` 直下（[制作マニュアル](../CONTENT_GUIDE.md)、[テンプレート](../templates/) など）にあります。制作ツールが使う観察カードや交通判断の場所は、各旅行編の `content/journeys/<旅行編ID>/manifest.json` の `authoring` で指定します。

`research/` 以下の調査記録と、日付入りの作業記録（`REWRITE*.md`、`sources.json` など）は作成当時のまま保存しています。文中のパス・リンク・コマンド（例：`authoring/research/…`、`authoring/drafts/…`、`content/tourism/catalog.json`、`public/assets/tourism/…`）は当時の配置を指すため、現在の配置に読み替えてください。
