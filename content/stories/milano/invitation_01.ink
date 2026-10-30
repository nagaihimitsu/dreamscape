// Phase 2 試遊用短編。ヒロインからの無料のお誘い：3択を1回。
VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR romance_stage = 1
VAR memory_callback = ""
VAR confession_ready = false

-> start

=== start ===
# background: milano_walk
# speaker: narrator
待ち合わせの角に、{heroine_name}の方が先に来ていた。
ガイドブックは持っていない。代わりに、小さな紙袋を両手で抱えている。
# speaker: heroine
「今日は、私が行きたいところに付き合ってほしいの」
「{memory_callback}。あのときのこと、覚えてて……誘うなら、今日かなって」
# speaker: narrator
連れていかれたのは、小さな紙店の窓辺だった。便箋の束に、手書きの値札が揺れている。
# speaker: heroine
「有名な場所じゃないよ。でも、好きなの。紙の色を選んでるときの、決まらない時間が」
# speaker: narrator
彼女は紙袋から、まだ何も書かれていない絵葉書を出した。

* [「何も書かずに送ったら、すごく深い意味がありそう」]
    # effect: milano_invitation_chosen_joke
    # speaker: heroine
    「たぶん最初に、書き忘れを心配される」
    # speaker: narrator
    彼女は葉書を裏返してから、くすっと息をこぼした。
    -> ending

* [「どの色で迷ってたの？」]
    # effect: milano_invitation_chosen_listen
    # speaker: heroine
    「この白と、もう少し白い方」
    # speaker: narrator
    真面目な顔だった。違いを聞くと、彼女は紙袋からもう一枚取り出した。
    -> ending

* [「ここに連れてきてもらえて、嬉しい」]
    # effect: milano_invitation_chosen_honest
    # emotion: shy
    # speaker: heroine
    「……まだ、何も案内してないよ」
    # speaker: narrator
    彼女は店の窓へ目を戻した。でも、葉書は二人の間に置かれたままだった。
    -> ending

=== ending ===
# speaker: heroine
「{player_address}、もう少しだけ見ててもいい？　次の行き先は、今日は決めてないから」
# speaker: narrator
白い葉書の端に、二人の指がそれぞれ触れていた。
どこへ送るかは、まだ決めなかった。
-> END
