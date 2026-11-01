// Phase 3 / ミラノ『最後の晩餐』。クイズと採点は JSON・TypeScript が担当する。
// 各場面を独立して実行する。先の問題の答えは、その問題より前に明かさない。
VAR player_name = "ユウ"
VAR heroine_name = "ミオ"
VAR player_address = "ユウさん"
VAR battle_scene = "intro"
VAR answer_correct = false
VAR battle_score = 0

{ battle_scene == "intro": -> introduction }
{ battle_scene == "after_1": -> after_first }
{ battle_scene == "after_2": -> after_second }
{ battle_scene == "outro": -> conclusion }
-> END

=== introduction ===
# background: milano_refectory
# speaker: narrator
ミラノ、サンタ・マリア・デッレ・グラツィエの旧食堂。壁いっぱいの『最後の晩餐』を、二人で見上げた。
白い手袋の男が、白い手袋を、もう一枚はめている。
# speaker: enemy
「一枚目は作品のため。二枚目は一枚目のため。三枚目は――」
# speaker: heroine
「……最後の一枚は、誰が守るんですか」
# speaker: narrator
男の指が止まった。{heroine_name}は、質問を取り消さなかった。
# speaker: enemy
「その質問は保存上よろしくない。私はアルド・ヴェルニーチェ。壊さないことに関しては、何もしない男だ」
「持たなければ、落とさない。動かなければ、壊さない。これ以上の方法があるかね」
# speaker: heroine
「……絵を見に来たので。方法は、あとで考えてもいいですか」
# speaker: enemy
「ならば三つ、確かめよう。君たちが見ているのは絵か、それとも自分の思い込みか」
-> END

=== after_first ===
# background: milano_refectory
{ answer_correct:
    # speaker: enemy
    「中央のキリストは、三角形の安定した姿。その周りでは、十二人があんなに手を動かしている……」
    「全員に『静かに』と言って回りたいのに、中央まで騒がしくは見えない。ずるい配置だ」
    # speaker: heroine
    「全員をおとなしくしたら、何が起きたのか、わからなくなりそう」
- else:
    # speaker: enemy
    「見落としたな。中央のキリストは三角形の安定した姿で、周りの使徒たちとは対照的なのだ」
    「ほら、手が忙しいと、見る者まで混乱する。あの十二人にも手袋を支給したい」
    # speaker: heroine
    「……手袋をしても、身ぶりはできますよ」
}
# speaker: narrator
アルドは両手を背中に回した。それでも、片足が落ち着かない。
# speaker: enemy
「動きにも役目がある、と？　では次だ。見る側の目ぐらい、自由であってほしいものだが」
-> END

=== after_second ===
# background: milano_refectory
{ answer_correct:
    # speaker: enemy
    「遠近法の線が集まるのは、キリストの右のこめかみのあたり……私の視線に、集合場所があったのか」
    「整列用のロープもない。誘導係もいない。なのに、私まで並ばされていた！」
    # speaker: heroine
    「……絵に指図されるのは、嫌なんですね」
- else:
    # speaker: enemy
    「線の行き先は、キリストの右のこめかみのあたりだ。視線が中央へ導かれる仕掛けなのだよ」
    「気づかず見ていたなら、案内板が必要だ。『ただいま誘導されています』と、大きく――」
    # speaker: heroine
    「その板ばかり、見てしまいそう」
}
# speaker: narrator
アルドは口を開き、閉じた。言い返す前に、もう一度だけ壁を見た。
# speaker: enemy
「……いや。絵の前に、私の板はいらない」
「残るは、どう描いたかだ。ここだけは譲れない。何百年も先まで残すなら、失敗しない方法を選ぶべきだろう？」
-> END

=== conclusion ===
# background: milano_refectory
{ answer_correct:
    # speaker: enemy
    「乾いた壁なら、時間をかけて直せる。その代わり、絵の具は傷みやすかった……」
    「長持ちだけを選ばず、描き直す自由を選んだ。私なら、その自由にも手袋をはめていた」
- else:
    # speaker: enemy
    「乾いた壁で描けば、時間をかけて直せる。だが、湿った漆喰に描くフレスコほど、絵の具が定着しない」
    「自由と丈夫さが、別々の席に座っている。……隣同士にしておいてほしかった」
}
{
- battle_score == 3:
    -> perfect_ending
- battle_score == 2:
    -> victory_ending
- else:
    -> defeat_ending
}

=== perfect_ending ===
# speaker: narrator
アルドは手袋を一枚脱いだ。下から、また白い手袋が現れた。
# speaker: enemy
「負けた。何もしなければ壊れない。だが、何も描かなければ、この絵もない」
「帰ったら、保存していたノートに何か書く。新品のまま三年だ。……鉛筆から始めよう」
# speaker: heroine
「消しゴムも、使っていいと思います」
# speaker: narrator
彼は真剣にうなずき、手袋を落とさないようポケットへしまって去った。
{heroine_name}は、男がいた場所を少し見ていた。
# speaker: heroine
「三年も、最初の一行を待ってたんだね。……何を書くかは、ちょっと見たい」
-> END

=== victory_ending ===
# speaker: enemy
「君も一つ、見落とした。私はもっと大きなものを見落としたらしい。傷まないことと、描く価値は、同じではない」
# speaker: narrator
アルドは手袋を外しかけ、やめた。
# speaker: enemy
「明日から一枚減らす。……いや、明日の私に任せるのは危険だ」
# speaker: narrator
彼は今、一枚を脱いだ。残りの枚数は教えずに、出口へ歩いていった。
{heroine_name}が、ようやく小さく息を漏らした。
# speaker: heroine
「あの人、何もしないのを、ひとつやめたね」
「……{player_address}。私たちも、見落としたところだけ、もう一度見ていこう」
-> END

=== defeat_ending ===
# speaker: enemy
「今日の勝負は私の勝ちだ。だから当然、私の保存法も……」
# speaker: narrator
彼は重なった手袋を見た。その先にある絵を、しばらく見た。
# speaker: enemy
「……勝ったのに、手袋の枚数に自信がなくなった。ひどい勝負だ」
「出直すなら歓迎する。ただし次は、私も少し考えてから来る」
# speaker: narrator
アルドは新しい手袋を取り出しかけ、箱のふたを閉めて去った。
{heroine_name}は答えの書かれたメモをしまい、壁へ視線を戻した。
# speaker: heroine
「悔しいね。私は、わかったつもりで見ていたのが、いちばん悔しい」
「……でも、もう一度見る理由はできた。さっきと同じ絵なのに」
-> END
