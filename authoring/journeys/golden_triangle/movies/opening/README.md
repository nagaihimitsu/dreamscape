# インド編のオープニングムービーの元

「旅をはじめる」を押したときに流れる15秒の動画（`content/journeys/golden_triangle/public/assets/movies/gt_opening.mp4`）を作った元のファイルです。ゲームはこのフォルダを読み込みません。

- 絵は描いていません。実物の写真と文字と地図を、コードで組み立てて動画にします。
- 紙の地図の上に、金色の線が デリー → アーグラ → ジャイプール と引かれます。都市ごとに写真をテープで貼り、スタンプを押します。線がデリーへ戻ると三角形が閉じ、旅の名前と題字「Dreamscape」が出て終わります。
- 2026-11-17に作った「試作2」を、そのままゲームに入れました（バイトまで同じファイル。sha256 `1007ae5ea70540d02f03dc184a015752aaf9466103b6edf72ece67c2299360aa`）。前の動画（KlingAI で作った10秒の動画）と入れ替えています。
- 旅の名前は「インド」（小さく）と「ゴールデントライアングル編」（大きく）の2行で、「・」は出していません。制作者が「これでよい」と決めました（2026-11-17）。

| 項目 | 値 |
|---|---|
| 大きさ | 720×1280（縦） |
| 長さ | ちょうど 15.000 秒（30コマ/秒 × 450コマ） |
| 映像 | H.264（High、レベル 3.1）、yuv420p、色は BT.709。キーフレームは最初の1枚だけ |
| 音 | AAC、128 kbit/s、48 kHz、ステレオ |
| 入れ物 | MP4（faststart） |
| ファイルの大きさ | 2,979,771 バイト（2.98 MB。画質 CRF 19.5。上限 2,990,000 バイト） |

## まだ決めていないこと

制作者が決めることです。決まるまでは今のままにしています（2026-11-17の点検で見つかったもの）。

1. **同じ出だしが2回続く。** ムービーの音楽は、デリー到着の場面の BGM（`presentation/music.json` の `"arrival": "gt_jalandhar"`）と同じ曲の頭15秒です。最後まで見ると、同じ出だしを続けて2回聞きます。案は3つです。(1) このままにする。(2) 同じ曲の別の15秒（曲の 153.31〜168.31 秒。点検の作業用のフォルダに候補の音がある）で、音だけ作り直す。(3) 最後まで見たときは、到着の曲を15秒目から流す（ゲームのコードを変える）。
2. **始めの約1.5秒、2つの曲が重なる。** 「旅をはじめる」を押すと、タイトルの曲が消えていく間に、ムービーの曲がもう鳴り始めます（前からの動き。`src/audio/scene-music.ts`）。気になるなら、ムービーに入るときだけタイトルの曲を短く（0.3秒ほどで）消します。実機で聞いて決めます。
3. **素材のライセンスでビルドを止めるか。** 今は、CC BY・CC0・パブリックドメインでない素材を `credits` に書くと、`content:build` は注意を出すだけで止まりません。AGENTS.md の第一原則では、ビルドを止めるのは、ゲームやセーブが壊れるものと、AGENTS.md に書いた決まりを破るものだけだからです。止めたいときは、その決まりを AGENTS.md に書いてから、`scripts/opening-movie.ts` を止める形に戻します。
4. **BGM のクレジットの文。** ムービーの音楽のクレジットは、曲のページの文のとおり「By Attribution 4.0 License」です。ゲームの BGM の出典（`presentation/music.json`）の同じ曲の文は「License」の語がありません。そろえるかどうかを決めます（どちらも作者・曲名・ライセンス・URL は入っています）。

## 作り直す

リポジトリのいちばん上で、次の1つの命令を実行します。

```
node authoring/journeys/golden_triangle/movies/opening/src/render.mjs
```

これだけで、次のことを順に行います。8分ほどかかります。

1. `src/index.html` を Playwright の Chromium で開く（720×1280、倍率1）。インターネットは使いません。
2. 時間を 1/30 秒ずつ進めて、450コマを `out/frames/f0000.png` 〜 `f0449.png` に保存する。
3. ffmpeg で `out/gt_opening.mp4` を作る。音楽は `music/segment.flac`。
4. 長さとファイルの大きさを表示する。

`out/` はこのフォルダの中にできます。Git には入りません（`.gitignore`）。できた動画を確かめてから、自分で `content/journeys/golden_triangle/public/assets/movies/gt_opening.mp4` に写します。写したら `npm run content:build` を実行します。

必要なもの：

- Node.js と、リポジトリの `npm install` で入る Playwright。Chromium は `npx playwright install chromium` で入ります（E2E テストと同じもの）。
- ffmpeg（libx264 と AAC が使えるもの）。
- 写真や文字を作り直すときだけ：Python 3 と Pillow（写真）、fontTools（文字）。

よく使う指定：

| 指定 | 意味 |
|---|---|
| `--frames-only` | コマだけ作る（動画にしない） |
| `--encode-only` | いまある `out/frames/` から動画だけ作る |
| `--from 80 --to 100` | そのコマだけ作り直す（確認用。動画は作らない） |
| `--shutter 0` | 動きのぶれを付けない（速い。確認用） |
| `--crf 19.5` | 最初に試す画質。ファイルが上限より大きいときは、0.5 ずつ数字を上げて作り直す |
| `--max-bytes 2990000` | ファイルの大きさの上限 |
| `--gain -5.8` | 音楽の大きさの調整（dB）。ゲームの音楽と同じ約 -20 LUFS にする |

### 同じ動画になるか（2026-11-17に確かめた）

このフォルダで上の命令を1回実行して、ゲームに入れた動画と比べました（作り直すのに 8 分 20 秒）。

| 比べたもの | 結果 |
|---|---|
| 長さ・大きさ・コマ | どちらも 15.000 秒、720×1280、30 コマ/秒、450 コマ |
| 音 | 同じ（ほどいた音のサンプルがすべて同じ） |
| コマ（PNG） | 450 コマのうち 324 コマは点まで同じ。残る 126 コマも、1 コマで 8/255 より違う点は多くて 44 点（92 万点のうち）。目では違いが分からない |
| 動画どうし（SSIM） | 平均 0.9970、いちばん低いコマで 0.9857（f267、ジャイプールのスタンプ。2つの動画をそれぞれ圧縮したための違い） |
| ファイルの大きさ | 2,979,322 バイト（ゲームの動画は 2,979,771 バイト）。バイトまでは同じにならない |

元の作業用のフォルダで同じ命令を実行したときも、同じくらいの違いでした（321 コマが点まで同じ、SSIM 平均 0.9969）。

違いの理由：Chromium は、写真を前のコマでどう描いたかによって、小さく描くときの点が少し変わります。命令を実行するたびにも、動きのあるコマが少しだけ変わります。ゲームに入れた動画は、全部のコマを作ったあと、最後の 78 コマ（f372〜f449）だけを `--from 372 --to 449 --frames-only` で作り直し、`--encode-only` で動画にしたものです。その 78 コマは、同じ指定で作り直すと点まで同じになりました。元のファイルは、ゲームの動画を作ったときのままです（直したところはありません）。

このフォルダに写したときに変えたのは、置き場所の名前だけです（コマの置き場所 `out/frames/`、動画の名前 `out/gt_opening.mp4`、同じ音のまま FLAC にした `music/segment.flac`）。

### 動画を見ないで確かめる

```
python3 -I authoring/journeys/golden_triangle/movies/opening/src/tools/contact_sheets.py
```

`out/sheets/` に、コマを並べた一覧の画像を作ります（0.5 秒ごと、出だし、都市ごと、題字のところ、連続するコマ、スマホの大きさ、スキップボタンの場所の枠つき、完成した4つのページ）。

### ブラウザで見る

`src/index.html` をブラウザで開くと、再生ボタンとつまみで動きを確かめられます（音楽つき）。見るためだけのもので、コマを作るときには使いません。

## 変えるとき

絵は時刻だけで決まります。タイマー、CSS のアニメーション、毎回変わる乱数は使っていません。変えたら、上の命令で作り直し、コマの一覧で確かめます。

| 変えたいもの | 書く場所 |
|---|---|
| できごとの時間（写真を貼る、スタンプ、線が動く、題字） | `src/js/timeline.js` の先頭の `SCHED`。8分音符（0.37 秒）に合わせ、いちばん近いコマに置いている |
| 写真の場所・大きさ・傾き | `src/js/timeline.js` |
| 題字の場所・大きさ | `src/js/movie.js` の `TITLE` |
| 画面に出る文字 | `src/js/movie.js`。文字の形は `src/js/glyphs.js` にあり、新しい字を足すときは `src/tools/make_glyphs.py` で作り直す（下の「フォント」のファイルが要る） |
| スタンプの文字 | `src/js/stamp.js`。`src/fonts/` のフォントで描く |
| 写真を替える・切り抜きを変える | `src/tools/prepare_photos.py` の表（写真・切り抜く範囲・大きさ）。元の写真を `photos/new/`（Commons の 1920px 版。`sources.json` の `downloadUrl`）と `photos/game/`（ゲームの `content/journeys/golden_triangle/public/assets/tourism/india/` の WebP）に置いてから実行する。結果は `src/photos/` と `src/photos/crops.json` |
| 音楽の切り方 | `music/segment.flac` を作り直す（ゲームの `gt_jalandhar.mp3` の頭から 15.0 秒、48 kHz、+7.15 dB、終わりの 1.2 秒を小さくして消す）。ffmpeg で読める音なら、`render.mjs` の `MUSIC` を変えてもよい |

写真・音楽・フォントを足したり替えたりしたら、`sources.json` と、ゲームの出典 `content/journeys/golden_triangle/manifest.json` の `openingMovie.credits` を直します。素材は、自作・CC0・パブリックドメイン・CC BY のものを使います。ほかのライセンス（CC BY-SA・NC・ND、GFDL、分からないものなど）を `credits` に書くと、`content:build` が注意を出します（止まりはしません）。

## フォルダの中身

| 場所 | 中身 |
|---|---|
| `README.md` | この説明 |
| `sources.json` | 使った素材の記録（写真・音楽・フォントの出典、作者、ライセンス、確かめた日と根拠、変えたところ、切り抜いた範囲、ファイルの sha256） |
| `music/segment.flac` | 動画の音楽（15.0 秒、48 kHz、ステレオ、16 bit）。動画を作ったときの WAV と同じ音を、そのまま FLAC にした（1.4 MB） |
| `src/index.html` | 720×1280 の舞台。`window.renderAt(秒)` で、その時刻の絵になる |
| `src/render.mjs` | 動画を作る命令 |
| `src/css/movie.css` | 見た目とフォントの読み込み |
| `src/js/timeline.js` | 時間の表、地図の計算、カメラ、写真やスタンプの動き（計算だけ） |
| `src/js/movie.js` | 舞台を組み立てて、`renderAt` で全部の位置を決める |
| `src/js/paper.js` | 地図の紙（決まった種の乱数で描くむらと折り目） |
| `src/js/stamp.js` | スタンプの絵（かすれは決まった種の乱数） |
| `src/js/type.js`、`src/js/glyphs.js` | 文字を輪郭で描くしくみと、使う文字の輪郭（フォントから写したもの。OFL） |
| `src/js/preview.js` | ブラウザで見るための再生ボタン |
| `src/photos/` | 動画で使う写真8枚（切り抜いて、画面でいちばん大きく出る大きさの約2倍にしたもの）と、切り抜きの記録 `crops.json` |
| `src/fonts/` | スタンプを描くフォント2つと、4書体のライセンス文（`OFL-*.txt`） |
| `src/tools/prepare_photos.py` | 写真を切り抜いて `src/photos/` に入れる |
| `src/tools/make_glyphs.py` | フォントから文字の輪郭を取り出して `src/js/glyphs.js` を作る |
| `src/tools/contact_sheets.py` | コマの一覧の画像を作る |
| `.gitignore` | `out/`（作ったコマと動画）と `photos/`（元の写真）を Git に入れない |

このフォルダの大きさは 4.7 MB です（写真 1.5 MB、フォント 1.6 MB、音楽 1.4 MB）。

## 使った素材とライセンス

くわしい記録は `sources.json` にあります。2026-11-17に、写真8枚の Wikimedia Commons のページと、音楽の incompetech のライセンスのページを開き直して、作者とライセンスを確かめました。動画の中には出典の文字を出していません。ゲームの「出典・権利の一覧」の「オープニングムービー」に出します（`manifest.json` の `openingMovie.credits`）。

### 写真（8枚）

| 写真 | 撮影者 | ライセンス | 入手元 | 変えたところ |
|---|---|---|---|---|
| インド門 | Quintin Soloviev | CC BY 4.0 | [Commons](https://commons.wikimedia.org/wiki/File:India_Gate_(All_India_War_Memorial).jpg) | 切り抜き、968×1085px に縮小、Display P3 から sRGB に変換 |
| レッド・フォートのラホール門 | Vyacheslav Argenberg | CC BY 4.0 | [Commons](https://commons.wikimedia.org/wiki/File:Delhi,_India,_Red_Fort_Facade.jpg) | 切り抜き、620×310px に縮小 |
| クトゥブ・ミナール | Raghith | CC0 1.0 | [Commons](https://commons.wikimedia.org/wiki/File:The_Qutb_Minar_in_morning.jpg) | 切り抜き、364×650px に縮小 |
| アーチ越しのタージ・マハル | Philip Nalangan | CC BY 4.0 | [Commons](https://commons.wikimedia.org/wiki/File:Taj_Mahal_Agra_India_2025_06.jpg) | 切り抜き、916×1145px に縮小 |
| アーグラ城の象眼細工（ゲームの写真） | Biswarup Ganguly | CC BY 3.0（GFDL との選択。CC BY 3.0 を使う） | [Commons](https://commons.wikimedia.org/wiki/File:Pietra_Dura_-_Pillar_-_Musamman_Burj_-_Agra_Fort_-_Agra_2014-05-14_4143.JPG) | ゲームの写真をさらに切り抜き、352×440px に縮小 |
| 夜のハワー・マハル（ゲームの写真） | Ninara | CC BY 2.0 | [Commons](https://commons.wikimedia.org/wiki/File:Hawa_Mahal_by_night.jpg) | ゲームの写真をさらに切り抜き（794×992px。縮小はしていない） |
| 丘の上のアンベール城 | Dudva | CC0 1.0 | [Commons](https://commons.wikimedia.org/wiki/File:Amber_Fort_in_Jaipur_2.jpg) | 切り抜き、620×310px に縮小、Display P3 から sRGB に変換 |
| シティ・パレスの孔雀の門 | Ninara | CC BY 2.0 | [Commons](https://commons.wikimedia.org/wiki/File:City_Palace_(Jaipur)_-_Peacock_Gate.jpg) | 切り抜き、352×440px に縮小 |

- 写真にしたのは、切り抜き、縮小、色の形式の変換（2枚だけ）です。色の調整、修整、描き足しはしていません。動画の中では、白いふち・描いたテープ・影を付けて、傾けて地図に貼り、動かしています。主役の3枚（インド門・タージ・マハル・ハワー・マハル）は、下の余白に手書き風の名前を入れています。
- 撮影者が求めていること：レッド・フォートは、ページのライセンスの欄に「Attribution: © Vyacheslav Argenberg」とあるので、© を付けます。タージ・マハルは「撮影者 Philip Nalangan の名前を、見えて読める大きさで出す」ことを求めています。
- 知らない人の顔が大きく写らないように切り抜いています（インド門は下の 17% を使っていません。クトゥブ・ミナールは下の 8% を使っていません）。インド門のアーチの向こうには、2022 年にできた像が小さく写っています（公共の場所にずっと置かれている像です）。

### 音楽（1曲）

| 曲 | 作者 | ライセンス | 入手元 | 変えたところ |
|---|---|---|---|---|
| "Jalandhar" | Kevin MacLeod（incompetech.com） | CC BY 4.0 | [incompetech](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1400018)（ゲームの `gt_jalandhar.mp3` と同じ曲） | 頭から 15.0 秒を切り出し、48 kHz に変換、終わりの 1.2 秒を小さくして消した。動画にするとき、ゲームの音楽と同じ大きさ（約 -20 LUFS）にそろえ、AAC にした |

クレジットの文：`"Jalandhar" Kevin MacLeod (incompetech.com) Licensed under Creative Commons: By Attribution 4.0 License http://creativecommons.org/licenses/by/4.0/`

曲のページ（`index.html?isrc=USUAN1400018`）の「Attribution Code」の3行を、そのまま1行につないだものです（2026-11-17に確かめた）。incompetech の FAQ の例は少し違います（「License」の語がなく、URL が https）。ゲームの BGM の出典（`presentation/music.json`）の同じ曲の文は、「License」の語がない書き方のままです。

音は音楽だけです。写真を貼る音やスタンプの音は入れていません。

### フォント（4書体、6ファイル）

どれも SIL Open Font License 1.1 です。ファイルは npm の `@fontsource` のパッケージ（Google Fonts と同じもの）から取り、変えていません。動画に入るのは文字の絵だけなので、ゲームの「出典・権利の一覧」には載せません。

| 書体 | 太さ | 使うところ | ファイル | 入手元 | このフォルダに |
|---|---|---|---|---|---|
| Gelasio | 500 | 題字「Dreamscape」 | `gelasio-latin-500-normal.woff2` | `@fontsource/gelasio@5.3.0` | ない |
| Noto Serif JP | 700 | 旅の名前、地図の都市名と名前、スタンプのカタカナ | `noto-serif-jp-japanese-700-normal.woff2` | `@fontsource/noto-serif-jp@5.3.1` | ある（スタンプに要る） |
| Noto Sans JP | 700 | 地図の「NORTH INDIA」と「N」、スタンプの英字 | `noto-sans-jp-latin-700-normal.woff2` | `@fontsource/noto-sans-jp@5.3.1` | ある（スタンプに要る） |
| Noto Sans JP | 500 | 緯度・経度の数字、距離、縮尺 | `noto-sans-jp-latin-500-normal.woff2` | `@fontsource/noto-sans-jp@5.3.1` | ない |
| Noto Sans JP | 500 | 副題「旅の余白」 | `noto-sans-jp-japanese-500-normal.woff2` | `@fontsource/noto-sans-jp@5.3.1` | ない |
| Klee One | 600 | 写真の下の手書き風の名前 | `klee-one-japanese-600-normal.woff2` | `@fontsource/klee-one@5.3.1` | ない |

- 動画を作るのに要るのは、スタンプを描く2つのファイルだけです。ほかの文字は、フォントから写した輪郭（`src/js/glyphs.js`）で描きます。
- 「ない」と書いたファイルは、`make_glyphs.py` で文字を足すときだけ要ります。上の版の npm のパッケージの `files/` にある同じ名前のファイルを `src/fonts/` に置きます（例：`npm pack @fontsource/gelasio@5.3.0` でパッケージを取り出す）。各ファイルの sha256 は `sources.json` にあります。
- `src/js/glyphs.js` はフォントから作ったものなので、OFL のままです。著作権表示はそのファイルの先頭に、ライセンス文は `src/fonts/OFL-*.txt` にあります。

### 地図

3つの都市は、本当の緯度・経度から位置を決めています（北が上。平均の緯度で横幅を縮める正距円筒図法）。辺のそばの距離（178 km・222 km・235 km）は、緯度・経度から計算した大圏距離です。国境・海岸線・道路・地図タイルは使っていません。紙のむらと折り目も、コードで作った模様です。
