INCLUDE modules.ink
-> DONE

// ドゥオモ（ミラノ大聖堂）の場所のファイル（2026-11-13 に1場面1ファイルから移した）。
// 観光案内、通常戦、道中交流（バトルの後と散歩のデートの後の「切れた三本目」）とデート。
// 2026-11-22 の改稿：録音屋リヴィオの初登場。フィナーレ（milano_darsena.ink）の前振りを置く回。
// 前振り：一度聴いた足音は忘れない／録音機のイルカのシール（娘キアラのもの。本人は「前の持ち主の趣味」とごまかす）／
// いちばんの客は外国の匿名の客で、毎月「人の気配なし」を買う／失敗した音は消す主義／自分の息だけは消せず、客は一度も文句を言わない／
// 注文の帳面（フィナーレで # letter: で見せる）／「夕方はたいていダルセナ」。設計は authoring/journeys/milano/drafts/SCENARIO_REWRITE.md。

// 観光案内。tourism/catalog.json の guideStoryId がこの knot を指す。
=== duomo_milano_guide ===
# scene: guide
# background: milano_duomo
# speaker: narrator
ドゥオモ広場に出ると、白い大聖堂が目の前いっぱいに広がった。尖った塔が、何本も空へ伸びている。
# speaker: heroine
# reaction: heroine,surprised,exclamation
わ……写真で見たのと、大きさが全然違う
# speaker: narrator
{heroine_name}はスマホを出し、カメラではなく録音の画面を開いた。
# speaker: heroine
十秒だけ録らせて。帰ってから目をつぶって聴くと、ここに戻ってこられるの
# speaker: player
写真じゃなくて？
# speaker: heroine
写真は、いつも誰かを撮る係だから。音は自分のために録るの。……しーっ
# speaker: narrator
十秒。再生すると、ごそっ、ごそっ、と布のこすれる音がした。広場のざわめきより、ずっと大きい。
# speaker: heroine
# reaction: heroine,exasperated,sweat
……わたしの袖の音しか入ってない
# speaker: narrator
すぐそばに、頭から大きな布をかぶった人がいた。布の下から棒つきのマイクが突き出していて、その先が、彼女の袖を向いている。
-> END

// ───── バトル（本筋）。battles/catalog.json の milano_duomo_01 の storyId がこの knot を指す。1本の流れ（-> quiz(n) -> でクイズ）。
// 団体の案内係（milano_duomo_tour_leader）は名札だけの人物。
=== milano_duomo_01 ===
# scene: battle
# background: milano_duomo
# speaker: narrator
布がめくれ、中から男が顔を出した。鼻の頭に、布の目の跡がついている。
# speaker: enemy
その袖。三本目だ
# speaker: heroine
# reaction: heroine,surprised,question
え……わたし、ですか？
# speaker: enemy
朝から録って、一本目は鳩、二本目は俺の腹の虫。三本目が、君の袖の『ごそっ』
# speaker: narrator
男は録音機をかざして見せた。側面に、色あせたイルカのシールが貼ってある。
# speaker: heroine
ごめんなさい。すぐ向こうへ行きます
# speaker: enemy
動くな！　今動いたら、足音で四本目もだめになる
# speaker: narrator
二人はその場で固まった。男は目を閉じ、こちらの足もとへ耳を向けた。
# speaker: enemy
そっちの彼。靴が新しい。右足に体重が乗ってる。旅に慣れてない足音だ
# speaker: player
……当たってる
# speaker: enemy
# cutin: name
一度聴いた足音は忘れない。商売道具でね。リヴィオだ。十秒のミラノを売ってる
# speaker: heroine
十秒の、ミラノ？
# speaker: enemy
広場の十秒、運河の十秒。映画やお店に売る。今日のはいちばんの得意客で、注文はいつも同じ。『ドゥオモ広場、人の気配なし』
# speaker: narrator
二人は広場を見回した。観光客、鳩、写真を撮る人。自撮りの棒が、あちこちで揺れている。
# speaker: heroine
……ここで、ですか
# speaker: enemy
客は外国の人で、ミラノに来たことがないそうだ。毎月、人のいないミラノを十秒だけ買っていく。家賃の半分は、そいつの払いだ
# speaker: enemy
今日じゅうに送らないと、今月の分はなし。広場なんてのは、もともと空っぽの場所だろ。人さえどけば、本当の音がするはずなんだ
# speaker: heroine
最初から、空っぽだったのかな
-> quiz(1) ->
# background: milano_duomo
{ quiz_correct:
    # speaker: heroine
    空っぽの場所があったんじゃなくて、空けたんだ。新しい大聖堂を建てるために、前の建物を壊して、埋めて
- else:
    # speaker: enemy
    埋めたのは、洪水よけでも市場のためでもない。新しい大聖堂の場所を空けるため、か
}
# speaker: enemy
空っぽにするにも、誰かが片づけたってわけだ。俺の仕事と同じだな
# speaker: narrator
そのとき、小さな男の子が鳩の群れに突っこんだ。
# speaker: narrator
# se: pigeons_takeoff
羽音が広場をおおった。リヴィオは録音機を胸に抱えて、空を仰いだ。
# speaker: enemy
四本目
# speaker: heroine
埋められたのって、どんな建物だったんですか？
# speaker: enemy
知らん。音のしないものに興味はない
# speaker: narrator
{heroine_name}はスマホで調べ始めた。広場の下には今も古い建物の跡が残っていて、見学もできるらしい。
# speaker: heroine
跡の真ん中に、水盤があるんだって。……何に使った水だろう
-> quiz(2) ->
# background: milano_duomo
{ quiz_correct:
    # speaker: heroine
    洗礼の水盤。ここで洗礼を受けた人たちがいたんだ。アウグスティヌスも、ここで
- else:
    # speaker: heroine
    洗い場じゃなくて、洗礼の水盤だったんだ。アウグスティヌスも、ここで洗礼を受けたって
}
# speaker: heroine
誰かにとっての、一生に一度の日。その上で、わたしたちは鳩を追いかけてるんだね
# speaker: enemy
……人の集まった場所の上で、人のいない音を録ってるわけか、俺は
# speaker: narrator
リヴィオがマイクを構え直したとき、広場の向こうから小さな旗が近づいてきた。
# speaker: narrator
旗の後ろに、団体客の列が続いている。四十人はいる。全員が、しゃべっている。
# speaker: enemy
終わった。家賃が、旗を持って歩いてくる
# speaker: narrator
リヴィオはマイクを下ろし、布をたたみ始めた。
# speaker: heroine
# emotion: worried
……あの。十秒だけで、いいんですよね
# speaker: enemy
十秒あれば、あの人数は百回しゃべる
# speaker: narrator
{heroine_name}は団体を見て、それから自分の手を見た。指先が少し冷たくなっている。
# speaker: heroine
知らない人に話しかけるの、得意じゃないんだけど。……十秒なら、頼めるかも
# speaker: player
一緒に行こうか
# speaker: heroine
# emotion: serious
隣にいて。言うのは、わたしが言う
# speaker: narrator
彼女は旗の前まで歩いていき、息を吸った。
# speaker: heroine
Excuse me! Could everyone be quiet for just ten seconds?
# speaker: narrator
十秒だけ、静かにしてもらえませんか。最後のところで、声が少し裏返った。
# speaker: narrator
旗を持った案内係が目を丸くし、リヴィオのマイクを見て、吹き出した。
# speaker: milano_duomo_tour_leader
# cutin: name
はい皆さん、十秒だけお静かに！　録音中です！
# speaker: narrator
旗が高く上がった。四十人の口が、ぴたりと閉じた。子どもが二人、唇に指を当てている。
# speaker: narrator
# pause: 800
リヴィオが録音ボタンを押した。
# speaker: narrator
# quiet: line
風の音。遠くの路面電車。鳩が一羽、石畳を歩く爪の音。
# speaker: narrator
九秒目で、団体の中の子どもが、こらえきれずにくすっと笑った。
# speaker: narrator
# se: applause
停止の音が鳴ると、四十人が自分たちに拍手した。
# speaker: enemy
……四十人が黙った十秒。これなら『人の気配なし』で送れる
# speaker: heroine
四十人もいたのに、どこにも残らないんですね
# speaker: enemy
音は残る。誰がいたかは残らん。そういう商売だ
# speaker: heroine
名前を残すのは、石に彫ることだけじゃないみたいですよ。この大聖堂でも
-> quiz(3) ->
# background: milano_duomo
{ quiz_correct:
    # speaker: heroine
    寄付した人は、紙とネットの名簿に名前を残せる。建物に彫らなくても、ちゃんと残るんだ
- else:
    # speaker: enemy
    入口でも瓦でもなく、名簿か。紙とネットに名前が残る。……石よりずっと軽いな
}
# speaker: narrator
リヴィオはしばらく黙ってから、上着のポケットから手帳を出した。角が丸くなるまで使いこんだ、注文の帳面だ。
# speaker: narrator
# letter: note
ドゥオモ広場。人の気配なし。
# speaker: narrator
# letter: note
（四十人と、案内の旗が一本）
# speaker: enemy
名簿ってほどじゃないがな
# speaker: narrator
彼はイヤホンで今の十秒を聴き直した。九秒目で、指が止まった。
# speaker: heroine
子どもが笑ったところ？
# speaker: enemy
切る。客が買うのは『人の気配なし』だ。君の『Excuse me』も、頭から切る
# speaker: heroine
# emotion: serious
あの笑い声、いちばんいいところだと思うけど
# speaker: enemy
失敗した音は残さない。それが俺のやり方だ
# speaker: narrator
画面の上で、九秒目から先が消えた。{heroine_name}は何か言いかけて、口を閉じた。
# speaker: narrator
消えた音の下に、細い線が一本だけ続いていた。
# speaker: heroine
この線は？
# speaker: enemy
俺の息だ。録ってるあいだは、どうしても入る。これだけは消せない
# speaker: enemy
妙な客でな。人の気配なしと言うくせに、俺の息には一度も文句を言ってこない
# speaker: narrator
リヴィオは録音機をしまうと、二人に名刺を一枚よこした。裏に、手書きで『夕方はたいていダルセナ』とある。
# speaker: enemy
助かった。次に俺の録音を邪魔したら、そのときは払ってもらう
# speaker: narrator
# leave: enemy
布を肩にかけて、彼は広場の向こうへ歩いていった。
# speaker: heroine
知らない人に話しかけちゃった。……四十人も
# speaker: player
声、ちゃんと届いてた
# speaker: heroine
# emotion: smile
最後、裏返ったけどね。……あそこ、切ってもらえてよかったのかな
-> END

// 道中交流「切れた三本目」（knot の名前 duomo_string が交流のID）。
// ドゥオモの場所（p_duomo）の本筋の後（# priority: +1）：ドゥオモのバトルの結果を閉じた後と、散歩のデート（milano_walk_01）の後。ドゥオモを終えた後だけ。
// 完了すると青いピックをもらう（# on_done: item blue_pick）。「場所を空ける」は「また今度」で、散歩のデートの後にまた会える。
// ピックの行き先：城でピックのないティノにもう会っていれば（flag milano_tino_needs_pick）ダルセナを教え、まだならノラは「城の中庭の子に」と言う。
// 尖塔の上に人物像が立つことは scenes/catalog.json の出典。リヴィオの話には頼らない（デートの後にも読める）。
=== duomo_string ===
# scene: encounter
# title: 切れた三本目
# at: place p_duomo
# priority: +1
# when: episode milano_duomo_episode
# person: milano_nora
# on_done: item blue_pick
# background: milano_duomo
# speaker: narrator
大聖堂の正面の脇で、ギターを抱えた女の人が弦を張り替えていた。開いたケースは空っぽで、足を止める客もいない。
# speaker: milano_nora
# cutin: name
客はいるよ。上に
# speaker: narrator
彼女が顎で示した先、尖った塔のてっぺんに、石の人が立っている。あっちの塔にも、こっちの塔にも。
# speaker: milano_nora
ノラ。毎日、あの人たちに向かって弾いてる。一度も帰らない客なんて、ほかにいないからね
# speaker: heroine
ほんとだ……。下から見ると、みんなで聴いてくれてるみたい
# speaker: narrator
鈍い音がして、三本目の弦が跳ねた。ノラは予備の袋を歯で開けようとして、袋ごと石畳に落とした。
# speaker: milano_nora
私が拾ったら、ギターまで落ちる。悪いけど、手を一本貸して
# speaker: heroine
わたし、ギター持ってます。……わ、思ったより重い

* [I'll hold the loose string. # option: coil # translation: ほどけた弦を押さえます。]
    # speaker: narrator
    丸まった弦を押さえると、ノラの両手が空いた。新しい弦を張り終えると、彼女はケースの隅から青いピックを二枚出した。
    -> duomo_string_pick

* [Let me pick up the packet. # option: case # translation: 袋を拾います。]
    # speaker: narrator
    袋を拾うと、中から青いピックがこぼれた。ノラは新しい弦を一本だけ鳴らしてから、二枚のうち一枚をこちらへ押し出した。
    -> duomo_string_pick

* [I'll give you some room. # option: leave # translation: 少し場所を空けます。]
    # later
    # speaker: narrator
    ノラはギターを膝から下ろし、ようやく両手を空けた。
    # speaker: milano_nora
    場所を空けてくれるのも助かる。またね
    # speaker: heroine
    今度ここを通ったら、弦が戻ったか聴いてみよう
    -> END

=== duomo_string_pick ===
# speaker: milano_nora
# item_show: blue_pick
一枚どうぞ。予備が、誰かの本番になる日もあるから
{ cond("flag milano_tino_needs_pick"):
    # speaker: heroine
    あ……城の中庭で、親指で弾いてた子がいた。ケースに、これと同じ形の跡があったの
    # speaker: milano_nora
    ティノだ。あの子、ダルセナの岸でもよく弾いてる。会えたら渡して。私からって言わなくていい
- else:
    # speaker: milano_nora
    城の中庭で、小さいギターを弾いてる子に会ったら、渡してあげて。会わなかったら、あなたのでいい
    # speaker: heroine
    渡すかどうかは、会ってから決めようか
}
# speaker: narrator
張り替えた弦が鳴った。塔の上の客は、今日も一人も帰らなかった。
-> END

// デート（本筋）。romance/date_catalog.json の milano_walk_01 の storyId がこの knot を指す。
// 恋愛の選択は、選択肢のすぐ下の # profile:（と # memory:）。もとの 1場面1ファイルの # effect: と同じ噛み合いと思い出。
=== milano_walk_01 ===
# scene: date
# title: わたしを探す一枚
# background: milano_walk_landmark
# speaker: narrator
ドゥオモ広場で、カメラを渡された。彼女はポーズを取らず、広場の人の流れにすっと混じった。
# speaker: heroine
大聖堂を撮って。あとでわたしを探せるくらい、小さく
この広場の下には、昔の礼拝堂の跡も残ってるんだって。……さすがに、そこまでは写らないか
# speaker: player
君が主役じゃなくていいの？
# speaker: heroine
わたし、いつも撮る係だから。一枚くらい、たしかにここにいたって証拠がほしいの
{
- relationship_tone == "strained" || relationship_tone == "reserved":
# speaker: narrator
彼女はストラップを渡しきるまで、カメラから両手を離さなかった。
- relationship_tone == "romantic_tension" || relationship_tone == "warm":
# speaker: narrator
カメラを渡すとき、彼女は背伸びをして、ファインダーをのぞくこちらの顔を見た。
}

* [「袖だけでも分かる」 # option: first_playful]
    # profile: playful
    { romance_result == "negative":
        # speaker: heroine
        # emotion: exasperated
        わたしがここにいたって話なんだから、袖だけで済ませないで
    - else:
        # speaker: heroine
        # emotion: teasing
        じゃあ腕は振らない。難易度、ちょっと上げます
    }
    -> join_1

* [「どの辺まで歩きたい？」 # option: first_attentive]
    # profile: attentive
    { romance_result == "negative":
        # speaker: heroine
        範囲を決めたら、探すのが簡単すぎる。行き先は内緒
    - else:
        # speaker: heroine
        あの、石の色が変わる辺りまで。足もとも入れてね。歩いてるところも、わたしだから
    }
    -> join_1

* [「一枚だけ僕に任せて」 # option: first_bold]
    # profile: bold
    { romance_result == "negative":
        # speaker: heroine
        一枚だけって言われると緊張する。何枚か撮ってくれる？
    - else:
        # speaker: heroine
        うん、一枚だけね。変でも、あとで二人で見よう
    }
    -> join_1

= join_1
# speaker: narrator
画面を拡大すると、人の肩と肩のあいだに彼女がいた。大聖堂を見上げずに、こちらを向いて笑っている。
# speaker: heroine
しまった。カメラのほう見ちゃった。これじゃ普通の記念写真だ

* [「こっちを見た理由を聞く」 # option: second_honest]
    # profile: honest
    # memory: sound_memory_walk_01
    { romance_result == "negative":
        # speaker: heroine
        そんなに理由がありそうな顔してた？　たまたまかもよ
    - else:
        # speaker: heroine
        ちゃんと探してくれてるか、気になったの。……探してたね
    }
    -> join_2

* [「次は交代して探して」 # option: second_playful]
    # profile: playful
    # memory: sound_memory_walk_01
    { romance_result == "negative":
        # speaker: heroine
        今日は撮る係をお休みしたいの。もう少しだけ
    - else:
        # speaker: heroine
        見つけるよ。立ち止まって人に道を譲る癖、もう知ってるから
    }
    -> join_2

* [「この一枚を送っていい？」 # option: second_attentive]
    # profile: attentive
    # memory: sound_memory_walk_01
    { romance_result == "negative":
        # speaker: heroine
        先に二人で見よう。送るかどうかは、ちょっと考えさせて
    - else:
        # speaker: heroine
        うん。縮めないで送って。家でも、探すところからもう一回やりたい
    }
    -> join_2

= join_2
{ relationship_tone_after == "romantic_tension" || relationship_tone_after == "guarded_attraction":
# speaker: narrator
小さな画面を一緒にのぞきこんだとき、肩が触れた。
}
# speaker: narrator
二人で画面を元の大きさに戻した。彼女はまた人ごみに紛れたが、今度はすぐに見つかった。
-> END
