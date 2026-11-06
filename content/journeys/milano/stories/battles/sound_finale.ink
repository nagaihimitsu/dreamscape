VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR battle_scene = "intro"
VAR answer_correct = false
VAR battle_score = 0

{ battle_scene == "intro": -> s_intro }
{ battle_scene == "after_1": -> s_after_1 }
{ battle_scene == "after_2": -> s_after_2 }
{ battle_scene == "after_3": -> s_after_3 }
{ battle_scene == "after_4": -> s_after_4 }
{ battle_scene == "outro": -> s_outro }
-> END

=== s_intro ===
# background: milano_darsena_finale
# speaker: narrator
ダルセナの岸に折り畳み椅子と小さな送信機がある。椅子に座ったリヴィオは、膝にパン屑を落としたまま片手を挙げた。
# speaker: enemy
# reaction: heroine,surprised
「一枠だけ空いた。十秒。ミラノを知らない人に何を聴かせる？」
# speaker: heroine
「先に聞きたいです。誰が、どこで聴いてるの？」
# speaker: enemy
「小さなネット放送だ。仕事帰りにひとり、飯作りながらひとり。あとは知らない。知らん人の夕飯にお邪魔するんだ。」
# speaker: player
「じゃあ、空腹の音は避けたほうが。」
# speaker: enemy
「あれは朝の番組に取っといた。」
-> END

=== s_after_1 ===
# background: milano_darsena_finale
{ answer_correct:
# speaker: heroine
「昔は、水辺で荷を待つ人がいたんですね。」
- else:
# speaker: heroine
「あの散歩道、昔は港だったんだ。岸で待つ人にも、別の用事があった。」
}
# speaker: narrator
岸を歩く足音に自転車のベルが重なる。リヴィオは水面にマイクを向けた。
# speaker: enemy
「水だけじゃ、ここが何に使われてきたかまでは録れんな。」
# speaker: heroine
「広場だって地下に人がいた。最初の十秒、上ばっかり向いてましたね。」
-> END

=== s_after_2 ===
# background: milano_darsena_finale
{ answer_correct:
# speaker: heroine
「ここからあの広場まで、石も旅をした。」
- else:
# speaker: heroine
「運ばれたのは大聖堂の石。広場の重さを、ここの水が引き受けたんですね。」
}
# speaker: heroine
「荷物を下ろす人の声、録れてたら聴きたいな。」
# speaker: enemy
「ない音をあるとは言えない。代わりに君がそう言えば、聴く人は想像できる。」
# speaker: narrator
差し出されたマイクを、彼女はまだ受け取らなかった。
-> END

=== s_after_3 ===
# background: milano_darsena_finale
{ answer_correct:
# speaker: heroine
「見られる時間の短さにも、絵を守る理由があった。」
- else:
# speaker: heroine
「短い時間ずつ案内するのは絵のため。あの三秒は、自分で持っていよう。」
}
# speaker: narrator
旧食堂で止めた三秒を、彼女は自分だけで聴いた。消さず、人にも渡さず、鞄へ戻した。
# speaker: heroine
「残しておくのと、聴かせるのって、別ですね。」
# speaker: enemy
「放送屋としては残念だが、本人の持ち物だ。」
-> END

=== s_after_4 ===
# background: milano_darsena_finale
{ answer_correct:
# speaker: heroine
「床を空けると、聴く人が踊る人に変わる。」
- else:
# speaker: heroine
「桟敷じゃなく、動かせる平土間の椅子。片づければ、その足で踊れる。」
}
# speaker: narrator
リヴィオは椅子から腰を上げ、彼女に席を譲った。ポケットからパン屑が落ちる。
# speaker: heroine
# emotion: smile
「これ、生放送でしゃべってもいいですか？」
# speaker: enemy
# reaction: heroine,teasing
「椅子の話はいい。パンの話なら提供料を払ってほしい。」
# speaker: narrator
彼女が吹き出した。まだスイッチは入っていない。
-> END

=== s_outro ===
# background: milano_darsena_finale
{ answer_correct:
# speaker: heroine
「水の音の中に、働いていた人の手が見える気がします。」
- else:
# speaker: heroine
「石だからって荷役の道具とは限らない。あの小路では衣服を洗うのが仕事だったんだ。」
}
# speaker: narrator
指が三、二、一と折れた。彼女は岸に向き直って、マイクを持った。
# speaker: heroine
「ミラノのダルセナにいます。隣に、一緒にここまで歩いた人がいます。……ちょっとだけ、聴いていってください。」
# speaker: narrator
残りは水が岸を打つ音だった。リヴィオは指を下ろした。誰もすぐにはしゃべらなかった。
# speaker: enemy
「俺だったら、あの隙間に曲を入れた。」
# speaker: heroine
「知ってます。だから今日は、私が持ってたんです。」
# speaker: narrator
マイクを返すと、掌に網目がついていた。
{ battle_score >= 3:
# speaker: enemy
「番組名、君がつけてよ。」
# speaker: heroine
「「十秒のミラノ」。次は、聴く側でもいいですか？」
- else:
# speaker: enemy
「俺の番組、また聴いてくれるか。たまに場所を取り違える。」
# speaker: heroine
「その時は、お便りを出します。匿名で。」
}
-> END
