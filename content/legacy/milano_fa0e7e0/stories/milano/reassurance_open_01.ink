// 返事を保留された後の任意の短い会話。
VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR romance_stage = 1
VAR memory_callback = ""
VAR confession_ready = false

# background: milano_walk
# speaker: narrator
道の角で、{heroine_name}が立ち止まった。
# speaker: heroine
「この前の返事、待たせたままなのが気になって」
「まだ決められないけど、何も話さないのも違うと思って」

* [「返事の予告だけ先に届いた」]
    # effect: milano_reassurance_chosen_joke
    # speaker: heroine
    # emotion: smile
    「本編が遅れてますね。……予告も、言うのに時間がかかりました」
    -> ending
* [「話してくれてありがとう。急いで決めなくていいよ」]
    # effect: milano_reassurance_chosen_listen
    # speaker: heroine
    「うん。でも、考えてるふりのままにはしたくないです」
    -> ending
* [「返事を待ちながら、また会いたい」]
    # effect: milano_reassurance_chosen_honest
    # speaker: heroine
    # emotion: shy
    「……それなら、次に会う約束は今できます」
    -> ending

=== ending ===
# speaker: narrator
彼女は横断歩道の先を見て、それからこちらへ向き直る。
# speaker: heroine
「{player_address}、もう少し歩きませんか」
-> END
