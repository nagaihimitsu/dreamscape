// ナヴィリオの洗濯場から、道を決めずに歩く。
VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR romance_stage = 1
VAR ending_reached = false
VAR has_cafe_memory = false
VAR relationship_tone = "reserved"
VAR relationship_tone_before = "reserved"
VAR relationship_tone_after = "reserved"
VAR romance_result = "neutral"
VAR affection_delta = 0
VAR trust_delta = 0
VAR spark_delta = 0

# background: milano_navigli_date
# speaker: narrator
ナヴィリオ・グランデ沿いを歩いていると、{heroine_name}が急に足を止めた。
# speaker: heroine
# emotion: surprised
「ちょっと待って。あの屋根、何だろう」
# speaker: narrator
彼女が見つけた細い路地には、傾いた石が水路に沿って並んでいる。
# speaker: heroine
「ヴィーコロ・デイ・ラヴァンダイ……昔、ここで洗濯をしていたんだって」
「水のすぐそばで。冬もここに来たのかな」
{
- relationship_tone == "strained":
彼女は路地の入口で立ち止まり、水路と石を見比べた。
- relationship_tone == "guarded_attraction":
彼女は身を乗り出しかけて、隣との距離を確かめた。
- relationship_tone == "comfortable":
彼女は案内を読み終える前に、奥の石を指さした。
- relationship_tone == "warm":
彼女は読んでいた案内から顔を上げ、こちらに石を指さした。
- relationship_tone == "romantic_tension":
彼女は水路をのぞいて、並んだ二人の影を見つけて笑った。
- else:
彼女はもう一度案内を読み、石と水路を交互に見た。
}
# speaker: heroine
「景色を見に来たのに、働いてた人のことが気になっちゃった」

* [「洗濯物を干す場所まで探しに行こうか」]
    # effect: milano_navigli_v2_first_joke
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        「今も誰かが暮らしてる場所だし、のぞきすぎはやめておこう」
        「ここから見えるところだけで十分、面白いよ」
    - else:
        # speaker: heroine
        # emotion: smile
        「探検隊だ。……でも、よその家の洗濯物は見ないこと！」
        「案内のある道までにしようね」
    }
    -> after_first
* [「あの石、使いやすい角度に見える？」]
    # effect: milano_navigli_v2_first_listen
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        「うーん、実際に使ったことがないから、自信ないな」
        「でも、水に近いと何度も運ばなくてよさそう」
    - else:
        # speaker: heroine
        # emotion: smile
        「腰をかがめて、ここで洗うのかな」
        「見てるだけなら簡単そうだけど、毎日は大変そう」
    }
    -> after_first
* [「気になるなら、もう少しここにいよう」]
    # effect: milano_navigli_v2_first_honest
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        「ありがとう。でも、あなたが見たいものも教えてね」
        「わたしに合わせるだけの散歩にはしたくないな」
    - else:
        # speaker: heroine
        # emotion: smile
        「うん、あと少し。あの石が並んでるところを見たい」
        「行き先を決めてなくてよかったね」
    }
    -> after_first

=== after_first ===
# speaker: narrator
路地を出ると、運河の向こう岸の窓が水面で細く揺れていた。
# speaker: heroine
「川みたいに見えるけど、運河なんだよね。街の中を水の道が通ってる」
「ねえ、次の橋、渡る？　それとも向こうまで歩く？」

* [「橋の上から、さっきの路地を探そう」]
    # effect: milano_navigli_v2_second_joke
    { romance_result == "negative":
        # speaker: heroine
        # emotion: teasing
        「さっき曲がった場所、覚えてる？」
        「わたしは……たぶん、覚えてる」
    - else:
        # speaker: heroine
        # emotion: happy
        「賛成。見つからなかったら、二人とも迷子ってことで」
        「あ、まだ出発してないのに笑わないで」
    }
    -> ending
* [「君が見たい景色はどっち？」]
    # effect: milano_navigli_v2_second_listen
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        「わたしは橋。でも、{player_address}の希望も聞かせて」
    - else:
        # speaker: heroine
        # emotion: smile
        「橋かな。水面の色が、向こうからどう見えるか気になる」
        「あなたは？　違うなら、両方行こう」
    }
    -> ending
* [「遠回りしてもいい。一緒に見ていたい」]
    # effect: milano_navigli_v2_second_honest
    { romance_result == "negative":
        # speaker: heroine
        # emotion: shy
        「そう言われると、橋の話をしてたのを忘れそう」
        「先に渡るかどうか、決めようか」
    - else:
        # speaker: heroine
        { relationship_tone_after == "romantic_tension":
            # emotion: shy
            「うん。じゃあ、迷ってる時間も数に入れてね」
        - else:
            # emotion: smile
            「遠回りは賛成。地図に載ってない発見があるかもしれないし」
        }
    }
    -> ending

=== ending ===
# speaker: narrator
橋へ向かう途中、{heroine_name}はさっきの路地を振り返った。
# speaker: heroine
「洗濯場から始まる散歩って、予定表には書かなかっただろうな」
「でも、わたしは好き。こういう予定外」
-> END
