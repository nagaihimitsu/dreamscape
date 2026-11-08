// 通常戦（stories/battles/<接頭辞>_….ink）：英語3択3問の前後に入る会話。
// - ゲームが battle_scene に場面名（battles/catalog.json の scenes：intro・after_1・after_2・outro）を渡す。
// - answer_correct は直前の問題の正誤、battle_score はそこまでの正解数。どの組合せでも日本語の台詞が出るようにする。
// - 選択肢と # effect は置かない。各場面は -> END で閉じる。解答前の場面で正解を明かさない。
// - 敵（# speaker: enemy）はヒロインとは別人格。生活・目的・弱さを持たせ、クイズで論破するだけの役にしない。
// - 見本の人物と言い伝えは架空。
VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR battle_scene = "intro"
VAR answer_correct = false
VAR battle_score = 0

{ battle_scene == "intro": -> introduction }
{ battle_scene == "after_1": -> after_first }
{ battle_scene == "after_2": -> after_second }
{ battle_scene == "outro": -> conclusion }
-> END

=== introduction ===
# background: smp_bg_mihon_clock_tower
# speaker: enemy
「旅の人？　三時ですよ。……そう言うと、みんな自分の時計を見て笑うんです」
# speaker: narrator
青年はトーマと名乗った。塔の時計番で、毎朝、動かない歯車に油を差しているという。
# speaker: enemy
「今年こそ直します。止まった時計の番人なんて、仕事をしていないのと同じですから」
# speaker: heroine
「直す前に、止まった理由を聞いてもいいですか」
# speaker: enemy
「古いから止まった。それだけ……のはずです。じゃあ、街の言い伝えで確かめましょうか」
-> END

=== after_first ===
# background: smp_bg_mihon_clock_tower
{ answer_correct:
    # speaker: enemy
    「直さずに、三時のまま残した。……修理代がなかったんだと思ってました」
- else:
    # speaker: enemy
    「言い伝えでは、街の人は新しい塔も建てず、三時のまま残したそうです」
}
# speaker: heroine
「お金の話なら、言い伝えにまではならない気がする。三時に何か意味があったのかな」
-> END

=== after_second ===
# background: smp_bg_mihon_clock_tower
{ answer_correct:
    # speaker: enemy
    「『来られるときに来て』……祖母の口癖でした。時刻のことじゃなかったのか」
- else:
    # speaker: enemy
    「この街の『三時に会おう』は、『来られるときに来て』なんです。ぼくも今、つながりました」
}
# speaker: heroine
# reaction: heroine,smile,sparkle
「いつ来ても三時なら、待ち合わせに遅刻がないね」
-> END

=== conclusion ===
# background: smp_bg_mihon_clock_tower
{ answer_correct:
    # speaker: enemy
    「戻ってきた人のための鐘。……毎朝の油差しは、そのためだったんですね」
- else:
    # speaker: enemy
    「鐘は時刻じゃなく、街に戻ってきた人がいるときに手で鳴らすんです。毎朝の油差しは、そのためでした」
}
{
- battle_score == 3:
    # speaker: enemy
    「全部、街の人の約束の話だった。直すかどうか、ぼく一人で決めることじゃないですね」
    # speaker: heroine
    「うん。でも、毎朝油を差してたのは、ちゃんと仕事だったと思う」
- battle_score == 2:
    # speaker: enemy
    「一つ外れても、言い伝えの形は見えました。町長にも話してみます」
- else:
    # speaker: enemy
    「ぼくも知らないことばかりでした。祖母の話を、もう一度思い出してみます」
    # speaker: heroine
    「わたしも。来られるときに、また聞かせてください」
}
-> END
