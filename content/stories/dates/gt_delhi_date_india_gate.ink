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

# background: gt_bg_delhi_india_gate
# speaker: narrator
インド門の見える広場で、家族連れの女性が二人にカメラを差し出した。自分も一緒に写りたいのだという。
# speaker: heroine
# emotion: smile
「もちろん。みなさんが入るようにしますね」
# speaker: narrator
{heroine_name}は人の流れを避けて立ち、全員がこちらを向くのを待った。一枚撮り、画面を見せる。
# speaker: narrator
女性は家族を指し、それから自分を指して笑った。礼を言うと、今度は二人の写真も撮ろうかと申し出る。
# speaker: heroine
「あ、わたしたちも……どうしよう。まだ門しか撮ってなかった」
{ relationship_tone == "reserved" || relationship_tone == "strained":
    # speaker: narrator
    彼女はこちらを見て、スマートフォンを渡す前に一度待った。
- else:
    # speaker: narrator
    彼女はすぐ隣の空きを指し、そこに並んだ姿を想像して笑った。
}

* [「一緒に一枚、お願いしよう」]
    # effect: gt_delhi_date_india_gate_first_honest
    { romance_result == "negative":
        # speaker: heroine
        「今日は別々に撮るのでもいい？　並ぶと、どういう顔をしたらいいか急に分からなくなっちゃった」
        # speaker: narrator
        こちらがうなずくと、彼女も女性にその希望を伝えた。
    - else:
        # speaker: heroine
        # emotion: happy
        「うん。二人とも写るの、一枚は欲しかった」
        # speaker: narrator
        彼女は自分で立つ位置を選び、空けた隣をこちらへ示した。
    }
    -> after_first

* [「門に負けない大きな顔で」]
    # effect: gt_delhi_date_india_gate_first_playful
    { romance_result == "negative":
        # speaker: heroine
        「それ、わたしには難易度が高いな。普通の顔を一枚、先に残させて」
        # speaker: narrator
        彼女は一度息を吐き、肩を楽にした。
    - else:
        # speaker: heroine
        # emotion: teasing
        「その勝負、顔の大きさじゃ勝てないよ。表情で頑張って」
        # speaker: narrator
        先に吹き出したのは彼女だった。女性は、その瞬間にシャッターを切った。
    }
    -> after_first

* [「どんな写真にしたい？」]
    # effect: gt_delhi_date_india_gate_first_attentive
    { romance_result == "negative":
        # speaker: heroine
        「急に聞かれると、欲張っちゃう。まず一枚、普通に撮ろう」
        # speaker: narrator
        彼女は迷っていた手を下ろし、二人の間に小さく隙間を空けた。
    - else:
        # speaker: heroine
        「門も、足元も入れたい。ちゃんとここまで歩いたって分かるのがいい」
        # speaker: narrator
        希望を伝える声は、撮る側だった時より少し明るかった。
    }
    -> after_first

=== after_first ===
# speaker: narrator
撮った写真を確認し、女性に礼を言う。家族が去った後、二人は門の説明に目を通した。
# speaker: heroine
# emotion: serious
「戦争で亡くなった人たちを記憶するための場所なんだね」
# speaker: narrator
彼女はしばらく、画面ではなく実物を見ていた。それから少し離れた場所へ歩き、写真をもう一度開く。
# speaker: heroine
「ここに来た写真、ちゃんと残しておきたいな。門のことも、一緒に覚えていたい」
# speaker: narrator
画面を見せる指が、一枚の端で止まった。こちらの目が少し閉じかけている。
# speaker: heroine
# emotion: teasing
「ただ、この一枚は……うとうとしてる人も記録されてます」

* [「それも残して。撮り直しは別にしよう」]
    # effect: gt_delhi_date_india_gate_second_honest
    { romance_result == "negative":
        # speaker: heroine
        「覚えておくのはできるけど、全部残すと選べなくなりそう。これは二人で見る分にしようね」
    - else:
        # speaker: heroine
        「いいの？　後で消してって言っても、もう一度見てから消します」
        # speaker: narrator
        彼女はそう言って、画面をこちらにも寄せた。
    }
    -> ending

* [「次は撮る側を交代しよう」]
    # effect: gt_delhi_date_india_gate_second_attentive
    { romance_result == "negative":
        # speaker: heroine
        「もう少しだけ、撮らずに歩きたいな。写真の顔をしてると、肩が疲れちゃう」
    - else:
        # speaker: heroine
        「じゃあ、わたしも一枚撮ってもらおうかな。足元まで入れてね」
        # speaker: narrator
        彼女はポーズを決めず、門の方を見てからこちらへ振り返った。
    }
    -> ending

* [「この顔、見せるのは君だけにしたい」]
    # effect: gt_delhi_date_india_gate_second_bold
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        「分かった。誰かに見せる時は先に聞くね。でも、その言い方はちょっと照れる」
    - else:
        # speaker: heroine
        # emotion: shy
        「目を閉じかけた写真で、そんなこと言うんだ。……じゃあ、大事に保管します」
        # speaker: narrator
        笑いながら言った後、彼女はもう一度その写真を見た。
    }
    -> ending

=== ending ===
# speaker: narrator
スマートフォンをしまい、二人は広場を歩く。門を振り返る時には、同じところで足が止まった。
{ relationship_tone_after == "warm" || relationship_tone_after == "romantic_tension":
    # speaker: heroine
    # emotion: smile
    「撮ってる人が写らないって、少し寂しかったんだ。一緒に来たって、わたしの方からも分かる写真ができてよかった」
- else:
    # speaker: heroine
    # emotion: smile
    「次に誰かの写真を撮る時も、撮ってた人がちゃんと入ってるか見よう。さっき、うれしそうだったね」
}
-> END
