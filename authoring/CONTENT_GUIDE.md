# コンテンツ制作ガイド

Dreamscapeの正式データは `content/` です（全旅行編で共有する共通データは `content/` 直下、各旅行編のデータは `content/journeys/<旅行編ID>/`）。文章はInk、クイズ・設定はJSON、画像は旅行編の `content/journeys/<旅行編ID>/public/assets/`（全旅行編で共有する画像は `public/assets/`）に置きます。テキストエディタで直接編集できます。VS Code では、JSON の項目の候補・型・書き間違いが出ます（`authoring/schemas/` のスキーマを `.vscode/settings.json` で結び付けています。データの書式を変えたら `npm run schemas:build`。検査は `npm run content:build`）。人間の原稿も、どのAIの出力も、同じファイル形式・同じ検証を使います。AIや外部APIは不要です。任意の作業途中原稿は `authoring/journeys/<旅行編ID>/drafts/` などに置けますが、必須ではありません。Gitの差分とレビューで採用を決めます。

画面での呼び方（2026-11-11のユーザー判断）：遊ぶ人に見せる文では、バトルを「クイズ」（B・Cは「推理クイズ」）、敵を「相手」と呼び、勝ち負けの言葉を使いません。このガイドの「バトル」「対戦相手」と、`battles/`・`# speaker: enemy` などのファイル・札の名前は、内部の名前としてそのまま使います。

## 編集するファイル

会話の編集元は、各旅行編フォルダの `content/journeys/<旅行編ID>/stories/` の `.ink` ファイルです。ストーリーIDは `stories/` からの相対パスです。台詞と選択肢は React に埋め込まず、Ink に置きます。たとえばミラノのデートは [`places/milano_roastery.ink`](../content/journeys/milano/stories/places/milano_roastery.ink) の knot `milano_cafe_01` にあります（告白のデートは [`places/milano_darsena.ink`](../content/journeys/milano/stories/places/milano_darsena.ink) の knot `milano_confession_01`）。インド編の置き場所は[制作記録の編集元一覧](journeys/golden_triangle/drafts/scenario/README.md#編集元)にあります。

下の表の `<旅行編>` は `content/journeys/<旅行編ID>/`（例：`content/journeys/milano/`）、`<共通>` は `content/` 直下の共通データです。どのファイルを共通データと旅行編のどちらに置けるか、どう統合するかは[技術設計の「統合の規則」](../docs/02_TECH_ARCHITECTURE.md#統合の規則)にあります。

| 編集するファイル | 内容 |
| --- | --- |
| `<旅行編>/stories/places/*.ink` | 場所のファイル：その場所の場面（観光案内・バトルの相手の台詞と正誤の反応と結末・デート・道中交流と会話・到着とエピローグ（宿のファイル）・ツアー）を knot ごとに書く。会話・選択肢・リアクション・札 |
| `<旅行編>/stories/<種類>/*.ink` | 1場面1ファイル（`battles/`・`tourism/`・`dates/`・`encounters/`・`arrivals/`・`epilogues/`）。今も使える。クイズとくじのある道中交流（今はどの旅行編も使っていない）と、英語ノートの解説（`learning/`。場面ではないので場所のファイルには入れない）はこの形 |
| `<旅行編>/romance/date_catalog.json` | 種別、表示文、AP、開く条件・履歴、シナリオの参照、選択の回数・検証の文脈 |
| `<旅行編>/romance/effect_catalog.json` | 関係の値の差分、思い出ID、告白の結果（accepted/deferred）。共通のデート効果は `<共通>`。1場面1ファイルの `# effect:` が使う（ミラノ編・インド編は持たず、デートを選択肢の札で書く） |
| `<共通>/romance/progression.json` | 4段階の閾値・必要な履歴・敬称、告白が成立する条件（思い出の引用は `<旅行編>`） |
| `<旅行編>/romance/presentation.json` | 背景・思い出。表情・エンディングの文章と既定背景は `<共通>` |
| `<共通>/romance/balance.json` | APの上限・名前の既定値・名前の長さ |
| `<旅行編>/progression/journey.json` | 観光と特殊戦が開く条件・都市フィナーレ・章末の表示文・一度かぎりのAP報酬の条件 |
| `<旅行編>/cities/<都市ID>.json` | 都市名・予定の観光地・初回クリア報酬（`firstClearReward`） |
| `<旅行編>/battles/catalog.json` | A/B/Cの形式、相手、クイズ・Inkの参照、推理の問い、ケース資料・正解の証拠 |
| `<旅行編>/quizzes/*.json` | 通常3問・都市フィナーレ5問、正解ID、語句、ヒント、正誤の解説、難易度、出典 |
| `<旅行編>/tourism/catalog.json` | 観光地・画像の出典と権利・発見の範囲・説明・史実とクイズの参照 |
| `<旅行編>/public/assets/tourism/` | 同梱する資料の画像。外部サイトの画像へ直接リンクしない |

## Inkで会話と演出を作る

新しい会話の本文、選択肢、話者、背景、表情、漫符はInkに書きます。既存の外部表情・リアクションJSONに指定された現行会話はその設定も参照しますが、新しい行の登録には不要です。`reaction` はその一行だけに適用され、話者とは別の人物にも指定できます。

```ink
# speaker: enemy
# reaction: heroine,exasperated,sigh
これは絶対に本物です
# speaker: heroine
# emotion: serious
# reaction: enemy,sweat
根拠を見せてください
```

`# reaction: heroine,sigh` のように漫符だけ、`# reaction: heroine,smile` のように表情だけも指定できます。対象は現在の表示に対応する `heroine` または `enemy` です。両者に指定する場合は別々のタグにします。明示したInkの表情・リアクションが旧外部指定より優先されます。人物が画面に表示されない場面では、その人物の漫符は表示されません。

話し手（`# speaker:`）は、`narrator`（地の文）・`heroine`・`player`・`enemy`（バトルの対戦相手、場面の `# person:` で絵の立つ人）のほかに、`progression/story.json` の `people` に登録した人物のIDも書けます（`# speaker: <人物ID>`。2026-11-11）。その行はその人の台詞になり、名札にその人の `nameJa` が出ます（その人に絵（`characterId`）があれば、その台詞からヒロインの向かいに立ちます。絵のない人は舞台に立たず、その行では誰も暗くなりません。[章・都市と報酬](#章都市と報酬)）。名前のない役（店主・運転手など）も、役名を `nameJa` にして登録できます。登録していないIDは、`content:build` がファイル・knot・行とIDを示して止めます。対戦相手と、場面の `# person:` で絵が立つ人は、今までどおり `enemy` で書きます。例は見本の編の `stories/places/smp_mihon_clock_tower.ink` のリリの見送り（`smp_mihon_lili_seeoff`）。

台詞は「」で囲まずに書きます（名札が話し手を示します。2026-11-11のユーザー判断。インド編・ミラノ編・見本の編はこの書き方。ミラノ編と見本の編は2026-11-13に「」を外した。主人公が言う言葉の選択肢は、行動の選択肢と分けるため「」で囲む）。台詞の中の引用（『』、看板・題名・前に聞いた言葉の「」）はそのまま書けます。地の文の中の台詞は、地の文の行と、話す人の行（`# speaker:`）に分けて書きます（「〜と言った」のように地の文が伝える言葉は、地の文のままでかまいません）。

行の見せ方も、その行の札で決められます（どれも任意で、書いた行だけに効きます。書かなければ今までどおり）。どの会話の場面（観光案内・バトル・デート・道中交流と会話・到着とエピローグ）でも使えます。例は見本の編の `stories/places/smp_mihon_clock_tower.ink`（バトルの `# pause:`、鐘の会話の `# shake:` と `# size:`）。

```ink
# speaker: heroine
# pause: 600
……え？
# shake: window
# size: large
そんなの、聞いてない！
```

- `# pause: 600`：その行の字が出る前に、書いたミリ秒だけ間を置きます（100〜3000。0.6秒なら `600`）。間の途中でタップすると、すぐに行が全部出ます。文字送りの「一括表示」と「高速送り」では間を置きません。自動送りは、間の後に行を読み終えてから進みます。
- `# shake: window`：その行の字が出始めるときに、会話の窓が1回だけ小さく横に揺れます。動きを減らす設定（端末の設定と「演出を短縮する」）では揺れません。
- `# shake`（2026-11-13）：その行の字が出始めるときに、場面そのもの（背景の絵・天気・人物。会話の窓は揺れません）が1回だけ揺れ（0.3〜0.45秒）、端末が短く震えます（設定「振動する」がオンで、震えられる端末だけ）。弱くは `# shake: small`、強くは `# shake: large`。ドアを叩く音・物が落ちる・地面が揺れるなど、ここぞという行だけに書きます。動きを減らす設定では揺れず、振動だけです。高速送りの間と、ロードで戻った行では揺れません。`# shake: window` と同じ行に書けます（例：見本の編の鐘が鳴る行）。
- `# size: large`：その行の字を大きく出します。
- `# em: <語>`（2026-11-13）：その行の字の中の最初の<語>を、太字と強調の色で見せます（字が出るとき小さく弾みます）。`# em_shake: <語>`：最初の<語>を1字ずつ小さく震わせます。1つの行に `# em:` と `# em_shake:` を1つずつ（別の語で）書けます。語は行の字に書いたとおりに書きます（名前は `{heroine_name}` のまま）。動きを減らす設定・高速送り・ロードで戻った行では動かず、太字だけです。会話ログにも太字で残ります。ここぞという1語だけに書きます（例：見本の編の時計塔の案内の「三時？」と「止まってる」）。語が空・その行の字にない・同じ札が1つの行に2つ・2つの語が同じ字に重なる・選択肢に書いたときは、`content:build` が止めます。
- `# voice: <ID>`：その行の字が出始めるときに、その旅行編の `public/assets/voice/<ID>.mp3`（ID は英小文字・数字・`_`。登録はいりません）を流します。その場面を終えると、読んだ行が旅の音楽室（最初の都市のクリア後、「旅の記録」から）にその行の字と一緒に並びます（選ばなかった枝の行は並びません。`# bgm:` の曲は終えた場面のものが並びます。2026-11-13）。高速送りと、設定「台詞の声を出す」がオフのときは流さず、自動送りは声が終わってから進みます。声の作り方（音声合成のモデルなど）は、その旅行編の `manifest.json` の `voiceCredits` に書くと「出典・権利の一覧」の「声」に出ます（ゴールデントライアングル編は Irodori-TTS v4.1-Small）。ファイルのない ID と、`{player_name}`・`{player_address}`・`{heroine_name}` のある行の `# voice:`（主人公とヒロインの名前は遊ぶ人が決めるので、録音した声では言えません。主人公の呼び名も名前から作ります）は `content:build` が止め、どの行も使わないファイルは注意（使われていないファイル）に出ます。
- `# se: <ID>`：その行の字が出始めるときに効果音を1回鳴らします（声と重なってかまいません。高速送りと、設定「効果音を出す」がオフのときは鳴らしません。自動送りは待ちません）。使える音は、共通の `public/assets/se/<ID>.mp3` と、その旅行編の `public/assets/se/<ID>.mp3`（ID は旅行編の頭文字で始めます）です。
- 音のファイルは、置いた層の `presentation/sounds.json`（共通は `content/presentation/sounds.json`）の `sounds` に、使い道（`useJa`）・もとの作品（`sources` の ID）・作り方（`fromJa`）と一緒に登録し、作品の題・作者・ライセンス・確認日（自作 `own` でなければ `url` も）を `sources` に書きます。「出典・権利の一覧」に出ます。一覧にないファイル、ファイルのない音、出典のない音、ほかの旅行編の音は `content:build` が止めます。
- 範囲の外の数や小数（`0.6`・`600ms`）、`# shake:` の `window`・`small`・`large` 以外の値と `# size:` の `large` 以外の値、1つの行に同じ札を2つ（`# shake: window` と `# shake` の組は書けます）書いたときは、`content:build` が止めます。

写真の札（任意、2026-11-11）：行に `# photo: <絵のID>` を書くと、通常の遊びでその行が画面に出たときに、その絵が1枚アルバム（⚙設定の「アルバム」）に入ります。アルバムに入るのは、作者が Dreamscape のために描いた絵だけです。

- 置き場所：`content/journeys/<旅行編ID>/public/assets/album/<ID>.webp` に置きます（拡張子は `webp`・`png`・`jpg`・`jpeg` のどれか。WebP がおすすめです）。
- ID はファイル名から拡張子を除いたものです（英小文字・数字・`_` だけ。例 `smp_album_clock_tower.webp` の ID は `smp_album_clock_tower`）。同じ ID の絵は、すべての旅行編で1つだけにします。
- 登録はいりません。`tourism/catalog.json` にも `presentation/own-artwork.json` にも書かず、出典も書きません。アルバムにも「出典・権利の一覧」にも出典は出ません。
- 絵は横長の 3:2 で作ります（例 1536×1024 か 1600×1067）。アルバムでは 3:2 の枠に合わせて表示し、違う比率の絵は真ん中を残して切り取ります。押すと全体が見えます。大事なもの（顔など）は真ん中に寄せます。字や名前は絵に入れません。

アルバムには、その絵と、都市、「n日目 hh:mm」、場所の名前が出ます。絵の下に出す短い説明は、同じ行に `# photo_caption: <説明>` と書きます（任意。`#` は書けません。説明は絵の代わりの文にもなり、ないときは「思い出の絵」です）。同じ絵は一度だけ入り、読み直し・観光案内の読み直し・セーブからの再開では増えません。どの会話の場面でも書けます（英語ノートの解説には書けません）。セーブから再開したときの「前回までのあらすじ」は、最後に終えたエピソードの観光案内・バトル（フィナーレはバトルとエピローグ）で入った絵を出し、なければその場所の観光写真を出典つきで出します（デートや道中交流の絵は、同じ場所でも出しません）。例は見本の編のデート（`stories/places/smp_mihon_clock_tower.ink` の `= ending`、説明つき）と、朝市・図書室の観光案内の最初の行（絵は見本の `public/assets/album/`）。

```ink
# speaker: narrator
# photo: smp_album_clock_tower # photo_caption: 三時までの席。お茶のあとも、針は三時のまま
お茶を飲み終えても、針は三時のままだった。
```

写真が入ると、上の帯の下に絵の小さな写しと「アルバムに入れました」・説明が数秒出ます（押せず、そのまま読み進められます）。山場の1枚は、同じ行に `# photo_show: large` と書くと、その行のあいだ絵を画面の真ん中に大きく見せます（人物は後ろで少し暗くなり、会話の窓はそのまま読めます）。次の行へ進むと、絵は上の小さな写しになって消えます。大きく見せるのは、その行を読むたびです（アルバムに入るのは一度だけ）。

```ink
# photo: gt_album_a05 # photo_caption: 門のアーチからはみ出していく白 # photo_show: large
一歩進むごとに、白がアーチからはみ出していく。最後の一歩で、全体が現れた。
```

- 次のときは `content:build` が止めます：その旅行編の `public/assets/album/` にない ID（ほかの旅行編の絵も書けません）、ID にならないファイル名（大文字・`-`・ほかの拡張子・下のフォルダ）、同じ ID の絵が2つ（`x.webp` と `x.png`、2つの旅行編）、`# photo:` と一緒に読まれない `# photo_caption:` や `# photo_show:`、`large` 以外の `# photo_show:`、1つの行に2つの `# photo:` や説明。札を書かなければ、何も記録されません。どの札も書いていない絵は、`content:build` の注意（使われていないファイル）に出ます。

### 場面の演出の札（任意、2026-11-11）

場面を演出する6つの行の札です。どれも任意で、書かなければ今までどおりに見えます。どの会話の場面（観光案内・バトルの会話・デート・道中交流と会話・到着とエピローグ）でも使えます。見せ方だけの札で、物語・関係値・保存の進み方は変わりません。タップで読み進める・既読スキップ・自動送り・ログ・「隠す」は、どの札の行でも今までどおりです。主人公とヒロインの名前は、行の中では `{player_name}`・`{heroine_name}` のまま書きます。

- **思い出の呼び戻し `# recall: <絵のID>`**：その行のあいだだけ、その絵を場面の背景にうっすら重ねます（人物と会話の窓の下で、顔と字にはかかりません）。絵の ID は `# photo:` と同じく、その旅行編の `public/assets/album/` に置いた絵のファイル名です。アルバムには入りません。出典はないので、⚙設定の「画像の出典」には出ません。
- **スマホのメッセージ `# phone: received` / `# phone: sent`**：その行を、スマホの画面の吹き出しで見せます。`received` は左で、`# speaker:` の人の名前が上に出ます（ヒロインと主人公。`# speaker: <人物ID>` ならその人の名前。バトルとエピローグでは `enemy` の相手の名前も。地の文の `narrator` と、道中交流・会話の `enemy` は名前なし。同じ人の続くメッセージでは名前を繰り返しません）。`sent` は右で、主人公が送ったメッセージです。`# phone:` の行を続けて書くと同じ画面に積み重なり（新しいものが下。画面の中でスクロールできます）、`# phone:` のない行で終わります。あいだに選択肢があっても続きます。話し手の札（窓の左上の名前）は出ません。
- **手紙・メモ `# letter: letter` / `note` / `card`**：その行を紙に書いて見せます（`letter` は便箋、`note` は罫線のメモ、`card` は中央揃えのカード）。字は大きめの明朝で、話し手の札は出ません。同じ種類の `# letter:` の行を続けると1枚の紙に1行ずつ積み重なるので、5行のメモは5つの行にそれぞれ `# letter: note` を書きます（長い紙は紙の中でスクロールします）。種類が変わるか、`# letter:` のない行で次の紙になります。
- **静かな場面 `# quiet: scene` / `# quiet: line`**：上の帯（場所・時刻と⚙設定）と、デートの訪問先の写真の案内を隠し、字を少しゆっくり出し、背景を少し暗く落ち着かせます。`scene` はその行から場面の終わりまで、`line` はその行だけです。場面の頭（knot の行のすぐ下や、1場面1ファイルの最初の行の前）に `# quiet: scene` を1行で書くと、場面全体が静かになります。選択肢が出ている間は、上の帯はいつもどおり出ます（お金や AP を見て選べるように）。会話の窓・その操作・「会話を表示」・キーボードは隠れません。
- **立ち位置 `# stand: apart` / `near` / `close`**：ヒロインの立ち絵の位置を変えます（`apart` は少し離れて小さめに横へ、`near` は札のないときと同じいつもの位置、`close` はすぐそばで大きめ）。ゆっくり移り（動きを減らす設定ではすぐ）、次の `# stand:` か場面の終わりまで続きます。関係値からは決まりません。書いた人が場面ごとに決めます。
- **名札のカットイン `# cutin: name`**：その行の話し手の名札（役どころと名前）を、少しのあいだ会話の窓のすぐ上に出します（タップ・キー・次の行で消え、操作は止めません）。名前が初めて名札に出る行に書きます。同じ行に `# speaker: enemy`（バトルの対戦相手は `enemyTitleJa` と `enemyNameJa`、任意の `enemyQuoteJa` の一言も。ほかの場面は `# person:` の人、到着とエピローグで `# person:` がなければその都市のフィナーレの相手）か `# speaker: <人物ID>`（`progression/story.json` の `nameJa` と、任意の役どころ `titleJa`）を書きます。名乗る前の台詞は、呼び名（「青年」など）の人物IDで話させます（絵があれば両方に同じ `characterId`。バトルの相手の呼び名に、相手の絵（`presentation/characters.json` の `battleCharacters`）と同じ `characterId` を付けると、その行も相手の行として絵・表情・反応が出ます。例：インド編の `gt_delhi_jama_old_man`）。地の文・ヒロイン・主人公の行、携帯と手紙の行には書けません。札は書いた行だけです（読み直しやロードでその行に戻ると、もう一度出ます）。

```ink
# speaker: heroine
# phone: received
起きてる？　窓の外、見て。
# speaker: player
# phone: sent
起きてるよ。今、カーテンを開ける。
# speaker: narrator
# letter: note
つぎに　くるときは
# letter: note
リリより
# speaker: heroine
# recall: smp_album_clock_tower
# quiet: line
# stand: close
短い滞在だったね。でも、あの針を見るたびに思い出しそう
```

- 決まった値のほか（`# phone: left`、`# stand: far` など）、空の札、1つの行に同じ札を2つ、アルバムの絵にない ID の `# recall:`、1つの行に `# phone:` と `# letter:` の両方を書いたときは、`content:build` が止めます。
- バトルでクイズ（`-> quiz(n) ->`）から戻った後の最初の行は、場面の始まりと同じです（話し手と背景を書き直すのと同じく、`# quiet: scene` と `# stand:` も、続けたいときはもう一度書きます）。
- 例は見本の編：時計塔のバトルとフィナーレの相手、リリの見送りの `# cutin: name`、デートの `# stand:`（`stories/places/smp_mihon_clock_tower.ink`）、エピローグの `# recall:` と `# quiet: line`（`stories/places/smp_mihon_hotel.ink`）、宿の夜の会話の頭の `# quiet: scene`、宿の朝の `# phone:`、リリの見送りの `# letter: note`（どれも場所のファイル）。

### 品物を見せる札と場面の空気（任意、2026-11-13）

品物を大きく見せる札と、場面の空気（天気・時刻の色）を変える札です。どれも見せ方だけで、品物・関係値・物語・保存の進み方は変わりません。どの会話の場面（観光案内・バトルの会話・デート・道中交流と会話・到着とエピローグ）でも使えます。自由時間・夜の画面・タイトルには出ません。

- **品物を見せる `# item_show: <品物のID>`**：その行のあいだ、品物の絵と名前の札を画面の真ん中（人物の上、会話の窓の下）に見せ、短い効果音（`item_get`）が鳴ります。品物の ID は `encounters/catalog.json` の `items` の ID で、その旅行編の品物だけ書けます。札は見せるだけで、品物は手に入りません（入手は今までどおり選択肢の `# give:` などや、場面の頭の `# on_done: item …`）。次の行へ進んだとき、その品物を持っていて上の帯に所持品が出ていれば、札は小さくなって所持品の所へ飛んでいき、それから「…を手に入れました」が出ます（持っていないときや帯の所持品が隠れているときは、その場で消えます）。読み直しやロードでその行に戻ると、もう一度出ます（効果音はロードの直後と高速送りの間、静かな行では鳴りません）。続く行にも同じ ID を書くと、札は出たままです。
- **天気 `# weather: rain` / `dust` / `colors` / `petals`**：その行から場面の終わりまで、背景の絵の上（人物と会話の窓の下）に、雨（`rain`）・舞う砂ぼこりと霞（`dust`）・ホーリーの色粉（`colors`）・散る花びら（`petals`）を重ねます。`# weather: stop` でその行から止め、別の値で変えます。場面の頭（`# background:` のすぐ下など）に書けば最初からです。バトルでは、クイズの間もクイズの後の会話も続きます。動きを減らす設定では、動かない薄い形（雨と砂ぼこりは淡い色、色粉はやわらかな色、花びらは数枚が止まったまま）になります。
- **時刻の色 `# tint: off` / `# tint: on`**：会話の場面の背景の絵には、ゲームの時刻に合わせた淡い色（夕方は琥珀、夜は青。自由時間より弱い）がかかります（人物と会話の窓にはかかりません）。夜景の写真など、絵そのものが夕方や夜のときは、場面の頭に `# tint: off` を書くと、その行から場面の終わりまで色をかけません。`# tint: on` で戻します。
- 人物の立ち絵は、どの場面でもゆっくり小さく呼吸するように上下します（札はいりません。動きを減らす設定では止まります）。

```ink
# background: smp_bg_mihon_clock_tower
# weather: petals
# speaker: narrator
時計塔の広場では、ベンチがどれも塔の方を向いている。
# speaker: narrator
# item_show: smp_mihon_three_bookmark
リリはいちばん針のまっすぐな一枚を選んで、こちらの手のひらにのせた。
```

夜景の写真の場面なら、頭に `# tint: off` を1行足します。

- 次のときは `content:build` が止めます：値のない `# item_show`、どの旅行編にもない品物・ほかの旅行編の品物の `# item_show:`、`rain`・`dust`・`colors`・`petals`・`stop` 以外の `# weather:`、`off`・`on` 以外の `# tint:`、1つの行に同じ札を2つ。
- 例は見本の編：しおりを受け取る行の `# item_show:`（`smp_mihon_bookmark_stall`）、時計塔広場のデートの頭の `# weather: petals`（どちらも `stories/places/smp_mihon_clock_tower.ink`）。

### 音楽（BGM、2026-11-12）

曲は、文章の後ろで小さく流れる脇役です。画面ごとのいつもの曲は一覧で決め、場面の曲は台本の札で変えられます。

- 曲のファイルは、置いた層の `public/assets/bgm/<ID>.mp3` に置きます（共通はリポジトリ直下の `public/assets/bgm/`、旅行編はその旅行編の `public/assets/bgm/`。旅行編の曲の ID は旅行編の頭文字で始めます。例 `gt_jalandhar`）。同じ層の `presentation/music.json` の `tracks` に、効果音と同じ書き方（`useJa`・`sources`・`fromJa`、任意の `volume`）で登録し、作品を `sources` に書きます。「出典・権利の一覧」の「音楽」に出ます。`stop` と `default` は曲の ID にできません。
- 一覧の `play` で、画面ごとのいつもの曲を決めます。共通の一覧（`content/presentation/music.json`）には、次の鍵をすべて書きます：`title`（タイトル画面）、`freeTime`（自由時間。`morning` 5:00〜11:59、`day` 12:00〜17:59、`night` 18:00〜4:59 の3曲）、`night`（夜の画面）、`place`（観光地の場面・クイズ・デート・道中交流）、`arrival`（都市への到着）、`epilogue`（都市のエピローグ）、`endRoll`（エンドロール）。
- 旅行編の一覧の `play` には、変えたい鍵だけを書きます（書いた鍵が共通の曲に代わります。`freeTime` は3つまとめて書きます）。`places` に地点ごとの曲を書くと、その地点の場面で流れます（地点 ID は、その旅行編の `travel/<都市ID>.json` の `places` の `id`）。書いていない地点は `place` の曲です。旅行編の一覧には、共通の曲とその旅行編の曲を書けます（共通の一覧には共通の曲だけ）。

```json
"play": { "place": "gt_jalandhar", "places": { "delhi_red_fort": "gt_hidden_wonders", "delhi_hotel_hub": "late_night_radio" } }
```

- 台本の札 `# bgm: <曲のID>` を書くと、その行から場面の曲が変わります。`# bgm: stop` はその行から無音、`# bgm: default` はいつもの曲に戻します。場面が終わると、いつもの曲に戻ります。場面の頭（`# background:` のすぐ下など、最初の行の前）に書けば、場面の最初から流れます。バトルでは、クイズの間も、クイズの後の会話も同じ曲のままです。

```ink
# background: gt_bg_hotel_rooftop_night
# bgm: immersed
# speaker: narrator
宿の屋上には、黒い貯水タンクと、物干しの綱があった。
```

- 同じ曲のまま画面が変わると、曲は頭に戻らず流れ続けます。曲が変わるときは1.5秒で重ねて入れ替え、最近流した曲は、止めた所の続きから流れます。
- クイズの問題・判定・結果の間は、流れている曲を小さく、こもった音にします（曲は変えません。バトルの会話の間は元の大きさです。札で選んだ曲でも同じです）。`# quiet:` の行、移動の演出、台詞の声の間も、曲を少し小さくします。
- 曲で関係の値を知らせません。親しさや信頼で曲は変わりません。告白の場面の曲は、書いた人が札で選んだ曲のままで、結果では変わりません。
- 次のときは `content:build` が止めます：ファイルのない曲、一覧にない曲のファイル、出典のない曲、`stop`・`default` という ID、共通の `play` の鍵が足りない・`places` がある、ない曲やほかの旅行編の曲を書いた `play` と `# bgm:`、ない地点を書いた `places`、1つの行に2つの `# bgm:`。どの `play` にも `# bgm:` にもない曲は注意に出ます。
- 遊ぶ人は、⚙設定の「BGMを流す」「BGMの大きさ」で止めたり小さくしたりできます。ブラウザの決まりで、最初のタップの後から流れます。

### 環境音（2026-11-13）

雨・市場のざわめき・鳥の声など、場所の音を BGM の下で小さくくり返し流します。会話の場面（観光案内と観察・バトル・デート・道中交流と会話・到着とエピローグ）だけで流れ、自由時間・夜の画面・タイトル・エンドロール・移動の演出では流れません。

- 音のファイルは、置いた層の `public/assets/ambience/<ID>.mp3` に置きます（共通はリポジトリ直下の `public/assets/ambience/`、旅行編はその旅行編の `public/assets/ambience/`。旅行編の ID は旅行編の頭文字で始めます。例 `gt_amb_bazaar`）。同じ層の `presentation/ambience.json` の `tracks` に、BGM と同じ書き方（`useJa`・`sources`・`fromJa`、任意の `volume`）で登録し、録音を `sources` に書きます（自作 `own` でなければ `url` と `author`）。「出典・権利の一覧」の「環境音」に出ます。`stop` と `default` は ID にできません。継ぎ目なくくり返せるように切り出した音にします。
- 地点ごとの環境音は、旅行編の一覧の `play.places` に書きます（地点 ID は、その旅行編の `travel/<都市ID>.json` の `places` の `id`。共通の環境音とその旅行編の環境音を書けます。共通の一覧には書けません）。その地点の会話の場面で流れます。書いていない地点では流れません。

```json
"play": { "places": { "delhi_chandni_chowk": "gt_amb_bazaar", "delhi_lodhi_garden": "amb_birds_park" } }
```

- 台本の札 `# ambience: <ID>` を書くと、その行から場面の終わりまで、その環境音に変わります（地点の音より優先します）。`# ambience: stop` はその行から無音、`# ambience: default` は地点の音に戻します。場面の頭に書けば最初からです。バトルでは、クイズの間も、クイズの後の会話も同じ音のままです。変わるときは1.5秒で重ねて入れ替えます。
- 大きさは BGM の半分で、クイズの問題・判定・結果の間と `# quiet:` の行、台詞の声の間は、BGM と同じように小さくなります。関係の値では変わりません。
- 次のときは `content:build` が止めます：ファイルのない環境音、一覧にない環境音のファイル、出典のない環境音、`stop`・`default` という ID、共通の一覧の `play`、ない地点やほかの旅行編の環境音を書いた `play.places` と `# ambience:`、1つの行に2つの `# ambience:`。旅行編の環境音で、どの `play.places` にも `# ambience:` にもないものは注意に出ます。
- 遊ぶ人は、⚙設定の「環境音を流す」で止められます（大きさは「BGMの大きさ」の半分）。例は見本の編の宿の夜の会話（`smp_mihon_hotel_bell_night`）の頭の `# ambience: amb_night_insects`。

### 台詞の声の台本と、台詞が変わったときの確認（2026-11-13）

声を作る人には、ヒロインの台詞を1行＝1回の収録＝1ファイル（ファイル名は台本の [ID]）にした台本を渡します。届いた声は、その行の前の `# voice: <ID>` で鳴ります（上の「行の見せ方」）。台本を渡した後や録音した後に台詞の文を直すと、その声は作り直しが要るので、次の流れで記録と照らし合わせます。記録は `authoring/journeys/<旅行編ID>/voice/` に置きます（渡した台本は日付のフォルダ、届いた声が言っている文は `recorded.json`。ゲームは読み込みません。インド編は [authoring/journeys/golden_triangle/voice/](journeys/golden_triangle/voice/README.md)）。

1. 台本を作る：`npm run voice:script -- --journey <旅行編ID>`。今の `content/` のInkから、ヒロインの台詞を都市ごと・ファイルごとに抜き出し、`artifacts/voice/<旅行編ID>/` に `heroine_lines.txt`（渡す台本。[ID]ごとに前の行・場面の分かれ道・表情・演出と台詞）と `entries.json`（同じ台詞のデータ）を書きます（`--out <フォルダ>` で置き場所を変えられます）。メッセージと手紙・メモの行（`# phone:`・`# letter:`）は入れません。主人公とヒロインの名前は【主人公の呼び名】のように出し、「★名前を含む」の印を付けます（その行には声を付けられません）。
   - ID は変わりません：`# voice:` のある行はその ID、前に渡した台本と同じ文の行は、その文を最後に渡したときの ID のままです（行を足したり消したり、バトルを場所のファイルへ移したりしても、ずれません）。新しい行と文を直した行は、どの台本・声でも使ったことのない新しい ID（「knot の名前_番号」。その knot で使った番号の続き）になるので、1つの ID が2つの文を指すことはありません。
2. 渡す：渡したら、渡した日付のフォルダ（例 `2026-11-12/`）を `authoring/journeys/<旅行編ID>/voice/` に作り、渡したファイル（台本・`entries.json`・説明書）をそのまま置いてコミットします。
3. 届いたら：声を MP3 にして、その旅行編の `public/assets/voice/<ID>.mp3` に置きます（変換は手作業。インド編の声は MP3・48kHz・モノラル・80kbps）。それから `npm run voice:tag -- --journey <旅行編ID> --from <届いたファイルのフォルダ>` を実行します。届いたファイル（`<ID>.mp3`・`<ID>.wav`）ごとに、その ID の行の前に `# voice: <ID>` を書き、`recorded.json` にその声が言っている文（その ID を最後に渡した台本の文と日付）を記録します。今の文が台本の文と違う声、今の台詞にない ID・台本にない ID、`public/assets/voice/` にまだ MP3 のない声は付けずに、理由を出します（ほかの声は付けます）。`--from` には届いたファイルだけのフォルダを指します（前からある声まで記録し直さないように）。
4. 変わったら：`npm run voice:changes -- --journey <旅行編ID>` で、録音した行は `recorded.json` の文と、まだ録音していない行はいちばん新しい台本と比べ、録り直しが要る行（先に出ます）、使われなくなった声、まだ録音していない行の変わった・なくなった・新しい台詞を、ID・場面の題・ファイルと前後の文で出します（同じ文の行は同じ台詞と数え、残りは同じ都市で文の近いものどうしを直した台詞と数えます）。ファイルは変えません。`content:build` も、`# voice:` のある行の文が `recorded.json` の文と違うと、注意「録音した台詞が変わりました：<ID>（録り直しが必要）」を、録音した文と今の文と一緒に出します（`recorded.json` にない `# voice:` も注意。止めません。件数が出て、`-- --verbose` で一覧）。
5. 録り直す：`voice:script` で台本を作り直して渡し（2.）、作り直した声が届いたら `voice:tag` で付けます（3.）。注意と一覧は、新しい台本を渡しただけでは消えず、作り直した声を `voice:tag` で記録すると消えます。

## 簡単な道中交流を追加する

`content/journeys/milano/stories/encounters/milano_duomo_new_event.ink` を作り（名前は [IDの付け方](../docs/02_TECH_ARCHITECTURE.md#idの付け方) の `encounters/<頭>_<交流>`）、名前用変数、会話、英語の選択（ふつうは3択。選択肢の数は自由）と分岐を書きます。英文はInkを正とします。訳を付ける場合は **選択肢の角括弧の中** にタグを置きます。

```ink
VAR player_name = ""
VAR heroine_name = ""
# background: milano_duomo
# speaker: narrator
広場で声をかけられた。
* [Look closer. # translation: 近くで見てみる。]
    # speaker: heroine
    # reaction: heroine,smile,sparkle
    「一緒に見てみよう」
    -> END
* [Ask a question. # translation: 質問する。]
    -> END
* [Keep walking. # translation: 先へ進む。]
    -> END
```

`content/journeys/milano/encounters/catalog.json` の `encounters` に、既存の観光地IDを使って次のように追加します。都市は観光地から導かれ、説明はタイトル、各選択肢の費用は0、再プレイ不可が標準です。新しい事実を扱う場合は、確認した出典も `sources` に追加します。

```json
{
  "id": "milano_duomo_new_event",
  "landmarkId": "duomo_milano",
  "titleJa": "ドゥオモの新しい出会い",
  "storyId": "encounters/milano_duomo_new_event"
}
```

購入やアイテム使用など選択肢ごとのルールがある場合は、カタログに `options` を、Inkの選択肢と同じ数だけ（ふつうは3件）追加し、各選択肢に `* [Tea # option: tea # translation: お茶を頼む。]` のような安定IDを指定します。カタログ側は `{ "id": "tea", "cost": 4 }` のようにルールだけを記述し、英文は重複させません。選択肢の順序を変えてもIDで対応します。金額は所属する旅行編の通貨の整数単位で、選択肢の支払いは `cost`、交流を終えたときに受け取る金額は `completionMoney` に書きます（ユーロ専用だった `costEuro`・`completionMoneyEuro` は v14 でこの2つにまとめ、使えなくなりました）。所持金・アイテムの変更はゲーム側が処理します。

## 簡単な通常デートを追加する

新しいInk（`content/journeys/milano/stories/dates/milano_date_new.ink`。名前は `dates/<頭>_date_<行き先・出来事>`）に1場面1ファイルのデート（例：テストの元データ `tests/fixtures/one-scene-date-cafe.ink`）と同様の名前用変数、デートの定義の `choiceCount` の回数（ふつう2回）の選択（選択肢はふつう3つ。数は自由）、結果別の反応を記述します。各分岐では、1回目に `# effect: common_date_first_attentive`、2回目に `# effect: common_date_second_attentive` のような共通効果を使えます。末尾は `attentive`、`playful`、`honest`、`bold`、`provocative` から、その返答に合う既存の確率特性を選びます。結果は `romance_result` の `positive` / `negative` で描き分けます。共通効果は個別の思い出を保存しません。場所固有の思い出が必要な場合は従来どおり固有effectとmemoryを追加します。

`content/journeys/milano/romance/date_catalog.json` の `dates` には、例えば次の最小設定を追加できます。開く条件 `when` は `{ "episodesCompleted": { "city": "milano", "atLeast": 1 } }`（その都市のエピソードを1つ終えたら）が標準で、2 AP、一度限り、交際後も利用可能が既定です。`when` を書かないデートは、進行の条件なしに最初から開きます。特定の観光地を訪れた後に開きたい場合は、`destinationId` と `when: { "episodeCompleted": "<エピソードID>" }` などを書いてください（書き方は[条件の書き方](#条件の書き方)）。

```json
{
  "id": "milano_new_date",
  "chapterId": "milano",
  "titleJa": "新しいデート",
  "storyId": "dates/milano_date_new",
  "when": { "episodesCompleted": { "city": "milano", "atLeast": 1 } },
  "backgroundId": "milano_cafe"
}
```

公開済みInkを編集・差し替えると途中セーブの指紋が変わり、過去のセーブや途中の会話が再開できなくなる場合があります。開発中は誤字修正や改稿のたびに旧セーブ再開用の旧稿を保存する必要はありません。現在のゲームが使っている脚本・データは誤って削除しないでください。安全に読めないデータは勝手に消さず、利用者が案内に従って消去し、最初から始められます。古い外部演出の行や脚本がなくなった場合は警告されます。`npm run content:check` は差分だけでなく全コンテンツの参照と分岐を検証し、ゲーム用データを生成します。

## 見本の編（雛形）

ファイルの書き方の手本は、架空の「見本の街」を舞台にした遊べる最小の旅行編 [見本の編](templates/sample_trip/README.md)（`templates/sample_trip/`、開発・テスト専用）です。観光案内・通常戦・デート・都市フィナーレ・エピローグの必須の20ファイルと、任意の特殊戦B（矛盾追及）・特殊戦C（証拠連結）・品物つきの道中交流があり、各Inkの冒頭のコメントにその種類の脚本の規則を書いています。新しい旅行編は `npm run journey:new` で見本から作れます（[新しい編を追加する手順](../docs/02_TECH_ARCHITECTURE.md#新しい編を追加する手順)）。既存の旅行編に項目を足すときも、見本の同じ種類の項目を写してIDと内容を置き換えます。見本の文章・出典（`https://example.com/dreamscape-sample`）・画像は架空なので、写したら実在の観光地、実際に確認した出典、権利を確認した画像に置き換えます（残っていると `npm run journey:readiness` が示し、`npm run journey:release` は公開を止めます）。カタログのファイルは、既存のカタログの配列に項目を追加します。例でカタログ全体を上書きしないでください。

配置先の `<旅行編>` は `content/journeys/<旅行編ID>/`（ミラノ編なら `content/journeys/milano/`）です。見本の中も同じ相対配置です。

| 作るもの                       | 見本の例（`templates/sample_trip/` の中）                                                        | 正式な配置先                                              |
| ------------------------------ | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| 観光地・画像・発見・資料       | `tourism/catalog.json`                                                                           | `<旅行編>/tourism/catalog.json` の各配列                  |
| 英語3択（通常戦3問・フィナーレ5問） | `quizzes/smp_mihon_main_clock_tower_quiz.json`, `quizzes/smp_mihon_finale_quiz.json`             | `<旅行編>/quizzes/<クイズID>.json`（ファイル名＝クイズID）   |
| 敵と通常戦、矛盾追及、証拠連結 | `battles/catalog.json`（特殊戦は `quizzes/smp_mihon_special_b_market_quiz.json`・`smp_mihon_special_c_library_quiz.json` も） | `<旅行編>/battles/catalog.json` の `battles`              |
| 敵の会話                       | `stories/places/smp_mihon_clock_tower.ink` の `smp_mihon_main_clock_tower`・`smp_mihon_finale_battle`, `stories/places/smp_mihon_market.ink` の `smp_mihon_special_b_market`, `stories/places/smp_mihon_library.ink` の `smp_mihon_special_c_library`（場所のファイルの knot） | `<旅行編>/stories/places/`（1場面1ファイルの `stories/battles/` も使える） |
| デート、行き先、背景           | `romance/date_catalog.json`, `romance/date_destinations.json`, `romance/presentation.json`       | `<旅行編>/romance/` の対応するカタログ                    |
| デートの会話                   | `stories/places/smp_mihon_clock_tower.ink` の `smp_mihon_date_tower_square`（場所のファイルの knot） | `<旅行編>/stories/places/`（1場面1ファイルの `stories/dates/` も使える） |
| 観光案内                       | `stories/places/smp_mihon_clock_tower.ink` の `smp_mihon_clock_tower_guide`、`stories/places/smp_mihon_market.ink` の `smp_mihon_market_guide` | `<旅行編>/stories/places/`（1場面1ファイルの `stories/tourism/` も使える） |
| 都市・順路・報酬               | `cities/mihon.json`, `progression/journey.json`                                                  | `<旅行編>/cities/`, `<旅行編>/progression/journey.json`   |
| 道中交流と品物                 | `encounters/catalog.json`（品物）, `stories/places/smp_mihon_clock_tower.ink` の `smp_mihon_bookmark_stall` | `<旅行編>/encounters/catalog.json`, `<旅行編>/stories/places/`（1場面1ファイルの `stories/encounters/` も使える） |

デート専用の効果と思い出（`romance/effect_catalog.json` の固有effect、`romance/presentation.json` の `memories`）は見本にありません。効果の項目は共通の `content/romance/effect_catalog.json` と、テストの元データの告白が使う効果（`src/content/test-fixtures.ts` の `ONE_SCENE_CONFESSION_EFFECTS`）を参考にします。選択肢の札（`# profile:`・`# memory:`）で書くデートは、インド編の `romance/presentation.json` の `memories` と場所のファイル（例：`stories/places/gt_delhi_lodhi_garden.ink`）を参考にします（インド編に `effect_catalog.json` はありません）。

JSONにはコメントを入れず、カンマ、引用符、配列の括弧を保ちます。`schemaVersion` はデータ形式の版で、個々のコンテンツIDとは別です。編集前に対象ファイルを複製し、既存内容を消さずに追加してください。表示名は変更できますが、公開済みIDはセーブ・他データの参照に使うため変更しないでください。新しいIDは英小文字で始め、英小文字・数字・`_` を使います。IDはすべての旅行編で共有する一つの名前空間にあるため、新しい旅行編では `manifest.json` の `authoring.eventPrefix` と同じ接頭辞（例：`gt_`、`uz_`）を付けます（地点IDは都市IDを接頭辞にします。付け忘れは `content:build` が警告します）。`storyId` は、旅行編フォルダの `stories/`（`content/journeys/<旅行編ID>/stories/`）からの拡張子なしの相対パスで、場所のファイルの場面は `places/gt_delhi_red_fort.gt_delhi_red_fort_guide` のように後ろに `.knot の名前` を付けます。旅行編フォルダ名は含まないため、他の旅行編と同じフォルダ名（`battles/` など）を使う場合はファイル名に接頭辞を付けて重ならないようにします。会話・クイズ・問題の名前（「頭 ＋ 役割 ＋ 場所・話題」）と、クイズのファイル名をクイズIDと同じにする決まりは [技術設計の「IDの付け方」](../docs/02_TECH_ARCHITECTURE.md#idの付け方) にあります。共通データ（`content/` 直下）には都市・移動・Ink・クイズや旅行編専用のカタログを置けません。

## 題材を選ぶ

英文にする前に「話の入口」「問い」「種明かし」を日本語で書き、クイズにしなくても人に話したくなる小話かを確認します。人の願い・失敗・信仰や権力、土地の伝説や文化の接点、絵の人物や表現から見える物語を優先します。材料・運搬・寸法・年号や名前だけの暗記は原則避けますが、人の選択・事件・意外な結末に不可欠なら候補になります。史実・解釈・仮説・伝説を分け、資料の主張を支える箇所を確認します。閲覧できなければ未確認と記録します。

訳は問題文と全選択肢を公平に、原文にない正解の根拠を加えずに書きます。文法・語法の説明は実際の英文に対応させ、辞書や信頼できる教材を確認してください。観光問題の成績から英語力を推定しません。

## 新しい観光地を準備する

1. 事実・解釈・伝説を区別し、各項目の出典と日付を記録します。写真の作者、ライセンス、加工内容と利用条件も確認します。
2. 見本の `tourism/catalog.json` を見ながら、画像を `assets`、場所を `landmarks`、その発見を `clues` に登録します。画像は旅行編の `content/journeys/<旅行編ID>/public/` 以下に配置し、`path` に `public/` を除いたパス（配信時のパス）を書きます。
3. 3問のクイズ（見本の `quizzes/smp_mihon_main_clock_tower_quiz.json`）と、要る場所なら観光案内（その場所の場所のファイルの knot。見本の `stories/places/smp_mihon_market.ink` の `smp_mihon_market_guide`）を作り、対応するIDをそろえます。
4. 見本の `battles/catalog.json` の通常戦と、場所のファイルの knot `stories/places/smp_mihon_clock_tower.ink` の `smp_mihon_main_clock_tower`（特殊戦は `stories/places/smp_mihon_market.ink` の `smp_mihon_special_b_market`）を参考に、敵・会話と問題を結びます（下の「対決の会話を1本の流れで書く」）。演出背景は `<旅行編>/romance/presentation.json` に登録します。
5. 順路・報酬を `<旅行編>/progression/journey.json` の既存配列に追加し、参照関係を確認します。新都市の追加には後述の現行制約があります。
6. 後述の検証と編集者レビューを済ませてからGitで採用します。

### 観光データの項目

- `assets`：`id` は画像の安定ID、`path` は画像ファイル、`width` / `height` は実際のピクセル寸法、`altJa` は画像を見られない人向けの日本語説明、`isPlaceholder` は仮画像かどうか。`sourceUrl`、`licenseName`、`licenseUrl`、`creditJa`、`modificationJa`、`checkedAt` に元画像の所在・権利・作者・加工・確認日を記録します。仮画像を実物の細部の根拠にしません。配信する写真は WebP（品質80）にします。JPEG・PNG の写真は置いた後に `npm run images:optimize -- --journey <旅行編ID> --write` で変換します（`--write` を付けなければ確認だけ）。観察で拡大する写真（観光地の `imageAssetId` と観察資料の画像）は同じ大きさのまま、ほかは幅1600px・高さ1800pxの枠に収まるよう縮小し、色のプロファイルは残します。このとき `path`・`width`・`height` と観察資料の `path`・`sha256` を書き換え、`modificationJa` の最後に変換の一文（例「さらに同じ寸法のままWebP形式（品質80）に変換。」）を足し、CC BY-SA の写真には変換の一文の後に「変換版もCC BY-SA 4.0で提供。」のように足します（それより前の「この縮小版も…で提供します。」などは、変換する前の版についての記載です）。変換できる写真が残っていると `npm run content:build` が警告で知らせます（生成は止めません）。仮画像（`isPlaceholder: true`）と見本の編の画像は変換しません。
- `landmarks`：`id` / `cityId` は場所と都市のID、`nameJa` / `nameEn` は表示名、`descriptionJa` は短い案内。`imageAssetId`、`guideStoryId`、`battleId` はそれぞれ画像、案内Ink、通常戦のID、`clueIds` はその場所の発見ID一覧です。案内の要らない場所では `guideStoryId` を書きません。観察の要らない場所では `observation: false` を書きます（書かなければ観察あり）。どちらもない場所では、着いてすぐバトルが始まります。案内のない場所には、案内の AP（`guide_read` の報酬）もありません（書くと `content:build` が止まります）。観察のない場所に手がかりを書いたり、バトルの問題や特殊戦の証拠が使う手がかりをどの観察でも見つけられなかったりすると、`content:build` が注意します（生成は止めません）。
- `clues`：`id`、`landmarkId`、`titleJa`、`descriptionJa`、`factId`、`relatedQuestionIds`、`sources` は発見と参照、説明、根拠です。`relatedQuestionIds` には、同じ観光地のクイズの問題のうち、問題文・正解・解説がその手がかりの内容を必要とする問題のIDだけを書きます（ゲームの表示と判定には使わず、`content:build` が同じ観光地のクイズの問題であることを確かめます。都市フィナーレと例のクイズの問題は書けません）。同じ場所の話題というだけでは書きません。どの問題にも結び付かない手がかりは `[]` とし、これを「観察だけの手がかり」として正式に認めます。見え方を変える観察・資料として手がかり帳に残り、表示も同じです。旅行編ごとの数は `content:build` の行（`observation-only clues`）に出ます。公開中の旅行編の観察だけの手がかりを問題へ付け直すのはシナリオ改修のときの作業で、改修する問題と1件ずつ文を照らして決めます。特殊戦の証拠の手がかりを変えるとその特殊戦の途中のセーブは再開できなくなります（[データ契約](../docs/07_DATA_AND_TESTS.md#観察だけの手がかり)）。`kind: "hotspot"` は写真で見える場所、`kind: "document"` は画像だけでは判断できない資料。後者の `region` は `null` です。hotspotの `region` は画像全体を1とする左上の `x` / `y` と `width` / `height`（各0〜1）で、画像の外には出せません。画像差し替えで構図が変われば座標も見直します。
- `sources` の `publisher` / `title` / `url` / `checkedAt` / `claimType` / `claimJa` は発行者、資料名、URL、確認日、根拠の区分、その資料が裏付ける主張。`claimType` は `documented_fact`、`interpretation`、`legend` を区別します。

### 単語の意味

問題文・選択肢の単語には一般的な意味を登録します。複数の旅行編で使う語は共通の `content/learning/word-meanings.json`、1つの旅行編だけで使う語（地名・建造物名など）はその旅行編の `content/journeys/<旅行編ID>/learning/word-meanings.json` に置きます。同じ語を両方に置くときは同じ意味にします（違えば生成時のエラー）。旅行編の辞書にしかない語を別の旅行編の問題で使うと、その旅行編を外した生成（`scripts/journey-folders.test.ts`）で未登録として知らされるため、その語は共通の辞書へ移します。どの英文にも使われない語の一覧は `npm run content:build -- --verbose` で確認できます。大文字・小文字、アクセント、曲がったアポストロフィは照合時に正規化します。その問題の `vocabularyJa` に同じ語句があれば、その文脈での意味を優先します。新しい問題の語に未登録があれば全体検証で知らせます。一般的な意味は文脈によって異なるため、曖昧な語は該当問題の `vocabularyJa` で補ってください。たとえば [court](https://dictionary.cambridge.org/dictionary/english/court) や [secure](https://dictionary.cambridge.org/dictionary/english/secure) の複数の用法はCambridge Dictionaryで確認できます。語義の正確さと文脈への適合は編集者が確認します。外部辞書APIは使いません。

### 対訳・学習説明

公開する問題は `content/journeys/<旅行編ID>/learning/translations.json` に問題IDを登録し、`source` に問題文・全選択肢・正解IDの原文をそのまま記録します。`questionJa` と `optionsJa` は正誤の根拠を加えず、選択肢A/B/Cを公平に訳します。原文や正解を変更すると全体検証が不一致を検出するため、訳を確認して `source` を更新してください。既存のバトル保存指紋は学習データを含みません。

詳細が必要な問題だけ、その問題がある旅行編の `content/journeys/<旅行編ID>/learning/details.json` に問題IDで登録し、学習会話の `storyId`、原文中の `segments` と `topics`、疑問見出し、説明、実用例文・訳、確認済みの文法資料URLと確認日を追加します。対訳と同じく問題IDごとに統合されるため、どの旅行編も自分の問題の詳細を持てます（どの旅行編にもなければ詳細なしとして扱います）。`storyId` は問題ごとに必須で、同じ旅行編の学習会話を指します。学習会話は話題ID（`topic`）ごとに分岐し、話者はヒロイン、2〜4行、選択肢やeffectは使いません。話題IDは全旅行編で重ならないようにし、新しい旅行編では `authoring.eventPrefix` の接頭辞を付けます（例：`gt_which_subject`）。現在はミラノ編の『最後の晩餐』の通常戦3問が対象で、会話は `content/journeys/milano/stories/learning/milano_english.ink` です。英語ノートの解説は場面（時点に置く出来事）ではないので、場所のファイルには入れません。どの問題も使わない話題は置きません。意味の自然さ、資料の該当箇所と訳は編集者が確認します。

### その国の言葉（任意）

訪ねた国の言葉（あいさつ・料理の名前など）を、台詞の行の札で覚えられます（2026-11-11のユーザー判断）。語はその旅行編の `content/journeys/<旅行編ID>/learning/local-words.json` に書きます。このファイルも札もなければ、何も変わりません。例は見本の編の `learning/local-words.json` と、時計塔の観光案内（`stories/places/smp_mihon_clock_tower.ink` の扉の文字の行）です。

- `schemaVersion` は `1`、`words` に語を並べます。1語ごとに `id`（全旅行編で重ならないID。接頭辞を付けます。例：`smp_mihon_word_trisol`）、`cityId`（任意。英語ノートでその語を並べる都市。同じ旅行編の都市にします。書かなければ「この旅の言葉」にまとめます）、`word`（その国の文字で書いた語。例：नमस्ते）、`reading`（カタカナの読み。例：ナマステ）、`meaningJa`（意味）、`noteJa`（任意の補足）、`sources`（1件以上。観光データの `sources` と同じ書き方）。実在の言葉は、辞書や公的資料で確かめた出典を書きます。
- 覚えさせたい行に `# local_word: <語のID>` を書きます。どの会話の場面（観光案内・バトルの会話・デート・道中交流と会話・到着とエピローグ）でも使えます。

```ink
# speaker: narrator
# local_word: smp_mihon_word_trisol
扉の上の石に「Trisól（トリソル）」と彫ってある。
```

- その行が出たとき、その語を覚えます。画面の上に「ことばを覚えた：Trisól（トリソル）」と少しのあいだ出て（読み上げにも伝わり、操作は止めません）、英語ノートの「その国の言葉」に都市ごと・覚えた順に並びます。もう覚えた語では何も起きません。点数や習熟度はありません。
- 覚えた語はこの端末に旅行編ごとに残り、ゲームのセーブには入りません（「保存データの消去」では英語ノートと一緒に消えます）。Debugでの遊びは、通常の記録を読み書きしません。
- 1つの行に札を2つ書けば2語を覚えます。一覧にないID、形の正しくない札（`# local_word:` だけ、大文字や空白のあるID）、1つの行に同じ語の札を2つ、IDの重複、ない `cityId`、出典のない語は、`content:build` が止めます。

### クイズの項目

クイズの `id` は問題セット、`landmarkId` は観光地、`englishLevel` は `A2` / `B1` / `B2`。通常戦の `questions` は3問です。各問の `id`、英語の `questionEn`、`options` の `id` と `textEn`、`correctOptionId` を指定します。選択肢は3つ、正解IDはそのうち一つ。`vocabularyJa` の `word` / `meaning` は英単語と日本語補足（答えた後、英語ノートの「単語帳」に、その語を含む問題文か選択肢の英文と場所の写真つきの札で出ます）、`hintJa`、`correctExplanationJa`、`incorrectExplanationJa` は日本語、`sources` は各問の根拠、`difficulty` は `easy` / `medium` / `hard`。問題と選択肢だけを英語にします。解答前の会話で正解を明かさないようにします。都市フィナーレは `scope: "city_finale"`、`cityId`、`landmarkId: null`、5問です。

ヒントは、ヒロインの小さな顔と「（ヒロインの名前）の耳打ち」という吹き出しで、問いの下にいつも出ます（開くボタンはありません）。`hintJa` は地の文のままでかまいません（彼女の言葉としてかぎかっこで囲んだりはしません）。問いごとに、次の2つを任意で書けます（書かなければ今までどおり）。例は見本の編の `quizzes/smp_mihon_main_clock_tower_quiz.json`。

- `hintHeroineJa`：ヒントを彼女の言葉で書いたもの。書くと、`hintJa` の代わりにこれが吹き出しに出ます（`hintJa` も必須のまま書きます）。
- `heroineCorrectJa`：正解したとき、解説のすぐ下に、彼女の顔と名前つきの吹き出しで出る短い一言（不正解では出ません）。得点や関係の値は出しません。答えた後の会話（`-> quiz(n) ->` の後の行）とは別で、そちらは「敵の反応を見る」の後に流れます。

どちらも彼女の台詞なので、[キャラクターバイブル](../docs/09_HEROINE_CHARACTER_BIBLE.md)に照らして1〜2文で書きます。吹き出しで彼女の言葉と分かるので、かぎかっこは要りません（書いたとおりに出ます）。名前はベタ書きしません。ヒントで正解そのものを言わないようにします。

答えの後に、対決の観光地の写真で「どこを見れば見え方が変わるか」を示せます（写真の種明かし。2026-11-11、任意）。問いに次の2つを書くと、正誤と解説の下に、その対決の観光地の写真（`landmarks` の `imageAssetId`。対決の背景と同じ写真）が小さな枠で出て、書いた範囲へゆっくり寄り、範囲を枠で囲みます（動きを減らす設定では寄らずに、すぐ囲みます）。写真の下には、手がかり帳の写真と同じく出典の1行（作者・「画像の出典」・「利用条件」）が出ます。正解でも不正解でも出ます。書かなければ今までどおりです。例は見本の編の `quizzes/smp_mihon_main_clock_tower_quiz.json` の第1問。

- `revealRegion`：写真の中の範囲。観察の手がかりの `region` と同じ形で、写真全体を1とする左上の `x` / `y` と `width` / `height`（例 `{ "x": 0.41, "y": 0.23, "width": 0.18, "height": 0.26 }`）。写真の外にはみ出す範囲と、幅・高さが0の範囲は `content:build` が止めます。都市フィナーレの問い（観光地の写真がない）と、観光地の写真が `tourism/catalog.json` にない問いにも書けません（止まります）。範囲が写真の7割より大きいときは寄らずに囲むだけ、小さいときも2.4倍より寄りません。
- `revealCaptionJa`：写真の下の短い1行の説明（例「見本の時計塔の針は、今も三時を指したまま（架空の見本）。」）。`revealRegion` がなければ出ません。解説を写さず、写真のどこを見ればよいかを書きます。

範囲は、解説の内容が写真のその場所で確かめられる所にします（史実・解釈・伝説の区別は解説と出典のとおり）。写真を差し替えて構図が変わったら、範囲も見直します。クイズのほかの項目と同じく、書き足したり直したりすると、その対決の途中のセーブは再開できなくなります。

### 敵・バトルの項目

`battle_*.json` の `id`、`titleJa`、`descriptionJa`、`enemyNameJa`、`enemyTitleJa`、`enemyDescriptionJa` は対決と人物の識別・表示。相手の名札（`enemyTitleJa` の役どころと `enemyNameJa` の名前）は、相手の名前が初めて出る `# speaker: enemy` の行に `# cutin: name` を書くと、少しのあいだ出ます（「場面の演出の札」）。任意の `enemyQuoteJa` を書くと、名札に相手の一言が1行添えられます（書いたとおりに出るので、台詞ならかぎかっこも書きます。例は見本の編の `battles/catalog.json`）。`landmarkId`、`storyId`、`quizId`、`backgroundId` は観光地・Ink・問題セット・登録済み背景への参照です。対決の会話は1本の流れ（下）で書きます。`format` はAでは省略可能、B/Cは明示。任意の `portrait` は既存で定義済みの表示種別に限られます。新規の立ち絵種類には実装作業が別途必要です。

B/Cの `reasoning` には `kind`（Bは `contradiction`、Cは `connection`）、0から数える `roundIndex`（何問目の前で資料を選ぶか）、候補 `caseClueIds`、正解 `correctClueIds` を記入します。正解証拠はBが1つ、Cは異なる2つを順不同で組み合わせます。証拠は未発見でもケース資料として開けるよう候補に含めます。英語3択の正解はクイズ側で別に指定します。主張・追及・資料の後の台詞は、対決のInkに書きます（下）。

`format` を省くとA（ふつうのクイズ）です。Bは `format: "B"` と `reasoning.kind: "contradiction"`、Cは `format: "C"` と `reasoning.kind: "connection"` を書きます。`caseClueIds` は観光の `clues` を使い回す証拠のID（3〜5枚）で、Cの正解の2枚は順不同で判定します。推理の結論は、同じ `roundIndex` のクイズの `correctOptionId` で決めます。証拠の選択と英語の採点は別で、証拠だけで3択に答えることはしません。台詞はInk、証拠と条件はJSON、判定と保存はTypeScript、入力と描画はReactが持ちます。ビルドは、形式と推理の種類、証拠の枚数・重なり・正解が候補に入っているか、証拠IDと観光地が合うか、問いの位置の範囲、主張の knot と止まる所を確かめます。正しい証拠と結論が理屈のうえで1つに決まるかは、出典と脚本でも照らし合わせてください。

推理クイズを本編に置くには、`progression/journey.json` の `storyBattles` に、対決ID、前後のエピソードID、案内文とボタン名を書きます。そこに書いた `completionReward` は、共通の報酬の処理で `battle_complete` の報酬として扱います。B/Cの戦績を完了の記録に使い、観光エピソードや報酬を重ねて登録しません。ミラノの『最後の晩餐』を舞台にした古いB/C（`milano_last_supper_b01`・`milano_last_supper_c01`）はカタログに残っていますが、`storyBattles` にないので新しい旅には出ません。

新しい通常のクイズは、3問のクイズのJSONとInkを用意し、`battles/catalog.json` に登録するだけで遊べます（画面を直す必要はありません）。今の数は、ミラノが7セット（通常4、推理クイズB・C各1、都市フィナーレ1）、インドが都市ごとに5セット（通常4、都市フィナーレ1）です。正解の位置（A・B・C）が偏らないようにします。日本語の導入や、証拠を示せたときの台詞が、続く英語の答えを直接教えていないか、史実が正しいかは、脚本のレビューでも確かめます。

### 対決の会話を1本の流れで書く（段階5）

対決の会話は、上から下へ1本に流れるInkに書きます。見本の編の4本（`stories/places/smp_mihon_clock_tower.ink` の `smp_mihon_main_clock_tower`・`smp_mihon_finale_battle`、`stories/places/smp_mihon_market.ink` の `smp_mihon_special_b_market`、`stories/places/smp_mihon_library.ink` の `smp_mihon_special_c_library`）が手本です。

- 置き場所は、その場所の場所のファイルの knot（頭の札は `# scene: battle`）か、1場面1ファイル（`stories/battles/<頭>_…`）です。1場面1ファイルは、1行目を `INCLUDE modules.ink` にし、`VAR` を書きません（ゲームが用意する呼び口と変数。Inkyで見るときは、場所のファイルと同じく `src/story/modules.ink` の写しを隣に置く）。
- `-> quiz(1) ->` と書いた所で、ゲームがクイズの画面（ヒント・答え・正誤と解説）を出します。正誤の画面から進むと、`quiz_correct`（その問いの正誤）と `battle_score`（そこまでの正解数）が入って続きます。クイズは第1問から順に、どの道でも1回ずつ呼びます（通常戦は3問、都市フィナーレは5問。順が違う・足りない道は `content:build` が止めます）。最後の `-> END` の後に結果の画面が出ます。
- 呼び口の後の最初の行は、場面の始まりと同じく、話し手と背景（`# speaker:`・`# background:`）を書き直します（書かないと地の文になります）。
- クイズ・正誤の画面・資料を選ぶ画面・結果の画面の絵は、呼び口（結果なら `-> END`）の前の行の背景のままです（上の帯の場所の札も同じ。2026-11-13）。話が宿の路地や市場へ移ってからクイズを出すと、クイズもその場所で出ます。対決の背景（`battles/catalog.json` の `backgroundId`）に戻したいときは、呼び口の前の行でその背景を書きます。観光地の写真がある対決は、今までどおりどの画面も観光地の写真です。
- 正解の余韻（2026-11-13）：`-> quiz(n) ->` の後、正解の枝（`{ quiz_correct: … }`）には、次へ進む前に少なくとも1行、相手かヒロインの反応か、その場所の見え方が変わる一言を置きます（正解をすぐ次の話題で流さない）。
- 特殊戦B・Cでは、`-> reasoning ->` が資料を選ぶ画面です。`reasoning.roundIndex` のとおり、`-> quiz(<roundIndex>) ->` の後・次のクイズの前に置きます（`roundIndex: 1` なら第1問の後）。
  - 主張は手伝いの knot `<バトル>_claim` に書き（`=== smp_mihon_special_b_market_claim ===` … `->->`）、止まる所の前に `-> <バトル>_claim ->` で流します。手がかり帳の「主張」は、ゲームがこの knot の相手の台詞を読んで出します。`<バトル>` は、場所のファイルなら対決の knot の名前、1場面1ファイルならファイルの名前です。ゲームは手がかり帳のためにこの knot（と下の `<バトル>_press`）だけを読むので、その中（そこから呼ぶ knot の中も）には選択肢もクイズ・推理の呼び口も書けません（届くと `content:build` が knot の名前を出して止めます）。主張の文の名前（`{player_name}` など）は、流れと同じく設定した名前で出ます。
  - 主張の後に、反論の前置き（ヒロインの「待って」など）をそのまま続けて書けます。ほかの台詞と同じく1行ごとに保存されます。
  - 止まる所は `- (stop)` の次の行に `-> reasoning ->` と書きます。戻ると `reasoning_action` が `"press"`（Bの追及）か `"evidence"`（資料）で、資料なら `evidence_result` が `"success"` か `"failure"` です。追及や違う資料の文の後に `-> stop` と書くと、止まる所へ戻って選び直せます。書かなければ次の問いへ進みます（どちらにするかは作者が決めます。見本は戻る形）。正しい資料の後は `-> stop` を書かずに進みます（戻ってばかりで終わりに届かない流れは `content:build` が止めます）。資料は得点を変えません。
  - 追及の文を手伝いの knot `<バトル>_press` に書いて `-> <バトル>_press ->` で流すと、手がかり帳の「追及で聞いたこと」にもその文が出ます。追及の文を流れの中（`{ reasoning_action == "press": … }` の中）にそのまま書いても遊べますが、そのときは「追及で聞いたこと」に出ません。
  - 画面では、主張の前の最後の行と、反論の前の主張の最後の行に「次へ進む」が出て（自動送りもそこで止まる）、主張と反論の間、手がかり帳の問題は資料で答える問題を出し、反論の行の間は上の帯の手がかり帳を出しません（ゲームが、行が主張の knot から来たかを見て決める）。

```ink
-> quiz(1) ->
# speaker: enemy
{ quiz_correct: ……そう、三時はただの時刻じゃない|三時は三時よ }
-> smp_mihon_special_b_market_claim ->
- (stop)
-> reasoning ->
{ reasoning_action == "press":
    -> smp_mihon_special_b_market_press ->
    -> stop
}
{ evidence_result == "failure":
    # speaker: enemy
    それは今年の帳面よ。昔の話をしているの
    -> stop
}
# speaker: enemy
三時の欄……。昔の人も、好きな時間に買いに来てたのね
-> quiz(2) ->
```

- 会話の中に日本語の選択肢を書けます（`* [「…」 # option: <ID>]` と、そのすぐ次の行の札。書き方は道中交流・会話と同じ「選択肢の札」）。札（関係値・お金・AP・フラグ・品物・噛み合いの `# profile:` など）は、その対決を初めて遊ぶときだけ、1回の対決の中で選択肢ごとに1回だけ当たります（同じ止まる所へ戻ってもう一度選んでも、遊び直しても当たりません）。`# later` は書けません。どの選択の場にも、何も要らない選択肢か、頭の札などで保証された選択肢を1つは置きます（`content:build` が確かめます）。

## 恋愛とInk

### デートで訪れる観光地

観光・発見・バトルを持つメイン観光地と、デート中に訪れる行き先は別のデータです。デート先のために敵・クイズ・観光エピソードを作る必要はありません。将来、メイン観光地と同じ場所をデートで再訪する場合も、同じ場所を指すデート先を登録できます。

1. `content/journeys/<旅行編ID>/romance/date_destinations.json` の `destinations` に、安定した `id`、`cityId`、日本語・英語の名称、短い `descriptionJa`、`backgroundId`、`facts` を登録します。事実ごとに `publisher`・`title`・`url`・`checkedAt`・`claimType`・`claimJa` を記録し、実際に資料の該当箇所を確認してください。事実・解釈・仮説・伝説は既存の観光資料と同じ区分を使います。
2. 権利を確認した写真を `content/journeys/<旅行編ID>/public/assets/tourism/` に置き、`content/journeys/<旅行編ID>/tourism/catalog.json` の `assets` に実寸・作者・出典URL・ライセンス・加工内容を登録します。同じ旅行編の `romance/presentation.json` の背景から `imageAssetId` で参照し、必要なら `imagePosition` の x / y を0〜100で指定します。写真家の権利だけでなく被写体の権利も確認してください。近隣の風景を使う場合は実際の場所を代替テキスト・クレジットに明記します。確認できる画像がない場合は `fallback: "neutral"` を使います。出典は会話中の操作メニューから確認できます。出典のある写真ではなく Dreamscape のために作った絵（品物のアイコン、タイトルの絵など）は `tourism/catalog.json` に登録せず、その旅行編の `presentation/own-artwork.json` に配信時のパスを1行ずつ書きます（共通の `public/` に置く絵は `content/presentation/own-artwork.json`）。配信するどの画像も、どちらか一方に登録されていないと `npm run content:build` が「出典のない画像」で止まります（アルバムの絵 `public/assets/album/` だけは登録しません。上の「写真の札」。[技術設計](../docs/02_TECH_ARCHITECTURE.md#画像の出典と自作の絵)）。
   背景に訪問対象が写っていないときは、行き先に任意の `referenceImage`（HTTPSの `url`、リンク名 `labelJa`、背景についての `backgroundNoteJa`）を追加し、実物を確認できる公式資料へ案内できます。外部リンクは写真のゲーム内への転載許諾を意味しません。
3. `content/journeys/<旅行編ID>/romance/date_catalog.json` の通常デートに `destinationId` と開く条件 `when` を指定します。デートの `chapterId`、行き先の `cityId`、双方の背景IDを一致させます。訪問後に開放する通常デートでは、`when` にそのエピソードだけを書けます（例：`"when": { "episodeCompleted": "milano_galleria_episode" }`）。交際後も同じ短編を遊べる場合は `allowAfterEnding` を指定します。
4. Inkには、その場所で見られるものや出典を確認した小話を、ヒロインの関心や会話に自然につなげて書きます。選択にかかわらず観光を楽しめるようにします。選択をデートの定義の `choiceCount` の回数（ふつう2回）書き（選択肢はふつう3つ。数は自由）、選択肢には共通または固有の `effect` を指定します。固有の思い出を残す場合は対応する `memory` も登録します。必要な表情は `# emotion:`、無言の反応は `# reaction:` で指定します。既存の恋愛進行に新イベントを必須条件として追加するかは、別途慎重に検討してください。
5. `npm run content:check` でIDの重複、都市・エピソード・背景の参照、出典形式、全分岐と効果を確認し、スマートフォンの画面と脚本をレビューします。

現在の都市読み込みはミラノ前提です。別都市の実装には、後述の都市選択・進行・セーブなどの対応が必要です。

### 関係の空気を会話へ反映する

新しい確率リアクション付き恋愛Inkは `relationship_tone`、`relationship_tone_before`、`relationship_tone_after` を文字列変数として宣言します。使用できる値は `reserved`、`strained`、`comfortable`、`guarded_attraction`、`warm`、`romantic_tension` です。冒頭では `relationship_tone`、選択の反応では `romance_result` と `relationship_tone_after` を使えます。数値や閾値をInkに書かず、共通本文を中心に少数の違いを作ります。内容検証で分岐とIDを確認し、文章と人物らしさは人間がレビューしてください。

### 通常デートのデータ

デート（`romance/date_catalog.json` の `dates`）の `id`、`chapterId`、`titleJa`、`descriptionJa`、`storyId`、`backgroundId` はイベント、章、表示文、脚本、背景です。`kind` は通常なら `normal`。`apCost`、`minRomanceStage`、`minAffection` と開く条件 `when` は開始条件で、`destinationId` と閉じる条件 `until` は必要な場合のみ（`when`・`until` の書き方は[条件の書き方](#条件の書き方)）。通常デートも、ほかのデートを遊んだことを開く条件（`when`）にできます。条件を書かない通常デートは順不同で、最初に選んでも成立させます。期間限定イベントには `until` で終了条件を指定できます（例：`"until": { "episodeCompleted": "milano_last_supper_episode" }`。一度地図に出た特別な出来事も、`until` が真になると閉じます）。`repeatable` は再挑戦可否で、通常デートは `false`、告白は再挑戦のため `true` にします。`rewardOnlyOnce` は効果の重複防止、`needsDeferred` は告白保留後の条件、`choiceCount` / `effectCount` は各経路の選択・効果回数です。

新しい通常デートは、Inkと、JSONの定義（デートのカタログと、都市の移動データ `<旅行編>/travel/<都市ID>.json` の `events`）・効果を足すだけで、行き先の一覧と会話の画面に出ます。行き先に出る地点名・イベント名・説明もJSONにあり、Reactにイベントごとの文言を足す必要はありません。`kind` は `normal` / `special` / `confession` / `reassurance` です。通常は `choiceCount: 2`、無料のイベントは必要に応じて0〜2回の選択にできます。`effectCount` は各経路で期待する効果の数です。`validationContexts` には、関係の段階、告白の結果、引用する `memoryId`、交際の状態を書き、その文脈ごとに全分岐を検証します。告白は成立・保留・拒否の文脈をすべて書きます。通常デートは文脈ごとに9経路（3択×2回）、選択の機会が1回のイベントは文脈ごとに3経路です。

次の目標の札（任意、2026-11-13）：デートの knot の頭（場所のファイル）か、1場面1ファイルのデートの頭に `# hint: <一言>` を書くと、Debugモードがオンの間だけ、そのデートの開く条件（`# when:` か `when`）がかなうまで、自由時間の札の列の行き先の後ろに、鍵のかかった灰色の札としてその一言が出ます（制作者の確認用。選んでも出発できず、新しい札の演出もしません。読み上げは「まだ行けません：<一言>」）。**遊ぶ人には出ません**（2026-11-13のユーザー判断）：まだ行けない行き先は列に並ばず、開いたときに新しい札として加わります。出るのは書いた一言だけで、いつ・なぜ開くかはゲームが足しません。札を書かなくても、遊ぶ人に見えるものは同じです。例は見本の編の時計塔の広場のデート（`# hint: 時計塔の番人と話したあとで`）。一言が空のとき、デートでない場面に書いたとき、JSON の `hintJa` と両方に書いたときは `content:build` が止めます。開く条件のないデート・関係修復のデートの札（出ません）と、関係の値でも開くデートの札（開かずに消えることがあります）は注意に出ます。

`effect_catalog.json` の各 `id` と任意の `memoryId` はInkの `# effect:` に対応します。新しい台本では、選択肢の札（`# profile:`・`# memory:`・`# rel:`）で同じことを直接書けます（ビルドが選択肢ごとの表にします。ミラノ編・インド編のデートは場所のファイル `stories/places/` の札で書いています。例：`places/gt_delhi_lodhi_garden.ink`、告白は `places/milano_darsena.ink` の `milano_confession_01`）。告白を除く恋愛選択には `responseProfileId` を指定し、`content/romance/response_profiles.json` のリスク特性から選びます。`responseProfileId` を指定した選択の関係値は確率判定で決まり、固定の `affectionDelta`・`trustDelta`・`sparkDelta` は使われません。`affectionDelta` は `0` とし、`trustDelta`・`sparkDelta` は書きません。台詞と選択の性格に合うプロフィールを選び、全段階をレビューしてください。思い出は `presentation.json` の `memories` に同じIDと `titleJa` / `descriptionJa` を登録します。Stage・告白条件は `progression.json` で管理し、特定デートIDを条件にしません。

Inkの `VAR player_name` / `heroine_name` / `player_address` は設定名を受け取ります（`player_address` は関係の段階に応じた敬称つきの呼び方）。恋愛の場面では、`romance_stage`、過去の思い出を引く `memory_callback`、告白が成立する状態かを示す `confession_ready` も使えます。AP・段階・告白の条件の計算はTypeScriptが行い、Inkには結果だけを渡します。`# speaker: narrator` / `heroine` / `player` / `enemy` / 登録した人物のID（[Inkで会話と演出を作る](#inkで会話と演出を作る)）、`# background: 登録済みID`、`# emotion: 登録済みID` を使い、本文はふつう日本語で書きます（英語の台詞や選択肢も書けます。ビルドは止めません）。デートの `* [選択肢]` と各分岐直後の札（`# option:` と `# profile:`）、`->` の合流例は見本の場所のファイル `stories/places/smp_mihon_clock_tower.ink` のデート `smp_mihon_date_tower_square` を参照（今の1場面1ファイルのデートは、各分岐直後に `# effect: 登録済みID`）。通常デートは3択を2回、各選択直後・最初の発話の前に対応する `# effect:` を1つ置きます。Inkで `romance_result` と `affection_delta`・`trust_delta`・`spark_delta` を宣言し、`romance_result` の positive と negative それぞれで異なる人物らしい反応を書きます。確率計算と乱数はInkに書きません。告白は確定的な別契約です（場所のファイルの告白は `# profile:` も結果の `# effect:` も書かず、始めたときにゲームが関係状態から決めた `confession_result` で返事を分けます。デートの knot の中の選択の回数が `choiceCount` です。例：インド編の `places/gt_delhi_hotel_hub_dates.ink`）。案内とバトルには恋愛effectを置きません。バトルの会話は1本の流れで書きます（[対決の会話を1本の流れで書く](#対決の会話を1本の流れで書く段階5)。`-> quiz(n) ->` でクイズを呼び、戻ると `quiz_correct`・`battle_score` で分岐する）。場所のファイル（`stories/places/`）では、変数はゲームが用意する `modules.ink` が宣言するので、`VAR` を書きません（1場面1ファイルのバトルも、1行目を `INCLUDE modules.ink` にして `VAR` を書かない）。案内にも選択肢と効果の札を書けます（読み直しでは当てない）。特殊戦の主張（`<バトル>_claim`）・追及（`<バトル>_press`）・証拠成功／失敗（`evidence_result` の分かれ道）の例は見本の `stories/places/smp_mihon_market.ink`（B）と `stories/places/smp_mihon_library.ink`（C）にあります。

会話中の無言リアクションは、通常はInkの `# reaction:` で指定します。既存の `content/journeys/milano/presentation/dialogue-reactions.json` は、公開済みの脚本を変えずに演出を付けた旧指定として維持します。外部指定では固定台詞の完全一致が必要で、変数を含む行には指定できません。脚本を更新した場合、参照先の消えた旧指定は検証時に警告されます。

漫符IDは `question`、`exclamation`、`interrobang`、`anger`、`sweat`、`blush`、`gloom`、`dizzy`、`music`、`heart`、`sparkle`、`sleep`、`sigh` です。`exasperated` は呆れの表情で、画像が未登録の衣装では同じ衣装の `neutral` を使います。演出は対象人物が表示されている間だけ現れ、ゲームの進行や保存には影響しません。台詞ごとに機械的に付けず、必要な瞬間を選んでください。

順不同のデートで過去の出来事を参照する場合、Inkで `EXTERNAL has_memory(memory_id)` を宣言し、`has_memory("登録済みmemoryId")` を使います。引数は固定の登録済みIDだけで、任意コードを実行せず状態も変更しません。基本本文は思い出がなくても成立させ、`validationContexts` の `memoryIds` で思い出あり・なしの両方を検証します。`romance_stage` と `ending_reached` に応じた反応、告白の `confession_result` も各文脈を登録してください。

### ミニゲーム（任意、2026-11-13）

選択肢の組の代わりに、遊ぶ人が短いミニゲームを遊び、その結果で選択肢が決まるようにできます。Ink の選択肢の組が出る所なら、どの場面でも書けます（場所のファイルのデート・道中交流と差し込みの場面・観光案内・到着・エピローグ・ツアーの区間・バトルとフィナーレの会話。その knot から呼ぶ手伝いの knot の中も同じ）。選択肢のすぐ前の行に `# minigame: <ゲーム>` を書き、すぐ後にゲームの結果ごとに1つずつ選択肢を書きます。選択肢の `# option:` は結果のIDにします。画面には選択肢の代わりにゲームの「構える」などのボタンが出て、遊び終えると、結果のIDの選択肢を押したのと同じに選びます。その後はふつうの選択肢と同じです（効果の札、デートの `# profile:` の噛み合い、セーブ、ログ）。選択肢の文は画面に出ませんが、何が起きたかが分かる文にします（例「最後の一球：まっすぐ打ち返した」。英語の返事を選ぶ道中交流でも、日本語の説明でかまいません）。

ゲームの一覧・遊び方・結果のID・札の引数・絵の名前・使っている場面は、Debug の「ミニゲームの見本」（`?debug` の場面の確認の下）に出ます。そこで、物語なしに自分で・おまかせの各結果で・動きを減らして遊べます。今のゲームはクリケットの打席 `cricket_batting` です（結果 `six`・`over_wall`・`edge`・`bowled`・`no_swing`、おまかせの既定 `six`）。

```ink
# speaker: heroine
# emotion: serious
# minigame: cricket_batting auto over_wall
本気で投げるから。本気で打ってね
* [最後の一球：まっすぐ打ち返した # option: six]
    # profile: bold
    -> gt_agra_mehtab_bagh_ball_six ->
* [最後の一球：横へ高く打ち上げた # option: over_wall]
    # profile: honest
    -> gt_agra_mehtab_bagh_ball_over_wall ->
（edge・bowled・no_swing も同じように1つずつ）
```

札の形は1つです：`# minigame: <ゲーム> [auto <結果>] [prefix <語>] [bg <背景>] [art.<名前> <絵>] [<キー> <値>]…`（順は自由、同じキーは1回）。

- `auto <結果>`：⚙設定の「ミニゲームをおまかせにする」がオンのとき、ゲームは押さずに進み（画面を押すとすぐ結果へ）、この結果になります。書かなければゲームの既定。今の文の流れに合う結果を書きます。
- `prefix <語>`：同じ場面で同じゲームをもう一度遊ばせるとき（`# option:` は場面の中で1つずつなので）、そちらの選択肢の `# option:` を `<語>_<結果>`（`prefix again` なら `again_six` など）にします。
- `bg <背景>`：遊ぶ間の背景の絵。`# background:` に書ける背景のIDです（その旅行編の `romance/presentation.json` の `backgrounds`）。書かなければ、その場面の今の背景のまま。
- `art.<名前> <絵>`：ゲームが用意した絵の枠（例：クリケットの `art.pitch` は打者の目から見た空き地、`art.bowler` は投げるヒロインの全身）に、旅行編の絵を入れます。絵は旅行編の `public/assets/minigames/<絵のID>.webp`（png・jpg・jpeg も可。人物や物の枠は背景が透明な webp か png）に置き、その旅行編の `presentation/own-artwork.json` に載せます。書かなければ、ゲームの絵（CSS で描いたもの）のまま。
- そのほかのキーは、ゲームごとの引数です（ゲームが決めます。キーと説明は Debug の部屋とエラーの文に出ます）。クリケットにはありません。
- 状態で変えたいときは、`cond()` の分かれ道に札を書き分けます。札は選択肢の組の前の最後の行に付いていれば、どの分かれ道からでもかまいません。
- 結果の数はゲームごとに決まっていて、使い所で減らせません。分けたくない結果は、選択肢を同じ所へ合流させます。

結果と効果の決まり：

- 結果は遊び方（押した時刻など）だけで決まり、乱数は使いません。点数や値段などの数は物語に渡しません。値段の交渉のような場面は、値段の段を結果にして（例：`deal_high`・`deal_fair`・`walk_away`）、選択肢ごとに `# money:` を書きます。
- 結果の選択肢には、その場で選べることが保証される札なら何でも書けます。ゲームは持ち物に関係なく結果を選ぶので、`# requires:`・品物を渡す・使う・`# money:` や `# ap:` の支払いは、場面の頭の `# when:` か、そこへ来る道の上で真と読んだ `cond("…")` で保証します（その道で先に払った・渡した分は引かれます）。`# then: move` は保証されません。
- 関係値はゲームが動かしません。動かすのは、作者が結果の選択肢に書いた札（`# profile:`・`# rel:`）だけです。デートの knot の選択肢の組の代わりなら、どれにも `# profile:` が要ります（噛み合い。`choiceCount` に数えます）。結果は腕前でなく「どう遊んだか」という態度にすると公平です。場面の中のゲーム（手伝いの knot・差し込み・案内・バトル）には、ふつう `# rel:` を書きません（書くなら結果ごとに別の軸にし、どれか1つが得にならないようにします。ビルドでは止めず、台本の点検で見ます）。失敗の結果も、面白いか意味のある場面にします。
- 「また今度」（`# later`）を書ける場面なら、結果の選択肢にも書けます。おまかせの結果を `# later` の選択肢にすると、おまかせではその場面がいつまでも終わらないので、`content:build` が注意を出します。
- セーブに新しいものは増えません（選択肢の所で保存され、ゲームの途中で読み込み直すと、ゲームを最初から遊びます）。遊んでいる間に別のタブへ移ると、時間で進むゲームは止まり、戻ると「続ける」が出ます。「中断する」（Esc）で、何も選ばずに開始のボタンへ戻れます。Debugモードがオンの間は、開始のボタンの下に結果ごとのボタンが出ます。

書けない所：告白のデート（その knot と手伝いの knot。気持ちの答えが腕前や運で決まったように見えないように。告白の前後の差し込みの場面 `# at: date <告白>` には書けます）、クイズの問い・推理の資料を選ぶ所とその呼び口（`-> quiz(n) ->`・`-> reasoning ->` のすぐ前）、カタログの道中交流と1場面1ファイルのデート、選択肢の無い1場面1ファイルの到着・エピローグ、特殊戦の主張・追及の手伝いの knot。

次のときは `content:build` が止めます：ないゲーム（ゲームの一覧を出します）、結果に無い `auto`、`prefix` の形の誤り、知らないキー・同じキーが2回・値の無いキー・ゲームの引数に合わない値（そのキーの説明を出します）、無い背景や絵・その旅行編のものでない絵・人物の枠に jpg、選択肢に `# minigame:` を書いた、行の後に別の行が続いたり場面が終わったりして選択肢がすぐ来ない、選択肢が結果と1つずつ合わない（足りない・余分・`# option:` のない選択肢）、結果の選択肢が選べないことがある、書けない所に書いた（告白のデートは理由を言います）、おまかせの結果をたどると、ほかの選択肢の組を通らずに同じゲームへ戻る（おまかせで進めなくなります）。

例：インド編のメヘターブ・バーグのデート（`places/gt_agra_mehtab_bagh.ink`）。最後の一球の結果がデートの2回目の噛み合いで、振らなかったとき（`no_swing`）は、ソニアの「もう一球」の後、手伝いの knot `gt_agra_mehtab_bagh_another_ball`（`prefix again`、場面の中の選択）でもう一度だけ打ちます。噛み合いは1回の打席で1回だけです。新しいゲームを作る人の手順は [13 ミニゲームの仕組み](../docs/13_MINIGAMES.md#7-ゲームを足す手順作る人へ) にあります。

## 条件の書き方

デートの開く条件 `when`・閉じる条件 `until`（`romance/date_catalog.json`）と、道中交流の入場ルールの `when`（`encounters/entry-rules.json`）は、共通条件管理システムの同じ形の JSON で書きます。ゲームは条件を1つの関数（`src/domain/conditions.ts` の `meets`）で判定し、条件が真になっても何も記録しません。条件を書かなければ「条件なし」です。今使えるのは、今の記録を読む部品だけです（段階1と2a）。場面のInkの中では、同じ部品を文字で書いた `cond("…")` で分岐できます（下の「場面の中の分岐」）。

条件は、キーが1つだけのオブジェクトです。組み合わせは入れ子にできます。

| 組み合わせ | 書き方 | 真になるとき |
|---|---|---|
| すべて | `{ "all": [条件, 条件, …] }` | 全部が真（空にはできない） |
| どれか | `{ "any": [条件, 条件, …] }` | どれかが真（空にはできない） |
| ではない | `{ "not": 条件 }` | 中の条件が偽 |
| いくつ以上 | `{ "atLeast": { "count": 2, "of": [条件, 条件, 条件] } }` | `count` 個以上が真（`count` は1〜`of` の数） |

| 部品 | 書き方 | 読む記録 |
|---|---|---|
| エピソードを終えた | `{ "episodeCompleted": "<エピソードID>" }` | 終えたエピソード |
| 都市のエピソードをいくつ終えた | `{ "episodesCompleted": { "city": "<都市ID>", "atLeast": 1 } }` | その都市のエピソード（フィナーレを含む）の数。`atLeast: 1` がデートの標準（旧「章」） |
| 都市をクリアした | `{ "cityCompleted": "<都市ID>" }` | クリアした都市 |
| バトルを遊んだ | `{ "battlePlayed": "<バトルID>" }` | 一度でも戦ったバトル（勝ち負けは問わない） |
| 観光地を訪れた | `{ "landmarkVisited": "<観光地ID>" }` | 訪れた観光地 |
| 案内を読んだ | `{ "guideRead": "<観光地ID>" }` | 最後まで読んだ観光案内 |
| 交流を終えた | `{ "encounterCompleted": "<交流ID>" }` | 「また今度」以外で終えた交流 |
| 交流を見た | `{ "encounterSeen": "<交流ID>" }` | どの選択肢でも最後まで見た交流（「また今度」も） |
| デートを遊んだ | `{ "datePlayed": "<デートID>" }` | 遊んだデート |
| エピローグを読んだ | `{ "epilogueViewed": "<都市ID>" }` | 読んだ都市のエピローグ |
| 品物 | `{ "item": { "id": "<品物ID>", "is": "held" } }` | 品物の状態（下の表） |
| 時間帯 | `{ "time": "day" }`・`{ "time": "night" }` | `day` は9:00〜18:00、`night` は18:00から眠るまで（21:00の一日の終わりに休むときの、宿へ向かう移動と宿の「眠る前」の場面も夜） |
| この都市の何日目 | `{ "cityDay": { "atLeast": 2, "atMost": 3 } }` | 都市に着いた日が1日目。`atLeast`・`atMost` の片方だけでもよい |
| 旅の何日目 | `{ "journeyDay": { "atLeast": 5 } }` | 旅の暦（旅行編の `startWeekday`）がある旅だけ。暦のない旅ではいつも偽 |
| 曜日 | `{ "weekday": [5, 6] }` | 月曜が0。暦のある旅だけ |
| 乗った回数 | `{ "rides": { "mode": "<乗り物ID>", "atLeast": 2 } }` | この都市で、これまでにその乗り物に乗った回数（徒歩は数えない） |
| 借りた | `{ "rented": "<乗り物ID>" }` | この都市で借りた乗り物 |
| 都市のバトルをいくつ遊んだ | `{ "battlesPlayed": { "city": "<都市ID>", "atLeast": 2 } }` | その都市のバトル（フィナーレを除く。勝ち負けは問わない）を遊んだ数 |
| 関係の値 | `{ "relationship": { "axis": "affection", "atLeast": 3 } }` | 親しさ `affection`・信頼 `trust`・恋愛の意識 `spark` の今の値（`atMost` も。負の数も書ける）。プレイヤーには、値も、条件が満たされたかも見せない |
| 使えるお金 | `{ "money": { "atLeast": 300 } }` | 旅行予算から帰りの交通費の取り置きを引いた額（`atMost` も） |
| 恋愛の段階 | `{ "romanceStage": { "atLeast": 2 } }` | 今の段階（1〜4。`atMost` も） |
| 交際している | `{ "couple": true }` | 告白が成立した |

品物の `is` は5つです。

| `is` | 真になるとき | 読める場所 |
|---|---|---|
| `obtained` | 一度でも手に入れた（今の状態は問わない） | どこでも |
| `held` | 今持っている | その品物の都市の条件だけ。旅の間持ち歩く品物（`"carry": "journey"`）は、同じ旅の後の都市の条件でも読める（ほかの場所では持てないので、ビルドが止める） |
| `gifted` | 渡した | どこでも |
| `used` | 使った | どこでも |
| `left_behind` | 都市を出るときに置いてきた | 同じ旅の、品物の都市より後の都市の条件だけ（品物の都市の中では決して真にならないので、ビルドが止める）。持ち歩く品物は置いていかないので、どこでもビルドが止める |

例（期間限定の特別な出来事。ガッレリアを終えてから、最後の晩餐を終えるまで）：

```json
"when": { "all": [ { "episodesCompleted": { "city": "milano", "atLeast": 1 } }, { "episodeCompleted": "milano_galleria_episode" } ] },
"until": { "episodeCompleted": "milano_last_supper_episode" }
```

- デートは `when` が真で、`until` が偽で、恋愛の欄（`minRomanceStage`・`minAffection`・`needsDeferred`）を満たすときに開きます。一度地図に出た特別な出来事も、`until` が真になると閉じます。始めた後のデートは、セーブを読み込み直しても条件を調べ直しません。
- デートが開かない理由の文は今のままの順です（`when` のすぐ下の部品で、都市のクリア → エピソード → `until` → 告白の待ち時間 → そのほか）。ゲームは条件の中身や関係値を理由に出しません。Debugだけが、満たしていない部品を表示します。
- まだ使えない部品（`flag`・`met`・名前付き条件 `condition`・`ap`、品物の `encounter`・`to`）や、観察以外の時点（`at` の `afterBattle` など）は、ビルドが「まだ使えません（段階…）」で止めます。後の段階で足します。
- `npm run content:build` が止めるのは、形の誤り、存在しないID、旅行編が宣言していない乗り物（徒歩も数えない）、読める場所でない品物の `held`・`left_behind`、入手元のない品物です。止めずに注意として知らせるのは、決して満たされない条件（`never-offered`：観察だけで調べる交流が自分の観光地のエピソードやバトルを条件にしている、同じ旅の後の都市の進行を前の都市で読む、暦のない旅の `journeyDay`・`weekday`、互いを待つデート）と、デートの条件の `time`・`rides`・`money`（`date-condition-trip`：行き先へ向かう移動で変わるので、地図に出ても着くと始まらないことがある。時間や曜日で限るデートは、行き先の時間窓 `startWindows`・`openingWindows`・`closedWeekdays` で書けます）です。

### 場面の中の分岐

場面（案内・到着・エピローグ・対決の会話・道中交流・デート）のInkの中では、`cond("…")` で、条件が今満たされているかを読んで分岐できます（統一イベント設計の段階2a）。文字は、道中交流の頭の札 `# when:` と同じ書き方で、部品を1つ書きます（前に `not` を付けられます）。`cond` は真か偽だけを返し、数はInkに渡りません。読むだけで、何も変えません。

```ink
VAR player_name = ""
VAR heroine_name = ""
EXTERNAL cond(text)

{ cond("rel affection >= 3"): 「また来ようね。」 | 「次は、どこへ行く？」 }
* {cond("money >= 300")} [Let me buy you a coffee.]
  # speaker: heroine
  「じゃあ、窓ぎわの席で。」
* [Let's just walk.]
  # speaker: heroine
  「うん、川のほうまで。」
- -> END

=== function cond(text) ===
~ return false
```

- 今の「1場面1ファイル」のInk（`VAR` で始まる形）で `cond` を使うときは、`VAR` の行の後に `EXTERNAL cond(text)` を1行、ファイルの最後に、Inkyで下書きを見るための代わりの関数 `=== function cond(text) ===` と `~ return false` の2行を書きます（`EXTERNAL has_memory(memory_id)` と同じ書き方）。宣言がないと、`npm run content:build` が直し方を示して止めます。代わりの関数はInkyだけが使い、ゲームは本当の値を渡します。
- 書ける文字：`item <品物> held`（`obtained`・`gifted`・`used`・`left_behind`）、`seen <交流>`・`done <交流>`、`visited <観光地>`・`guide <観光地>`、`battle <バトル>`・`episode <エピソード>`・`city <都市>`、`episodes <都市> >= 1`、`battles <都市> >= 2`、`date <デート>`・`epilogue <都市>`、`time day`・`time night`、`day >= 2`（`<=` も）、`journey_day >= 5`、`weekday 5,6`、`rides <乗り物> >= 1`・`rented <乗り物>`、`rel affection >= 3`（`trust`・`spark`、`<=` も）、`money >= 300`（`<=` も）、`stage >= 2`（`<=` も）、`couple`。それぞれ上の表の部品と同じ意味です。`flag`・`met`・`ap`・名前付き条件は段階3からです。
- 引数は、引用符で囲んだ文字だけです（変数や式は書けません）。
- `npm run content:build` は、`cond` の文字を頭の札と同じ読み方で条件にし、ほかの条件と同じ検査（形・存在しない名前・品物の都市など）をして、誤りがあれば止めます。そのうえで、代表の組み合わせ（全部偽・全部真・1つだけ真）で、全部の道が最後まで進むかを確かめます。全部の組み合わせは確かめません。
- 選択肢を選んだ直後の行の `cond` は、その選択肢の効果（品物を渡した・関係の値が変わった など）の後の状態を読みます。
- 関係の値の条件は制作者が書くものです。プレイヤーには、条件が満たされたかも見せません。Debugモードがオンの間だけ、場面の上に、今の場面の `cond` の文字ごとの真偽を出します。
- 英語ノートの話題の説明（場面ではありません）と、特殊戦の反論（段階5から）では使えません。ビルドが止めます。

## 章・都市と報酬

都市エピローグの `# speaker: enemy` は、そのエピソードの `battleId` が参照する対戦相手の名前で表示します。ほかの登場人物の言葉は、その人を `progression/story.json` の `people` に登録して `# speaker: <人物ID>` で書きます（[Inkで会話と演出を作る](#inkで会話と演出を作る)）。到着会話でも、主人公（`player`）と対戦相手（`enemy`。その都市のフィナーレの対戦相手の名前で表示）を話者にできます。到着・エピローグ・会話・寄り道の場面の頭に `# person: <人物ID>` を書き、その人物を `progression/story.json` の `people` に絵（`characterId`：`presentation/characters.json` の人物ID）付きで登録しておくと、その人が最初に話したとき（または `# reaction: enemy,…` を付けたとき）から場面の終わりまで、ヒロインの向かいにその絵が立ち、`# speaker: enemy` の行にはその人の名前（`nameJa`）が出ます。絵のある人物を2人以上書いたときは、先に書いた人です（例：インド編の `places/gt_delhi_hotel_hub.ink` のエピローグ。2026-11-11のユーザー判断）。また、`# speaker: <人物ID>` で話す人に絵（`characterId`）があれば、デートやバトルを含むどの場面でも、その台詞からヒロインの向かいに立ちます。ほかの絵のある人が話すまで残り、`# speaker: enemy` で場面の相手に戻ります（バトルでは相手の絵と入れ替わります）。携帯と手紙の行では出ません。ヒロインは、デート・観光案内・到着とエピローグ・バトルの会話では最初から立ち、会話と寄り道では、自分が話す最初の行（表情の札がなければ、ふだんの顔で）か、`# reaction: heroine`・地の文の表情の札から場面の終わりまで立ちます。携帯と手紙の行はその場で話す行ではないので、それだけでは彼女を立たせません（彼女がまだその場にいない場面は、こう書けます）。途中で舞台から下ろすときは、その行に `# leave: <人物ID>` を書きます（`# leave: heroine` と `# leave: enemy` も書けます。2026-11-13のユーザー判断）。その行から絵が下がり、上の決まりでまた出るまで戻りません（ヒロインは自分の行か `# reaction: heroine` などの合図、人物はその人の台詞、`enemy` はその台詞か `# reaction: enemy`、バトルの相手はクイズでも。最初から立つ場面でも、下ろした後は自分から出るまで戻りません）。その人自身の台詞に書くと、去りながら舞台の外から言ったことになります。2人とも下ろすときは、1人ずつ2つ書きます。見せ方だけの札で、文も声の台本も変わりません。登録していない人物ID（`narrator`・`player` も）は `content:build` が止め、その行で舞台にいない人（まだ出ていない・もう下りた・絵のない人）を書くと注意が出ます（例：インド編の `places/gt_delhi_hotel_hub.ink` のエピローグの「アマンが帰ったあと」、`places/gt_delhi_inserts.ink` の駅の検札係、`places/gt_agra_agra_fort.ink` の観光案内のツアーの客）。舞台に立つ人が話す行では、その人が少し前に出て、もう1人は少し暗くなります。地の文・主人公・絵のない人・携帯と手紙の行では、誰も暗くなりません（2026-11-13のユーザー判断）。名前を名乗る前の呼び名（「老人」など）を別の人物IDにしているときは、両方に同じ `characterId` を付けます（例：インド編の `gt_delhi_bangla_old_man` と `gt_harbans`）。人物の任意の `titleJa`（役どころ）は、`# cutin: name` の名札に名前と一緒に出ます。

### 道中の交流

現在の小さなミラノの寄り道は、観光地の場所のファイル（`content/journeys/milano/stories/places/`）の knot に書き（出典は `scenes/catalog.json`）、品物は `content/journeys/milano/encounters/catalog.json` の `items` で管理します（ガッレリアの願掛けも2026-11-13に場所のファイルへ移し、カタログの `encounters` は空です）。カタログには安定した交流・選択・品物ID、観光地、必要な費用や条件、実際に確認した出典を記録し、選択肢の英文と任意の訳はInkに書きます。各品物にも `cityId` を付け、入手・所持条件・贈与・使用・Inkからの参照を同じ都市の場面に限ります。旅の間持ち歩く品物（`"carry": "journey"`）だけは、入手はその都市のまま、所持条件（`item … held`。`# when:`・`# requires:`・`cond("…")` のどれでも）・贈与・使用を旅の後の都市でも書けます（Inkの `has_item_status` は、今どおりその都市の品物だけ）。入手都市のクリア後も使える機会を設けてください。メモや手紙のように文字が書かれた品物は、任意の `linesJa`（文の配列）に書かれている行を書くと、持ち物を開いたときに説明の下へ順に出ます。物語の途中で書き足される行は `{ "textJa": "…", "when": 条件 }` と書くと、条件を満たした後だけ出ます（2026-11-11のユーザー判断）。価格や展示・人物はゲーム内の設定です。旅の予算、品物、APは別に扱います。メイン観光・都市フィナーレ・デートが地図に出る条件に品物やお金を書くかは制作者が決め、書いたときは、どの都市もクリアできる道が残るようにします（`content:build` と探索テストが確かめます）。条件を書かない都市やデートは、購入しなくても続けられます。

道中交流は、観光地の時点で始まります。交流のInkの頭に札（`at: visit <観光地>`・`priority:`・`when:`・`until:`・`repeat:`）を書くと、本筋の前（`-1` など）・観察の後（`after observe`）・本筋の後（`+1` など）に置けます（見本の編では、時計塔の場面を場所のファイル `stories/places/smp_mihon_clock_tower.ink` の knot に書いている。ミラノ編のガッレリアの願掛けのほかの交流も、観光地の場所のファイルの knot に `at: visit <観光地>`・`priority: after observe`・`when:` を書いている。1場面1ファイルの交流のInkの頭にも、同じ札を書ける）。

場所のファイルの会話（`# scene: talk`）と道中交流（`# scene: encounter`）は、観光地のほかの時点にも置けます（段階4）。`# at:` に書けるのは次のとおりです。

| 書き方 | 時点 | 負の数（前） | 途中 | 正の数（後） |
|---|---|---|---|---|
| `date <デート>` | デート | デートの前 | `after date`：デートの後、「交際開始」の画面の前 | 画面の後（画面がなければデートの後） |
| `finale <都市>` | フィナーレ | バトルの前 | `after battle`：結果の後 | 結果の後 |
| `epilogue <都市>` | エピローグ | エピローグの前 | — | エピローグの後 |
| `depart <都市>` | 都市の出発（次の都市があるときだけ） | 品物を置いていく前（まだ渡せる・使える） | — | なし（次の都市の `arrive` の負の数に書く） |
| `arrive <都市>` | 到着（最初の都市ではオープニング） | ロゴの前 | `after logo` | 到着の会話の後 |
| `trip <乗り物>`（`walk` も。`from <場所>`・`to <場所>` で絞れる） | 移動 | 出発する場所で、動く前 | — | なし（行き先の時点の負の数に書く） |
| `ticket <場所>` | 窓口（入場料のある行き先だけ） | 入場料を払った後、入る前 | — | なし |
| `hotel`・`hotel <場所>` | 宿（「休む」） | 眠る前（宿に着いた時刻で読む） | — | 起きた後 |
| `tour <ツアー> <行程>` | 参加中のツアーの行程（下の「ツアー」） | 区間：出発の前／見学：訪問の前 | 区間だけ `after leg`：語りの後、動く前（車の中の交流） | 区間：着いた後／見学：結果の「ツアーを続ける」の後 |

- `place <場所>` は、その場所の観光地・デート・フィナーレのどの時点にも合います（「また今度」の場面を、同じ場所のデートの前でもう一度出したいとき）。
- 「休む」は、宿へ向かう移動の場面（「休む」を押した時刻）→ 宿に着く（21時を過ぎることもある）→ 眠る前の場面 → 眠る（次の日の9時）→ 起きた後の場面、の順です。`time night` は18時から眠って次の朝になるまで真なので、21時に休むときの眠る前の場面も夜です。昼に休んでも眠る前の場面は流れるので、夜だけにしたいときは `# when: time night` を書きます。
- 乗車回数（`rides`）は動いたときに増えるので、移動の場面は「初めて乗る」を `# when: not rides <乗り物> >= 1` で書けます（「休む」で宿へ帰る道は、今までどおり乗車回数に数えません）。
- 到着とエピローグの会話にも、頭の札・選択肢の札の `then:` を書けます。
- `then: move <場所>` は、`by <乗り物>` を書かなければ徒歩で動きます（徒歩の道がなければいちばん安い道）。地図の出発と同じく時刻を確かめるので、夕方や遠い場所へ徒歩で動くと、動いた先の本筋が間に合わず本筋のない訪問になったり、帰り道が間に合わずその選択肢が選べなくなったりします。速い乗り物で動かしたいときは `by <乗り物>` を書いてください。
- 例は見本の編の `stories/places/smp_mihon_clock_tower.ink`（デートの前のベンチを塗る人・初めての貸し自転車・宿の眠る前と起きた後・エピローグの前のしおりとリリの見送り）と `stories/places/smp_mihon_city_end.ink`（フィナーレの前後と、エピローグを始める時。統一イベント設計 3.9 の (d)）です。時点の並びは `npm run journey:readthrough -- --journey <旅行編>` で読めます。札を書かない交流は、入場ルール（`encounters/entry-rules.json`）を満たすものが、観察を進めたときにカタログの順に始まり、終わると観察に戻ります。自由時間から始める道はありません。入場ルール（`encounters/entry-rules.json`、`"schemaVersion": 2`）には、交流ごとに `encounterId`、調べる時点 `at`（今は観察の `["observe"]` だけ。省略しても同じ）、出会える条件 `when`（例：`{ "episodeCompleted": "milano_duomo_episode" }`、`{ "battlePlayed": "milano_la_scala_b01" }`。書き方は[条件の書き方](#条件の書き方)）を書きます。入場ルールのない交流や `when` のない交流は、条件なしに出会えます。`quizAfterLandmarkBattle` の印を付けた交流は、最初の観察で会えます。同じ観光地の本戦をまだ戦っていないうちはクイズなしで話が終わり、本戦を戦った後に始まった場合だけ、文化クイズと賞品の抽選へ進みます（今はどの旅行編も使っていません。テストは `tests/fixtures/catalog-encounters/` のカタログの形の願掛けで確かめます）。ミラノの道中交流は、2026-11-13の改稿で、どの順に観光地を回っても起こる時点に置き直しました：観察の後（ガッレリアの願掛けと券、ブレラの学生）、本筋の後（`# priority: +1`。ドゥオモのノラ・城のティノ・ガッレリアのリナ・スカラ座の喉飴・最後の晩餐の兄妹）、フィナーレの前（ダルセナの一音。城を先に回ってティノにピックなしで会ったときだけ）。「また今度」は、同じ場所に後の時点（デート）がある交流にだけ残し、`# at: place <地点>` でその場所のデートの後にもう一度出します。各交流がいつ起こるかは、場所のファイルのその knot の前のコメントに書いています。JSONにはコメントを書けないので、カタログと入場ルールには書きません。起こる時を変えたら、そのコメントも直してください。カタログに `availability` は書けません（セーブ版 v14 でなくなりました）。使わない交流はカタログから消してください。既存の会話や賞品を差し替える際は、現在のゲームの参照と獲得・使用の整合性を確認してください。

旅行予算とAP・保留APは都市別に初期化しない共通残高です。次の都市へ出発すると、その都市でまだ持っている品物は「置いてきた」になり、持ち越せません。旅の間持ち歩く品物（`"carry": "journey"`）だけは、持ったまま次の都市へ行きます。置いていくことのある品物（持ち歩く印がなく、次の都市がある都市の品物）には、その都市での使い道が要ります。入手・贈与・使用の履歴、交流の履歴、思い出・関係値は残ります。

差し込みの場面（`# scene: encounter`・`talk`）の頭に `# on_done: reward <報酬ID>` を書くと、その場面を終えたとき（「また今度」でないとき）に、`progression/journey.json` の一度きりの報酬を受け取ります（文化交流にも既存報酬の代替達成条件がある。[docs/01](../docs/01_GAME_DESIGN.md)）。同じ報酬を本来の条件（例：バトルの2問正解）で先に受け取っていれば何も起きず、どちらの道でも二重には受け取りません。上限を超える分は保留APになります。ゲームはその交流を終えたことを、受け取った理由として保存の検査で読みます。`content:build` は、本筋の場面、知らない報酬、APのない報酬、ほかの都市の報酬、2つの場面（またはカタログの交流の `alternativeApRewardId`）が名指す報酬、ツアーの車の中の交流に書いたときに止めます。例：ミラノの `galleria_fortune`（`victory_galleria_first`）。

ゲームは、交流を最後まで終えるたびに「見た」記録を残し（「また今度」で終えた場合も）、品物を渡した・使ったときは、その交流と選んだ選択肢のIDを品物の状態と一緒に保存します（共通条件管理システムの記録。[データ契約](../docs/07_DATA_AND_TESTS.md#共通条件管理システムの記録)）。そのため、公開した後は交流のIDと、品物を渡す・使う選択肢の `# option:` のIDを変えないでください。変えるとセーブが読み込めなくなります。

交流Inkは名前変数を宣言し、英語の選択を一度置きます（選択肢の数は自由。ふつうは3つ）。選択肢の英文はInkにだけ記述し、費用やアイテム操作がある場合は安定した `option` IDでカタログのルールと結び付けます。選択後の日本語の会話はどの枝も完走させ、効果や残高操作をInkに書きません。正誤のない返答と、正解がある任意の文化クイズを区別します。小さな観光クイズは既存の問題スキーマを使い、事実・伝承・創作を混同せず出典の該当箇所を確認してください。クイズの賞品と当落後のInk、アイテムの贈与・使用、既存報酬と共有するAPの条件はカタログで参照します。

交流Inkから以前の品物を参照する場合は `EXTERNAL has_item_status(id, status)` を宣言し、例えば `has_item_status("blue_pick", "gifted")` のように登録済みIDと `held`・`gifted`・`used` の固定文字列を使います。状態の変更はゲーム側だけが行います。この参照は現時点では道中交流のInkで使用できます。`npm run content:check` は重複ID、参照、選択肢と分岐、出典の形式、アイテム参照を検証します。既存の戦闘・デートInkを改稿した場合、過去の途中セーブを再開できなくなることがあります。

都市（`cities/<都市ID>.json`）の `id`、`countryCode`、`nameJa`、`themeJa`、`landmarkIdsPlanned`、`productionStatus` は都市と場所の識別、表示、予定と状態。`firstClearReward` は都市の初回クリア報酬の `rewardSourceId` と `ap` です（`ap` が正の場合、同じIDの `episode_clear` 報酬を一つの観光エピソードに設定します。0なら設定しません）。`progression/journey.json` の `episodes` は順路（各都市の最初のエピソードは前提なし）、`rewards` は一度限りの報酬です。各エピソードの `id`、`kind`、`cityId`、`landmarkId`、`battleId`、`requiredEpisodeIds`、`titleJa` / `descriptionJa` / `clearTitleJa` / `clearDescriptionJa` は識別・参照・順序・表示文。`titleJa` は、そのエピソードを初めて始めたときに場所の写真の上に大きく出る題名の札にもなり、`clearTitleJa` と `clearDescriptionJa` は、対決の結果のほか、セーブから再開したときの「前回までのあらすじ」（最後に終えたエピソード）、夜の「今日の見出し」（その日に終えたエピソードの `clearTitleJa`）、旅の終わりのエンドロールにも出ます（2026-11-11。`{player_name}`・`{heroine_name}` は名前に変わります）。エンドロールの「出会った人」は、`progression/story.json` の `people` の `nameJa` のうち、その人を `# person:` で挙げた場面を見た人です。都市フィナーレは `kind: "city_finale"`、`landmarkId: null` と `epilogueStoryId` を指定します。

報酬の `id`、`episodeId`、`trigger`、`ap`、`minScore`、`titleJa` は安定ID、対象、発生条件、付与量、得点条件、表示文です。`trigger` は `guide_read` / `battle_complete` / `battle_score` / `episode_clear` / `city_clear`（このほかに、ビルドが場面の札 `# ap: +N` から作る `scene_tag` がありますが、作者はこのJSONに書きません。書くと `content:build` が止まります）。`minScore` は `battle_score` のみ正の数、それ以外は `null`。AP上限や報酬IDの重複防止はゲームルール側で処理します。

報酬の対象は、通常の `episodeId` か、特殊戦の `battleId` のどちらか一方です。特殊戦の `episode_clear` はその対決を初めて終えたときで、観光エピソードの数や都市のクリアの条件は増やしません。ミラノの `firstClearReward`（`chapter_milano_first_clear`、4AP）は『最後の晩餐』の `episode_clear` の報酬で、都市クリアのIDとは別です。章末の短い地の文はこのJSON、人物の台詞はInkに置きます。

エピソードが地図に出る条件：`when` を書かないときは、`requiredEpisodeIds` のエピソードと、その都市の特殊戦をすべて終えたときです（ミラノのフィナーレは4観光地と2つの特殊戦、インドは各都市の4観光地）。エピソード・特殊戦・フィナーレには `when`（全部・どれか・いくつ以上。バトルの数・お金・品物・恋愛の値など。[条件の書き方](#条件の書き方)）も書けます。`when` を書くときは `requiredEpisodeIds` を空にします。バトル・デートの knot の頭に `# when:` を書くと、ビルドが同じ `when` に変えます（JSON と両方に書くと止まります）。実在しない5番目の観光地は作りません。

フィナーレの `epilogueStoryId` は都市ごとに書きます（ミラノはダルセナの場所のファイルの knot `places/milano_darsena.milano_epilogue`）。エピローグのInkには、名前・呼び方・`romance_stage`・`ending_reached` を渡します。デートの恋愛の効果（`# effect:`）は使いませんが、日本語の選択肢と効果の札（関係の値・お金・APなど）は書けます（ゲームが自分で始めるエピローグでは、お金やAPを減らす `on_done:` は書けません）。デートの間に決まった順序はなく、実際に遊んだものだけを思い出として引きます。都市クリアと交際の状態は別々に記録します。

都市は旅行編の `manifest.json` の `cities` に登録し、その旅行編フォルダに都市・移動・各カタログの項目を置きます。都市の追加手順と制約は [都市の追加手順](FUTURE_CITIES.md)、旅行編そのものを追加する手順は [技術設計](../docs/02_TECH_ARCHITECTURE.md#新しい編を追加する手順) を参照してください。

### 地点の紹介文

自由時間で行き先を選ぶと、下のカードに地点の紹介文が出ます。`travel/<都市ID>.json` の `places[]` に `descriptionJa`（日本語の短い文章。任意）として書きます。どんな場所か、いつ頃からあるか、何が見られ何ができるかといった一般的な観光案内にし、年号・数などの事実は出典で確かめられるものだけを書きます。そこで起きる物語やデートの出来事・人物は書きません（筋を先に明かさないため。出来事の一行の `descriptionJa` はこのカードに出ません）。書かない地点は紹介文の行が出ないだけで、`content:build` の注意にもなりません。自由時間の札の写真は、その場所の最初の観光地の写真か背景の写真です。別の写真にしたいとき（宿など）は、同じ地点に `photoAssetId`（同じ旅行編の `tourism/catalog.json` の観光画像のID。任意）を書きます。宿の札はこの欄の写真だけを出し、書かなければ色の札のままです。

### 自由時間の背景

自由時間の画面の後ろには、都市ごとに1枚の背景を敷けます（任意。なければ地図風の模様）。出典のある写真なら `cities/<都市ID>.json` の `backdropAssetId` に `tourism/catalog.json` の画像のIDを、作者が描いた絵なら `backdropImagePath` に配信時のパス（例 `assets/backdrops/delhi-free-time.webp`）を書きます（どちらか一方）。絵はその旅行編の `public/assets/` に置き、同じ旅行編の `presentation/own-artwork.json` に1枚ずつ登録します（自作の絵は出典の一覧に載りません）。画面は縦長なので、縦長の絵を1080×1920pxの枠に収めたWebPにすると軽く、画面いっぱいに切り抜いて少し暗くして表示します（[技術設計](../docs/02_TECH_ARCHITECTURE.md#画像の出典と自作の絵)）。

### 都市内の移動（乗り物）

- 乗り物は旅行編の `manifest.json` の `transportModes` に、徒歩のほかに2つまで宣言します（名前・移動中の文字・絵の種類。[技術設計](../docs/02_TECH_ARCHITECTURE.md#乗り物と交通判断台帳)）。経路の `mode` には宣言したIDを書きます。
- 経路の `transferNote` は、乗り物の名前の後に（ ）で出る短い補足です。路線の番号や、乗る・降りる場所を書きます（例「16番」「24番・ミッソーリから乗る」「近くの車道から乗る」）。40文字以内を目安にし、時刻表や料金の説明は書きません。
- 乗り物の経路には、ゲーム用の推定の印（`"estimation": "game_model"`）と、事実の出典（`documented_fact`。路線があること、料金の決まりなど）を付けます。所要時間や料金の計算式など、推定の根拠は `hypothesis` の出典として残します。画面の時間・料金は「ゲーム内の推定」と表示されます。その事実がその移動に届いているか（例：市内のオートの運賃は、約40km先へのオートの根拠にならない）は点検で見ます。届く資料がないときは、ほかの資料を事実として付けず、仮説の出典だけにします。事実の出典がない経路は `content:build` の注意に出ます。台帳の理由に、資料がないこと・仮の値であることを書きます。
- 台帳のある都市で徒歩の経路がない向き（歩けるか確かめられない橋、何時間も歩く遠い地点など）は `content:build` の注意に出ます（生成は止めません）。台帳の理由で徒歩と比べる組（「歩いて◯分で着く」）には、徒歩の経路を置きます。
- 都市ごとの交通判断台帳 `travel/<都市ID>-transit.json` に、地点の組と乗り物ごとに、使う（`available`）・使わない（`not_suitable`）・走っていない（`not_applicable`）・特定できず（`inconclusive`）を、確かめた日と日本語の理由とともに書きます。使わない判断は、その乗り物が現実にないという意味ではありません。理由にそう書き分けます。
- 借りる乗り物（`"rental": true`。例：貸し自転車）は、借りる場所と料金を `travel/<都市ID>-settings.json` の `rentals` に書きます。料金は滞在中の分の目安で、実際の1日あたりの料金と違うときは、出典の `claimJa` にゲーム用の値であることを書きます。借りなくても、すべての地点へ徒歩などで行けるようにします。
- 作者や制作者が現地で確かめたことを出典にするときは、`authoring/journeys/<旅行編ID>/research/` に確認メモ（確かめた人・時期・確かめたこと・確かめていないこと・ゲームでの扱い）を置き、そのメモを `documented_fact` として引きます。日付を記録していなければ月までを書き、日付を作りません。`checkedAt` はメモを書いた日にします（例：[ルアンパパーンの確認メモ](journeys/luang_prabang/research/field-check-2026-07/README.md)）。

### ツアー（決まった行程の日帰り）

- ツアーは旅行編の `tours/<ツアーID>.json` に1つずつ書きます（ツアーの段階2a。IDは `<頭>_tour_<場所>`、ファイル名も同じ。形と決まりは[技術設計](../docs/02_TECH_ARCHITECTURE.md#ツアー)）。例：インド編のアーグラの `tours/gt_agra_tour_fatehpur_sikri.json`。
- 行程（`steps`）は宿の9:00から順に進みます。移動（`kind: "leg"`）には、行き先の地点・分・演出の絵（`vehicle.kind`、例 `car`）と移動中の文字、ゲーム用の推定の印 `"estimation": "game_model"` と出典（移動時間の事実 `documented_fact` と、ゲームの値にした理由 `hypothesis`）を書きます。見学（`kind: "event"`）には、その都市の地図の出来事のID（ツアー専用の地点の観光地のエピソードか特殊戦）を書きます。最後は宿か、宿へ歩いて帰れる地点への移動で終えます。
- 販売（`offers`）は、Web予約（`web`）・窓口（`desk`。`placeIds` に売る地点）・紹介（`introduced`。`when` に、会った場面を書きます）ごとに書けます。**値段（`price`）はパーティ全員分で、入場料を含みます**（ツアーの見学では入場料を払いません）。出典には値段の元になった事実と、ゲームの値であることを書いた `hypothesis` を付けます。開けなかったページ・検索結果に出ただけの数字は出典にしません。公開中の旅行編に `<要調査>` などの仮の値を残すと `content:build` が止まります。
- ツアーでだけ行く地点には `"access": "tour"` を付け、同じ地点の徒歩（0分）のほかに経路を書きません（交通判断台帳にもその地点の判断を書きません）。地図の行き先には出ず、ツアーが連れて行きます。
- 行程の場面（ツアーの段階2b・3）は、ツアーIDの名前の場所のファイル `stories/places/<ツアーID>.ink` に knot で書きます（例：インド編の `stories/places/gt_agra_tour_fatehpur_sikri.ink`）。頭の札の `# at: tour <ツアーID> <行程ID>` で行程を指します。
  - 区間の語り（`# scene: tour_leg`）：移動の行程に1つまで。到着・エピローグと同じ画面で読みます（ログ・オート・速さ・窓を隠す・どこでもタップ）。選択肢と効果の札は書けません（`# priority:`・`# when:`・`# on_done:`・`# then:` なども書きません）。`cond("…")` と、`player` を含むどの話し手も使えます。読み終えると「ツアーを続ける」で次へ進みます。
  - 車の中の交流（`# scene: encounter`、`# title:`、`# priority: after leg`）：語りの後、着く前に流れます（語りのない区間では、出発の前の場面の後に）。区間に1つまで。英語の答えと `# translation:`、選択肢の札（`# rel:`・`# set:` など）を書けます。お金（選択肢・`# on_done:`）、得るAP、「また今度」（`# later`）、`# repeat: always` は書けません（ツアーの日に1回だけ流れ、代金に含みます）。
  - 行程の前後の会話・交流（`# scene: talk`・`encounter`、`# priority: -N`・`+N`）：区間なら出発の前（宿・前の見学地にいる）と着いた後、見学の行程なら訪問の前（観光地の訪問の負の数の場面より前）と後（結果の「ツアーを続ける」の後、訪問の正の数の場面より後）。
  - 流れる順：区間の負の数 → 語り → `after leg` → 動く（運賃なし。演出の車の絵）→ 区間の正の数 → 見学の行程の負の数 → 訪問 → 見学の行程の正の数 → 次の区間……。ツアーは一度しか遊べないので、行程の場面も一度きりです。土地の事実を言う語り・場面は、ほかの場面と同じく `scenes/catalog.json` に出典を書きます（言わないなら `# sources: none`）。
  - 背景は `# background:` に登録済みの背景を書きます。車の中や道の絵がなければ、共通の既定背景 `default_scene`（色だけの「旅の余白」）を書けます。
  - 自由散策（ツアーの段階2b の残り）はまだありません。
- `# then:` は、予約したツアーの朝の宿の場面（`# at: hotel` の起きた後、`# priority:` +N）では動かず、ツアーの見学の間（その訪問の場面・案内・対決の頭）と行程の場面（`# at: tour …`）では断られます（ツアーが続きます）。`content:build` はこれらを注意に出します。
- 時間枠の外に着く行程、21:00を過ぎる帰り、行けない窓口、出典の組み合わせは注意に出ます（生成は止めません）。値段は最後のバランス調整で旅の予算と合わせて決め直します（`tests/journeys/golden_triangle/budget.test.ts` が、旅の予算で都市の本筋に必要な額をまかなえるかを確かめます）。

### 夜の一言（任意）

夜の画面と一日の終わりの札には、その日に移った地点を点線でつないだ小さな地図（ゲームが出します）の下に、彼女の短い一言を出せます（2026-11-11）。`travel/<都市ID>.json` の最上位に `nightLinesJa`（日本語の文の配列）として書きます。その都市の1日目に1つ目、2日目に2つ目…と順に出し、最後の次は1つ目に戻ります。書かなければ一言は出ません。名前は `{player_name}`・`{heroine_name}` と書くと設定した名前になります（名前をそのまま書かない）。引用符（「」）は書いたとおりに出ます。関係の段階にかかわらず出るので、どの段階でも自然な一言にし、書く前に [キャラクターバイブル](../docs/09_HEROINE_CHARACTER_BIBLE.md) を読みます。例は見本の編の `travel/mihon.json`（架空）。

```json
"nightLinesJa": ["今日はたくさん歩いたね。足はくたくたなのに、まだ眠くないや"]
```

### 写真札を選んだときの彼女のひと言（任意）

自由時間で場所の写真札を選ぶと、下のカードの紹介文の下に、彼女の小さな顔と吹き出しで短いひと言を出せます（2026-11-11のユーザー判断）。`travel/<都市ID>.json` の `places[]` に `heroineLinesJa`（配列）として書きます。上から順に見て、今出せる最初の1つだけを出します。文字だけの行はいつでも、`{ "textJa": "…", "when": 条件 }` の行は条件を満たす間だけ出せます（書き方は[条件の書き方](#条件の書き方)）。そのため、条件つきの行を先に、いつでも出す行を最後に書きます。書かない場所や、どの行も出せない場所には何も出ません。名前は `{player_name}`・`{heroine_name}` と書きます。`content:build` は形と、条件が名前を挙げる物（観光地・デートなど）があるかを確かめ、ない物を挙げると止めます。夜の一言と同じく関係の段階にかかわらず出るので、どの段階でも自然な一言にし、書く前に [キャラクターバイブル](../docs/09_HEROINE_CHARACTER_BIBLE.md) を読みます。例は見本の編の `travel/mihon.json`（時計塔と朝市。架空）。

```json
"heroineLinesJa": [
  { "textJa": "針は三時のままなのに、理由を聞いたら、ちょっと違って見えるね", "when": { "landmarkVisited": "mihon_clock_tower" } },
  "ねえ、あの時計、ずっと三時で止まってるんだって。どうしてだろう？"
]
```

### 出会った人の帳面（任意）

⚙設定の「旅の記録」の下の「出会った人」に、旅で出会った人を都市ごと（旅の順）・出会った順に、名前と短い紹介で並べます（2026-11-11のユーザー判断）。人物は `progression/story.json` の `people` に `id`・`cityId`・`nameJa` と、任意の `descriptionJa`（名前の下に出る日本語の短い紹介。なければ `titleJa`）で宣言し、その人が出る場面の頭に `# person: <ID>` を書きます。道中交流・会話（`# scene: encounter`・`talk`）は最後まで見る（「また今度」で終えても）と（条件の `met` と同じ）、到着は過ぎると、案内・デート・エピローグは終えると、帳面に載ります。クイズの相手も、そのクイズを遊ぶと載ります（2026-11-13のユーザー判断）：立ち絵（`presentation/characters.json` の `battleCharacters`）か同じ都市の同じ名前で宣言した人はその人として、いなければクイズの `enemyNameJa` と `enemyTitleJa` で。同じ都市の同じ名前は1人です。関係の値は出しません。会える人もクイズもない旅行編には、この欄は出ません。ゲームの条件の `met` は、今までどおり道中交流・会話だけを見ます。紹介は出会った後に読まれるので、その時点で分かることだけを書き、先の筋を明かさないようにします。名前は `{player_name}`・`{heroine_name}` と書けます。例は見本の編の `progression/story.json`（リリとトーマ。架空）。

```json
{ "id": "smp_mihon_lili", "cityId": "mihon", "nameJa": "リリ", "descriptionJa": "時計塔の下で、針が三時を指す手描きのしおりを並べていた女の子。トーマの妹。" }
```

## 人物の絵と会話の背景

人物の絵は [`content/presentation/characters.json`](../content/presentation/characters.json) で登録します。人物ID `heroine` は、遊ぶ人が決める名前とは関係ありません。地域に属さない基本の衣装 `default_01` に、12の表情の透過画像を登録しています。旅行編の人物の絵は、その旅行編の `presentation/characters.json` に登録します（[旅行編の制作手順](JOURNEY_AUTHORING.md)）。

### 基本の衣装・表情の画像を足す

1. 背景を透過した全身のPNGかWebPを用意します。白背景の参照画像は正式な立ち絵とは別に管理し、拡張子だけを変えて登録しないでください。基本の衣装 `default_01` の `standing_01` は **1024×1536px** を共通のキャンバスにしています。同じ衣装・ポーズの差分は、人物の位置とキャンバスをそろえ、画像ごとに切り抜きません。配信するファイルは、見た目の変わらない可逆のWebPにすると軽くなります（今の12表情は可逆のWebPで、PNGの約4割の大きさ。元のPNGは配信しない `authoring/characters/heroine/default_01/standing_01/` にあります。可逆のWebPは、たとえば sharp の `.webp({ lossless: true, effort: 6 })` や `cwebp -lossless` で作れます）。
2. たとえば `public/assets/characters/heroine/default_01/standing_01/neutral.webp` に置き、`characters.json` の `heroine` → `costumes` → `default_01` → `poses` → `standing_01` の `expressions` に `"neutral": "assets/characters/heroine/default_01/standing_01/neutral.webp"` と登録します。パスは `public/` からの相対パスです。Dreamscape のために作った絵なので、同じパスを [`content/presentation/own-artwork.json`](../content/presentation/own-artwork.json) の立ち絵の `paths` にも1行足します（足さないと `npm run content:check` が「出典のない画像」で止まります。自作の絵は出典の一覧に載せません。[技術設計](../docs/02_TECH_ARCHITECTURE.md#画像の出典と自作の絵)）。
3. 表情IDは `neutral`、`smile`、`happy`、`shy`、`shy_deep`、`surprised`、`surprised_big`、`worried`、`serious`、`teasing`、`teasing_big`、`exasperated` です。差分が届いたら `expressions` に1枚ずつ足し、届いていないファイルは登録しません。`neutral` だけでもその衣装が使われ、登録のない表情は同じ衣装・ポーズの `neutral` が出ます。表情の指定には Ink の `# emotion:` を使います。
4. `npm run content:check` を実行します。登録したファイルがあること、実際の形式・寸法・透過の画素、表情や衣装の参照を確かめます。背景がきれいに切り抜けているか、透過の縁の質までは確かめないので、下のプレビューで目で確かめてください。衣装が届いていないときは基本の素材を使い、画像を読み込めなくても会話は続きます。

### 配置・衣装・表情の指定

- 人物の配置は人物ごとの `placement`、衣装・ポーズごとの補正は同じポーズの `placement` で書きます。`x`・`bottom`・`width`・`height`・`scale`・`originX`・`originY` を差分の間で共有し、画像をゆがめずに出します。`imagePath`、`variants`、相手の `battleCharacters` の設定も使えます。観察用の画像と座標は別に管理します。
- `heroine` の `defaultCostume` と `defaultPose` が、地域に属さない基本の衣装とポーズです。`wardrobe` の `cities`・`countries`・`regions` で、都市・国・地域ごとの標準の衣装を指定できます。今の `milano` → `IT` → `south_europe` → `south_europe_01` の設定は残していますが、南欧の衣装は届いていないので、今は基本の衣装を出します。優先の順は、`scenes`、都市、国、地域の標準の衣装、基本の衣装、仮の素材です。`scenes` のキーにはデートID・バトルID・観光地ID・都市エピローグのエピソードIDを使い、たとえば `"milano_cafe_01": { "costume": "south_europe_01", "pose": "standing_01" }` と書きます。届いていない衣装から、表情だけが別の衣装に切り替わることはありません。
- すでにある台詞に表情を付けるときは、各旅行編の `presentation/dialogue-expressions.json`（例：[ミラノ編](../content/journeys/milano/presentation/dialogue-expressions.json)）に `storyId`・`speaker`・`text`・`emotion` を書けます。名前などの変数を含まない Ink の原文の1行を、完全に一致させて登録します。台詞に `emotion` の札があればそちらを使い、同じ行に重ねて指定しません。`npm run content:check` は、登録した検証の文脈の分岐で、話者と台詞があるか、表情IDと札がぶつからないかを確かめます。脚本を変えたときは、検証していない分岐も含めて、表情と札の対応を編集者が確かめてください。表情の指定は見た目だけで、保存した会話の位置や関係の値は変えません。Ink そのものを書き直すと、途中のセーブの指紋が変わる点に気をつけてください。

### プレビュー

`npm run dev` を起動し、表示されたURLに `?character-preview` を付けて開きます。衣装・ポーズ・表情、明るい背景と暗い背景、台詞の枠を切り替え、基準線と見比べながら、差分の顔や足元、透過の縁を確かめられます。「全体を確認」と「ゲーム中の配置」を切り替えて、表示の範囲も確かめられます。まだ作っていない差分と、画像の読み込みの失敗は区別して出します。プレビューはゲームのセーブやAPに触れません。公開版では、Debugモードをオンにした端末でだけ開けます。

### 会話の背景・タイトルの絵・会話の窓

- 会話の背景の画像は、各旅行編の `romance/presentation.json`（例：[ミラノ編](../content/journeys/milano/romance/presentation.json)。共通の既定背景 `default_scene`「旅の余白」は [`content/romance/presentation.json`](../content/romance/presentation.json)）の各背景に、任意の `imagePath`（配信時の `assets/` 以下のパス）を足して差し替えます。画像の置き場所は[技術設計の「共通データと旅行編フォルダ」](../docs/02_TECH_ARCHITECTURE.md#共通データと旅行編フォルダ)にあります。登録がないときと読み込めないときは今の仮の背景を出し、観察用の画像には影響しません。
- **背景がどこか（任意、2026-11-13）**：`romance/presentation.json` の背景には、その絵の場所を書けます。地図の地点なら `placeId`（その旅行編の `travel/<都市ID>.json` の `places` の ID。宿なら、ほかの画面と同じく「滞在先のホテル」と出ます）、地図にない場所なら `placeJa`（例：`"placeJa": "ニューデリー駅"`）で、書くのはどちらか1つです。会話の場面がその背景を出している間、上の帯の場所の札は、今いる地点ではなくその場所を出します。場面が駅や宿の前の路地へ移るとき、フィナーレの途中で宿や別の地点へ行くときに、札が場面について行きます。書かない背景では、今までどおり今いる地点です。ツアーの車の中では区間の名前のまま、観光地の写真を出す場面（観光案内・観光地のクイズと道中交流）ではその観光地のままです。
  - 同じ写真を別の場所の代わりに使うときは、背景をもう1つ登録します（同じ `imageAssetId` に、その場所の `nameJa`・`captionJa` と場所）。例：インド編の3つの宿のロビー `gt_bg_delhi_hotel_hub`・`gt_bg_agra_hotel_hub`・`gt_bg_jaipur_hotel_hub`（同じロビーの写真 `gt_img_hotel_illustration` に、それぞれの都市の宿の `placeId`）。
  - 到着の場面も、ほかの場面と同じく、その旅行編のどの背景でも書けます（地図の地点の背景でなくてもかまいません）。
  - どの地図にもない地点・ほかの旅行編の地点の `placeId`、`placeId` と `placeJa` の両方を書いた背景は、`content:build` が止めます。
- タイトル画面の絵は、旅行編ごとに `manifest.json` の任意の `titleArt`（画像・説明・切り抜く位置）で指定します。ない旅行編は既定背景の色だけの場面を出します。勧める大きさ（1760×560px）と安全域は[技術設計の「既定背景とタイトルの絵」](../docs/02_TECH_ARCHITECTURE.md#既定背景とタイトルの絵)にあります。
- 会話の窓の色・透明度・角丸・余白・文字の大きさなどは、[`romance-scene.css`](../src/features/romance/romance-scene.css) の最初にある `--vn-*` でまとめて調整できます。
- 背景・人物・テーマ・窓の表示は、進行中の Ink やクイズの指紋を変えません。

## 確認と公開前レビュー

`npm ci` の後、1ファイルを編集中に確認する例です（見本のファイルで試せます）。形式の推測が難しい雛形や下書きは `--type` を指定します。対決は複数項目を含むカタログ形式なので `battle-catalog` です。

```sh
npm run content:inspect -- --type quiz authoring/templates/sample_trip/quizzes/smp_mihon_main_clock_tower_quiz.json
npm run content:inspect -- --type battle-catalog authoring/templates/sample_trip/battles/catalog.json
npm run content:inspect -- authoring/templates/sample_trip/stories/places/smp_mihon_hotel.ink
```

単体検証はJSONの構文・指定形式とInkのコンパイルを調べます。参照先、Inkタグ、分岐の全文脈は単体では検証しません。正式データの変更後に `npm run content:check` を実行すると、全コンテンツの構造・参照を検証し、ゲーム用のデータを生成します。生成ファイルを書き換えずに全体を確認したい場合は、代わりに `npm run content:inspect -- --all` を利用できます。`npm run test:saves` はコンテンツ生成後に保存関連の単体テスト（`src/persistence/`）を実行します。過去のセーブの更新後の再開を保証するものではありません。

普段は変更内容と影響範囲に応じて、必要な型検査・対象テスト・実画面確認を選びます。全単体テストと全E2Eを毎回実行する必要はありません。公開前や大きな変更時の全体確認は [開発時の確認](../docs/10_DEVELOPMENT_CHECKS.md) を参照してください。失敗したらエラーで示されたファイル、ID、フィールドを直して再実行します。Inkやクイズの途中再開は内容の指紋を使うため、改稿で読めなくなったデータを勝手に削除しないでください。

自動検証に加え、編集者が次を確認します。

- 事実と解釈・伝説が混ざっていないか、出典URLを実際に確認したか。
- 写真のライセンス・改変条件・クレジットが対象画像に合っているか。
- 英文が自然で、選択肢に唯一の正解があり、正解の長さや事前会話で答えが露見しないか。
- 敵の価値観が会話を通じて動き、ヒロインに自分の意思があるか。短く読みやすいか。
- スマートフォンで文章・画像・操作が読みやすいか。観察なしでも進めるか。
- 現在のゲームが使用するID・報酬・Ink・クイズ参照を壊していないか。過去の途中セーブが再開できなくなる場合は、読めないデータを安全に保護できるか。

検証は構造や参照の誤りを見つけますが、面白さ・史実・自然な英語・画像の権利を保証するものではありません。人間が書いた場合もAIが補助した場合も、同じ確認を行います。
