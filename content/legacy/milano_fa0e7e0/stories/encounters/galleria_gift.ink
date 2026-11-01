VAR player_name = ""
VAR heroine_name = ""
VAR romance_result = "positive"

# background: milano_galleria
# speaker: heroine
「そのしおり、さっきのお店でもらったものだよね。小さな牛の絵がある」

* [Would you like this bookmark?]
    { romance_result == "positive":
        # speaker: heroine
        「いいの？　ありがとう。じゃあ、見たものをあとで教えるね」
    - else:
        # speaker: heroine
        「ありがとう。うれしいけど、次は一緒に決めてからにしよう？」
    }
    -> given
* [This bookmark made me think of you.]
    { romance_result == "positive":
        # speaker: heroine
        「え、私を？　……ふふ、その理由を聞いてもいい？」
    - else:
        # speaker: heroine
        「ありがとう。でも、私が何を見たいかも聞いてくれたら、もっとよかったな」
    }
    -> given
* [I'll keep it for now.]
    # speaker: heroine
    「うん。しおりは逃げないし、もう少し考えよう」
    -> END

=== given ===
# speaker: narrator
彼女はしおりの角を折らないように、そっと手帳にはさんだ。
-> END
