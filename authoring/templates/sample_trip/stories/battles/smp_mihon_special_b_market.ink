// 【任意】特殊戦B・矛盾追及（battles/catalog.json の format: "B"、reasoning.kind: "contradiction"）。
// - 場面は intro・after_1・after_2・outro に加え、reasoning の claim（主張）・press（追及）・
//   evidence_success（正しい資料）・evidence_failure（違う資料）。reasoning.roundIndex 番目の問題の前に資料を選ぶ。
// - 正しい資料（correctClueIds）は1つ。どの資料が正しいかは台詞で明かさない。証拠の判定と英語3択はゲーム側。
// - 主張は大きすぎる断言にし、資料1枚で崩れるようにする。選択肢・# effect は置かない。
// - 見本の朝市と人物は架空。
VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR battle_scene = "intro"
VAR answer_correct = false
VAR battle_score = 0

{ battle_scene == "intro": -> introduction }
{ battle_scene == "after_1": -> after_first }
{ battle_scene == "claim": -> claim }
{ battle_scene == "press": -> press }
{ battle_scene == "evidence_failure": -> evidence_failure }
{ battle_scene == "evidence_success": -> evidence_success }
{ battle_scene == "after_2": -> after_second }
{ battle_scene == "outro": -> conclusion }
-> END

=== introduction ===
# background: smp_bg_mihon_market
# speaker: enemy
「焼きたては今なの。今！　なのに、この街の人は好きな時間にしか来ない」
# speaker: narrator
パン屋のサラは、冷めかけた丸パンの籠を抱えていた。
# speaker: heroine
「みんな、来られるときに来るんですよね。三時に会おう、って」
# speaker: enemy
「それよ。あの時計のせいで、街じゅうがのんびりになったの。朝市の始まり方から教えてあげる」
-> END

=== after_first ===
# background: smp_bg_mihon_market
{ answer_correct:
    # speaker: enemy
    「手をたたく合図で始まる。……鐘じゃないって、よく知ってたわね」
- else:
    # speaker: enemy
    「朝市は、店主たちが手をたたいて始めるの。鐘なんて待っていたら、日が暮れるわ」
}
-> END

=== claim ===
# background: smp_bg_mihon_market
# speaker: enemy
「時計が止まってから、この街では誰も時間を守らなくなった。一人残らず、よ！」
-> END

=== press ===
# background: smp_bg_mihon_market
# speaker: enemy
「誰も、よ。だから焼きたてを出しても、いつも冷めてから売れるの」
# speaker: heroine
「……一人残らず、ですか。朝市の中にも、時間を計っている人はいませんか」
-> END

=== evidence_failure ===
# background: smp_bg_mihon_market
# speaker: enemy
「その資料で、誰かが時間を守っていると言える？　わたしの『誰も』は、まだ崩れないわ」
# speaker: heroine
「この資料じゃ足りないみたい。時間を計る道具が書いてあるものを探そう」
-> END

=== evidence_success ===
# background: smp_bg_mihon_market
# speaker: narrator
サラは資料を読むと、自分の店の棚をふり返った。砂時計が、ちょうど落ちきるところだった。
# speaker: enemy
「……これ、わたしのことじゃない。でも、まだ答えは聞いてないわよ」
-> END

=== after_second ===
# background: smp_bg_mihon_market
{ answer_correct:
    # speaker: enemy
    「砂時計で計る。一度も焦がしたことがない。……時間を守ってる人、ここにいたわ」
- else:
    # speaker: enemy
    「わたしは砂時計で焼き時間を計ってるの。塔の時計なんて、最初から使ってないわ」
}
# speaker: heroine
「塔の時計がなくても、時間の計り方はあるんですね」
-> END

=== conclusion ===
# background: smp_bg_mihon_market
{ answer_correct:
    # speaker: enemy
    「それぞれのやり方で守ってる。……わたしが怒ってたのは、時計じゃなくて冷めたパンね」
- else:
    # speaker: enemy
    「街の人は、手の合図や砂時計で時間を守ってる。誰も守らないなんて、言いすぎだったわ」
}
{
- battle_score == 3:
    # speaker: enemy
    「決めた。焼き上がりは『砂時計三回分』って札に書く。来られる人は、そのときに来ればいい」
    # speaker: heroine
    # emotion: happy
    「わたし、三回目に来ます。焼きたて、食べたいので」
- battle_score == 2:
    # speaker: enemy
    「一つは外れたわね。でも、札は書いてみる。砂時計なら、誰が見ても分かるもの」
- else:
    # speaker: enemy
    「勝ち負けより、パンが冷めないことの方が大事。……次は焼きたての時間に来て」
    # speaker: heroine
    「はい。今度はちゃんと、間に合うように来ます」
}
-> END
