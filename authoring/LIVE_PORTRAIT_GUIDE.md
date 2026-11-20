# 動く立ち絵の作り方

立ち絵を動かす（呼吸・まばたき・髪の揺れ・表情・声に合わせた口）ための手順です。読む人は、制作者と、作業をする AI の会話です。今は基本の衣装 `default_01` の `standing_01` に付いています。顔（表情・まばたき・口）は全衣装で共通にしてあり、頭が同じ衣装は、衣装の絵1枚から作れます（2026-11-20）。なぜこの形になったか（試したこと・やめたこと）は [動く立ち絵の試作](LIVE_PORTRAIT_TRIAL.md) にあります。

## 目次

- [1. 仕組み](#1-仕組み)
- [2. 表情を足すとき](#2-表情を足すとき)
- [3. 衣装を足すとき（顔は共通）](#3-衣装を足すとき顔は共通)
  - [頭の違う衣装（髪を残す）](#頭の違う衣装髪を残す)
- [4. 新しい人物・顔の違う衣装に作るとき](#4-新しい人物顔の違う衣装に作るとき)
- [5. ゲームに入れる](#5-ゲームに入れる)
- [6. 動かす部品を作り直すとき](#6-動かす部品を作り直すとき)
- [7. 確かめること](#7-確かめること)

## 1. 仕組み

- 動く立ち絵は、[Mesh Avatar Studio](https://github.com/shinshin86/mesh-avatar-studio)（MIT）の形式です。`characters.json` の衣装・ポーズに書きます（[コンテンツ制作ガイド](CONTENT_GUIDE.md#動く立ち絵)）。
  - `"avatar": "assets/characters/heroine/<衣装>/standing_01/avatar/"`：**衣装ごとのフォルダ**。その衣装の元の絵を動かすための層と骨組み。
  - `"avatarFace": "assets/characters/heroine/face/standing_01/"`：**全衣装で共通の顔のフォルダ**。表情・まばたき・口の差分。頭（顔・髪・帽子）を同じに描いた衣装は、みなここを使います。書かないと、衣装のフォルダの `built/sprites/` を使います（頭の違う衣装）。
- 衣装のフォルダの中身：

  | ファイル | 中身 |
  |---|---|
  | `avatar.json`・`rig.json` | 名前と、骨組み（頭・目・口・髪の毛束・身体の位置）。頭が同じ衣装は基本の衣装と同じ |
  | `built/base.png`・`hairmask.png`・`layers.json`・`eye*.png` | その衣装の元の絵（`neutral`）を動かすための層 |

- 共通の顔のフォルダの中身：

  | ファイル | 中身 |
  |---|---|
  | `sprites.json` | 差分の一覧と位置 |
  | `face_<表情ID>.png` | **表情ごとの顔**。表情の絵から顔（あごより上、髪を除く）を切り出したもの。`neutral` は元の顔なので要らない |
  | `mouthopen_<表情ID>.png` | 口を開けた絵の表情が、話すときに開く口（普段は顔に描き込んだ閉じた口） |
  | `mouthrest_<表情ID>.png` | 口を閉じた絵の表情の、その表情の閉じた口。口を閉じている間だけ出す（顔のほうは、話す口に合う通常の口を描き込む） |
  | `mouth_<a/u/o>__<表情ID>.png` | 口を閉じた絵の表情が話すときの口（頬の赤みを掛けたもの） |
  | `eyes_closed_<0/1>__<表情ID>.png` | 表情ごとのまばたきの閉じ目（頬の赤みを残す） |
  | `eyes_closed_*`・`eyes_half_*`・`mouth_a`・`mouth_u`・`mouth_o` | 作者が描いたまばたきと口（[`blink-mouth-sheet.png`](characters/heroine/default_01/mesh_avatar/blink-mouth-sheet.png)） |

- `# emotion:` の表情IDが、そのまま `face_<表情ID>` を選びます。**顔のない表情は、元の顔（`neutral`）のまま動きます**（表情の静止画には切り替わりません）。
- 表情の静止画（`expressions` の WebP）は、動かせないとき（「演出を短縮する」・端末の動きを減らす設定・WebGL がない・読み込めない）と、読み込みが終わるまでに出ます。顔の丸枠とミニゲームの全身の絵も静止画です。
- 作業用のスクリプトと素材は [`characters/heroine/default_01/mesh_avatar/`](characters/heroine/default_01/mesh_avatar/) にあります。

## 2. 表情を足すとき

表情の絵（`expressions`）を足すときは、**同じポーズの動く立ち絵に `face_<表情ID>.png` も必ず足します**。足さないと、動く立ち絵ではその表情が出ず、元の顔のまま話します。顔は全衣装で共通なので、表情の絵は基本の衣装 `default_01` で描いてもらい、ほかの衣装の静止画は 6. で作ります。

1. いつもどおり表情の絵を足します（元の絵 `authoring/characters/…/<表情ID>.png`、配信用の WebP、`expressions`・`own-artwork.json` への登録。[コンテンツ制作ガイド](CONTENT_GUIDE.md#基本の衣装表情の画像を足す)）。
2. その表情の絵の口が開いているなら、[`cut-faces.py`](characters/heroine/default_01/mesh_avatar/cut-faces.py) の `CLOSED` に、普段の閉じた口に使う絵を足します（明るい表情は `source.png`、驚きは `serious.png` など）。口を閉じた絵なら何もしません（その口は閉じている間だけ出し、話すときは「あ・う・お」の口になります）。口がとても大きい・横に広い（舌や口角の線が口から離れている）なら `WIDE` にも足します。足りないと、話すときにその表情の口の端が残って見えます（teasing の舌で起きた）。足したら、12表情すべての「閉じた口・あ・う・お」を並べて見ます（[7.](#7-確かめること)）。
3. Mesh Avatar Studio の作業フォルダ `projects/<名前>/`（基本の衣装で [4.](#4-新しい人物顔の違う衣装に作るとき) を行ったもの。なければ4.の1〜8をやり直す）で、次を順に実行します。`<表情の絵>` は `authoring/characters/heroine/default_01/standing_01` のような、表情の元の絵のフォルダです。表情の一覧は、そのフォルダの `neutral` 以外の PNG から自動で作ります。

   ```sh
   uv run --with pillow --with numpy --with opencv-python-headless python <mesh_avatar>/cut-faces.py <表情の絵>
   uv run --with pillow --with numpy --with opencv-python-headless python <mesh_avatar>/cut-closed-eyes.py <表情の絵>
   ```

4. できた `built/sprites/` の新しいファイル（`face_<表情ID>.png`、`eyes_closed_0__<表情ID>.png`・`eyes_closed_1__<表情ID>.png`、口が開いた表情は `mouthopen_<表情ID>.png`、口を閉じた表情は `mouthrest_<表情ID>.png` と `mouth_a__<表情ID>.png`・`mouth_u__…`・`mouth_o__…`）と `sprites.json` を、共通の顔のフォルダ `public/assets/characters/heroine/face/standing_01/` に写し、新しい PNG を `own-artwork.json` の動く立ち絵の `paths` に1行ずつ足します。
5. 顔を共通にしているほかの衣装にも、その表情の静止画を作ります：衣装ごとに [3.](#3-衣装を足すとき顔は共通) の2.（`new-costume.py`）をもう一度実行し、新しい表情の WebP を作って `expressions` に足します。
6. [7. 確かめること](#7-確かめること) をします。

## 3. 衣装を足すとき（顔は共通）

頭（顔・髪・帽子）を基本の衣装 `default_01` と同じに描いた衣装は、**衣装の絵1枚**から、動く立ち絵と12表情の静止画を作れます。帽子・髪型・耳飾りが違っても顔（目・鼻・口・輪郭）の位置が同じなら、[頭の違う衣装（髪を残す）](#頭の違う衣装髪を残す)で、やはり絵1枚から作れます。顔の向きや大きさが違う衣装は [4.](#4-新しい人物顔の違う衣装に作るとき) です。

1. **衣装の絵を描いてもらう**：基本の衣装の `neutral` と同じ 1024×1536、同じポーズ・位置で、服だけを変えた絵（透過の PNG）を1枚。顔・髪・帽子は描き直さないように頼みます（描き直されても、2.で基本の衣装の頭に置き換えます）。
2. **頭をそろえ、静止画を作る**：リポジトリの直下で次を実行します。

   ```sh
   uv run --with pillow --with numpy --with opencv-python-headless python \
     authoring/characters/heroine/default_01/mesh_avatar/new-costume.py <衣装の絵.png> \
     --out authoring/characters/heroine/<衣装>/standing_01
   ```

   - [`new-costume.py`](characters/heroine/default_01/mesh_avatar/new-costume.py) は、衣装の絵に基本の衣装の頭（あごより上と、髪）を重ねた `neutral.png` と、共通の顔を重ねた表情の絵（`<表情ID>.png`、11枚）を書きます。
   - 表示される「head: mean difference」が大きいとき（0 から遠いとき）は、衣装の絵の頭が基本の衣装とずれています。ポーズや位置が同じか確かめます（そのまま置き換えるので、首まわりがつながっているかを目で見ます）。
3. **静止画を配信用にする**：`npm run images:optimize -- --write` で WebP を作り、`characters.json` に衣装 `<衣装>` の `standing_01` を足して `expressions` に12枚を登録し、`own-artwork.json` にも書きます（[コンテンツ制作ガイド](CONTENT_GUIDE.md#基本の衣装表情の画像を足す)）。`canvas` と `placement` は基本の衣装と同じにします。
4. **層を作る**：Mesh Avatar Studio で `uv run tools/new-project.py authoring/characters/heroine/<衣装>/standing_01/neutral.png <衣装>`、`rig.draft.json` を基本の衣装の [`rig.draft.json`](characters/heroine/default_01/mesh_avatar/rig.draft.json) で置き換え、`tools/build-layers.py projects/<衣装> --rig rig.draft.json` を実行します。頭が同じなら、骨組みは基本の衣装と同じになります。
   - 裾の位置やスカートの長さが大きく違うときだけ、`body`（`hip.band`・`breathBand`・`rollBand`）を直してから作ります。
5. **ゲームに入れる**：`projects/<衣装>/` の `avatar.json`・`rig.json`・`built/`（`sprites/` はない）を `public/assets/characters/heroine/<衣装>/standing_01/avatar/` に写し、PNG を `own-artwork.json` に書き、`characters.json` の衣装・ポーズに `"avatar": "assets/characters/heroine/<衣装>/standing_01/avatar/"` と `"avatarFace": "assets/characters/heroine/face/standing_01/"` を足します。
6. [7. 確かめること](#7-確かめること) をします。動く立ち絵の大きさは衣装1つで約0.8MB（主に `base.png`）です。

### 頭の違う衣装（髪を残す）

帽子がない・髪型が違う・耳飾りがある衣装（例：サリー `saree_01`、2026-11-20）。衣装の絵の髪と耳飾りは残し、顔（目・眉・口・頬）だけを基本の衣装の顔にそろえます。共通の顔の差分はその衣装の髪を塗りつぶすので、衣装の髪を切り抜いた写しを衣装のフォルダに持ちます（`avatarFace` は書かない）。

1. **衣装の絵**：基本の衣装と同じポーズで、顔の位置・大きさが同じ絵（背景が透明の PNG。大きさは少し違ってよい）。透ける布の所も、背景を抜いた絵を作者に用意してもらいます（白い背景から私たちが抜くと、透けた所が粗くなる）。
2. **顔の位置をそろえる**：`new-costume.py <衣装の絵.png> --out <作業用のフォルダ> --align --align-only` で、顔を基本の衣装に合わせて 1024×1536 にした `aligned.png` を作ります。表示される大きさ・回転・ずれが大きいとき（大きさ 0.97〜1.03、回転 1度、ずれ 10px を超えるとき）は、ポーズや顔が違う絵なので [4.](#4-新しい人物顔の違う衣装に作るとき) にします。
3. **衣装の髪を調べる**：Mesh Avatar Studio で `aligned.png` の作業フォルダを作り、`rig.draft.json` を基本の衣装のもので置き換えて `tools/build-layers.py` を1回実行し、`built/hairmask.png`（衣装の髪）を別の場所に写します。帽子がない分の頭の上の髪も入っているかを、重ねて見ます。
4. **顔をそろえ、静止画と顔の差分を作る**：

   ```sh
   uv run --with pillow --with numpy --with opencv-python-headless python \
     authoring/characters/heroine/default_01/mesh_avatar/new-costume.py <作業用>/aligned.png \
     --out authoring/characters/heroine/<衣装>/standing_01 \
     --keep-hair <写した hairmask.png> --sprites-out <作業用>/sprites
   ```

   - `neutral.png`：衣装の絵に、基本の衣装の顔を、どちらの絵でも髪でない所だけ重ねたもの（耳飾りは避ける）。
   - `<表情ID>.png`：12表情の静止画。顔の差分は、衣装の髪と耳飾りを切り抜いて重ねる。
   - `<作業用>/sprites/`：衣装の髪を切り抜いた顔の差分一式。
   - 目のまわりの金色（瞳）は耳飾りと見なさない（2026-11-20、喜びの閉じ目から瞳がのぞいた）。
5. **層を作り直す**：作業フォルダの `source.png` を `neutral.png` で置き換えて `tools/build-layers.py` をもう一度実行し、`built/sprites/` を `<作業用>/sprites/` で置き換えます。骨組みは基本の衣装と同じになります。
6. **ゲームに入れる**：[3.](#3-衣装を足すとき顔は共通) の3.・5.と同じ。ただし `built/sprites/` も写し、`avatarFace` は書きません。元の衣装の絵は `authoring/characters/heroine/<衣装>/mesh_avatar/outfit.png` に残します。
7. [7. 確かめること](#7-確かめること)。とくに前髪・眉・耳飾りのまわりに継ぎ目がないか、12表情とまばたきを並べて見ます。大きさは衣装の絵しだいで、サリーは動く立ち絵が約2.7MB（`base.png` 約1.5MB、顔の差分の写し約0.7MB）、静止画が12枚で約1.8MB。

## 4. 新しい人物・顔の違う衣装に作るとき

道具の準備：Node.js 22.17 以上、Python と [uv](https://docs.astral.sh/uv/)。Mesh Avatar Studio を手元に持ってきて `npm install`、（Mesh Avatar Studio の側で）`npm run doctor` で足りない物を確かめます。以下の `npm run …` と `tools/…` は、どれも Mesh Avatar Studio の側のコマンドです（このリポジトリの `package.json` にはありません）。手順の元は向こうの [agent-guide](https://github.com/shinshin86/mesh-avatar-studio/blob/main/docs/agent-guide.md) です。ここでは、この作品でのやり方だけを書きます。

1. **元の絵**：その衣装・ポーズの `neutral` の元の絵（可逆の PNG。配信用の WebP ではなく）で、`uv run tools/new-project.py <neutral.png> <名前>` を実行します。全身の絵のままで構いません。
2. **骨組み**：`rig.draft.json` に、頭・顔の部品・目の輪郭・口・頬・髪の毛束・身体を、拡大した方眼（`tools/grid.py --region …`）で読んで書きます。ヒロインの下書き [`rig.draft.json`](characters/heroine/default_01/mesh_avatar/rig.draft.json) が見本です。この作品の絵で気をつけること：
   - 全身の絵なので、`view.padTop` は胸から上の絵の値（-0.07）のままにしない（ゲームでは 0 で読みます）。`body.pivotY` は足もと。
   - 首から下は一体で動かす（2026-11-19。胸から上の絵向けの初めの値では、左右の揺れで胸のまわりだけが大きくずれ、足もとも滑り、足もとを支点に傾く動きでドレスがしなっていた）：`body.hip` を `{ "shift": 9, "band": [<腰より下>, <足もと>] }`（左右の揺れを腰から上で一体にし、足もとへ消す）、`body.rollBand` を足もとの近く（`[1380, 1500]`。全身が1枚のまま傾く）、`body.maxRoll` は 0.012、`head.weightBand` は首から鎖骨まで少し広め（`[268, 345]`）。
   - 外側の明るい茶色の毛先は、毛束の線をその上にも引かないと髪のマスクに入らない。
   - 目の周り（`roi`）は、前髪にかからないよう、まつ毛のすぐ外にとどめる。
3. **確かめる**：`npm run validate-rig`、`tools/overlay.py` で重ねて見て直します。
4. **層を作る**：`tools/build-layers.py`、`npm run render-poses` で、顔の向きや髪の揺れが崩れないか見ます。
5. **まばたきと口の絵を描いてもらう**：作者に、元の絵柄で6コマの絵を描いてもらいます（[見本](characters/heroine/default_01/mesh_avatar/blink-mouth-sheet.png)）。並びは上の段が「通常の顔・まばたき（閉じ）・まばたき（半目）」、下の段が「あ・う・お」。胸から上で構いません。位置は後で合わせるので、元の絵と同じ大きさでなくてよい。画像生成で描くと前髪が消えたり絵柄が変わったりしたので、作者の絵を使います。
6. **位置を合わせる**：`tools/variant-requests.py` で差分のマスクを作ってから、[`register-sheet.py`](characters/heroine/default_01/mesh_avatar/register-sheet.py) `<neutral.png> <6コマの絵>` で各コマを元の絵に合わせます。コマの境目（`X`・`Y`）は絵に合わせて直します。
7. **差分にする**：[`sheet-to-variants.py`](characters/heroine/default_01/mesh_avatar/sheet-to-variants.py) `projects/<名前>` で、閉じ目・半目・「あ」「う」「お」を `variants/` に入れます。「う」は向こうの道具が知らないので、`variants/mouth_u.png` を `work/mouth_u_full.png` に移してから `tools/build-sprites.py` を実行し、[`cut-mouth-u.py`](characters/heroine/default_01/mesh_avatar/cut-mouth-u.py) で切り出します。
8. **表情の顔を切り出す**：[2.](#2-表情を足すとき)の3.と同じく `cut-faces.py`、`cut-closed-eyes.py` を実行します。顔の範囲とあごの線（[`face-geometry.json`](characters/heroine/default_01/mesh_avatar/face-geometry.json)。`new-costume.py` も使う）と、口の範囲（`cut-faces.py` の `zone`）は、ヒロインの全身の絵の座標なので、ほかの絵では方眼で読み直します。
   - `build-sprites.py` は `built/sprites/` を作り直し、顔の差分も消えます。順番はいつも 7.→8. です。

## 5. ゲームに入れる

1. `projects/<名前>/` の `avatar.json`・`rig.json`・`built/` の層（`layers.json`・層の PNG）を、`public/assets/characters/<人物>/<衣装>/<ポーズ>/avatar/` に写します（`source.png`・`work/`・`review/` は写さない）。顔の差分（`built/sprites/`）は、ほかの衣装と共通にするなら `public/assets/characters/<人物>/face/<ポーズ>/` に、しないなら衣装のフォルダの `built/sprites/` に写します。
2. その PNG を全部、`content/presentation/own-artwork.json` に1行ずつ書きます。
3. `characters.json` のその衣装・ポーズに `"avatar": "assets/characters/<人物>/<衣装>/<ポーズ>/avatar/"` を足し、共通の顔を使うなら `"avatarFace": "assets/characters/<人物>/face/<ポーズ>/"` も足します。
4. 作業用のスクリプトと素材（骨組みの下書き・6コマの絵）を `authoring/characters/<人物>/<衣装>/mesh_avatar/` に残します。

## 6. 動かす部品を作り直すとき

ゲームは、mesh-avatar 0.8.0 を Dreamscape 用に直した部品を使っています（表情ごとの顔 `setFace`、表情ごとの閉じ目、口を開けた表情の口、描いた「う」と「あ」の代用、端末の画素の密度どおり最大3倍で描く。元は2倍までで、3倍の iPhone ではぼけて見えた。口を閉じた絵の表情の閉じた口 `mouthrest_` と、表情ごとの話す口）。部品は [`vendor/mesh-avatar-0.8.0-dreamscape.3.tgz`](../vendor/mesh-avatar-0.8.0-dreamscape.3.tgz) で、`package.json` の依存です（ライセンスの一覧に自動で載るため）。

1. Mesh Avatar Studio の `406714b`（2026-11-17）に [`mesh-avatar-faces.patch`](characters/heroine/default_01/mesh_avatar/mesh-avatar-faces.patch) を当てます（`git apply`）。
2. `packages/runtime/package.json` の `version` を上げ（今は `0.8.0-dreamscape.3`。次は `.4` など）、`dependencies`（fflate。部品に同梱済み）と `publishConfig` を外します。
3. `packages/runtime` で `npm pack`、できた tgz を `vendor/` に置いて、Dreamscape で `npm install ./vendor/<tgz>` を実行します。古い tgz は消します。
4. 直した所はパッチにも書き戻します（`git diff -- packages/runtime/src > mesh-avatar-faces.patch`）。

## 7. 確かめること

- `npm run content:check`：衣装のフォルダと共通の顔のフォルダのファイルがそろっているか、顔の名前（`face_<表情ID>`）が表情IDか。**表情に顔がないことは知らせない**ので、[2.](#2-表情を足すとき)を忘れないでください。
- `npm run dev` で `?character-preview` を開き、衣装・ポーズ・表情を切り替えて、動く立ち絵が静止画と同じ位置・大きさで、その表情の顔になるかを見ます。
- 声のある台詞の場面で、話しているときだけ口が動くか、まばたきで頬の赤みが消えないかを見ます。
- 表情ごとに、閉じた口と話す口（あ・う・お）を並べて、元の口が残って見えないか、口のまわりの頬の赤みが薄くならないかを見ます（試作では、作業フォルダで差分を重ねた画像を作って見比べた）。
- 実機のスマートフォンで、滑らかさと電池の減りを見ます。
