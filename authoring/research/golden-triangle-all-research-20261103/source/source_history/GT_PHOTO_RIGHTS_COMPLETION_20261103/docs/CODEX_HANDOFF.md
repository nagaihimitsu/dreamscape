# Codexへの引き継ぎ — 画像のみの研究差分

- 画像ファイル本体は0件。`data/PHOTO_RIGHTS_AUDIT_30.csv` は画像の **Commonsページ表示の監査結果** であり、画像バイナリの検証結果ではない。
- このZIPを `authoring/research/golden-triangle-20261103/` の新しい監査差分ディレクトリに置く。ミラノや既存インド本番の JSON/Ink に自動追加しない。
- メイン観光として確定する前に、`importance=MAIN_CANDIDATE` の12件から、利用場面・構図・証拠ポイントを確定する。
- `jaipur_johari_bazaar` は**現代のJohari Bazaarを示す高解像度候補が確証不足**。汎用Jaipur市場写真を「Johari」と表示しない。
- `jaipur_jaigarh_fort` はデジタル透かしのある元画像を無断除去する運用にしない。別候補を人間が評価する。
- `CC BY-SA` の画像を縮小・切り抜き・WebP化する場合、必要な帰属・改変記録・派生ライセンスを各ファイル単位で保持する。
- 人物が写った市場写真は、CCライセンスに加えて肖像/プライバシー/文脈上の配慮が必要。前に確認したCCの表記だけで無条件に製品利用可と結論しない。
- `CAMERA_AND_OBJECT_GEOTAGS_NOT_ENTRANCES_10.csv` は**写真の地点**。`entryGateLatitude/Longitude` に自動転記しない。
- 背景を登録するときは `content/tourism/catalog.json` の `assets` に、画像パス・原著作物URL・作者・クレジット・ライセンス・変更履歴・確認日を対応させる。`content/romance/presentation.json` の背景IDと照合し、存在する画像のみ指定。
- 最後に `npm run content:check`, `npm run typecheck`, `npm test`, `npm run build` と実画面・観察用画像のズーム、縦横比・表示位置の目視確認を行う。
- この画像調査は `source/OPEN_ISSUES.md` にある徒歩・入場門・料金の未確定を解決していない。別に追跡する。
