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

# background: gt_bg_agra_guru_ka_taal
# speaker: narrator
グル・カ・タールの入口で、二人は案内に従って靴を預け、頭を覆った。{heroine_name}は身支度を確かめてから、砂岩の塔に目を止める。
# speaker: heroine
# emotion: surprised
「あそこにも塔がある。今見てた建物と、少し感じが違うね」
# speaker: narrator
ほかの人が進む方へ一歩踏み出しかけ、彼女は止まった。見学できる範囲を案内で確かめ、こちらへ顔を向ける。
# speaker: heroine
# emotion: smile
「みんなについていこうとしてた。わたし、先にあの塔のことを知りたいな」
{ relationship_tone == "warm" || relationship_tone == "comfortable":
# speaker: heroine
# emotion: teasing
「今日は、わたしが先に見つけました。見学の順番も、提案していい？」
- else:
# speaker: heroine
「{player_address}は、どこを見てた？　お互いに見たいところ、先に確かめよう」
}

* [「見たい方を、先に案内して」]
    # effect: gt_agra_date_guru_ka_taal_first_attentive
    { romance_result == "negative":
        # speaker: heroine
        「案内できるほどは、まだ分からないよ。一緒に説明を見てほしいな」
    - else:
        # speaker: heroine
        「うん。じゃあ、あの案内から見よう。何の塔なのか気になる」
    }
    -> after_first
* [「今日は発見係が早いね」]
    # effect: gt_agra_date_guru_ka_taal_first_playful
    { romance_result == "negative":
        # speaker: heroine
        「早い方が勝ち、ではないんだけどね。そっちが気付いたものも聞きたいよ」
    - else:
        # speaker: heroine
        # emotion: smile
        「今なら、もう一つくらい見つけられそう。足元も見て歩きます」
    }
    -> after_first
* [「自分は、今の建物の方を見ていた」]
    # effect: gt_agra_date_guru_ka_taal_first_honest
    { romance_result == "negative":
        # speaker: heroine
        「そっちを先に見たかった？　わたし、一人で決めかけちゃったね。順番は相談しよう」
    - else:
        # speaker: heroine
        # emotion: smile
        「じゃあ、あとでそこも見よう。同じところにいても、最初に目に入るものが違うんだね」
    }
    -> after_first

=== after_first ===
# speaker: narrator
礼拝する人の妨げにならないよう、二人は案内を確かめながら見学した。説明には、かつての貯水施設と砂岩の塔について記されている。
# speaker: heroine
「ここ、昔の水をためる場所ともつながってるんだね。塔を見ただけじゃ、分からなかった」
# speaker: narrator
建物の説明を読んだあと、彼女はスマートフォンをしまう。撮るものを探さず、その場の人の動きに合わせて立ち止まった。
# speaker: heroine
# emotion: neutral
「もう少し、静かにここにいたいな。何か話さなきゃって、考えないで」

* [「話したくなるまで、ここにいよう」]
    # effect: gt_agra_date_guru_ka_taal_second_attentive
    { romance_result == "negative":
        # speaker: heroine
        「うん。でも、話すまで待たれてるって思うと、気になっちゃう。景色も見てて」
    - else:
        # speaker: heroine
        # emotion: smile
        「ありがとう。わたしの顔を見て待たなくても、大丈夫だからね」
    }
    -> ending
* [「一緒なら、黙っている時間も好きだ」]
    # effect: gt_agra_date_guru_ka_taal_second_bold
    { romance_result == "negative":
        # speaker: heroine
        「今は、そういう返事を考える時間にもしたくないな。少しだけ、何も言わずにいたい」
    - else:
        # speaker: heroine
        # emotion: shy
        「うん。わたしも、今はこうしていたい。返事は、それだけでいい？」
    }
    -> ending
* [「自分も、少し落ち着いていたい」]
    # effect: gt_agra_date_guru_ka_taal_second_honest
    { romance_result == "negative":
        # speaker: heroine
        「何か気になってる？　……聞かなくていいか。話したいときに聞くね」
    - else:
        # speaker: heroine
        「そっか。じゃあ、二人ともそうしよう。出るときは、目で合図して」
    }
    -> ending

=== ending ===
# speaker: narrator
しばらくして彼女がこちらを見る。目が合って、二人は静かに出口へ向かった。
# speaker: narrator
預けていた靴を受け取ると、彼女は片方を履く前に中を確かめた。身支度を整えてから、もう一度塔の方を振り向く。
# speaker: heroine
# emotion: smile
「最初に見つけた塔、帰りも気になっちゃうね。次に思い出すときも、あそこから始まりそう」
{ relationship_tone_after == "warm" || relationship_tone_after == "comfortable":
# speaker: heroine
# emotion: teasing
「帰り道では、そっちが見つけたものも教えてね。わたし、一つ見始めると長いから」
- else:
# speaker: heroine
「このあと、少し休んでから行こう。次の行き先も、そこで決めたいな」
}
# speaker: narrator
返すものを返し終え、二人は入口を離れる。彼女は今度はこちらが歩き出すのを待ち、隣へ並んだ。
-> END
