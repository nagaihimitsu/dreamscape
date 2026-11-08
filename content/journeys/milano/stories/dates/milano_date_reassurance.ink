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

# background: milano_city_date_landmark
# speaker: narrator
ガッレリアの混雑が切れ、二人の前に柱二本ぶんの空間ができた。彼女がその真ん中で止まる。
# speaker: heroine
「あの返事、今日はしないって先に言わせて。そうしたら、普通の話をしても逃げてるみたいにならないから。」
{
- relationship_tone == "strained" || relationship_tone == "reserved":
# speaker: narrator
彼女は次の柱に向かって息を吐いた。
- relationship_tone == "romantic_tension" || relationship_tone == "warm":
# speaker: narrator
彼女は隣を見てから、二人に聞こえる声で話し始めた。
}

* [「じゃあ、夕飯の話がしたい」]
    # effect: sound_reassurance_01_1_1
    { romance_result == "negative":
        # speaker: heroine
        「いきなり切り替えるの難しいね。もうちょっと並んで歩こう。」
    - else:
        # speaker: heroine
        「いいね。お腹がすいたって、ずっと言いにくかった。」
    }
    -> join_1

* [「待つのは得意じゃない、と伝える」]
    # effect: sound_reassurance_01_1_2
    { romance_result == "negative":
        # speaker: heroine
        「今日はその言葉が、少しだけ急かす音に聞こえた。時間をください。」
    - else:
        # speaker: heroine
        「言ってくれてありがとう。うまく待てなくてもいい。私が決めたら、私から話す。」
    }
    -> join_1

* [「普通の話、僕から失敗していい？」]
    # effect: sound_reassurance_01_1_3
    { romance_result == "negative":
        # speaker: heroine
        「無理に面白くしなくていいよ。そばにいてくれるだけで。」
    - else:
        # speaker: heroine
        「どうぞ。一つ目の話題に天気を持ってきたら、私も盛大に失敗してあげる。」
    }
    -> join_1

=== join_1 ===
{ relationship_tone_after == "romantic_tension" || relationship_tone_after == "guarded_attraction":
# speaker: narrator
まだ返事のない二人の靴が、もう一本の柱まで進んだ。
}
# speaker: narrator
次の柱まで歩いて、彼女から「昨日、何食べた？」と尋ねた。その答えだけを、今日はちゃんと待った。
-> END
