// 関係がぎくしゃくし、ほかのデートを選べないときの短い再交流。
VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR romance_stage = 1
VAR ending_reached = false
VAR romance_result = "neutral"
VAR affection_delta = 0
VAR trust_delta = 0
VAR spark_delta = 0

# background: milano_city_date_landmark
# speaker: narrator
ガッレリアの屋根の下。{heroine_name}は、通り過ぎる人の足音を聞いていた。
# speaker: heroine
「同じ道でも、歩く速さが違うと話しにくいですね」
「……今日は、どのくらいの速さにしましょうか」

* [「話したいことがあれば聞くよ。黙って歩いてもいい」]
    # effect: milano_recovery_listen
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        「聞いてもらうこと、まだ上手に決められなくて」
        # speaker: narrator
        彼女は足を緩めた。言葉が出るまでは待つことにした。
    - else:
        # speaker: heroine
        # emotion: smile
        「じゃあ、途中で黙っても、続きを待っててください」
        # speaker: narrator
        彼女は歩幅を確かめるように、一度こちらを見た。
    }
    -> ending
* [「ゆっくり。追い越されるのは、鳩だけにしよう」]
    # effect: milano_recovery_playful
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        「鳩には、もうだいぶ負けていますけど」
        # speaker: narrator
        彼女が指す先で、一羽が小走りに追い抜いていった。
    - else:
        # speaker: heroine
        # emotion: smile
        「あの鳩、ずいぶん急ぎの用事ですね」
        # speaker: narrator
        彼女は小走りの鳩を見送り、小さく笑った。
    }
    -> ending
* [「少し気まずくても、また一緒に話したい」]
    # effect: milano_recovery_honest
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        「……気まずいことも、急いで片付けなくていいですか」
        # speaker: narrator
        彼女は返事を待って、それから並んだ。
    - else:
        # speaker: heroine
        # emotion: shy
        「はい。言い直したいことも、きっとありますから」
        # speaker: narrator
        彼女は手を振りかけ、近すぎることに気づいて下ろした。
    }
    -> ending

=== ending ===
# speaker: narrator
屋根の切れ目まで、二人は歩幅を合わせて歩いた。
-> END
