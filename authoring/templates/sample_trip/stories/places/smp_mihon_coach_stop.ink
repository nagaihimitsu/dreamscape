// 【任意：会話の手がかりと時点の推理クイズ】【場所のファイル】見本の停留所（stories/places/<接頭辞>_<都市ID>_<場所>.ink）。見本の停留所と人物は架空。
// - この1本に、時点に置く推理クイズB（時点のクイズ）を書く。観光地 mihon_coach_stop（tourism/catalog.json）は地図の出来事を持たず、
//   観察も案内もない（observation: false）。このクイズは progression/journey.json の storyBattles にも、travel の出来事にも書かない
//   （地図から始めると時点の外で開き、保存を読み込めなくなるので、ビルドが止める）。
// - 頭の # at: epilogue mihon と # priority: -3 で、都市のエピローグの時点の手番として、エピローグの前（-2・-1 の場面より先）に流れる。
//   置ける時点は今は depart（出発）と epilogue（エピローグ）だけ。形式は推理のある B・C だけ。頭に # then: は書けない。
// - # when: は、番が来たときに調べる条件（# at: のないクイズの # when: は、地図に出る条件）。手がかり smp_obs_mihon_coach_bell は、
//   時計塔の鐘の会話で「下から見上げておく」を選ぶと手がかり帳に入る（その選択肢の # clue:）。持っていなければ、このクイズは流れない。
// - # repeat: を書かなければ once（一度遊んだクイズは、もう流れない）。会話の選択肢の札と頭の # on_done: は最初の1回だけ当たる。
//   頭の # on_done: はお金・APを減らせない（払いは選択肢の # money:・# ap: に書く）。
// - 結果の画面の出口は「先へ進む」。押すと、エピローグの時点の次の手番（-2・-1 の場面、エピローグ）へ続く。
// - 書き方は特殊戦B（朝市）と同じ：主張は手伝いの knot <バトル>_claim、追及は <バトル>_press。
// - この部分を外すときは、このファイルごと外す（README の「任意の部分」）。
INCLUDE modules.ink
-> DONE

=== smp_mihon_special_b_coach ===
# scene: battle
# at: epilogue mihon
# priority: -3
# when: clue smp_obs_mihon_coach_bell
# background: smp_bg_mihon_clock_tower
# speaker: narrator
街を出る前に、時計塔の下の停留所へ寄った。切符売りの男が、乗合馬車の札を裏返している。
# speaker: enemy
おや、次の街へ？　残念。今日の馬車は、三時にもう出ましたよ
// 会話の選択肢（# option:）も書ける。札（# rel:・# money: など）は、このクイズを最初に遊んだときだけ当たる。
* [「三時って、どの三時ですか」と聞き返す # option: ask_which_three]
    # speaker: heroine
    三時に？　この街の時計、ずっと三時ですけど……
    # speaker: enemy
    だからこそ、きっちり三時に出るんです
* [黙って時刻表を見に行く # option: look_timetable]
    # speaker: narrator
    時刻表は色あせて、行き先の街の名前しか読めない。
    # speaker: enemy
    時刻表を見ても無駄ですよ。馬車は、きっちり三時に出るんです
-
# speaker: enemy
まずは、この停留所のことから
-> quiz(1) ->
# background: smp_bg_mihon_clock_tower
{ quiz_correct:
    # speaker: enemy
    そう、塔の真下。馬車は三十年、ここで止まって、ここから出ていきます
- else:
    # speaker: enemy
    停留所は時計塔の真下です。馬車は三十年、ここで止まって、ここから出ていきます
}
-> smp_mihon_special_b_coach_claim ->
- (stop)
-> reasoning ->
{ reasoning_action == "press":
    -> smp_mihon_special_b_coach_press ->
    -> stop
}
{ evidence_result == "failure":
    # background: smp_bg_mihon_clock_tower
    # speaker: enemy
    その資料で、馬車がまだ出ていないと言えますか
    # speaker: heroine
    これじゃない。馬車がいつ出るのか、誰かに聞いた気がする
    -> stop
}
# background: smp_bg_mihon_clock_tower
# speaker: heroine
トーマさんが言っていました。馬車は塔の時計じゃなくて、夕方の鐘で出るって
# speaker: narrator
切符売りは塔を見上げた。鐘は、まだ鳴っていない。
# speaker: enemy
……聞いていましたか。でも、答えはまだですよ
-> quiz(2) ->
# background: smp_bg_mihon_clock_tower
{ quiz_correct:
    # speaker: enemy
    夕方の鐘。御者は、あれを聞いてから手綱を取ります
- else:
    # speaker: enemy
    合図は夕方の鐘です。止まった針では、誰も出発できません
}
# speaker: heroine
じゃあ、どうして、もう出たなんて
-> quiz(3) ->
# background: smp_bg_mihon_clock_tower
{ quiz_correct:
    # speaker: enemy
    三時の街を、もう一晩見てほしかった。……見送るのに、少し疲れていたのかもしれません
- else:
    # speaker: enemy
    時刻表も馬も関係ありません。ただ、三時の街をもう一晩見てほしかったんです
}
{
- battle_score == 3:
    # speaker: enemy
    鐘が鳴るまで、ここで待ちましょう。次に来るときは、どの三時でもいいですから
    # speaker: heroine
    # emotion: happy
    はい。そのときは、ちゃんと一晩泊まります
- else:
    # speaker: enemy
    馬車は夕方に出ます。乗り遅れないように、鐘を聞いていてください
}
-> END

=== smp_mihon_special_b_coach_claim ===
# background: smp_bg_mihon_clock_tower
# speaker: enemy
この街の馬車は、塔の三時に合わせて出るんです。今日の馬車は、もう行ってしまいました
->->

=== smp_mihon_special_b_coach_press ===
# background: smp_bg_mihon_clock_tower
# speaker: enemy
塔の三時に出る、と決まっているんです。今から急いでも、もう間に合いません
# speaker: heroine
……塔の三時、ですか。馬車の合図は、本当に時計なんでしょうか
->->
