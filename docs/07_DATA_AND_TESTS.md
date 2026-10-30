# 07 データ契約・検証・テスト

## 必要な安定ID
`chapterId`、`dateId`、`storyId`、`rewardSourceId`、`memoryId`、`quizId`、`factId`、`choiceEffectId` は文字列で永続的に一意。画面に出す日本語名は後から変えられるがIDは変えない。

## シナリオ編集
- Inkは文章と選択肢を担当。`# speaker: heroine`、`# speaker: narrator`、`# background: milano_cafe`、`# effect: memory_milano_promise` のようなタグを採用する。
- `effect:` タグは許可済みイベントの識別子。任意の式やJavaScriptを埋め込まない。
- `#` タグの取り扱いはInk公式の`currentTags`/choice tags仕様に従い、本文の行に一度だけ適用する。
- 選択が決まった直後に状態を保存。再開時にinkjsのstate JSONを復元し、選択前か選択後かの境界を失わない。
- 同一effectの再適用を避けるため、適用済みイベントIDとシナリオ実行位置を正しく扱う。全memoryイベントを世界で一度しか起こせない仕様とは混同しない。
- プレイヤー名等はInk変数で表示し、HTMLとして解釈しない。

## APの操作契約
- `grantRewardOnce(state, rewardId, amount)`: `rewardId` が付与済みなら無変更。同じIDの連打/再表示でも重複加算なし。
- `startDate(state, dateId)`: 定義存在・章解放・関係段階・AP残高・未完了状態を検証し、成功時のみ費用を1回減算、アクティブデートを登録。
- `finishDate(state, eventResults)`: 1度だけ好感度・思い出・履歴を適用、次の画面へ。途中で失敗しても重複適用しない。
- 未完了状態のまま再開するなら`startDate`を再度呼ばない。開始をリトライしても重複減算しない。
- APは0以上、設定の上限以下で常に整合。

## GameState概念例
```
{
  "schemaVersion": 1,
  "playerName": "なお",
  "heroineName": "りえ",
  "ap": 2,
  "affection": 3,
  "romanceStage": 1,
  "completedChapters": ["milano"],
  "claimedRewardIds": ["chapter_milano_first_clear"],
  "playedDateIds": ["milano_cafe_01"],
  "memories": ["milano_promise"],
  "activeDate": null,
  "storyState": null
}
```
※セーブ詳細のデータ構造はTypeScript実装で確定させる。上は設計例。

## 受け入れテストの最低限
1. 空のセーブで開始し、デフォルト名/変更名の両方が表示できる。
2. 初回章クリアでAP4（仮）。同じ章の再クリア・画面再表示・再起動でもAPが増えない。
3. デート開始でAPを1回だけ消費。AP不足/未解放なら消費しない。
4. デート1本で3択×2回が完走し、各反応・思い出の記録が異なる。
5. ページリロード後も選択途中から再開でき、APと好感度の二重加算・二重減算なし。
6. イベントの再鑑賞では2度目の好感度報酬が発生しない。
7. `content/stories/*.ink` を改稿して再ビルドすると、コードを変更せず台詞が変わる。
8. 存在しないstoryId、重複dateId、未定義effect、壊れたInk、形式違反JSONで検証に失敗する。
9. 狭い画面で文字が切れない。長文の名前を入力してもレイアウトが大きく壊れない。
10. セーブデータ破損時は明確に案内し、利用者の他データを勝手に消さない。
11. ビルド/型チェック/テストの実行手順をREADMEに記載し、すべて通る。

## 将来のテスト
- 日本語敵台詞のみ/英語クイズのみの言語規則
- 英語3択に正解がちょうど1つで、選択肢がちょうど3つ
- クイズ再戦でAP無限獲得不可
- B/C特殊戦で証拠メモを開閉しても回答状態保持
- sourceURLあり・解釈区分あり・参照切れなし
