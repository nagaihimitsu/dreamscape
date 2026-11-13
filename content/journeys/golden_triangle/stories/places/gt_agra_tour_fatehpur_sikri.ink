INCLUDE modules.ink
-> DONE

// ファテープル・シークリー日帰りツアー（tours/gt_agra_tour_fatehpur_sikri.json）の場面。8場面。
// 札：# scene: tour_leg（区間の語り）・# at: tour <ツアー> <行程>・# priority: after leg（車の中の交流）・-1・+1。書き方は authoring/CONTENT_GUIDE.md の「ツアー」。
// 流れ：out の前（宿の朝）→ out の語り → out の車の中 → out の後（着いた所）→ visit（本筋：観光案内・観察・バトル）
//       → visit の後（車に戻る前）→ back の語り → back の車の中 → back の後（宿）。
// 本筋より前の場面では、観光案内とバトルの中身（町が丸ごとあること・尾根の上の眺め・門の碑文・聖者と跡継ぎ・皇帝が町を出たこと）を先に言わない。
// 本筋のバトル（ムケーシュ）にふれる文は cond("battle gt_agra_main_fatehpur_sikri_battle") の中だけに書く。
// 文の中に時刻と金額は書かない。運転手のヴィノードはガイドではない（中の説明をしない）。
// 土地の事実を言う場面は scenes/catalog.json に出典を書く（gt_agra_tour_morning・gt_agra_tour_out_leg・gt_agra_tour_arrive・gt_agra_tour_back_leg）。ほかは # sources: none。

// 【ツアー】out の前（-1）：宿の帳場のサミールと、大通りで待つ運転手のヴィノード
=== gt_agra_tour_morning ===
# scene: talk
# at: tour gt_agra_tour_fatehpur_sikri out
# priority: -1
# background: gt_bg_agra_hotel_hub
# bgm: morning
# speaker: narrator
朝の帳場で、サミールが待ちかまえていた。手には、ツアーの紙と、見覚えのある名刺。
# speaker: gt_samir
おはようございます。今日はファテープル・シークリーですね。……ただ、このツアーには、ガイドがついておりません
# speaker: gt_samir
今からでも、叔父を呼べます。この町で一番泣かせるガイドです。アクバルとジョーダーの恋の話なら、叔父の右に出る者はおりません
# speaker: heroine
ありがとうございます。でも、今日は、二人で見て回りたいんです
# speaker: narrator
言い終えてから、彼女は自分で少し驚いた顔をした。断る言葉が、思ったより先に出たらしい。
{ cond("date gt_agra_date_mariam_tomb"):
    # speaker: heroine
    それに、ジョーダーって名前、あとから広まった呼び名かもしれないって、聞きました
    # speaker: gt_samir
    恋の話に、本当の名前は要りません
    # speaker: heroine
    # emotion: serious
    名前が大事な人も、いると思うけどな
}
# speaker: gt_samir
お二人きりで。なるほど、ロマンチックです
# speaker: narrator
帳面の上で、サミールのペンが、妙に楽しそうに動いた。
路地を抜けた先の大通りに、白い車が停まっていた。横に、アイロンの効いたシャツの男が立っている。胸の前に掲げた紙には、こちらの名前が、整ったアルファベットで書いてあった。
# speaker: heroine
# emotion: worried
運転手つきの車、って聞くと、まだ少し、デリーの駅を思い出しちゃう
# speaker: narrator
男は紙を下ろし、軽く頭を下げた。
# speaker: gt_vinod
# cutin: name
ヴィノードです。運転をします。ガイドではありません。中のことは皇帝の仕事、外のことは、わたしの仕事
# speaker: heroine
# reaction: heroine,surprised,sparkle
その字、きれいですね。看板屋さんの字みたい
# speaker: gt_vinod
娘が書きました。わたしの字は、道に迷った牛みたいだそうです
# speaker: narrator
彼女は吹き出し、それから、こちらにだけ聞こえる声で言った。
# speaker: heroine
# emotion: smile
名前の紙を、娘さんに書いてもらう人。お芝居なら、そんなところまで作らないと思う
-> END

// 【ツアー】out の区間の語り（車の中）。観光案内の最初の眺め（尾根の上の町）は、ここでは書かない
=== gt_agra_tour_out_leg ===
# scene: tour_leg
# at: tour gt_agra_tour_fatehpur_sikri out
# background: gt_bg_agra_fatehabad_road
# bgm: gt_india_rhythm
# ambience: stop
# speaker: narrator
アーグラの町を抜けるまでが、いちばん長かった。オートリキシャ、自転車、制服の子どもたちを荷台に乗せた三輪。交差点の真ん中では、牛が一頭、信号のかわりに立ち止まっている。
ヴィノードは、クラクションを鳴らさなかった。牛の後ろで、ただ待っている。
# speaker: heroine
鳴らさないんですね
# speaker: gt_vinod
牛は、鳴らしても急ぎません。急ぐのは、こっちの心臓だけ
# background: gt_bg_agra_tour_road
# speaker: narrator
やがて道は西へまっすぐ伸び、建物の間に畑がのぞきはじめた。前を走るトラックの荷台の後ろに、色とりどりの文字が描いてある。HORN OK PLEASE。
# speaker: heroine
# reaction: heroine,surprised,question
ホーン、オーケー、プリーズ……。鳴らして、いいよ、お願い？　どういう意味なんだろう。あ、あっちのトラックにも書いてある
# speaker: gt_vinod
その OK は、運転手の数だけ説があります。父の説と、わたしの説も違います
# speaker: heroine
ヴィノードさんの説は？
# speaker: gt_vinod
書いてあると、なんだか安心する。それだけです
# speaker: narrator
バックミラーの下で、糸に通した小さなレモンと青唐辛子が揺れていた。彼女の視線に気づいて、ヴィノードが顎で示す。
# speaker: gt_vinod
母が付けます。悪い目よけ。シークリーへ行くたびに、新しいのに替えてくれる
# speaker: heroine
お母さん、シークリーに住んでるんですか？
# speaker: gt_vinod
皇帝の所の、すぐ下の町に。お二人が中にいる間、わたしは母の家で昼ごはんです。このツアーは、わたしにも、いいツアー
# speaker: narrator
窓の外を、畑が流れていく。水路の脇で、子どもが一人、水牛の群れを棒で追っていた。
-> END

// 【ツアー】out の車の中の交流（語りの後、着く前）。母に、二人のことを何と伝えるか
=== gt_agra_tour_out_mother ===
# scene: encounter
# title: 母への土産話
# at: tour gt_agra_tour_fatehpur_sikri out
# priority: after leg
# sources: none
# background: gt_bg_agra_tour_road
# bgm: gt_india_rhythm
# ambience: stop
# speaker: narrator
しばらく黙って走ってから、ヴィノードがバックミラー越しにこちらを見た。
# speaker: gt_vinod
一つ、聞いてもいいですか。母は、わたしが乗せたお客さんの話を、必ず聞きたがります。どこから来て、何を見て、どういう二人か
# speaker: gt_vinod
母は、シークリーからほとんど出ません。だから、お客さんの話が、母の旅行です
# speaker: gt_vinod
サミールさんは、新婚さんだと言っていました。でも、お二人は、新婚さんの顔には見えない。……母に、何と言えばいいですか
# speaker: heroine
# reaction: heroine,exasperated,sweat
サミールさん、運転手さんにまで……
{ cond("flag gt_agra_said_for_now"):
    # speaker: heroine
    # reaction: heroine,teasing,question
    今度は、『今のところは』って言わないでね
}
* [Tell her we're traveling together. That's all. # option: just_traveling # translation: 一緒に旅をしている二人だ、とだけ伝えてください。]
    # set: gt_agra_tour_told_traveling
    # rel: trust +1
    # speaker: gt_vinod
    一緒に旅をしている二人。分かりました。母は、その先を自分で考えるのが好きです
    # speaker: heroine
    # emotion: smile
    うん。それが、いちばん正確
    # speaker: heroine
    # reaction: heroine,teasing,question
    でも、『とだけ』って言われると、ちょっとだけ引っかかるな。ふふ、冗談
* [Tell her she reads everything. Signs, trucks, walls. # option: she_reads # translation: 何でも読む人だ、と。看板も、トラックも、壁も。]
    # set: gt_agra_tour_told_reader
    # rel: affection +1
    # speaker: heroine
    # reaction: heroine,shy,blush
    それ、わたしの紹介？　トラックまで読むのは、本当だけど
    # speaker: gt_vinod
    いい紹介です。母は、よく見る人が好きです。わたしは、前しか見ないので
* [She can answer that herself. # option: ask_her # translation: それは、彼女が自分で答えられます。]
    # set: gt_agra_tour_she_answered
    # rel: trust +1
    # speaker: heroine
    # reaction: heroine,surprised,interrobang
    えっ、わたし？
    # speaker: narrator
    彼女は少し考えてから、前の座席の背に手をかけた。
    # speaker: heroine
    同じ町を、同じ日に見たかった二人です。……って、伝えてください
    { cond("couple"):
        # speaker: heroine
        # reaction: heroine,shy_deep,blush
        新婚では、ないです。……恋人では、ありますけど
    - else:
        # speaker: heroine
        新婚では、ないです。そこは、大事なところなので
    }
    # speaker: gt_vinod
    同じ町を、同じ日に。いい言葉です。そのまま、母に渡します
-
# speaker: narrator
ヴィノードは小さくうなずき、アクセルを少し踏みこんだ。
-> END

// 【ツアー】out の後（+1）：着いた所。ヴィノードは母の家へ。見学の前（観光案内の最初の眺めの前なので、町の様子は書かない）
=== gt_agra_tour_arrive ===
# scene: talk
# at: tour gt_agra_tour_fatehpur_sikri out
# priority: +1
# background: gt_bg_agra_fatehpur_sikri_bazaar
# bgm: gt_vadodora
# ambience: gt_amb_bazaar
# speaker: narrator
# se: car_door
ヴィノードは、大きな木の陰に車を停めた。エンジンを切ると、外の音が急に近くなった。呼び込みの声、バイクの音、どこかで鳴る鈴。
ヴィノードは名前の紙を裏返し、電話番号を書いて、こちらに渡した。娘さんのきれいな字の裏に、道に迷った牛の字が並んだ。
# speaker: gt_vinod
入口で、ガイドが要ると言う人がいます。切符だけでは足りない、と言う人も。足ります。お二人の切符で、ちゃんと全部です
# speaker: heroine
# emotion: smile
# recall: gt_album_d84
大丈夫です。ノー・サンキューは、デリーで練習してきました
# speaker: gt_vinod
それなら安心です。デリーで練習した人は、どこでも強い
# speaker: heroine
お母さんに、よろしく伝えてください。あ、さっきの話も
# speaker: narrator
ヴィノードは笑って、木の下の細い道を、下の町の方へ歩いていった。
-> END

// 【ツアー】visit の後（+1）：見学を終えて車に戻る前。ヴィノードの母から、マトリーと、さっきの話への返事
=== gt_agra_tour_mathri ===
# scene: talk
# at: tour gt_agra_tour_fatehpur_sikri visit
# priority: +1
# sources: none
# background: gt_bg_agra_fatehpur_sikri
# bgm: gt_relics_of_past
# ambience: amb_wind
# speaker: narrator
木の陰に戻ると、ヴィノードはもう車の横にいた。ボンネットの上に、新聞紙の包みが一つ。
# speaker: gt_vinod
母からです。お二人に、と
# speaker: narrator
包みの中は、狐色の平たい揚げ菓子だった。マトリーというらしい。ヴィノードの母のは、アジョワンという種が入っている。
# speaker: heroine
# reaction: heroine,surprised,exclamation
あ、しょっぱい！　甘いクッキーだと思ってた
# speaker: heroine
# emotion: happy
でも、この香り、好き。ちょっと薬草みたいで、口の中がすっとする
# speaker: gt_vinod
母は、何にでもアジョワンを入れます。お腹にいい、と言って
{
- cond("flag gt_agra_tour_she_answered"):
    # speaker: gt_vinod
    母に、伝えました。同じ町を、同じ日に見たかった二人。母はしばらく黙って、それから言いました。それはもう、旅の話じゃなくて、二人の話だね、と
    # speaker: heroine
    # reaction: heroine,shy,blush
    ……お母さん、鋭い
- cond("flag gt_agra_tour_told_reader"):
    # speaker: gt_vinod
    母に、伝えました。何でも読む人。母は笑って、それなら帰りの道も、ずっと何か読んでいるんだろう、運転は静かにね、と
    # speaker: heroine
    # reaction: heroine,teasing,music
    読みます。トラック、全部
- cond("flag gt_agra_tour_told_traveling"):
    # speaker: gt_vinod
    母に、伝えました。一緒に旅をしている二人。母は、『一緒に』のところだけ、二回聞き返しました
    # speaker: heroine
    # reaction: heroine,surprised,sweat
    に、二回……
- else:
    # speaker: gt_vinod
    母は、お二人のことを聞きたがっていました。どこから来て、何を見たか。帰りに、また話します
}
# speaker: heroine
お母さんに、おいしかったって伝えてください。ほんとは、自分で言えたら、いちばんいいんだけど
-> END

// 【ツアー】back の区間の語り（車の中）。本筋のバトルにふれる文は cond の中だけ
=== gt_agra_tour_back_leg ===
# scene: tour_leg
# at: tour gt_agra_tour_fatehpur_sikri back
# background: gt_bg_agra_fatehpur_sikri_distant
# bgm: atlantean_twilight
# ambience: stop
# speaker: narrator
帰りの車の中は、行きより静かだった。日差しが真上から照りつけ、エアコンの風が、やっと追いついてくる。
# speaker: player
ヴィノードさんは、中に入ったことは？
# speaker: gt_vinod
一度だけ。学校の遠足で。あとは、ずっと外です。外にも、見るものはあります
# speaker: narrator
道沿いの家の屋上から、鉄の棒が何本も突き出していた。どの家も、まだ上に何かを建てるつもりのように見える。
{ cond("battle gt_agra_main_fatehpur_sikri_battle"):
    # speaker: heroine
    ムケーシュさんの家、今日、屋根ができるんだよね。二階の奥に、本を読む部屋のある家
    # speaker: narrator
    彼女は窓に額を寄せて、屋上の鉄の棒を、一軒ずつ目で追っていた。
}
# speaker: gt_vinod
うちの屋上も、ああです。もう一階、建てるつもりで。母の部屋です。母が、来ると言えば
# speaker: heroine
来てくれないんですか？
# speaker: gt_vinod
皇帝が出ていった町だから、誰かが残らないといけない、と言います
# speaker: gt_vinod
それに母は、聖者のお墓に糸を結んで、わたしを授かったそうです。だから、聖者のそばを離れない。皇帝は王子をもらって、母はわたしをもらった。母は、それで十分だと言います
# speaker: heroine
# emotion: smile
十分すぎるくらいだと思います
# speaker: narrator
ヴィノードは返事のかわりに、バックミラーのレモンを指で弾いた。
それから、しばらく誰も話さなかった。{heroine_name}のまぶたが、ゆっくりと下りてくる。
{ cond("couple"):
    # speaker: narrator
    # photo: gt_album_a27 # photo_caption: 帰りの車、こつんと落ちる頭
    # stand: close
    頭が、こちらの肩に、こつんと落ちた。
- else:
    # speaker: narrator
    頭が、窓ガラスに、こつんと当たった。
}
-> END

// 【ツアー】back の車の中の交流（語りの後、着く前）。眠ったはずの彼女
=== gt_agra_tour_back_awake ===
# scene: encounter
# title: 眠ったふり
# at: tour gt_agra_tour_fatehpur_sikri back
# priority: after leg
# sources: none
# background: gt_bg_agra_tour_road
# bgm: atlantean_twilight
# ambience: stop
# speaker: narrator
寝息のような音が聞こえはじめたころ、ヴィノードが声を落とした。
# speaker: gt_vinod
眠りましたか。……一つ、いいですか。お客さんは、たいてい皇帝のことを聞きます。何年住んだか、妃は何人いたか
# speaker: gt_vinod
でも、この人は、わたしの母のことを聞きました。レモンのことも、娘の字のことも、トラックの OK のことも。いつも、こうですか
* [Always. She notices what I miss. # option: notices_more # translation: いつもです。自分が見落とすものに、気づく人です。]
    # rel: affection +1
    # speaker: narrator
    目を閉じたまま、彼女の口元だけが、ゆっくり笑った。
    # speaker: heroine
    # reaction: heroine,shy,blush
    ……聞こえてるよ。本人のいる所で、そういうこと言う？
* [Only when she's having fun. # option: when_happy # translation: 楽しいときだけです。]
    # rel: spark +1
    # speaker: narrator
    目を閉じたまま、彼女が言った。
    # speaker: heroine
    # reaction: heroine,teasing,music
    楽しいときだけ？　じゃあ、今日は、ずっと楽しかったってことになるね
* [Ask her when she wakes up. # option: ask_when_awake # translation: 起きたら、本人に聞いてください。]
    # rel: trust +1
    # speaker: narrator
    すると、閉じていたはずの目が、片方だけ開いた。
    # speaker: heroine
    # reaction: heroine,teasing,question
    起きてます。わたしが答えるね。ヴィノードさんの話のほうが、皇帝の話より、近くにあったからです
-
# speaker: narrator
ヴィノードが、声を出して笑った。
# speaker: gt_vinod
これは、母が喜びます。今日いちばんの土産話です
-> END

// 【ツアー】back の後（+1）：宿に戻った後。ヴィノードと別れ、帳場のサミールに迎えられる
=== gt_agra_tour_home ===
# scene: talk
# at: tour gt_agra_tour_fatehpur_sikri back
# priority: +1
# sources: none
# background: gt_bg_agra_fatehabad_road
# bgm: atlantean_twilight
# speaker: narrator
大通りで車を降りると、ヴィノードが運転席の窓を下ろした。
# speaker: gt_vinod
次にシークリーへ来るときは、母の家に寄ってください。食べきれないほど、食べさせられますが
# speaker: heroine
# emotion: smile
次は、って言ってくれるんですね。はい。マトリーのお礼、お母さんに、自分で言いたいです
# speaker: narrator
白い車は、大通りの流れに戻っていった。バックミラーの下のレモンと青唐辛子が、最後まで揺れていた。
# background: gt_bg_agra_hotel_hub
# speaker: narrator
宿の帳場では、サミールが帳面を開いて待っていた。
# speaker: gt_samir
おかえりなさい。いかがでした？　叔父がいなくて、お寂しくはなかったですか
# speaker: heroine
ガイドさんがいなくても、話してくれる人は、たくさんいました
# speaker: gt_samir
なるほど。お二人の思い出が、たくさん
# speaker: narrator
サミールは、また何かを書き足した。
# speaker: heroine
# reaction: heroine,exasperated,sigh
……誤解は、今度、まとめて、ちゃんと解きます
-> END
