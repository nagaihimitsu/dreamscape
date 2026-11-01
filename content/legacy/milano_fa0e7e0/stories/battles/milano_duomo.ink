// Phase 7 / A型。石の出身地、運搬、保存を通して「一人で耐える」価値観を崩す。
VAR player_name = "ユウ"
VAR heroine_name = "ミオ"
VAR player_address = "ユウさん"
VAR battle_scene = "intro"
VAR answer_correct = false
VAR battle_score = 0

{ battle_scene == "intro": -> introduction }
{ battle_scene == "after_1": -> after_first }
{ battle_scene == "after_2": -> after_second }
{ battle_scene == "outro": -> conclusion }
-> END

=== introduction ===
# background: milano_duomo
# speaker: enemy
「動くな！　君の地図、軽すぎる！」
# speaker: narrator
大きな肩当ての男が、地図の端に分銅を置いた。彼の靴にも、同じ形の重りが付いている。
# speaker: heroine
「……これでは、地図を持って歩けません」
# speaker: enemy
「旅を軽く見ないためだ。ブルーノ・ザヴォッラ。価値ある物は、自分の肩で運ぶ！」
「この大聖堂を見ろ。あの石の重さ！　どんな石を運んできたか、まずは見極めたまえ」
-> END

=== after_first ===
# background: milano_duomo
{ answer_correct:
    # speaker: enemy
    「カンドーリアの大理石。遠くの山から、ここまで……よし、ますます立派だ」
    # speaker: narrator
    ブルーノは自分の肩をたたいた。石を運んできた肩ではない。
    # speaker: heroine
    「今、石の代わりに誇っていませんか」
- else:
    # speaker: enemy
    「カンドーリアの大理石だ。淡い桃色の筋もある。立派な石を、白いから同じと片付けてはいかん」
    # speaker: heroine
    「重さだけでも、見分けられませんね」
    # speaker: narrator
    ブルーノは地図の分銅を、何も聞かなかった顔で並べ直した。
}
# speaker: enemy
「では、山から街まで運ぶ方法だ。これほどの石を運ぶ苦労、想像できるか？」
-> END

=== after_second ===
# background: milano_duomo
{ answer_correct:
    # speaker: enemy
    「湖、川、運河……船で？　石が、肩を借りずに旅をしただと」
    # speaker: heroine
    「水には、借りていますね」
    # speaker: narrator
    ブルーノは広場を見回した。そこにない水路の分だけ、街が広くなったようだった。
- else:
    # speaker: enemy
    「石は湖や川、運河を船で運ばれた。ずっと道を引きずってきたわけではない」
    # speaker: narrator
    説明を終えたブルーノは、肩当てを見た。
    # speaker: enemy
    「……今の話、私の仕事が減っていないか？」
    # speaker: heroine
    「一人では届かない物が、届く話だと思います」
}
# speaker: enemy
「運ぶときだけは認めよう。だが、建った後は同じ石が耐え続ける。それが古い建物の誇りだ！」
-> END

=== conclusion ===
# background: milano_duomo
{ answer_correct:
    # speaker: enemy
    「傷んだ像を守り、外には写しを置く……場所を譲っても、大聖堂の仕事は続くのか」
- else:
    # speaker: enemy
    「傷んだ元の像を屋内で守り、外には写しを置く例がある。全部を新しい好みで作り直すためではない」
    # speaker: narrator
    ブルーノは尖塔を見上げた。今度は、石の年齢を決めつけずに。
}
{
- battle_score == 3:
    # speaker: narrator
    ブルーノは地図から分銅を外し、靴からも一つ外した。足が思いがけず高く上がった。
    # speaker: enemy
    「私の負けだ。耐えることばかり考えて、届かせることを忘れていた」
    「この重り、片方を持ってくれるか。……いや、二人で袋を持てばいいのか」
    # speaker: heroine
    「袋を持つ前に、本当に必要な重りかも考えませんか」
    # speaker: narrator
    ブルーノは返事をせず、重りを半分にした。去っていく足音も、少し軽かった。
    # speaker: heroine
    「{player_address}。ガイドブック、少し持ってもらってもいいですか。……これは読みたいので、必要な重さです」
- battle_score == 2:
    # speaker: enemy
    「見落としは一つ。しかし、私の肩だけでこの街を説明するのは無理らしい」
    # speaker: narrator
    ブルーノは地図の端を、分銅ではなく自分の指で押さえた。
    # speaker: enemy
    「向こう側を頼む。風が止んだら、二人とも手を離す。それでよいな」
    # speaker: narrator
    風が止むまで、彼は待った。待つのも、どうやら初めての仕事だった。
    # speaker: heroine
    「……手伝ってほしいって、言うだけなら軽い言葉なのにね」
- else:
    # speaker: enemy
    「勝負は私の勝ちだ！　だが、水路には勝っていない。写しの像にも、礼を言わねばならん」
    # speaker: narrator
    ブルーノは分銅を拾おうとして、片方の靴を脱いだ。驚くほど楽にしゃがめた。
    # speaker: enemy
    「今のは休憩ではない。運び方の、試験運用だ」
    # speaker: narrator
    彼は靴を抱えて去った。足音だけが、先ほどの威勢を覚えていなかった。
    # speaker: heroine
    「知らないこと、まだありましたね。でも、全部一人で覚えなくてもいいのかも。私のメモも、あとで見てください」
}
-> END
