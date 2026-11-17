# 声のモデルの一覧（2026-11-17）

ヒロイン以外の人物の声を配役するときに使った、AivisHub のモデルと VOICEVOX のキャラクターの一覧です。次の旅行編の配役にも使えます。やり方は [人物の声の作り方](../../CHARACTER_VOICE_GUIDE.md) にあります。ゲームはこのフォルダを読みません。

- 調べた日：2026-11-17。モデルは増えたり、規約が変わったりします。古いと思ったら、下の「作り直し方」で作り直します。
- **声の印象（年齢感・声質・「自然」かどうか）は、説明文・サイトの表示・声の高さの測定から推した推定です。だれも聞いて確かめていません。** 決める前に、見本を聞きます。
- **作者の判断（2026-11-17）「営利にはしない」。** このため、営利でなければ使えるモデル（AivisHub の ACML-NC 1.0、kuroike ai の ACML-NC 1.1、VOICEVOX の暁記ミタマ・No.7・Voidoll・ユーレイちゃん・ぞん子）も使えます。下の一覧の注は、この判断の前に書いたものが多く、非営利だけのモデルを「使えない」「NC」と書いています。この判断の後に読んだ規約の要点は、インド編の配役の記録（[casting.md](../../journeys/golden_triangle/voice/casting-2026-11-17/casting.md) の「D2 で使えるようになったモデル」）にあります。営利にすると、この判断は変わります。

## ファイル

| ファイル | 中身 |
| --- | --- |
| `aivishub.json` | AivisHub のモデル77件（Official 4・Community 73。作者が示した一覧 https://hub.aivis-project.com/search?sort=download&tiers=Official&tiers=Community&page=1 と同じ並び）。ライセンスの区分、クレジット、スタイルごとの声の高さ・話す速さ、説明と推定 |
| `aivishub-notes.md` | 上の読み方、ライセンスの一覧、AivisSpeech の設定（話速・感情表現の強さ・テンポの緩急・音高・音量・開始無音・終了無音） |
| `voicevox-a.json`・`voicevox-b.json` | VOICEVOX のキャラクター44人（22人ずつ2組）。規約の区分、別の人物の声に使えるか、スタイルとスタイル ID、声の高さ |
| `voicevox-a-notes.md`・`voicevox-b-notes.md` | 組ごとの規約の結果と、高さの並び |
| `voicevox-common.md` | VOICEVOX の全員に共通の決まり（ソフトウェアの規約、クレジットの形「VOICEVOX:キャラ名」）と使い方（設定の名前、スタイル、辞書） |
| `terms-2026-11-17/` | 2026-11-17 に読んだ規約などの写し（確認の記録。ゲームには入れない）：ACML-NC 1.0 の本文（`acml-nc-1.0.md`）、AivisHub の API で取ったモデルのページの写し（`api-<モデルの UUID>.json`：Shinjou Tomoharu・G59・akiRAM・kuroike ai・リダ・M2 など10件）、暁記ミタマ・No.7・ぞん子・Voidoll・ユーレイちゃんの規約を文字にしたもの（`*.rendered.txt`・`t-*.txt`）、VOICEVOX の音声モデルの説明（`vvm-readme.md`。スタイル ID の対応表の元） |

- JSON の `measuredFiles` などにある `samples/...` は、測ったときの見本の音声の置き場所です。音声はリポジトリに置いていません（大きいため。作り直すときに取り直す）。
- 一覧の注にある `tools/f0.py` は、測ったときの使い捨ての道具です。今は `npm run voice:pitch`（同じ測り方。`scripts/voice-pitch.ts`）です。

## 作り直し方

1. **AivisHub**：公開 API でモデルの一覧を取ります（`aivishub-notes.md` の1章）。`https://api.aivis-project.com/v1/aivm-models/search?sort=download&tiers=Official&tiers=Community&limit=30&page=1` から、ページを1つずつ（1ページ30件まで）。モデルごとのページは `https://hub.aivis-project.com/aivm-models/<UUID>`。ライセンスの種類とモデル内の規約文は、API のモデルの詳しい情報にあります。
2. **VOICEVOX**：公式サイトの各キャラクターのページ（https://voicevox.hiroshiba.jp ）と、スタイル ID の対応表（https://github.com/VOICEVOX/voicevox_vvm の README）を読みます。キャラクターごとの規約は、ページの「利用規約」から開きます。
3. **声の高さ**：各スタイルの見本の声を取り、`npm run voice:pitch -- <見本>` で測ります（[人物の声の作り方の 3.4](../../CHARACTER_VOICE_GUIDE.md#34-声の高さを測る)）。
4. **規約**：使うかもしれないモデルの規約の本文を読み、無料の Web ゲームに使えるか、別の人物の声に使えるか、クレジット、ほかの禁止を書き、読んだ日を書きます。読めなかったものは「未確認」と書きます。読んだ規約の写しを `terms-<日付>/` に残します。
5. 新しいフォルダ `voice-models-<日付>/` に置き、この README と同じ形で、何をいつ調べたかを書きます。
