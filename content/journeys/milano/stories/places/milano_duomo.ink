INCLUDE modules.ink
-> DONE

// ドゥオモ（ミラノ大聖堂）の場所のファイル（2026-11-13 に1場面1ファイルから移した）。
// 観光案内、通常戦、道中交流（バトルの後と散歩のデートの後の「切れた三本目」）とデート。
// 2026-11-23 の全面改稿：ヴィオラのリストの「音楽」。大聖堂の前の一等地を四十年守るアコーディオン弾きネッロと、場所を取った若いバンドのジャーダ。
// 反転：ジャーダたちの「作者不明の古い歌」は、ネッロが五十年前に妻のために作った歌だった（三小節目が上がる）。
// 結末：ジャーダは来る。ネッロは「考えとく」（フィナーレで、演奏の途中に現れる）。設計は authoring/journeys/milano/drafts/SCENARIO_REWRITE.md。

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
{heroine_name}はカメラを構えかけて、手を止めた。広場の両端から、音楽が聞こえてくる。
# speaker: narrator
右からはアコーディオン。左からは、バイオリンとギターと太鼓。二つは、同じ旋律を、違う速さで弾いていた。
# speaker: heroine
同じ曲……だよね？　追いかけっこしてるみたい
# speaker: narrator
曲の途中で、アコーディオンが止まった。弾いていた老人は楽器を下ろすと、まっすぐ左のほうへ歩きだした。
-> END

// ───── バトル（本筋）。battles/catalog.json の milano_duomo_01 の storyId がこの knot を指す。1本の流れ（-> quiz(n) -> でクイズ）。
// ジャーダ（milano_giada）は名札だけの人物。リストの2行目（音楽）を見せる。
=== milano_duomo_01 ===
# scene: battle
# background: milano_duomo
{ not cond("episode milano_galleria_episode") and not cond("episode milano_last_supper_episode") and not cond("episode milano_castello_episode"):
    -> milano_duomo_01_viola ->
}
# speaker: enemy
その歌を、やめろ
# speaker: narrator
アコーディオンの老人が、若い三人組の前に立ちはだかった。バイオリンを構えた女の子が、弓を下ろさずに言い返す。
# speaker: milano_giada
# cutin: name
ジャーダ。この広場は、誰のものでもないでしょ。おじいさんこそ、向こうで弾いてれば
# speaker: enemy
# cutin: name
ネッロだ。この場所は、四十年わしの場所だ。お前たちが生まれる前からな
# speaker: narrator
{heroine_name}は、ヴィオラにもらったリストを取り出した。
# speaker: narrator
# letter: note
音楽：ドゥオモの前に、昔すごいアコーディオン弾きがいた。今もいる？
# speaker: heroine
……あの人だ。でも、今は頼めそうにないね
# speaker: milano_giada
ねえ、そこの二人。どっちが正しいと思う？　旅の人なら、どっちの味方でもないでしょ
# speaker: heroine
# reaction: heroine,surprised,sweat
えっ、わたしたちが決めるの？
# speaker: enemy
決めるまでもない。わしが来たとき、ここには誰もいなかった。空っぽの広場だった
# speaker: heroine
この広場、最初から空っぽだったのかな
-> quiz(1) ->
# background: milano_duomo
{ quiz_correct:
    # speaker: heroine
    空っぽだったんじゃなくて、空けたんだ。新しい大聖堂を建てるために、前の建物を壊して、埋めて
- else:
    # speaker: milano_giada
    新しい大聖堂を建てるために、前の建物を壊して埋めたんだって。……ほら、おじいさんより先に、誰かいたじゃない
}
# speaker: enemy
ふん。なら、なおさら来た順だ。先にいた者が、場所を空けてやったんだからな
# speaker: milano_giada
空けたのは建物でしょ。おじいさんじゃない
# speaker: narrator
にらみ合う二人のあいだで、太鼓の男の子が、こっそりスティックを回している。
# speaker: heroine
……その、下に埋められた建物って、何だったんだろう
# speaker: narrator
{heroine_name}はスマホで調べた。広場の下には今も古い建物の跡が残っていて、真ん中に水盤があるらしい。
-> quiz(2) ->
# background: milano_duomo
{ quiz_correct:
    # speaker: heroine
    洗礼の水盤。アウグスティヌスも、ここで洗礼を受けたんだって
- else:
    # speaker: heroine
    洗い場じゃなくて、洗礼の水盤だったんだ。アウグスティヌスも、ここで洗礼を受けたって
}
# speaker: heroine
この広場の下は、誰かが新しく仲間に迎えられた場所だったのかも。……先にいた人が、あとから来た人を追い出す場所じゃなくて
# speaker: enemy
……説教は、司祭に任せてある
# speaker: milano_giada
分かった、分かった。じゃあ最後に一曲だけ。それで今日は移るから
# speaker: narrator
ジャーダが弓を構えて、三人がさっきの曲を弾き始めた。広場の人が、何人か足を止める。
# speaker: narrator
ネッロの顔から、すうっと血の気が引いた。
# speaker: enemy
……三小節目が違う。そこは、上がるんだ
# speaker: narrator
ネッロはアコーディオンを構えて、同じ旋律を弾いた。三小節目で、音がふわりと上がった。
# speaker: milano_giada
……なんで知ってるの。この曲、フリーマーケットで買った古いカセットに入ってたの。作った人の名前もなかった
# speaker: enemy
五十年前に、わしが女房のために作った。名前なんか書くか。照れくさい
# speaker: narrator
三人組は、楽器を持ったまま固まった。
# speaker: enemy
……もういい。名前なんか、どうでもいい。歌は、誰かが歌ってくれれば残る
# speaker: heroine
名前を残すのって、そんなに大げさなことじゃないみたいですよ。この大聖堂でも
-> quiz(3) ->
# background: milano_duomo
{ quiz_correct:
    # speaker: heroine
    寄付した人は、紙とネットの名簿に名前を残せる。石に彫らなくても、名前は残せるんだ
- else:
    # speaker: milano_giada
    入口でも瓦でもなくて、名簿。紙とネットに、名前が残る……。石に彫らなくていいんだ
}
# speaker: milano_giada
じゃあ、これからは毎回言う。『この曲は、ネッロの作曲です』って
# speaker: enemy
……やめろ。照れくさい
# speaker: narrator
そう言いながら、ネッロはアコーディオンを下ろさなかった。四人で、もう一度、頭から弾き始める。
# speaker: narrator
三小節目で、四つの音が、そろって上がった。
# speaker: narrator
曲が終わると、{heroine_name}はリストを握りしめて、一歩前へ出た。
# speaker: heroine
# emotion: serious
あの……ダルセナで、服のショーがあるんです。音楽がなくて。……弾いてもらえませんか
# speaker: milano_giada
行く！　日暮れでしょ。この子たちも連れてく
# speaker: enemy
年寄りは早く寝る
# speaker: milano_giada
またそういう……
# speaker: enemy
……考えとく
# speaker: narrator
# leave: enemy
ネッロは楽器を背負って、自分の場所へ戻っていった。三小節目のところを、口笛で吹きながら。
# speaker: heroine
# emotion: smile
音楽は、半分だけ埋まった。……でも、ちゃんと頼めた
-> END

// ヴィオラとの出会い（手伝いの knot）。本筋4回のうち、この回を最初に遊んだときだけ、クイズの頭で流れる（広場で、二つの音楽に気を取られているときにぶつかる）。
// ショーとリスト（4つの空欄と心当たり）を見せる。品物は渡さない（クイズの中では品物を渡せないため、リストは # letter: で見せる）。
=== milano_duomo_01_viola ===
# speaker: narrator
アコーディオンの老人を目で追いかけていたら、横から誰かと正面からぶつかった。
# speaker: narrator
# se: cloth_flap
抱えられていた衣装袋が、いくつも石畳に散らばった。口から、袖や裾がのぞいている。
# speaker: milano_viola
# cutin: name
ごめん、ごめん、ごめん！　拾って、でも踏まないで！　……あ、それ引きずらないで。世界に一着しかないの
# speaker: heroine
# reaction: heroine,surprised,sweat
は、はい！
# speaker: narrator
{heroine_name}が拾い上げたのは、厚い木綿の上着だった。仕事着みたいに丈夫そうなのに、襟の裏にだけ、細い刺繍がある。
# speaker: heroine
……きれい。作業着みたいなのに、裏だけ、すごく丁寧
# speaker: milano_viola
裏に気づいた人、初めて。ヴィオラ。服を作ってる。……作ってるけど、まだ誰にも見せたことがない
# speaker: narrator
ヴィオラは荷物を抱え直すと、{heroine_name}を頭からつま先まで眺めた。
# speaker: milano_viola
ねえ、あなた。モデルやらない？
# speaker: heroine
む、無理です
# speaker: milano_viola
即答。いいね、正直で
# speaker: milano_viola
大きなショーには、全部断られたの。『働く人の服なんて地味すぎる』って。だから、自分でやる。ダルセナの岸で、日暮れに
# speaker: milano_viola
ミラノで働く人の服を、ミラノで働く人に着て歩いてもらうショー。……でも、穴だらけ
# speaker: narrator
ヴィオラは、ポケットから折りたたんだ紙を出して広げた。
# speaker: narrator
# letter: note
音楽：まだ。ドゥオモの前に、昔すごいアコーディオン弾きがいた。今もいる？
# speaker: narrator
# letter: note
モデル：まだ。ガッレリアで五十年、毎日お茶をしてる夫婦がいるらしい。
# speaker: narrator
# letter: note
お客の整理：まだ。『最後の晩餐』の係の人は、行列をさばくのが鬼のようにうまい。
# speaker: narrator
# letter: note
仕上げ：まだ。相棒のルーカが消えた。あいつは迷うと、城の中庭に行く。
# speaker: milano_viola
心当たりは書いたけど、探して回る暇がないの。針が二本しかないのに、穴が四つ
# speaker: narrator
{heroine_name}は紙を見つめたまま、しばらく黙っていた。それから、ゆっくり顔を上げた。
# speaker: heroine
# emotion: serious
モデルは、無理です。でも……旅のあいだに、この人たちに会えたら、声をかけてみます
# speaker: milano_viola
それ、モデルより大変だよ？　ミラノの人は、みんな忙しいから
# speaker: milano_viola
その紙、あげる。四つ埋まったら、ダルセナで会おう
# speaker: milano_viola
最後の一着は、もう縫い始めてるから！　モデルが決まってないだけ！
# speaker: narrator
返事をする前に、ヴィオラは鳩の群れを突っ切って、人ごみに消えた。
# speaker: heroine
# reaction: heroine,exasperated,sweat
……言っちゃった。知らない人に頼みごとするの、いちばん苦手なのに
# speaker: player
手伝うよ
# speaker: heroine
# emotion: smile
うん、ありがとう。……でも、頼むのはわたしがやる。言いだしたの、わたしだから
# speaker: narrator
広場の左のほうで、老人の怒鳴り声が上がった。
->->

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
