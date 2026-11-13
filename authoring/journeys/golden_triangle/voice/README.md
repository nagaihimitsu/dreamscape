# インド編の声の台本（渡した台本の控え）

ヒロインの声を作る人に渡した台本を、渡したときのまま、渡した日付のフォルダに残します。ゲームはこのフォルダを読み込みません。台本を渡した後や録音した後に台詞の文が変わると、その声は作り直しが要るので、ここの台本と今のシナリオを比べて見つけます（[制作ガイドの「台詞の声の台本」](../../../CONTENT_GUIDE.md#台詞の声の台本と台詞が変わったときの確認2026-11-13)）。

## 2026-11-12/

2026-11-12に渡した、ヒロインの台詞877行（デリー・アーグラ・ジャイプール）の台本です。1行＝1回の収録＝1ファイルで、ファイル名は [ID] です。

- `india_heroine_lines.txt`：渡した台本（[ID]ごとに、前の行・場面の分かれ道・表情・演出と台詞）
- `entries.json`：同じ台詞のデータ（`id`・`text`・`file`・`knot`・`title` など。`line` はファイルの中の行で、0から数える）。`voice:changes` と `content:build` が読みます
- `india_voice_guide.txt`：声を作る人への説明書（読み方、札の意味、気をつけること）

この台本は、リポジトリにない使い捨てのスクリプトで作りました。今の `npm run voice:script` は同じ読み方で、同じ877行を同じ文で抜き出します。その後バトルの会話が場所のファイルへ移ったので、バトルの台詞150行の `file`・`knot` は当時のもの（例 `battles/gt_delhi_finale.ink`・`gt_delhi_finale`）で、今の knot には `_battle` が付いています（`gt_delhi_finale_battle`）。声のファイル名は、この台本の ID のままです。

届いた声：デリーの236行（台本の1〜236番目）が `content/journeys/golden_triangle/public/assets/voice/<ID>.mp3` にあり、Inkの台詞の前の `# voice: <ID>` で結び付けています。残りの641行は作っているところです。

## 使い方

- 台詞が変わったかを見る：`npm run voice:changes -- --journey golden_triangle`。いちばん新しい日付のフォルダの台本と今のヒロインの台詞を比べ、文が変わった台詞（録音済みのものが先。録り直しが要ります）、なくなった台詞、台本にない新しい台詞を出します。
- `npm run content:build` は、`# voice:` のある行の文が台本の同じ ID の文と違うと、注意「録音した台詞が変わりました：<ID>（録り直しが必要）」を出します（件数。文は `npm run content:build -- --verbose`）。
- 新しい台本を作る：`npm run voice:script -- --journey golden_triangle`（`artifacts/voice/golden_triangle/` に `heroine_lines.txt` と `entries.json`）。渡したら、このフォルダに渡した日付のフォルダ（例 `2026-11-20/`）を作り、渡したファイルをそのまま置いてコミットします。以後はそれが比べる相手です。
