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

# background: gt_bg_jaipur_jaigarh_fort
# speaker: narrator
ジャイガル城の見学路で、彼女が足を止めた。城壁の向こうには丘の起伏が続いている。
# speaker: heroine
「景色が開けるたび、あっちも見たくなる。さっきまで、もう十分歩いたと思ってたのに」
# speaker: narrator
一歩進みかけて、彼女はふくらはぎをさする。景色を見たい気持ちに、足が追いついていないらしい。
# speaker: heroine
# emotion: exasperated
「だめだ。先に休もう。足の方から、はっきり返事が来た」
{ relationship_tone == "reserved" || relationship_tone == "strained":
# speaker: heroine
「少し待ってもらってもいい？　急いでついていくと、かえって遅くなりそう」
- else:
# speaker: heroine
# emotion: teasing
「ここはわたしが足を休める係。そっちは、よさそうな眺めを探す係でお願い」
}

* [「水を飲んでから決めよう」]
    # effect: gt_jaipur_date_jaigarh_fort_first_attentive
    { romance_result == "negative":
        # speaker: heroine
        「水はさっき飲んだから大丈夫。今は、ただ止まっていたいな」
    - else:
        # speaker: heroine
        # emotion: smile
        「うん。飲みながら見る景色も、ちゃんと景色だもんね」
    }
    -> after_first
* [「足の返事には逆らえないね」]
    # effect: gt_jaipur_date_jaigarh_fort_first_playful
    { romance_result == "negative":
        # speaker: heroine
        「笑い話にするには、まだ少し疲れてる。もうちょっと待って」
    - else:
        # speaker: heroine
        # emotion: teasing
        「かなり強い口調でした。景色の方にも待ってもらいます」
    }
    -> after_first
* [「こちらも少し休みたかった」]
    # effect: gt_jaipur_date_jaigarh_fort_first_honest
    { romance_result == "negative":
        # speaker: heroine
        「合わせてくれてるなら、無理しなくていいよ。わたしはわたしで休むから」
    - else:
        # speaker: heroine
        「じゃあ、ちょうどよかった。二人とも、景色に引っ張られてたんだね」
    }
    -> after_first

=== after_first ===
# speaker: narrator
通行の邪魔にならない場所で、二人並んで立つ。足を動かさずに目だけを動かすと、城壁が丘をたどって延びているのがよく見えた。
# speaker: heroine
「ここも、アンベールの宮殿と地下通路でつながっていたんだって。別々に名前がついていると、別々の場所に見えちゃうね」
# speaker: narrator
彼女は案内の図をたどる。通路へ向かうのではなく、今いる城が周囲とどうつながるかを確かめている。
# speaker: heroine
「もう少しここから見たいな。歩いてる間は、足元ばっかり見てたから」

* [「同じ場所から、違う方を見てみよう」]
    # effect: gt_jaipur_date_jaigarh_fort_second_attentive
    { romance_result == "negative":
        # speaker: heroine
        「今は、この壁の続きが気になってる。もう少し同じ方を見ていたい」
    - else:
        # speaker: heroine
        # emotion: smile
        「いいね。あ、こっちにも尾根が続いてる。歩かなくても、見つかるものはあるね」
    }
    -> ending
* [「ここから、いい眺めを探してみる」]
    # effect: gt_jaipur_date_jaigarh_fort_second_playful
    { romance_result == "negative":
        # speaker: heroine
        「今は探すより、同じ方を一緒に見てほしいな」
    - else:
        # speaker: heroine
        # emotion: teasing
        「報酬は、わたしが見つけた景色の情報です。けっこう役に立つかも」
    }
    -> ending
* [「ここからの眺めが、一番気に入った」]
    # effect: gt_jaipur_date_jaigarh_fort_second_honest
    { romance_result == "negative":
        # speaker: heroine
        「わたしは、まだ一番は決められない。でも、ここがよく見えるのは賛成」
    - else:
        # speaker: heroine
        「そっか。じゃあ、足にお礼を言わないと。止まってよかったね」
    }
    -> ending

=== ending ===
{ relationship_tone_after == "warm" || relationship_tone_after == "romantic_tension":
# speaker: narrator
彼女が図をこちらへ寄せる。二人の指が、違う城壁を同時にたどっていた。
- else:
# speaker: narrator
彼女は図を開いたまま、城壁と見比べる。さっきよりゆっくりした動きだった。
}
# speaker: heroine
# emotion: smile
「よし、もう少し歩けそう。でも次も、気になったら止まろうね。疲れる前でも」
# speaker: narrator
彼女が足を踏み出す。今度は地面を確かめたあと、顔を上げて城壁の先を見た。
-> END
