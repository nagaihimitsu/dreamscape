VAR player_name = ""
VAR heroine_name = ""
VAR romance_result = "positive"

# background: milano_galleria
# speaker: heroine
「カンパリーノでもらったしおり、牛の顔がちょっと得意げだね」
「床で回った人を、上から見てたのかな」

* [Would you like this bookmark?]
    { romance_result == "positive":
        # speaker: heroine
        「いいの？　ありがとう。次に本を開いたら、この床のこと思い出しそう」
    - else:
        # speaker: heroine
        「ありがとう。でも、もらうより二人で使う方がいいな。次に読む本も一緒に選ぼう」
    }
    -> given
* [This bookmark made me think of you.]
    { romance_result == "positive":
        # speaker: heroine
        「私を？　……まさか、目を回しそうって言ったから？」
        「ふふ、理由は今度聞かせて」
    - else:
        # speaker: heroine
        「ありがとう。でも牛を見て私を思い出す理由は、ちゃんと聞いておきたいな」
    }
    -> given
* [I'll keep it for now.]
    # speaker: heroine
    「うん。しおりなら急いで決めなくても逃げないし」
    -> END

=== given ===
# speaker: narrator
彼女はしおりを手帳にはさみ、端が出ていないか確かめた。
-> END
