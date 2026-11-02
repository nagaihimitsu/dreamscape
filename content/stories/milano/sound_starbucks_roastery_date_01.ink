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

# background: milano_starbucks_roastery_date
# speaker: narrator
豆を選ぶ人の手元を眺めながら、彼女が自分のポケットを両方裏返した。糸くずが一つ落ちた。
# speaker: heroine
「今日は豆を買いません。買わない日のほうが、値段を見ずに好きなのを選べるから。」
# speaker: player
「じゃあ、どれを僕に選ぶ？」
# speaker: heroine
「待って。そこ、当ててもらう側も参加する仕組みにしたい。」
{
- relationship_tone == "strained" || relationship_tone == "reserved":
# speaker: narrator
彼女はポケットの口を丁寧に整えた。
- relationship_tone == "romantic_tension" || relationship_tone == "warm":
# speaker: narrator
彼女は主人公のポケットまでのぞくふりをした。
}

* [「僕のヒントは朝寝坊」]
    # effect: common_date_first_playful
    { romance_result == "negative":
        # speaker: heroine
        「朝寝坊だけじゃ味が分かんないよ。好きな朝ごはんから聞いていい？」
    - else:
        # speaker: heroine
        「じゃあ香りで起こす係を探そう。コーヒーに任せて、私は二度寝。」
    }
    -> join_1

* [「先に、君の好みを当てる」]
    # effect: common_date_first_bold
    { romance_result == "negative":
        # speaker: heroine
        「当てられる前に、自分で決めたいな。私の番を少し待って。」
    - else:
        # speaker: heroine
        「どうぞ。私の顔を見て答え直すのは一回まで。」
    }
    -> join_1

* [「選んだ理由を交換しよう」]
    # effect: common_date_first_attentive
    { romance_result == "negative":
        # speaker: heroine
        「理由までうまく言えるかな。今日は匂いだけで決めてもいい？」
    - else:
        # speaker: heroine
        「賛成。値札の代わりに理由がついてるおみやげだ。」
    }
    -> join_1

=== join_1 ===
# speaker: narrator
焙煎の様子の見える場所で、彼女は甘い香りのほうへ少し寄った。
# speaker: heroine
「ここ、昔は郵便局だったんだって。香りも届けられたらよかったのに。」
「実は、私に選んでほしかったのは豆？　それとも、考えてる時間のほう？」

* [「ばれた。後のほう」]
    # effect: sound_starbucks_roastery_date_01_2_1
    { romance_result == "negative":
        # speaker: heroine
        「そっか。私は本当に、気に入る味を見つけたかったよ。」
    - else:
        # speaker: heroine
        「私も。ちゃんと考えたから、今日は空のポケットで大成功。」
    }
    -> join_2

* [「糸くずに似合う味」]
    # effect: sound_starbucks_roastery_date_01_2_2
    { romance_result == "negative":
        # speaker: heroine
        「それは洗濯で落とそう。今はちゃんと選んでるんだから。」
    - else:
        # speaker: heroine
        「いちばん長く旅してるやつだ。持ち主より先におみやげ決まったね。」
    }
    -> join_2

* [「今日だけ答えは持ち帰る」]
    # effect: sound_starbucks_roastery_date_01_2_3
    { romance_result == "negative":
        # speaker: heroine
        「秘密ばっかりは寂しい。ひとことでも聞かせて。」
    - else:
        # speaker: heroine
        「じゃあ宿題。次に聞いたとき、ちゃんと自分の言葉でね。」
    }
    -> join_2

=== join_2 ===
{ relationship_tone_after == "romantic_tension" || relationship_tone_after == "guarded_attraction":
# speaker: narrator
彼女は鼻先を近づけ、上着に残った香りを笑った。
}
# speaker: narrator
彼女はポケットを戻し、店を出た。焙煎の匂いだけが、しばらく上着についてきた。
-> END
