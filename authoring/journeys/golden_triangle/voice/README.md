# インド編の声の記録

ヒロインの声（1行＝1回の収録＝1ファイル。ファイル名は台本の [ID]）の記録です。ゲームはこのフォルダを読み込みません。台本を渡した後や録音した後に台詞の文が変わると、その声は作り直しが要るので、ここの記録と今のシナリオを照らし合わせて見つけます。流れの説明は[制作ガイドの「台詞の声の台本」](../../../CONTENT_GUIDE.md#台詞の声の台本と台詞が変わったときの確認2026-11-13)にあります。

- `<日付>/`：声を作る人に渡した台本を、渡したときのまま置きます（台本・`entries.json`・説明書）。`voice:script` は、同じ文の行にここの ID を付け続けます。
- `recorded.json`：届いた声が言っている文。ID ごとに、その声を作った台本の文（`text`）と、その台本の日付（`script`）。`voice:tag` が書きます。

## 2026-11-12/

2026-11-12に渡した、ヒロインの台詞877行（デリー・アーグラ・ジャイプール）の台本です。

- `india_heroine_lines.txt`：渡した台本（[ID]ごとに、前の行・場面の分かれ道・表情・演出と台詞）
- `entries.json`：同じ台詞のデータ（`id`・`text`・`file`・`knot`・`title` など。`line` はファイルの中の行で、0から数える）
- `india_voice_guide.txt`：声を作る人への説明書（読み方、札の意味、気をつけること）

この台本は、リポジトリにない使い捨てのスクリプトで作りました。今の `npm run voice:script` は同じ読み方で、同じ877行を同じ文と同じ ID で抜き出します。その後バトルの会話が場所のファイルへ移ったので、バトルの台詞150行の `file`・`knot` は当時のもの（例 `battles/gt_delhi_finale.ink`・`gt_delhi_finale`）で、今の knot には `_battle` が付いています（`gt_delhi_finale_battle`）。ID は台本のまま（`gt_delhi_finale_001` など）です。

届いた声：デリーの236行（台本の1〜236番目）が `content/journeys/golden_triangle/public/assets/voice/<ID>.mp3`（MP3・48kHz・モノラル・80kbps）にあり、Inkの台詞の前の `# voice: <ID>` で結び付け、`recorded.json` に2026-11-12の台本の文で記録しています。残りの641行は作っているところです。

## 使い方

1. 台本を作る：`npm run voice:script -- --journey golden_triangle`（`artifacts/voice/golden_triangle/` に `heroine_lines.txt` と `entries.json`）。
2. 渡す：渡した日付のフォルダ（例 `2026-11-20/`）をここに作り、渡したファイルをそのまま置いてコミットします。
3. 届いたら：MP3 を `content/journeys/golden_triangle/public/assets/voice/` に置いてから、`npm run voice:tag -- --journey golden_triangle --from <届いたファイルのフォルダ>`。`# voice:` を付け、`recorded.json` に記録します。文が台本と違う声は付けずに、理由を出します。
4. 変わったら：`npm run voice:changes -- --journey golden_triangle` で、録り直しが要る行（`recorded.json` の文と違う行）と、まだ録音していない行の変更（いちばん新しい台本と比べる）を見ます。`npm run content:build` も、録音した行の文が変わると注意「録音した台詞が変わりました：<ID>（録り直しが必要）」を出します（文は `-- --verbose`）。
5. 録り直す：台本を作り直して渡し、届いたら `voice:tag` で付けます。注意は、作り直した声を記録するまで消えません。
