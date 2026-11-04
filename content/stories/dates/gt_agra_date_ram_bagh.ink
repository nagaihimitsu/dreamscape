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

# background: gt_bg_agra_ram_bagh
# speaker: narrator
ラム・バーグの園路に入ると、{heroine_name}は歩く速さを落とした。地図を開きかけ、そのまま鞄へ戻す。
# speaker: heroine
# emotion: neutral
「今日はここで、少し休みたいな。来て早々なんだけど」
# speaker: narrator
彼女が選んだのは、通路から少し離れた休める場所だった。腰を下ろして、両足をそろえ直す。
# speaker: heroine
「庭を歩きに来たのにって、ちょっと思った。でも、今は座った方が楽しめそう」
{ relationship_tone == "strained" || relationship_tone == "reserved":
# speaker: heroine
「{player_address}は、見たいところある？　無理に合わせなくていいからね」
- else:
# speaker: heroine
# emotion: teasing
「次々行きたい気持ちと、足の意見が割れました。今は足に一票」
}

* [「ここで一緒に休もう」]
    # effect: gt_agra_date_ram_bagh_first_attentive
    { romance_result == "negative":
        # speaker: heroine
        「ありがとう。でも、わたしに合わせて長く休まなくても大丈夫。行きたくなったら教えてね」
    - else:
        # speaker: heroine
        # emotion: smile
        「うん。座る場所を探すだけで、ちょっと元気になった。変なの」
    }
    -> after_first
* [「足の代表として賛成します」]
    # effect: gt_agra_date_ram_bagh_first_playful
    { romance_result == "negative":
        # speaker: heroine
        「ふふ。でも今は、議論より水がほしいかも。鞄を取らせて」
    - else:
        # speaker: heroine
        # emotion: happy
        「可決。では、地図を閉じてください。これより休憩に入ります」
    }
    -> after_first
* [「自分も、座りたかった」]
    # effect: gt_agra_date_ram_bagh_first_honest
    { romance_result == "negative":
        # speaker: heroine
        「それなら、もう少し早く言ってくれてよかったのに。わたしだけ我慢してないか気になってた」
    - else:
        # speaker: heroine
        「そうなの？　じゃあ、わたしが先に言えてよかった。二人とも待ってたんだね」
    }
    -> after_first

=== after_first ===
# speaker: narrator
水を飲み、しばらく園路を行く人を眺める。彼女は手元の案内だけを開いた。
# speaker: heroine
「この庭、バーブルの時代に造られたんだって。初期のムガル庭園の一つ。歩く道や水路が、ここにもあるんだね」
# speaker: narrator
先へ進む人を見送ったあと、彼女はこちらの足元を見た。片方の靴紐が、ゆるんでいる。
# speaker: heroine
# emotion: smile
「そこ、結び直しておこう。休んでる間に、わたしは次に見るところを一つだけ探す」
# speaker: narrator
彼女は地図ではなく、目の前の園路を見回した。
# speaker: heroine
「このまま、もう少しここにいる？　それとも、あの道を少しだけ歩く？」

* [「今の場所から見えるものを探そう」]
    # effect: gt_agra_date_ram_bagh_second_attentive
    { romance_result == "negative":
        # speaker: heroine
        「探すって決めると、ちょっと忙しいかも。わたしは、もう少しぼんやり見てたい」
    - else:
        # speaker: heroine
        「いいね。さっきから同じところを見てるのに、人が通ると違って見える」
    }
    -> ending
* [「歩くなら、ゆっくり並んで行こう」]
    # effect: gt_agra_date_ram_bagh_second_bold
    { romance_result == "negative":
        # speaker: heroine
        「うん。でも今すぐは、まだ。わたしが立つまで、少し待ってて」
    - else:
        # speaker: heroine
        # emotion: shy
        「うん。急がない約束なら。わたしが立ち止まっても、置いていかないでね」
    }
    -> ending
* [「あと少し、何もしないでいたい」]
    # effect: gt_agra_date_ram_bagh_second_honest
    { romance_result == "negative":
        # speaker: heroine
        「わたしは少し歩きたくなってきた。でも、急がなくて大丈夫。ここから見てる」
    - else:
        # speaker: heroine
        # emotion: smile
        「賛成。何もしないって、わざわざ言うと少し楽しいね」
    }
    -> ending

=== ending ===
# speaker: narrator
二人が立ち上がったのは、どちらからともなく鞄を持ったときだった。彼女が先に靴紐を確かめ、こちらへ目配せする。
# speaker: heroine
# emotion: teasing
「今度は大丈夫。足の意見も一致したみたい」
{ relationship_tone_after == "warm" || relationship_tone_after == "comfortable":
# speaker: heroine
# emotion: smile
「休みたいって、また先に言うかも。そっちから言ってくれるのも、待ってるね」
- else:
# speaker: heroine
# emotion: smile
「あの道を見てから出よう。今なら、ゆっくり歩けそう」
}
# speaker: narrator
地図は開かず、見えるところまで歩いてみる。先ほどより、二人の歩幅がそろっていた。
-> END
