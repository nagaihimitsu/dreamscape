// Phase 2 試遊用短編。夕暮れの散歩。通常デート：3択を2回。
VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR romance_stage = 1
VAR memory_callback = ""
VAR confession_ready = false

VAR romance_result = "neutral"
VAR affection_delta = 0
VAR trust_delta = 0
VAR spark_delta = 0

-> start

=== start ===
# background: milano_walk_landmark
# speaker: narrator
夕暮れのドゥオモ広場。{heroine_name}が大聖堂の尖塔を見上げた。
# speaker: heroine
「あの金色の像より高い建物を建てない、っていう習慣があったんだって」
「後から高いビルができたときは、屋上に像の写しを置いたそうなの」
「背比べに負けそうなら、自分をもう一人連れていく。……ちょっとずるいかも」
# speaker: narrator
広場の端で、二人の影だけが先に伸びていた。
{heroine_name}が足を止めた。視線の先には、少し傾いた街灯がある。
# speaker: heroine
「この街灯、ずっと気になってた。なんだか、話を聞こうとしてるみたいで」

* [「内緒話には向かなそうだね。耳が高すぎる」]
    # effect: milano_walk_first_joke
    { romance_result == "negative":
        # speaker: heroine
        # emotion: neutral
        「秘密を話す前に、声が届くか試さないとね」
        # speaker: narrator
        彼女は街灯を見上げた。つま先は上げなかった。
    - else:
        # speaker: heroine
        「……背伸びして秘密を言うの、かなり目立つね」
        # speaker: narrator
        彼女は一度だけつま先を上げ、何事もなかったように戻した。
    }
    -> sketch

* [「少しここで見ていこう。急ぐ用事もないし」]
    # effect: milano_walk_first_listen
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        「立ち止まるには、ここ、人が多いかな」
        # speaker: narrator
        彼女は通り過ぎる人を避けて、一歩脇へ寄った。
    - else:
        # speaker: heroine
        「じゃあ、こっち側から。傾き方がいちばんいいの」
        # speaker: narrator
        彼女の指が指したのは、写真には入りそうもない狭い隙間だった。
    }
    -> sketch

* [「そういうものを見つけるところ、好きだな」]
    # effect: milano_walk_first_honest
    { romance_result == "negative":
        # speaker: heroine
        # emotion: shy
        「……街灯の話をしてたんだけどな」
        # speaker: narrator
        彼女は鞄の紐を握り、広場のほうを向いた。
    - else:
        # speaker: heroine
        「……街灯の趣味を褒められたのは、初めて」
        # speaker: narrator
        彼女は街灯を見上げたまま、鞄の紐を持ち直した。
    }
    -> sketch

=== sketch ===
# speaker: narrator
{heroine_name}はメモ帳の端に、街灯を描き始めた。
描き終えた線は、実物よりさらに傾いていた。
# speaker: heroine
「……これだと、今にも倒れそう」
{romance_stage >= 3:
    「{player_address}、笑ってもいいよ。もう自分で笑ったから」
- else:
    「{player_address}には、まだ見せないつもりだったんだけど」
}

* [「支える人も描こうか。すごく忙しい絵になる」]
    # effect: milano_walk_second_joke
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        「この線、もう少し自分で直してみたい」
        # speaker: narrator
        彼女はペンを持ったまま、描き足す場所を探した。
    - else:
        # speaker: heroine
        「その人の休憩時間も描いてね」
        # speaker: narrator
        彼女は街灯の下に、小さな椅子を一つ足した。
    }
    -> ending

* [「消さないでおこう。今日ここで描いた線だから」]
    # effect: milano_walk_second_listen
    { romance_result == "negative":
        # speaker: heroine
        # emotion: neutral
        「消すかどうかは、もう少し迷わせて」
        # speaker: narrator
        彼女は消しゴムに触れたまま、傾いた線を眺めた。
    - else:
        # speaker: heroine
        「……そう言われると、消しにくいな」
        # speaker: narrator
        消しゴムは鞄に戻った。傾いた線は、ページに残った。
    }
    -> ending

* [「次は隣で描いてもいい？　上手くはないけど」]
    # effect: milano_walk_second_honest
    { romance_result == "negative":
        # speaker: heroine
        # emotion: teasing
        「まずは、その上手くない絵を見せてからね」
        # speaker: narrator
        彼女は紙を裏返した。自分の絵も、まだ隠している。
    - else:
        # speaker: heroine
        「上手だったら、隣は少し考える」
        # speaker: narrator
        彼女はそう言って、ページの半分を空けた。
    }
    -> ending

=== ending ===
# speaker: narrator
歩き出すと、影はまた二人より先に伸びた。
今度は急いで追いかけず、同じ角をゆっくり曲がった。
-> END
