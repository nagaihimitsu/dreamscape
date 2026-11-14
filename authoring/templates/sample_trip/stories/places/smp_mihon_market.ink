// 【任意：特殊戦B】【場所のファイル】見本の朝市（stories/places/<接頭辞>_<都市ID>_<場所>.ink）。見本の朝市と人物は架空。
// - この1本に、朝市の観光案内と特殊戦B・矛盾追及の会話を書く。knot の名前＝場面のID（保存に入る）。knot の行のすぐ下の札（頭の札）
//   # scene: で種類を決める。本筋の knot には # at:・# priority:・# repeat: を書かない（順番は観光地の順）。
// - 1行目は INCLUDE modules.ink（ゲームが用意する呼び口と変数。VAR はここに書かない）、次の行は -> DONE。
//   Inky で1つの場面を見るときは、-> DONE を -> 見たい knot の名前 に一時的に変え、modules.ink の写しを隣に置く。
// - 本筋は、カタログ（tourism/catalog.json の guideStoryId、battles/catalog.json の storyId）が「places/smp_mihon_market.<knot>」の住所で指す。
// - 特殊戦Bを外すときは、このファイルごと外す（README の「任意の部分」）。
INCLUDE modules.ink
-> DONE

// ───── 案内（本筋。tourism/catalog.json の guideStoryId がこの住所を指す）。
// - 規則は通常の観光案内と同じ：選択肢・# effect なし、日本語、表示される行は40行以内。
// - 特殊戦は地図の地点から直接始まるため、この案内は観光地の情報として登録しておく。
// - 最初の行の # photo: は、朝市の絵（public/assets/album/smp_album_market.webp）をアルバムに入れる例（説明の札なし）。
// - 2行目の # term: は、旅の図鑑の言葉（glossary/terms.json の架空の「三時パン」）の札の例。その言葉が初めて出る行の前に置くと、
//   その行で写真と1行の説明の小窓が出て、旅の図鑑に入る（同じセーブでは二度と出ない）。
=== smp_mihon_market_guide ===
# scene: guide
# background: smp_bg_mihon_market
# speaker: narrator
# photo: smp_album_market
朝市には、色違いの屋根の店が三軒並んでいる。真ん中のパン屋から、焼きたての匂いがした。
# speaker: narrator
# term: smp_term_mihon_sanji_pan
棚には、針の模様を焼きつけた丸い三時パンが並んでいる。
# speaker: heroine
# emotion: happy
わ、いい匂い。……でもあの人、なんだか怒ってない？
-> END

// ───── 特殊戦B・矛盾追及（本筋。battles/catalog.json の format: "B"、reasoning.kind: "contradiction"。storyId がこの住所を指す）。
// - knot の名前はバトルID。1本の流れ（段階5）：-> quiz(n) -> でクイズ、-> reasoning -> が止まる所（資料を選ぶ画面）。reasoning.roundIndex（ここでは1）の
//   とおり、第1問の後・第2問の前に止まる。主張は手伝いの knot <バトル>_claim に書き、止まる所の前に -> <バトル>_claim -> で流す
//   （手がかり帳の「主張」も、ゲームがこの knot を読んで出す）。追及（ゆさぶり）の文は <バトル>_press（手がかり帳の「追及で聞いたこと」）。
//   <バトル> は、この knot の名前（smp_mihon_special_b_market）。
// - 止まる所から戻ると reasoning_action が "press"（追及）か "evidence"（資料）で、資料なら evidence_result が "success" か "failure"。
//   追及と違う資料の後に -> stop と書くと、止まる所（- (stop)）へ戻って選び直せる（決定35。書かなければ次へ進む）。
//   正しい資料の後は -> stop と書かずに次の問いへ進む（戻ってばかりの流れはビルドが止める）。資料は得点を変えない。
// - 正しい資料（correctClueIds）は1つ。どの資料が正しいかは台詞で明かさない。証拠の判定と英語3択はゲーム側。
// - 主張は大きすぎる断言にし、資料1枚で崩れるようにする。
=== smp_mihon_special_b_market ===
# scene: battle
# background: smp_bg_mihon_market
# speaker: enemy
焼きたては今なの。今！　なのに、この街の人は好きな時間にしか来ない
# speaker: narrator
パン屋のサラは、冷めかけた丸パンの籠を抱えていた。
# speaker: heroine
みんな、来られるときに来るんですよね。三時に会おう、って
# speaker: enemy
それよ。あの時計のせいで、街じゅうがのんびりになったの。朝市の始まり方から教えてあげる
-> quiz(1) ->
# background: smp_bg_mihon_market
{ quiz_correct:
    # speaker: enemy
    手をたたく合図で始まる。……鐘じゃないって、よく知ってたわね
- else:
    # speaker: enemy
    朝市は、店主たちが手をたたいて始めるの。鐘なんて待っていたら、日が暮れるわ
}
-> smp_mihon_special_b_market_claim ->
- (stop)
-> reasoning ->
{ reasoning_action == "press":
    -> smp_mihon_special_b_market_press ->
    -> stop
}
{ evidence_result == "failure":
    # background: smp_bg_mihon_market
    # speaker: enemy
    その資料で、誰かが時間を守っていると言える？　わたしの『誰も』は、まだ崩れないわ
    # speaker: heroine
    この資料じゃ足りないみたい。時間を計る道具が書いてあるものを探そう
    -> stop
}
# background: smp_bg_mihon_market
# speaker: narrator
サラは資料を読むと、自分の店の棚をふり返った。砂時計が、ちょうど落ちきるところだった。
# speaker: enemy
……これ、わたしのことじゃない。でも、まだ答えは聞いてないわよ
-> quiz(2) ->
# background: smp_bg_mihon_market
{ quiz_correct:
    # speaker: enemy
    砂時計で計る。一度も焦がしたことがない。……時間を守ってる人、ここにいたわ
- else:
    # speaker: enemy
    わたしは砂時計で焼き時間を計ってるの。塔の時計なんて、最初から使ってないわ
}
# speaker: heroine
塔の時計がなくても、時間の計り方はあるんですね
-> quiz(3) ->
# background: smp_bg_mihon_market
{ quiz_correct:
    # speaker: enemy
    それぞれのやり方で守ってる。……わたしが怒ってたのは、時計じゃなくて冷めたパンね
- else:
    # speaker: enemy
    街の人は、手の合図や砂時計で時間を守ってる。誰も守らないなんて、言いすぎだったわ
}
{
- battle_score == 3:
    # speaker: enemy
    決めた。焼き上がりは『砂時計三回分』って札に書く。来られる人は、そのときに来ればいい
    # speaker: heroine
    # emotion: happy
    わたし、三回目に来ます。焼きたて、食べたいので
- battle_score == 2:
    # speaker: enemy
    一つは外れたわね。でも、札は書いてみる。砂時計なら、誰が見ても分かるもの
- else:
    # speaker: enemy
    どっちが正しいかより、パンが冷めないことの方が大事。……次は焼きたての時間に来て
    # speaker: heroine
    はい。今度はちゃんと、間に合うように来ます
}
-> END

=== smp_mihon_special_b_market_claim ===
# background: smp_bg_mihon_market
# speaker: enemy
時計が止まってから、この街では誰も時間を守らなくなった。一人残らず、よ！
->->

=== smp_mihon_special_b_market_press ===
# background: smp_bg_mihon_market
# speaker: enemy
誰も、よ。だから焼きたてを出しても、いつも冷めてから売れるの
# speaker: heroine
……一人残らず、ですか。朝市の中にも、時間を計っている人はいませんか
->->
