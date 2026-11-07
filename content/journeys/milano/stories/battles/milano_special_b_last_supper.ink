// Phase 6 / B型。証拠の判定と英語3択はJSON・TypeScript側。
// claimは証拠帳でも繰り返し参照する、短い日本語の主張。
VAR player_name = "ユウ"
VAR heroine_name = "ミオ"
VAR player_address = "ユウさん"
VAR battle_scene = "intro"
VAR answer_correct = false
VAR battle_score = 0

{ battle_scene == "intro": -> introduction }
{ battle_scene == "after_1": -> after_first }
{ battle_scene == "claim": -> claim }
{ battle_scene == "press": -> press }
{ battle_scene == "evidence_failure": -> evidence_failure }
{ battle_scene == "evidence_success": -> evidence_success }
{ battle_scene == "after_2": -> after_second }
{ battle_scene == "outro": -> conclusion }
-> END

=== introduction ===
# background: milano_refectory
# speaker: narrator
『最後の晩餐』の前で、男が帳簿に「同上」の印を押していた。まだ一行目だった。
# speaker: enemy
「原因はひとつ。それ以外は、原因を増やしたがる人間のせいだ」
# speaker: heroine
「……もう二つ、ありませんか」
# speaker: narrator
男は印を押す手を止めず、帳簿を少し遠ざけた。
# speaker: enemy
「ニーノ・ウニコ。世界を、一つの原因欄に収める男だ。この絵の傷みも、レオナルドの技法で片付く」
「実験などしなければよかった。まずは、その妙な描き方に何の得があったか聞こう」
-> END

=== after_first ===
# background: milano_refectory
{ answer_correct:
    # speaker: enemy
    「ゆっくり直せる……私の帳簿には、やり直す欄がない」
    # speaker: heroine
    「余白は、ありますよ」
    # speaker: enemy
    「それは将来の『同上』のために確保してある！」
- else:
    # speaker: enemy
    「乾いた下地なら、時間をかけて細部を直せる。湿った漆喰が乾く前に描く方法とは違う」
    「もっとも、私は間違えた行も『同上』で押し切る。修正時間はゼロだ」
    # speaker: heroine
    「……間違いは、残るんですね」
}
# speaker: narrator
ニーノは、絵の傷みを指でひとまとめにした。空中に、大きな丸ができた。
-> END

=== claim ===
# background: milano_refectory
# speaker: enemy
「この絵の損傷は、すべてレオナルドの実験的な絵画技法が原因だ。中央の下部まで、例外はない！」
-> END

=== press ===
# background: milano_refectory
# speaker: enemy
「『すべて』だ。絵の具が弱かった。それで上から下まで説明できる。後から起きたことなど、備考で十分！」
# speaker: heroine
「……その備考に、原因欄へ移したほうがいい出来事はありませんか」
-> END

=== evidence_failure ===
# background: milano_refectory
# speaker: enemy
「その資料で、別の原因による損傷が示せるかね？　私の大きな丸は、まだ消せん」
# speaker: heroine
「構図の説明だけでは足りないみたい。傷んだ場所と、そこで後から起きた出来事を比べてみよう」
-> END

=== evidence_success ===
# background: milano_refectory
# speaker: narrator
ニーノは差し出された資料を見て、押しかけた「同上」の印を宙に浮かせた。
# speaker: enemy
「……その資料は受け取ろう。ただし、反論はまだだ。私の『すべて』に、どう関わる？」
-> END

=== after_second ===
# background: milano_refectory
{ answer_correct:
    # speaker: enemy
    「十七世紀の出入口の拡張……絵の具が弱いのと、壁を広げて通るのは、別の出来事か」
    「原因欄が二つ要る。困った。私の定規は、縦線を引いたことがない」
    # speaker: heroine
    「横に持っているから、だと思います」
- else:
    # speaker: enemy
    「扉が後から広げられた。それは技法とは別の損傷だ。だが、絵の具が丈夫だった証明にもならん」
    # speaker: narrator
    ニーノは自分の説明を聞き、帳簿と絵を交互に見た。
    # speaker: enemy
    「……待て。今、私が原因を二つに分けたのか」
}
# speaker: enemy
「では現在の保存だ。原因を分けて考えると、何を守る手が増える？」
-> END

=== conclusion ===
# background: milano_refectory
{ answer_correct:
    # speaker: enemy
    「湿気や微粒子を減らす。過去の扉は戻せなくても、今の空気には手を打てる……」
- else:
    # speaker: enemy
    「空気の管理と入場制限で、湿気や微粒子の負担を減らす。熱く乾かせば済む話ではないのだな」
}
{
- battle_score == 3:
    # speaker: narrator
    ニーノは定規を九十度回し、原因欄を二つに分けた。三つ目の余白も残した。
    # speaker: enemy
    「私の負けだ。原因を一つにしても、問題は一つも減っていなかった」
    「この『同上』の印は……同じ原因だと調べた後に押す。仕事が増えたぞ」
    # speaker: heroine
    「そのほうが、印も落ち着きそう」
    # speaker: narrator
    彼は印にふたをして去った。今日、初めて押さずに済んだ欄が残った。
    # speaker: heroine
    「空欄って、放っておくことだけじゃないんだね。まだ決めない、ってこともある」
- battle_score == 2:
    # speaker: enemy
    「君たちにも一つ見落としがあった。だが、私の『全部同じ』は持ち帰れん」
    # speaker: narrator
    ニーノは原因欄の横に「ほかは？」と小さく書いた。
    # speaker: enemy
    「新しい部署だ。担当者は、ひとまず私だ」
    # speaker: narrator
    帳簿を閉じてから、彼はもう一度だけ開き、疑問符を大きくした。
    # speaker: heroine
    「……あの人の帳簿、急に続きが気になってきた」
- else:
    # speaker: enemy
    「勝負には勝った！　原因は私の――」
    # speaker: narrator
    ニーノは言いかけて、口をつぐんだ。帳簿の「同上」を見つめている。
    # speaker: enemy
    「いや、君たちの見落としもある。まずい。勝因まで一つにできない」
    「次までに、欄を増やしておく。……帳簿を買い直すほどではないはずだ」
    # speaker: narrator
    去り際、彼は予備の鉛筆を取り出した。印はポケットに入ったままだった。
    # speaker: heroine
    「悔しい。でも、わからないところを『同上』にはしたくないね。私も、もう一度読んでみる」
}
-> END
