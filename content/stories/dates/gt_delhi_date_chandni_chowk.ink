VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR romance_stage = 1
VAR ending_reached = false
VAR relationship_tone = "reserved"
VAR relationship_tone_before = "reserved"
VAR relationship_tone_after = "reserved"
VAR romance_result = "neutral"
VAR affection_delta = 0
VAR trust_delta = 0
VAR spark_delta = 0

# background: gt_bg_delhi_chandni_chowk
# speaker: narrator
チャンドニー・チョークで、{heroine_name}が急に歩幅を縮めた。こちらが見ていた店とは、反対側を見ている。
# speaker: heroine
# emotion: happy
「あっ、あそこの布。端だけ違う色になってる」
# speaker: narrator
彼女が半歩寄りかけ、こちらへ戻る。こちらの視線の先にも、気になる店先があった。
# speaker: heroine
「そっちを見たかった？　わたしは……いや、あとでも」
{ relationship_tone == "strained" || relationship_tone == "reserved":
    # speaker: narrator
    彼女は遠慮したまま、布の方をもう一度見た。
- else:
    # speaker: heroine
    # emotion: teasing
    「待って。あとでって言ったけど、帰りに忘れそう。わたし、あっちを見たいです」
}
# speaker: narrator
通り過ぎる人の邪魔にならない所へ寄る。二人の行きたい方向だけが、そこで分かれた。

* [「先に布を見よう。次はこっちに付き合って」]
    # effect: gt_delhi_date_chandni_chowk_first_attentive
    { romance_result == "negative":
        # speaker: heroine
        「順番を決めると急いじゃいそう。短く見るから、時計は見ないでね」
        # speaker: narrator
        彼女は小さく笑って、自分で店先へ歩き出した。
    - else:
        # speaker: heroine
        「うん、それがいい。次の店で、何が気になったかも聞きたい」
        # speaker: narrator
        彼女は迷っていた方向を、今度はまっすぐ指した。
    }
    -> after_first

* [「目だけ先に買い物を始めてるね」]
    # effect: gt_delhi_date_chandni_chowk_first_playful
    { romance_result == "negative":
        # speaker: heroine
        「笑うほど見てた？　でも、ほんとに気になったんだよ」
        # speaker: narrator
        こちらが布の方へ向き直ると、彼女も表情を緩めた。
    - else:
        # speaker: heroine
        # emotion: teasing
        「うん。目だけなら、もう三軒寄ってます。足が遅いんです」
        # speaker: narrator
        彼女は一度だけ大きく踏み出し、あとは人の流れに合わせて歩いた。
    }
    -> after_first

* [「気になってる顔も見ていたい」]
    # effect: gt_delhi_date_chandni_chowk_first_bold
    { romance_result == "negative":
        # speaker: heroine
        「顔を見られると思うと、普通に見られなくなるよ。今日は布も見てほしいな」
        # speaker: narrator
        彼女は照れるより先に、店先をきちんと指した。
    - else:
        # speaker: heroine
        # emotion: shy
        「それ、寄り道していいって意味にしちゃうからね」
        # speaker: narrator
        彼女は返事を待つようにこちらを見て、うなずきを受け取ってから歩いた。
    }
    -> after_first

=== after_first ===
# speaker: narrator
店先で許可を取り、彼女は布の端を近くから見る。店の人は別の色も広げたが、彼女が今日は見ているだけだと伝えると、そのまま見比べさせてくれた。
# speaker: heroine
「近くで見ると、こっちの色が好き。遠くからは派手な方が目に入ったのに」
# speaker: narrator
礼を言って通りへ戻る。彼女は案内を開き、この市場の始まりが十七世紀のシャージャハーナーバードにさかのぼると読む。
# speaker: heroine
「昔から買い物をする場所だったんだね。何が欲しいか迷う人も、ずっといたのかな」
# speaker: narrator
次は、こちらが気になった店の前へ行く。彼女はすぐ説明を求めず、同じ方向を覗き込んだ。
# speaker: heroine
# emotion: smile
「どこを見てたのか、当てていい？　これかな。違ったら、もう一回」

* [「今度は先に教えず、見つけてもらおう」]
    # effect: gt_delhi_date_chandni_chowk_second_playful
    { romance_result == "negative":
        # speaker: heroine
        「じゃあ、一回だけね。分からなくても答えを隠し続けないで」
    - else:
        # speaker: heroine
        「挑戦します。……その顔、正解に近づいた時の顔でしょ」
        # speaker: narrator
        彼女は商品の並びより、こちらの目の動きを追っていた。
    }
    -> ending

* [「違うものを見てるのも、面白いね」]
    # effect: gt_delhi_date_chandni_chowk_second_honest
    { romance_result == "negative":
        # speaker: heroine
        「面白いだけで終わらずに、教えてね。知らないまま別々なのは、少し寂しい」
    - else:
        # speaker: heroine
        「うん。自分だけだったら、ここで止まらなかったと思う」
        # speaker: narrator
        彼女は一つ目の予想を外し、それでも楽しそうに二つ目を指した。
    }
    -> ending

* [「もう一軒、君の気になる方へ行こう」]
    # effect: gt_delhi_date_chandni_chowk_second_attentive
    { romance_result == "negative":
        # speaker: heroine
        「今はそっちの番。わたしの行きたい所ばっかりだと、連れ回してるみたいになっちゃう」
    - else:
        # speaker: heroine
        「一軒だけなら。さっきから気になっていた店があるの」
        # speaker: narrator
        彼女は遠慮なく方向を示した後、まず目の前の店を最後まで一緒に見た。
    }
    -> ending

=== ending ===
# speaker: narrator
歩き出す前に、彼女は二人の鞄を確認した。何も買っていない。なのに、随分歩き回った気がした。
# speaker: heroine
# emotion: happy
「見るだけ、って言ったけど、ちゃんと忙しかったね」
{ relationship_tone_after == "romantic_tension" || relationship_tone_after == "warm":
    # speaker: heroine
    「次、わたしが黙って通り過ぎそうになったら、目がどこを見てるか確認してください」
- else:
    # speaker: heroine
    「次は最初から、見たいって言おう。忘れる前に」
}
# speaker: narrator
彼女がまた足を緩める。今度は戻らず、こちらへ見たいものを指さした。
-> END
