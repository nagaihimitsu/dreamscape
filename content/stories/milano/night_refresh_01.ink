// ナヴィリオの夜：住む人のいる景色と、写真に入れない選択。
VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR relationship_tone = "reserved"
VAR relationship_tone_before = "reserved"
VAR relationship_tone_after = "reserved"
VAR romance_result = "neutral"
VAR affection_delta = 0
VAR trust_delta = 0
VAR spark_delta = 0
-> start

=== start ===
# background: milano_night_landmark
# speaker: narrator
ナヴィリオ・グランデの橋で、{heroine_name}がカメラの画面を見せた。
# speaker: heroine
「運河を撮ったつもりなのに、窓の方が気になっちゃう」
# speaker: narrator
水に映った灯りの奥に、向かいの建物も写っていた。
# speaker: heroine
「この辺には、いくつもの家の玄関が同じ廊下に並ぶ建物があるんだって」
「住んでる人がいる景色を好きだと思う。でも、知らない人の暮らしを勝手に大きく撮るのは違うかな」
{
- relationship_tone == "strained":
彼女はカメラを下ろし、答えを急がずに水面を見た。
- else:
彼女はファインダーをのぞき直し、画角を変えた。
}
# speaker: heroine
「どうしよう。灯りだけ残す方法、あるかな」

* [「水面に映った灯りだけを撮ってみる？」]
    # effect: milano_night_first_joke_refresh
    { romance_result == "negative":
        # speaker: heroine
        「それだと、何の灯りだったか分からなくならないかな」
        # speaker: narrator
        彼女は画面を確かめてから、もう一度構えた。
    - else:
        # speaker: heroine
        「上下逆さまの街だ。……これなら窓は写らないね」
        # speaker: narrator
        彼女はレンズを水のほうへ傾けた。
    }
    -> photo
* [「橋の端から、もう一度構図を探そう」]
    # effect: milano_night_first_listen_refresh
    { romance_result == "negative":
        # speaker: heroine
        「移動する前に、この角度も試したいな」
        # speaker: narrator
        彼女は欄干を避けて一歩下がった。
    - else:
        # speaker: heroine
        「うん。通る人の邪魔にならない端っこでね」
        # speaker: narrator
        彼女は半歩譲り、二人で橋の端に立った。
    }
    -> photo
* [「写真を探してる君の表情が、いちばんいい」]
    # effect: milano_night_first_honest_refresh
    { romance_result == "negative":
        # speaker: heroine
        「今は景色の相談をしてたんだけど」
        # speaker: narrator
        彼女はカメラを持ち直した。
    - else:
        # speaker: heroine
        「今の私？　たぶん眉間にしわが寄ってるよ」
        # speaker: narrator
        彼女は額を指で押さえ、それから笑った。
    }
    -> photo

=== photo ===
# speaker: narrator
{
- relationship_tone_after == "strained":
彼女はカメラの画面を消し、少し距離をあけて立った。
- else:
彼女は画面を二人の間に差し出した。
}
川面の光は、波が来るたびに別の形になった。
# speaker: heroine
「廊下も窓も写さなくても、この場所を思い出せるかな」
「私が一番覚えていたいのは、いろんな人が暮らしてる街だって気づいたことかもしれない」

* [「写真の題名は『逆さまのミラノ』にしよう」]
    # effect: milano_night_second_joke_refresh
    { romance_result == "negative":
        # speaker: heroine
        「勝手に題名つけた。まだ撮るか決めてないよ」
    - else:
        # speaker: heroine
        「じゃあ横に『落ちたわけではありません』って書いてね」
    }
    -> ending
* [「写真がなくても、今日の話は覚えておきたい」]
    # effect: milano_night_second_listen_refresh
    { romance_result == "negative":
        # speaker: heroine
        「ありがとう。でも私は一枚くらい撮りたいな」
    - else:
        # speaker: heroine
        「うん。忘れたら、どっちかが話し直そう」
        # speaker: narrator
        彼女は水面を見ながら頷いた。
    }
    -> ending
* [「今度は君が撮りたい景色を一緒に探したい」]
    # effect: milano_night_second_honest_refresh
    { romance_result == "negative":
        # speaker: heroine
        「いいよ。でも次はあなたが見たいものも教えて」
    - else:
        # speaker: heroine
        「約束。私、きっとまた長く迷うけど」
        # speaker: narrator
        彼女はカメラをしまい、帰り道の方角を尋ねた。
    }
    -> ending

=== ending ===
# speaker: narrator
橋から降りると、運河沿いの店の灯りが近くなった。
# speaker: heroine
「次は温かいものが写ってる景色がいいな。……飲めるとなおいい」
-> END
