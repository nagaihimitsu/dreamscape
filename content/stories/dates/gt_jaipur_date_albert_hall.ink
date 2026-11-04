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

# background: gt_bg_jaipur_albert_hall
# speaker: narrator
ラームニワース庭園の中で、アルバート・ホール博物館の屋根が何段にも重なっていた。入口の前で、{heroine_name}が案内を読み込んでいる。
# speaker: heroine
# emotion: happy
「金属の工芸、木工、絨毯、それから細密画。名前を読んだだけで、見たいところが増えていく」
# speaker: narrator
指先が案内の上を行ったり来たりする。やがて彼女は、少し困ったようにこちらを見た。
# speaker: heroine
「全部、同じくらいちゃんと見ようって思ったら、入る前から忙しくなっちゃった」
「せっかく来たのに、って考えると、飛ばすのがもったいなくて」
{
- relationship_tone == "reserved" || relationship_tone == "strained":
    # speaker: heroine
    「見たいもの、決まってる？　わたしの迷ってる時間まで付き合わせたくないな」
- else:
    # speaker: heroine
    # emotion: teasing
    「気になる方はあとで教えてね。わたしが案内を全部読み上げる前に」
}

* [「いちばん気になったものから見よう」]
    # effect: gt_jaipur_date_albert_hall_first_attentive
    { romance_result == "negative":
        # speaker: heroine
        「一番を決めるのが難しいんだよ。でも、そうだな……今は細密画が気になる」
    - else:
        # speaker: heroine
        # emotion: smile
        「細密画。近くで見たら、どこまで細かいのか知りたい。最初はそれにする」
    }
    -> looking

* [「入口で既に、一周しそうだね」]
    # effect: gt_jaipur_date_albert_hall_first_playful
    { romance_result == "negative":
        # speaker: heroine
        「急かされてるみたいに聞こえちゃった。もう少しだけ待ってね」
    - else:
        # speaker: heroine
        # emotion: teasing
        「予習の周回です。本番はこれから。まずは、細密画を見てみたいな」
    }
    -> looking

* [「全部見ようとすると、自分も疲れそう」]
    # effect: gt_jaipur_date_albert_hall_first_honest
    { romance_result == "negative":
        # speaker: heroine
        「まだ入ってもいないのに、二人とも疲れた顔だね。気になるところは見たいよ」
    - else:
        # speaker: heroine
        「じゃあ、途中でちゃんと休もう。わたしも疲れたって言う。まずは細密画からでいい？」
    }
    -> looking

=== looking ===
# speaker: narrator
館内では、細密画の前で彼女の歩みが遅くなった。作品に触れず、見学できる位置から細い線を目で追う。
# speaker: heroine
「こんなに細かいの、描いている途中で、どこまで描いたか分からなくならないのかな」
# speaker: narrator
小声でそう言って、もう一度、絵全体を見る。ほかの来館者に場所を譲ってからも、少し離れて眺めていた。
# speaker: narrator
見学を終えて庭園へ戻ると、彼女は一度まばたきをして、遠くの木へ目を向けた。
# speaker: heroine
# emotion: smile
「今、ものすごく大きい葉っぱを見てる気分。目が小さいものに慣れちゃった」
「全部の名前は覚えてないけど、絵の前で立ち止まった感じは、しばらく残りそう」
# speaker: narrator
彼女は案内を広げ直す。指先がほかの展示の名前に止まり、今度はゆっくり折りたたんだ。
# speaker: heroine
「見足りないものもある。でも、見たものの話をする時間もほしいな。何が気になった？」

* [「細い線を、何度も見直したくなった」]
    # effect: gt_jaipur_date_albert_hall_second_honest
    { romance_result == "negative":
        # speaker: heroine
        「わたしは細かいところを追いすぎて、全体が頭から抜けちゃった。同じ見方でも違うね」
    - else:
        # speaker: heroine
        # emotion: happy
        「分かる。一度見えたところまで、戻って確かめたくなるんだよね」
    }
    -> garden

* [「夢中で見てた顔が、印象に残った」]
    # effect: gt_jaipur_date_albert_hall_second_bold
    { romance_result == "negative":
        # speaker: heroine
        「わたしの顔より、作品の話が聞きたかったな。今は、そっちを教えて」
    - else:
        # speaker: heroine
        # emotion: shy
        「そんなに分かりやすかった？　……でも、せっかくだから作品も覚えて帰ってね」
    }
    -> garden

* [「今度は、大きな屋根を見ながら休もう」]
    # effect: gt_jaipur_date_albert_hall_second_attentive
    { romance_result == "negative":
        # speaker: heroine
        「休むのは賛成。でも、その前に一つだけでも、感想を聞かせてほしいな」
    - else:
        # speaker: heroine
        # emotion: smile
        「いいね。目の休憩にもなりそう。あの屋根なら、少し離れていても見つかる」
    }
    -> garden

=== garden ===
{ relationship_tone_after == "warm" || relationship_tone_after == "comfortable":
    # speaker: narrator
    彼女は折りたたんだ案内を二人の間に開いた。途中で見つけた気になる名前を指して、先ほどとは違うゆっくりした速さで話し始めた。
- else:
    # speaker: narrator
    彼女は案内に目を落としてから、博物館の屋根を見上げた。思い出した感想を、一つずつ言葉にした。
}
# speaker: heroine
「次に博物館へ行ったら、最初の一つはそっちに選んでほしいな。わたしなら通り過ぎるものかもしれないし」
# speaker: narrator
話しているうちに、庭園を歩く足取りがゆっくりになった。細密画、と口にした彼女が、指先で空中に細い線を描いた。
-> END
