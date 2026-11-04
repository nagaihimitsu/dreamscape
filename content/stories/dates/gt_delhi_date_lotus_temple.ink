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

# background: gt_bg_delhi_lotus_temple
# speaker: narrator
ロータス寺院の白い輪郭を見て、{heroine_name}が足を止めた。近づく道の先に、花びらのような形が重なっている。
# speaker: heroine
# emotion: happy
「ほんとに、咲きかけの花みたい。近くで見ると、曲がってるところが大きいね」
# speaker: narrator
入口の案内を読み、二人は声を落とした。信仰を問わず、祈りや瞑想のために訪ねられるバハイの礼拝堂だという。
# speaker: heroine
「わたし、静かにしていると、何か立派なことを考えなきゃって焦る時がある」
{ relationship_tone == "reserved" || relationship_tone == "strained":
    # speaker: narrator
    彼女は言い過ぎたか確かめるように、こちらの顔を見た。
- else:
    # speaker: heroine
    # emotion: teasing
    「考えた結果が『あとで水を飲もう』でも、先に言っておけば驚かないでしょ」
}

* [「何を考えたか、話さなくてもいいと思う」]
    # effect: gt_delhi_date_lotus_temple_first_attentive
    { romance_result == "negative":
        # speaker: heroine
        「話したくなった時は聞いてね。今はまだ、どっちか分からないから」
    - else:
        # speaker: heroine
        # emotion: smile
        「うん。感想を用意しなくていいなら、気が楽になった」
    }
    -> after_first

* [「水のことは、二人で覚えておこう」]
    # effect: gt_delhi_date_lotus_temple_first_playful
    { romance_result == "negative":
        # speaker: heroine
        「忘れないように、って話じゃなかったんだけど。……でも、出たら飲もうね」
    - else:
        # speaker: heroine
        # emotion: smile
        「大事な共同作業になった。じゃあ、今はそれも少し置いておきます」
    }
    -> after_first

* [「自分も、うまい感想は浮かばないかもしれない」]
    # effect: gt_delhi_date_lotus_temple_first_honest
    { romance_result == "negative":
        # speaker: heroine
        「先に決めなくてもいいよ。何か浮かんだら、わたしは聞きたい」
    - else:
        # speaker: heroine
        「そっか。じゃあ二人とも、いいことを言う準備はしないで入ろう」
        # speaker: narrator
        彼女は案内をしまい、背中を少し伸ばした。
    }
    -> after_first

=== after_first ===
# speaker: narrator
二人は案内に従って入る。互いを急かさず、静かに過ごした。口を開きかけることもあったが、言葉にしないまま座っていられた。
# speaker: narrator
外に出てからも、彼女はすぐには話さなかった。人の流れから離れ、水を一口飲んで、ようやく笑う。
# speaker: heroine
# emotion: smile
「水のことは、覚えてました」
# speaker: narrator
彼女は白い建物を振り返る。入る前よりも、少しゆっくり目で追った。
# speaker: heroine
「あの中で、帰ったら誰に連絡しようかなって考えてた。何を見たか、話したくなった人がいて」
# speaker: heroine
「その後は、何もまとまらなかった。そっちは？　話しても、話さなくてもいいけど」

* [「今は、もう少し言葉にしないでいたい」]
    # effect: gt_delhi_date_lotus_temple_second_honest
    { romance_result == "negative":
        # speaker: heroine
        「そっか。聞きたい気持ちが先に出ちゃった。でも、急がせないよ」
        # speaker: narrator
        彼女は少しだけ残念そうにし、それでも次の問いを重ねなかった。
    - else:
        # speaker: heroine
        「うん。そのまま持っていこう。後で話したくなったら、その時に」
        # speaker: narrator
        彼女も無理に話題を足さず、隣で歩き出した。
    }
    -> ending

* [「隣にいるのを確かめたら、落ち着いた」]
    # effect: gt_delhi_date_lotus_temple_second_bold
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        「それはうれしいけど、わたしがいるかずっと気にしなくても大丈夫だよ。自分の時間も持ってね」
    - else:
        # speaker: heroine
        # emotion: shy
        「わたしも、一度だけ横を見た。邪魔しないで一緒にいられるの、いいね」
        # speaker: narrator
        彼女は今度は逃げずに、こちらの顔を見た。
    }
    -> ending

* [「連絡したい人には、何を話すの？」]
    # effect: gt_delhi_date_lotus_temple_second_attentive
    { romance_result == "negative":
        # speaker: heroine
        「そこは、まだ自分の中で考えておきたいな。誰に何を言うかも、旅の間に決めたい」
    - else:
        # speaker: heroine
        「ここで静かにしてた、って。それと、ちゃんと自分から寄り道を選んでるよって話す」
        # speaker: narrator
        彼女は少し照れくさそうに言い、その後は普段どおりの顔に戻った。
    }
    -> ending

=== ending ===
# speaker: narrator
白い花の形が、歩くごとに少しずつ重なりを変える。二人は出口へ向かい、時々だけ振り返った。
{ relationship_tone_after == "warm" || relationship_tone_after == "romantic_tension":
    # speaker: heroine
    # emotion: smile
    「今日、同じことを考えてなくても一緒に来てよかったって思った。そういう時間もあるんだね」
- else:
    # speaker: heroine
    # emotion: smile
    「静かな所に来たら、全部静かになるわけじゃないんだね。頭の中、案外忙しかった」
}
# speaker: narrator
彼女は残りの水を確かめてから、鞄を閉じた。次の話は、歩き始めてしばらくしてからだった。
-> END
