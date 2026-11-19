# 動く立ち絵の作り方

立ち絵を動かす（呼吸・まばたき・髪の揺れ・表情・声に合わせた口）ための手順です。読む人は、制作者と、作業をする AI の会話です。今は基本の衣装 `default_01` の `standing_01` に付いています。なぜこの形になったか（試したこと・やめたこと）は [動く立ち絵の試作](LIVE_PORTRAIT_TRIAL.md) にあります。

## 目次

- [1. 仕組み](#1-仕組み)
- [2. 表情を足すとき](#2-表情を足すとき)
- [3. 新しい衣装・人物に作るとき](#3-新しい衣装人物に作るとき)
- [4. ゲームに入れる](#4-ゲームに入れる)
- [5. 動かす部品を作り直すとき](#5-動かす部品を作り直すとき)
- [6. 確かめること](#6-確かめること)

## 1. 仕組み

- 動く立ち絵は、[Mesh Avatar Studio](https://github.com/shinshin86/mesh-avatar-studio)（MIT）の形式のフォルダです。`characters.json` の衣装・ポーズに `"avatar": "assets/…/avatar/"` と書くと、そのポーズのときに使われます（[コンテンツ制作ガイド](CONTENT_GUIDE.md#動く立ち絵)）。
- フォルダの中身：

  | ファイル | 中身 |
  |---|---|
  | `avatar.json`・`rig.json` | 名前と、骨組み（頭・目・口・髪の毛束などの位置） |
  | `built/base.png` ほか | 元の絵（`neutral`）を動かすための層 |
  | `built/sprites/face_<表情ID>.png` | **表情ごとの顔**。表情の絵から顔を切り出したもの。`neutral` は元の顔なので要らない |
  | `built/sprites/mouthopen_<表情ID>.png` | 口を開けた絵の表情が、話すときに開く口 |
  | `built/sprites/eyes_closed_<0/1>__<表情ID>.png` | 表情ごとのまばたきの閉じ目（頬の赤みを残す） |
  | `built/sprites/eyes_closed_*`・`eyes_half_*`・`mouth_a`・`mouth_u`・`mouth_o` | 作者が描いたまばたきと口（[`blink-mouth-sheet.png`](characters/heroine/default_01/mesh_avatar/blink-mouth-sheet.png)） |

- `# emotion:` の表情IDが、そのまま `face_<表情ID>` を選びます。**顔のない表情は、元の顔（`neutral`）のまま動きます**（表情の静止画には切り替わりません）。
- 表情の静止画（`expressions` の WebP）は、動かせないとき（「演出を短縮する」・端末の動きを減らす設定・WebGL がない・読み込めない）と、読み込みが終わるまでに出ます。顔の丸枠とミニゲームの全身の絵も静止画です。
- 作業用のスクリプトと素材は [`characters/heroine/default_01/mesh_avatar/`](characters/heroine/default_01/mesh_avatar/) にあります。

## 2. 表情を足すとき

表情の絵（`expressions`）を足すときは、**同じポーズの動く立ち絵に `face_<表情ID>.png` も必ず足します**。足さないと、動く立ち絵ではその表情が出ず、元の顔のまま話します。

1. いつもどおり表情の絵を足します（元の絵 `authoring/characters/…/<表情ID>.png`、配信用の WebP、`expressions`・`own-artwork.json` への登録。[コンテンツ制作ガイド](CONTENT_GUIDE.md#基本の衣装表情の画像を足す)）。
2. その表情の絵の口が開いているなら、[`cut-faces.py`](characters/heroine/default_01/mesh_avatar/cut-faces.py) の `CLOSED` に、普段の閉じた口に使う絵を足します（明るい表情は `source.png`、驚きは `serious.png` など）。口を閉じた絵なら何もしません（話すときは「あ・う・お」の口になります）。口がとても大きく開いているなら `WIDE` にも足します。
3. Mesh Avatar Studio の作業フォルダ `projects/<名前>/`（[3.](#3-新しい衣装人物に作るとき)で作ったもの。なければ3.の1〜8をやり直す）で、次を順に実行します。`<表情の絵>` は `authoring/characters/heroine/default_01/standing_01` のような、表情の元の絵のフォルダです。表情の一覧は、そのフォルダの `neutral` 以外の PNG から自動で作ります。

   ```sh
   uv run --with pillow --with numpy --with opencv-python-headless python <mesh_avatar>/cut-faces.py <表情の絵>
   uv run --with pillow --with numpy --with opencv-python-headless python <mesh_avatar>/cut-closed-eyes.py <表情の絵>
   ```

4. できた `built/sprites/` の新しいファイル（`face_<表情ID>.png`、口が開いた表情は `mouthopen_<表情ID>.png`、`eyes_closed_0__<表情ID>.png`・`eyes_closed_1__<表情ID>.png`）と `sprites.json` を、配信のフォルダ `public/assets/…/avatar/built/sprites/` に写し、新しい PNG を `own-artwork.json` の動く立ち絵の `paths` に1行ずつ足します。
5. [6. 確かめること](#6-確かめること) をします。

## 3. 新しい衣装・人物に作るとき

道具の準備：Node.js 22.17 以上、Python と [uv](https://docs.astral.sh/uv/)。Mesh Avatar Studio を手元に持ってきて `npm install`、`npm run doctor` で足りない物を確かめます。手順の元は向こうの [agent-guide](https://github.com/shinshin86/mesh-avatar-studio/blob/main/docs/agent-guide.md) です。ここでは、この作品でのやり方だけを書きます。

1. **元の絵**：その衣装・ポーズの `neutral` の元の絵（可逆の PNG。配信用の WebP ではなく）で、`uv run tools/new-project.py <neutral.png> <名前>` を実行します。全身の絵のままで構いません。
2. **骨組み**：`rig.draft.json` に、頭・顔の部品・目の輪郭・口・頬・髪の毛束・身体を、拡大した方眼（`tools/grid.py --region …`）で読んで書きます。ヒロインの下書き [`rig.draft.json`](characters/heroine/default_01/mesh_avatar/rig.draft.json) が見本です。この作品の絵で気をつけること：
   - 全身の絵なので、`view.padTop` は胸から上の絵の値（-0.07）のままにしない（ゲームでは 0 で読みます）。`body.pivotY` は足もと、`body.maxRoll` は小さく（0.015）。
   - 外側の明るい茶色の毛先は、毛束の線をその上にも引かないと髪のマスクに入らない。
   - 目の周り（`roi`）は、前髪にかからないよう、まつ毛のすぐ外にとどめる。
3. **確かめる**：`npm run validate-rig`、`tools/overlay.py` で重ねて見て直します。
4. **層を作る**：`tools/build-layers.py`、`npm run render-poses` で、顔の向きや髪の揺れが崩れないか見ます。
5. **まばたきと口の絵を描いてもらう**：作者に、元の絵柄で6コマの絵を描いてもらいます（[見本](characters/heroine/default_01/mesh_avatar/blink-mouth-sheet.png)）。並びは上の段が「通常の顔・まばたき（閉じ）・まばたき（半目）」、下の段が「あ・う・お」。胸から上で構いません。位置は後で合わせるので、元の絵と同じ大きさでなくてよい。画像生成で描くと前髪が消えたり絵柄が変わったりしたので、作者の絵を使います。
6. **位置を合わせる**：`tools/variant-requests.py` で差分のマスクを作ってから、[`register-sheet.py`](characters/heroine/default_01/mesh_avatar/register-sheet.py) `<neutral.png> <6コマの絵>` で各コマを元の絵に合わせます。コマの境目（`X`・`Y`）は絵に合わせて直します。
7. **差分にする**：[`sheet-to-variants.py`](characters/heroine/default_01/mesh_avatar/sheet-to-variants.py) `projects/<名前>` で、閉じ目・半目・「あ」「う」「お」を `variants/` に入れます。「う」は向こうの道具が知らないので、`variants/mouth_u.png` を `work/mouth_u_full.png` に移してから `tools/build-sprites.py` を実行し、[`cut-mouth-u.py`](characters/heroine/default_01/mesh_avatar/cut-mouth-u.py) で切り出します。
8. **表情の顔を切り出す**：[2.](#2-表情を足すとき)の3.と同じく `cut-faces.py`、`cut-closed-eyes.py` を実行します。`cut-faces.py` の顔の範囲（`X0`…`Y1`）・あごの線（`JAW`）・口の範囲（`zone`）は、ヒロインの全身の絵の座標なので、ほかの絵では方眼で読み直します。
   - `build-sprites.py` は `built/sprites/` を作り直し、顔の差分も消えます。順番はいつも 7.→8. です。

## 4. ゲームに入れる

1. `projects/<名前>/` の `avatar.json`・`rig.json`・`built/`（`layers.json`・層の PNG・`sprites/`）を、`public/assets/characters/<人物>/<衣装>/<ポーズ>/avatar/` に写します（`source.png`・`work/`・`review/` は写さない）。
2. その PNG を全部、`content/presentation/own-artwork.json` に1行ずつ書きます。
3. `characters.json` のその衣装・ポーズに `"avatar": "assets/characters/<人物>/<衣装>/<ポーズ>/avatar/"` を足します。
4. 作業用のスクリプトと素材（骨組みの下書き・6コマの絵）を `authoring/characters/<人物>/<衣装>/mesh_avatar/` に残します。

## 5. 動かす部品を作り直すとき

ゲームは、mesh-avatar 0.8.0 を Dreamscape 用に直した部品を使っています（表情ごとの顔 `setFace`、表情ごとの閉じ目、口を開けた表情の口、描いた「う」と「あ」の代用）。部品は [`vendor/mesh-avatar-0.8.0-dreamscape.1.tgz`](../vendor/mesh-avatar-0.8.0-dreamscape.1.tgz) で、`package.json` の依存です（ライセンスの一覧に自動で載るため）。

1. Mesh Avatar Studio の `406714b`（2026-11-17）に [`mesh-avatar-faces.patch`](characters/heroine/default_01/mesh_avatar/mesh-avatar-faces.patch) を当てます（`git apply`）。
2. `packages/runtime/package.json` の `version` を上げ（`0.8.0-dreamscape.2` など）、`dependencies`（fflate。部品に同梱済み）と `publishConfig` を外します。
3. `packages/runtime` で `npm pack`、できた tgz を `vendor/` に置いて、Dreamscape で `npm install ./vendor/<tgz>` を実行します。古い tgz は消します。
4. 直した所はパッチにも書き戻します（`git diff -- packages/runtime/src > mesh-avatar-faces.patch`）。

## 6. 確かめること

- `npm run content:check`：フォルダのファイルがそろっているか、顔の名前（`face_<表情ID>`）が表情IDか。**表情に顔がないことは知らせない**ので、[2.](#2-表情を足すとき)を忘れないでください。
- `npm run dev` で `?character-preview` を開き、衣装・ポーズ・表情を切り替えて、動く立ち絵が静止画と同じ位置・大きさで、その表情の顔になるかを見ます。
- 声のある台詞の場面で、話しているときだけ口が動くか、まばたきで頬の赤みが消えないかを見ます。
- 実機のスマートフォンで、滑らかさと電池の減りを見ます。
