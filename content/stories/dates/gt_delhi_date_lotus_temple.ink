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
ロータス寺院の白い花びらのような輪郭を見て、{heroine_name}が足を止める。信仰を問わず祈りや瞑想のために訪ねられる、バハイの礼拝堂だ。
# speaker: heroine
# reaction: heroine,happy,sparkle
「写真より、花びらの間が広い。中に入ったら、どんな感じなんだろう」
# speaker: narrator
二人は入口の案内を読み、会話を終える前に少し離れた場所で立ち止まった。
# speaker: heroine
「出てきたら、何を考えたか聞く？　わたし、たぶん、立派な感想は出てこない」
{ relationship_tone == "reserved" || relationship_tone == "strained":
    # speaker: narrator
    答えを期待しているようにも、聞かれたくないようにも見える。彼女自身、まだ決めていないらしい。
- else:
    # speaker: heroine
    # reaction: heroine,teasing,question
    「頭の中まで答え合わせするの、ちょっと大変そうでしょ」
}

* [「自分は、君に話したいことが出てきそう」]
    # effect: gt_delhi_date_lotus_temple_first_honest
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,worried,sweat
        「先に言われると、聞く準備をしたまま座っちゃいそう。出てから、もう一度にしない？」
    - else:
        # speaker: heroine
        # reaction: heroine,smile,blush
        「じゃあ、話したくなった分だけ。わたしも同じ量を返す約束は、まだしないよ」
        # speaker: narrator
        彼女は少し笑い、言い残すことがなくなったように入口を見る。
    }
    -> after_first

* [「感想の提出なし。気が向いたら話そう」]
    # effect: gt_delhi_date_lotus_temple_first_attentive
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,exasperated,question
        「提出しないって決めるのも、ちょっと寂しいな。自分でも面倒なこと言ってるね」
        # speaker: narrator
        彼女は苦笑し、出てから決めることにした。
    - else:
        # speaker: heroine
        # emotion: smile
        「うん。何かを思いつくために座らなくてもいいんだね」
        # speaker: narrator
        彼女の手が、握っていた鞄の紐から離れた。
    }
    -> after_first

* [「頭の中まで隣同士にしなくてもいいよね」]
    # effect: gt_delhi_date_lotus_temple_first_playful
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,serious,gloom
        「そうだけど。離れたいって聞こえる言い方は、今はちょっと嫌だな」
        # speaker: narrator
        こちらが隣の位置を示すと、彼女も、そこまで拒まれたわけではないと確かめた。
    - else:
        # speaker: heroine
        # reaction: heroine,teasing,music
        「うん。隣の頭から、突然お昼ごはんの話が流れてきても困るし」
        # speaker: narrator
        笑いを収めてから、二人は静かに入口へ向かった。
    }
    -> after_first

=== after_first ===
# speaker: narrator
案内に従って中へ入り、二人は言葉を交わさず過ごす。相手の顔を読むことも、急いで答えを探すことも、しばらくやめていた。
# speaker: narrator
外へ出て人の流れから離れても、彼女はすぐに感想を話さなかった。鞄を持ち直し、歩きながら一度だけこちらを見る。
# speaker: heroine
# emotion: neutral
「話せることもあるんだけど。今は、まだ言いたくないこともあった」
# speaker: narrator
その言葉の後だけは、彼女は先を急がなかった。
# speaker: heroine
# emotion: serious
「隠し事、って名前をつけないで置いておいてもいい？」

* [「黙って隣にいる時間も、君とほしい」]
    # effect: gt_delhi_date_lotus_temple_second_bold
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,worried,sweat
        「うれしい言葉なのは分かる。でも今は、何か返せる顔をしてないから」
        # speaker: narrator
        彼女は視線を前へ戻す。こちらも言葉を重ねず、同じ速さで歩いた。
    - else:
        # speaker: heroine
        # reaction: heroine,shy,blush
        「それを言われたら、また黙る時間が必要になるんだけど」
        { ending_reached:
            # speaker: heroine
            # emotion: smile
            「……うん。今日は、その時間も一緒に帰ろう」
        - else:
            # speaker: heroine
            「じゃあ、少しだけ。この先まで、何か言わなきゃって思わずに歩きたい」
        }
    }
    -> ending

* [「自分も、今すぐ話せないことがあった」]
    # effect: gt_delhi_date_lotus_temple_second_honest
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,worried,question
        「それ、わたしに合わせて言ってない？　話したかったことまで、しまわないでね」
        # speaker: narrator
        こちらが首を振ると、彼女は自分の分だけでなく、相手の沈黙も受け取った。
    - else:
        # speaker: heroine
        # emotion: smile
        「そっか。じゃあ、お互いに持って帰ろう。いつか話す予約も、しないで」
        # speaker: narrator
        彼女の歩幅が、ようやく普段の長さへ戻る。
    }
    -> ending

* [「今、話せる方だけ聞いてもいい？」]
    # effect: gt_delhi_date_lotus_temple_second_attentive
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        「聞きたいのは分かる。でも、どこから話せるか選ぶのにも、少し時間がほしい」
        # speaker: narrator
        彼女は断った後も、歩く場所を離さなかった。
    - else:
        # speaker: heroine
        # reaction: heroine,smile,sparkle
        「うん。一つだけ。静かにしてたら、帰ったら連絡したい人を思い出した」
        # speaker: heroine
        「心配させたくなくて、楽しい話だけ送ってたんだ。今日は、迷った話も少し送ろうかな」
    }
    -> ending

=== ending ===
# speaker: narrator
白い花の形が、歩くたびに重なりを変える。彼女は振り返り、さっきまでいた静かな場所を見た。
{ relationship_tone_after == "warm" || relationship_tone_after == "romantic_tension":
    # speaker: heroine
    # emotion: smile
    「出てからも、隣にいてくれてありがとう。……これは、言いたかった方」
- else:
    # speaker: heroine
    # emotion: neutral
    「さっきのこと、すぐ分かったふりをしないで聞いてくれて、ありがとう」
}
# speaker: narrator
その先は、二人とも何も付け足さずに歩いた。沈黙は礼拝堂に置いてくるものではなかった。
-> END
