// 【場所のファイル】見本の街・都市の終わり（架空の街・人物）。統一イベント設計 3.9 の (d) の例（段階4）。
// - エピローグを始める時を、作者が「# then: epilogue」で決める。この都市のどこかに then: epilogue を書くと、
//   ゲームは自分ではエピローグを始めず、「エピローグへ」のボタンも出さない（書かない都市は今と同じ）。
// - then: は、その場面を終えるとすぐ進む。同じ時点の残りの場面は流れない。
// - 「もう少し、歩こう」を選んだ人も、翌朝の宿の場面（受け皿）でエピローグへ進む。受け皿がないと、エピローグを
//   始められなくなり、ビルドと探索テストが止める（見本の編は都市が1つ＝旅の最後の都市のため）。
// - 選択のない支払い（# on_done: money -20）の例も入れた。
INCLUDE modules.ink
-> DONE

// ───── フィナーレの時点の -1：バトルの前。選択のない買い物。
// 使えるお金（予算 − 帰りの取り置き − 支払いの取り置き）が20より少ないときは、この場面は出ない。出すときに20を取り置き、払うのは場面を終えたとき。
=== smp_mihon_finale_sweets ===
# scene: talk
# title: 三時の砂糖菓子
# at: finale mihon
# priority: -1
# on_done: money -20
# sources: none
# background: smp_bg_mihon_clock_tower
# speaker: narrator
広場の屋台に、時計の形の砂糖菓子が並んでいた。針はどれも三時を指している。
# speaker: heroine
二つください。……はい、一個ずつ。最後の勝負の前の、三時のおやつ
-> END

// ───── フィナーレの時点の +1：バトルの結果の後。エピローグへ進むか、もう少し街にいるかを選ぶ。
=== smp_mihon_after_finale ===
# scene: talk
# title: 結果の後の広場
# at: finale mihon
# priority: +1
# sources: none
# background: smp_bg_mihon_clock_tower
# speaker: heroine
終わったね。……このまま、この街の最後の話にしちゃう？　それとも、もう少しだけ歩く？
* [「今日は、ここまでにしよう」 # option: to_epilogue]
    # then: epilogue
    # speaker: heroine
    うん。じゃあ、最後に鐘の音を聞いていこう
* [「もう少し、歩こう」 # option: stay]
    # speaker: heroine
    やった。宿に戻るまで、まだ時間あるよね
-
-> END

// ───── 宿の時点の +2：起きた後。「もう少し歩く」を選んだ人も、次の朝にはエピローグへ（受け皿）。
=== smp_mihon_last_morning ===
# scene: talk
# title: この街の最後の朝
# at: hotel mihon_hotel
# priority: +2
# when: city mihon
# when: not epilogue mihon
# then: epilogue
# sources: none
# background: smp_bg_mihon_hotel
# speaker: heroine
おはよう。窓の外、今日も三時。……そろそろ、この街ともお別れだね
-> END
