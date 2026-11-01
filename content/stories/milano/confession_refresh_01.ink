// 告白の結果は保存された関係から決まり、乱数には依存しない。
VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR romance_stage = 1
VAR memory_callback = ""
VAR confession_ready = false
VAR confession_result = "deferred"
EXTERNAL has_memory(memory_id)

# background: milano_night_landmark
# speaker: narrator
ナヴィリオ・グランデの橋で、{heroine_name}が手すりに触れた。
向かいの家々の灯りが、水面で長く伸びている。
# speaker: heroine
「昼に見た同じ水なのに、夜は全然違うね」
{ has_memory("milano_cafe_joke"):
    「予定表に迷子の時間を入れようって話、覚えてる？　あれから、少しくらい遠回りしてもいい気がして」
}
{ has_memory("milano_cafe_first_joke_refresh"):
    「ロースタリーで、豆に宛先を書くなんて話もしたね。あれ、まだ笑っちゃう」
}
{ has_memory("milano_cafe_first_interest_refresh"):
    「ロースタリーで、豆の管を一緒に追ってみようって話したね。あのとき、夢中になってたな」
}
{ has_memory("milano_brera_first_listen") or has_memory("milano_brera_v2_first_listen"):
    「ブレラでは、同じ絵を見ているのに違うところが気になったね。あれも楽しかった」
}
# speaker: narrator
彼女は振り返り、言葉を待った。今度こそ、自分の気持ちを言おうと思った。

* [「{heroine_name}が好きだ。恋人として、一緒にいたい」]
    # speaker: narrator
    彼女の指が、手すりから離れた。
    -> answer
* [「次の旅も隣にいたい。友達じゃなく、恋人として」]
    # speaker: heroine
    「……次の旅」
    # speaker: narrator
    彼女は一度だけ視線を道の先へ向け、また戻した。
    -> answer
* [「これからも会いたい。よかったら、付き合ってほしい」]
    # speaker: heroine
    「これからも、会うんだね」
    # speaker: narrator
    彼女は言葉の続きを、自分の中で確かめていた。
    -> answer

=== answer ===
{
- confession_result == "accepted":
    # effect: milano_confession_accepted
    # speaker: heroine
    # emotion: shy
    「うん。私も、{player_address}と付き合いたい」
    「さっきから私も言おうとしてたの。先に言われちゃった」
    # speaker: narrator
    彼女は小さく息を吐いて、こちらへ手を差し出した。
    # speaker: heroine
    「帰ってからも、ちゃんと話そう。行きたい所も、嫌なことも」
    # speaker: narrator
    差し出された手に、自分の手を重ねた。
    -> END
- confession_result == "deferred":
    # effect: milano_confession_deferred
    # speaker: heroine
    「話してくれてありがとう。嬉しい。でも、今すぐ返事を決めたくないの」
    # speaker: narrator
    彼女は運河を見て、それからまっすぐこちらを向いた。
    # speaker: heroine
    「あなたに合わせて答えるんじゃなくて、自分の気持ちをちゃんと知りたい。少し時間をください」
    -> END
- else:
    # effect: milano_confession_rejected
    # speaker: heroine
    # emotion: serious
    「ごめんなさい。今は、恋人として付き合えません」
    # speaker: narrator
    一艘の船が通り、水に映る光が揺れた。
    # speaker: heroine
    「一緒に旅を続けたくないわけじゃない。でも、そこは曖昧にしたくないの」
    -> END
}
