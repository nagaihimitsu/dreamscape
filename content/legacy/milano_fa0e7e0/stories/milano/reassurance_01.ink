// Phase 2 試遊用短編。保留後に一度だけ交わせる無料の会話：3択を1回。
VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR romance_stage = 1
VAR memory_callback = ""
VAR confession_ready = false

-> start

=== start ===
# background: milano_cafe
# speaker: narrator
カフェのテーブルに、あの白い葉書が置かれた。
一行だけ文字があり、その先はまだ空いている。
# speaker: heroine
「昨日、返事を最後まで言えなかったけど……待たせるだけで、何も言わないのも違うと思って」
# speaker: narrator
{heroine_name}は葉書を回した。『今度は、私から会いに行きたい』と書かれている。
# speaker: heroine
「……宛名の前に、これを書いちゃった」

* [「配達員より先に、宛先の人が読んでるね」]
    # effect: milano_reassurance_chosen_joke
    # speaker: heroine
    「うん。郵便にすると、訂正できないから」
    # speaker: narrator
    彼女は笑って、それから葉書を引っ込めずに言った。
    # speaker: heroine
    「……でも、訂正はしない」
    -> ending

* [「急いで返事を決めなくていいよ。この一行を聞けてよかった」]
    # effect: milano_reassurance_chosen_listen
    # speaker: heroine
    「ありがとう。でも、ずっと考えてるふりはしたくないの」
    # speaker: narrator
    彼女は葉書の角をきちんと揃え、こちらを見た。
    -> ending

* [「待ってる間も、会いたい気持ちは変わらなかった」]
    # effect: milano_reassurance_chosen_honest
    # emotion: shy
    # speaker: heroine
    「……私も。昨日の帰り道、次はいつ話せるかなって考えてた」
    # speaker: narrator
    彼女の指が、一行目の終わりをそっと押さえた。
    -> ending

=== ending ===
# speaker: heroine
「{player_address}。この葉書、持っていて。続きは、声で言いたいから」
# speaker: narrator
紙の端には、握っていた指の温かさが少し残っていた。
次に伝える言葉を、二人とももう探し始めていた。
-> END
