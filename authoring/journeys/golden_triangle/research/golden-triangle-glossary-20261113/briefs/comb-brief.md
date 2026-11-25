# Brief: find glossary (旅の図鑑) candidates in the India journey (read-only)

Repository: /home/user/dreamscape (do NOT edit, create or move any file in it; write nothing except your final report).

## What the glossary is
The India journey (`content/journeys/golden_triangle/`) has a "旅の図鑑" (travel encyclopedia): a card with ONE photo and a ONE-LINE Japanese description (about 40 Japanese characters max) pops up the first time a line tagged `# term: <id>` is shown, and the term stays in the encyclopedia. Purpose: things a Japanese traveller cannot immediately picture, shown at the moment they appear in the story. Categories available: food / creature / thing / clothing / building / custom (ならわし: customs, rituals, gestures, practices) / person / transport. The rules are in `authoring/CONTENT_GUIDE.md` (section 「旅の図鑑の言葉」) and past decisions are in `authoring/journeys/golden_triangle/research/golden-triangle-glossary-20261113/README.md` (read its "外した言葉" and the 2026-11-21/23/25 sections so you know what was excluded and why).

## Already in the glossary (77 terms — do not re-propose these)
ニハーリー、ゴルガッパ、ドゥパッター、サリー、サルワール・カミーズ、アナルカリ、ランガル、ローティー、ティフィン、アチャール、クルハル、自転車リキシャ、アタル、クルタ、キチュリー、オートリキシャ、女性車両、電動リキシャ、パラーター、ジャレビー、ブラックバック、マギー、パルチン・カーリー、ジャーリー、デリーの鉄柱、黒いタージ、ニーム、ホーン・オーケー・プリーズ、ニンブー・ミルチ、マトリー、アジョワン、隊商宿、ペーター、バラート、ドーティー、細密画、メヘンディ、ラックの腕輪、セーラー、ガンガウル、ムドラー、首を揺らすしぐさ、願いの糸、シャグン、ジョーラー・ガル、笑う会、ワカケホンセイインコ、ジャイヴァーナ、銀の大壺、パンチャーング、ミッティ、ドーナー、タヴェルニエ、シャー・ジャハーン、ムムターズ・マハル、アクバル、フマユーン、バーブル、アウラングゼーブ、ジャハーナーラー、ヌール・ジャハーン、マーン・シング1世、アミール・フスロー、テーグ・バハードゥル、イティマード・ウッダウラ、イーサー・ハーン、シヴァ、パールヴァティー、クリシュナ、ガネーシャ、ナハル・シン・ボーミヤー、ヴィディヤーダル、マリアム・ウッザマーニー、アマーナト・ハーン、シェール・シャー、アフザル・ハーン・シーラーズィー、サハーヤク
Separate "local words" list (旅のことば, vocabulary, no photo): バス、ダーディー、ニハーリー、ミッティ、グルドワーラー、ランガル、キチュリー、サハーヤク、チャンドニー、ヤートリーガン、クリプヤー、ディヤーン、ハーン、バフー、ペーター、メヘンディ、ナーニー、ナーナー、サワーイー、ムーリー、ダヒー. A word only in this list CAN still be a glossary candidate if there is a thing to show.

## What to look for — be exhaustive, cast a wide net
Read EVERY line of your assigned files (narration, dialogue, choices, comments are not shown to players — skip `//` comments but you may use them to understand intent). List every concrete thing a Japanese player may not picture well, including but not limited to:
- Design & craft: architectural elements (arch types, domes, chhatri, jharokha, chhajja, minarets, iwan, charbagh garden plan, stepwell parts, colonnades, calligraphy bands, inlay, carving, colours/stones like red sandstone, marble), patterns and motifs, textiles and dyeing (block print, bandhani, leheriya…), crafts (blue pottery, meenakari, miniature styles…), signage styles, truck art, rangoli, toran…
- Music, dance & sound: instruments (dhol, tabla, shehnai, harmonium, ektara…), song/genre (qawwali, kirtan/shabad, bhajan, filmi songs…), dances (ghoomar, kalbeliya…), the wedding band, temple bells, calls of street sellers, the station announcement style…
- Food & drink, spices, sweets, street food, utensils.
- Customs, rituals, religious practices, gestures, etiquette, festivals, superstitions, greetings, forms of address.
- Clothing, jewellery, headwear (turbans/pagri styles, patka), makeup marks (bindi, tilak, sindoor).
- Places/buildings types and named sub-parts that a card could show (but NOT the main landmark already shown by the scene background).
- Animals, plants, trees, flowers.
- Vehicles, transport details, money/coins, documents, everyday objects.
- People-types/roles/jobs (guide, astrologer, silversmith, rickshaw-wallah, chaiwala…) and real historical persons not yet listed.
- Legends, stories, deities, saints (mark clearly as legend/myth/deity).
Include borderline items too (mark them low). Do not invent: every candidate must be anchored to the exact text where it appears.

## For each candidate give (one block or one table row each)
1. 名前 — as the script says it, and the proper name/term if different (e.g. script 「花の房」 → term "セーラー").
2. 種類 (design / music / food / custom / clothing / building / thing / creature / person / transport / legend) and the glossary category you would use.
3. 最初に出うる行 — file path, line number, knot name (`=== knot ===`), the line text (first ~40 chars), and whether that scene is always played or optional (date, branch, choice, `cond(...)`, `# when:`). If the term can first appear in different scenes depending on play order, list each possible first place. Note the order rules: cities go Delhi → Agra → Jaipur; within a city the arrival comes first, then tourism places (any order), dates, finale, epilogue, departure.
4. 台本の説明 — does the script already explain it fully in words? (yes / partly / no)
5. クイズとの関係 — open the quiz JSON for that place (`content/journeys/golden_triangle/quizzes/*.json`; battles map to quizzes via `content/journeys/golden_triangle/battles/catalog.json`; quizzes are inserted in the Ink by `-> quiz(n) ->`) and say whether the candidate is (a) the answer or a key part of an answer/explanation of some question — then name the question id and give the first line AFTER that question's answer (after the `{ quiz_correct: … - else: … }` block merges) where the card could safely go; or (b) unrelated. Do the same for the reasoning quizzes (`-> reasoning ->`).
6. 写真の見込み — would a free-licensed photo likely exist (Wikimedia Commons)? one word: likely / maybe / unlikely, and what the photo would show.
7. 優先度 — 高 / 中 / 低 with a one-line reason (how much the card changes what the player sees/understands at that moment; whether the background photo already shows it; whether the script already explains it).

## Report
Return the full list (no file writing). Group by 種類. At the end, list items you considered and rejected, with a short reason. Be compact but complete — completeness matters more than polish.
