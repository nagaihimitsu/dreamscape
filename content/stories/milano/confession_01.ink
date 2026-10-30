// Phase 2 試遊用短編。告白：3択を1回。成否の条件はTypeScriptが渡す。
VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR romance_stage = 1
VAR memory_callback = ""
VAR confession_ready = false

-> start

=== start ===
# background: milano_night
# speaker: narrator
運河の灯りが落ち着く頃、二人は歩みを止めた。
{heroine_name}は白い葉書を鞄にしまい、こちらへ向き直った。
# speaker: heroine
「{memory_callback}。帰ってから思い出すの、きっと大きな建物より、そういうことなんだろうね」
# speaker: narrator
風が通り過ぎるまで待った。今から言うことは、風のせいにしたくなかった。

* [「{heroine_name}が好きだ。恋人として、一緒にいたい」]
    -> honest_answer

* [「次の旅も、隣の席を予約しておいていい？」]
    # effect: milano_confession_deferred
    # speaker: heroine
    「……隣の席は、嬉しい。でも、席の話だけで終わらせたくないな」
    # speaker: narrator
    彼女は視線を下げず、少し待った。
    # speaker: heroine
    「もう一度、ちゃんと聞かせて。急がなくていいから」
    -> deferred_ending

* [「旅が終わっても会いたい。友達の約束じゃなく、付き合ってほしい」]
    -> honest_answer

=== honest_answer ===
{confession_ready:
    # effect: milano_confession_accepted
    # emotion: shy
    # speaker: heroine
    「……うん。私も、{player_address}と付き合いたい」
    # speaker: narrator
    言い終えてから、彼女は小さく息を吐いた。
    # speaker: heroine
    「誘う方になると、返事を待つのって長いね。……この前、少しわかった」
    # speaker: narrator
    差し出された手に、自分の手を重ねた。
    旅行の予定表には書けないことが、二人の間で一つ決まった。
    # speaker: heroine
    「帰ってからも、会おうね。予定がある日も、ない日も」
    # speaker: narrator
    運河の灯りの下で、恋人として歩き始めた。
    -> END
- else:
    # effect: milano_confession_deferred
    # speaker: heroine
    「……言ってくれて、ありがとう。でも今、勢いでうなずきたくない」
    # speaker: narrator
    彼女は鞄の持ち手を握り直した。
    # speaker: heroine
    「嬉しくないんじゃないよ。もう少し、私の言葉が追いつくまで待ってほしい」
    -> deferred_ending
}

=== deferred_ending ===
# speaker: narrator
{heroine_name}は一歩も離れなかった。
# speaker: heroine
「今夜で最後、にはしないで。……まだ、話したいことがあるから」
# speaker: narrator
二人は並んで、ゆっくり橋へ向かった。返事の続きを、次の時間に残して。
-> END
