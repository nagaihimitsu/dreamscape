# 動く立ち絵の試作（mesh-avatar-studio）

立ち絵を「普段は呼吸・まばたきし、台詞の声で口が動き、表情が変わり、髪や身体がわずかに揺れ、スマホでも軽い」ものにするための検討と試作の記録です（2026-11-19）。本番の画面にはまだ入れていません。

## 決めたこと（2026-11-19 のユーザー判断）

- **mesh-avatar-studio（MIT）を主に使う。** 1枚の PNG から、ゲームで動かせる立ち絵（`rig.json` と `built/*.png`）まで作れます。ゲームでは npm の `mesh-avatar`（WebGL）が、呼吸・まばたき・声の大きさに合わせた口・表情・髪の揺れを受け持ちます。
- **still2rig-psd は使わない。** 動きを確かめる道具で（PC向け）、ゲームに埋め込める部品がありません。See-through で層を分けるには GPU（Colab など）が要り、mesh-avatar-studio につなぐには変換スクリプトの自作が要ります。隠れていた部分（前髪の下など）のぼやけが目立ったときに、改めて考えます。
- **描いた目・口の差分は、まだ作らない。** 差分を作ると、ヒロインの絵が画像生成（OpenAI）に送られます。

## 試作の結果

- 確認用ページ（非公開）：<https://claude.ai/artifact/4sSCgdT1Xd3oxMJVFnwKxb>。インド門のデートの台詞5本を、声つきで再生できます。
- 骨組みの下書き：[`characters/heroine/default_01/mesh_avatar/rig.draft.json`](characters/heroine/default_01/mesh_avatar/rig.draft.json)。基本衣装 `default_01/standing_01` の `neutral` を元にしています。mesh-avatar-studio の版は `406714b`（2026-11-17）、`mesh-avatar` は 0.8.0 です。
- まばたき、呼吸、髪の揺れ、声に合わせた口、表情の切り替えは、全身の絵（1024×1536）のままで動きました。頭・髪・上半身が動き、腕・脚・スカートは止めたままです（向こうの全身向けの機能は試験段階なので使っていません）。帽子は頭と一緒に固く動きます。
- 大きさ：立ち絵のファイルは約530KB（今の表情12枚は合計約940KB）、動かす部品は約183KB（gzip で約60KB）です。

### 分かった問題

- **目を閉じると、画面の左側の目の上に茶色いにじみが出る。** 前髪が目のすぐ横にあるため、作成ツール（`tools/build-layers.py` の `fill_skin`）がまぶたの下を塗るとき、髪の色を混ぜます。目の周りの範囲（`roi`）を狭めても消えませんでした。描いた目の差分（閉じた目・半目）を入れると消えます。
- **差分なしの口は、開いたときに簡単な形になる。** 描いた口の差分（あ・い・お など）で自然になります。
- **表情の数が合わない。** mesh-avatar は8種類（`neutral`・`smile`・`shy`・`surprise`・`halfLidded`・`angry`・`sad`・`wink`）、Dreamscape は12種類です。試作では次のように当てました：`surprised`→`surprise`、`exasperated`→`halfLidded`、`worried`→`sad`、`shy`→`shy`。
- **骨組みの表示の余白のままでは、帽子の上が切れる。** 骨組みの `view.padTop`（-0.07）は胸から上の絵に合わせた値です。全身の絵では `padTop` を 0 以上で渡します（試作は 0.01）。

## 作り直すときの手順

mesh-avatar-studio の [エージェント向けの手順](https://github.com/shinshin86/mesh-avatar-studio/blob/main/docs/agent-guide.md) に従います。この絵での要点：

1. 元の絵は、配信用の webp ではなく [`characters/heroine/default_01/standing_01/neutral.png`](characters/heroine/default_01/standing_01/neutral.png) を使う（試作では webp を使いました）。
2. `uv run tools/new-project.py <絵> heroine` の後、`rig.draft.json` を上の下書きで置き換える。
3. 外側の明るい茶色の毛先は、毛束（`strands`）の線を上に引かないと髪のマスクに入りません（下書きの `side_l0`・`tip_l`・`tip_r`）。
4. `build-layers.py` → `npm run render-poses` で、閉じた目・顔の向き・口を確かめる。
5. ブラウザで読むときは、`.mavatar` の代わりに展開したフォルダ（`avatar.json`・`rig.json`・`built/`）を `loadMeshAvatar(canvas, "<フォルダ>/")` で読めます。

## 本番に入れる前に決めること

- 描いた目・口の差分を作るか（絵を外部に送ってよいか）。
- 表情12種類と mesh-avatar の表情の対応表。制作者が JSON で決められるようにする。
- 衣装ごとに1体ずつ作るので、衣装の仕組み（`resolveCharacterCostume`）との対応。
- 声の大きさを `useVoice.ts` の AudioContext から取り出す方法と、声のない台詞の口の動き。
- WebGL が使えない端末・「動きを減らす」設定・画面が隠れている間は、今の webp 静止画を出す。顔の丸枠（`CharacterFace`）などは webp のままにする。
- 動かす部品は場面に入ってから読み込み、タイトル画面で読むファイルには入れない。版は固定する。
- 実機のスマホで、1秒あたりのコマ数と電池の減りを確かめる（確認用ページの右上に出ます）。
