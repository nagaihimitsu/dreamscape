// 告白は任意。判定は関係状態に基づいてゲームルールから渡される。
VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR romance_stage = 1
VAR memory_callback = ""
VAR confession_ready = false
VAR confession_result = "deferred"

# background: milano_night
# speaker: narrator
街の灯りが水に揺れるところで、{heroine_name}が歩みを止めた。
# speaker: heroine
「{memory_callback}。帰ってからも、ふと思い出しそう」
# speaker: narrator
今から言うことは、通り過ぎる風のせいにしたくなかった。

* [「{heroine_name}が好きだ。恋人として、一緒にいたい」]
    # speaker: narrator
    彼女は瞬きを一つして、言葉の続きを待った。
    -> answer
* [「次の旅も隣にいたい。友達としてじゃなく、恋人として」]
    # speaker: heroine
    「……次の旅、ですか」
    # speaker: narrator
    彼女はまだ予定のない道の先を見た。
    -> answer
* [「これからも会いたい。よかったら、付き合ってほしい」]
    # speaker: heroine
    「これからも、会う……」
    # speaker: narrator
    彼女は自分の声で確かめるように、言葉を繰り返した。
    -> answer

=== answer ===
{
- confession_result == "accepted":
    # effect: milano_confession_accepted
    # speaker: heroine
    # emotion: shy
    「……うん。私も、{player_address}と付き合いたい」
    # speaker: narrator
    彼女は言い終えてから、小さく息を吐いた。
    # speaker: heroine
    「返事をする方も、こんなに緊張するんですね」
    # speaker: narrator
    差し出された手に、自分の手を重ねた。
    -> END
- confession_result == "deferred":
    # effect: milano_confession_deferred
    # speaker: heroine
    「……言ってくれて、ありがとう。でも、今すぐうなずきたくはなくて」
    # speaker: narrator
    彼女は鞄の持ち手を握り直した。
    # speaker: heroine
    「嬉しくないんじゃないです。もう少し、自分の気持ちを考えさせてください」
    -> END
- else:
    # effect: milano_confession_rejected
    # speaker: heroine
    # emotion: serious
    「ごめんなさい。今は、恋人として付き合えません」
    # speaker: narrator
    彼女は言葉を探すように、揺れる水面を見た。
    # speaker: heroine
    「一緒に旅をするのが嫌なわけじゃない。でも、そこは曖昧にしたくないです」
    -> END
}
