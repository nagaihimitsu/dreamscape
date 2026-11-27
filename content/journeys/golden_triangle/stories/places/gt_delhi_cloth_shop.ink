INCLUDE modules.ink
-> DONE

// デリーの布の店（話して買う店。2026-11-26）。チャンドニー・チョークの布の市場カトラー・ニールの問屋、ゴーヴィンド。
// 三都市の布の店は「織る・縫う・押す」：デリーは織り（バナーラスの絹のサリー。銀の花は織り込み）、アーグラは縫い（ザルドージー）、
// ジャイプールは押す（サーンガーネールの木版）。出典は scenes/catalog.json（この knot の ID ごと）。
// 値切るのは主人公（英語の選択肢）。ヒロインが自分で値切るのは、ジャイプールのジョーハリー・バザールが生まれて初めて（そちらの台本）なので、
// ここで彼女は値切らない（「欲しい」と自分で言うことはある）。
// 交渉の分かれ方（どれにも得と損）：
//   haggle_hard ₹2,000・spark +1（安いが、ゴーヴィンドは織り手の話をやめる）
//   pay_asking  ₹2,800・affection +1・フラグ gt_delhi_govind_card（高いが、アーグラの刺繍の店への名刺。アーグラで問屋の値段になる）
//   ask_her     ₹2,400・trust +1（彼女が自分で「欲しい」と言う）
//   kamla_way   ₹1,900（デリーのフィナーレで、ジャレビーを三回値切った話を聞いた後だけ。いちばん安い）
//   think_later 「また今度」

// 初めて店に入ったときだけ。この後に、交渉の場面（gt_delhi_cloth_shop_haggle）が続く。
=== gt_delhi_cloth_shop_intro ===
# scene: talk
# at: shop gt_delhi_cloth_shop
# priority: -2
# person: gt_govind
{ cond("time night"):
    # background: gt_bg_delhi_chandni_chowk_night
    # tint: off
    # speaker: narrator
    日が落ちても、布の市場カトラー・ニールの店は、裸電球の下で開いていた。間口の狭い店が、どこも天井まで布でふさがっている。
- else:
    # background: gt_bg_delhi_chandni_chowk
    # speaker: narrator
    チャンドニー・チョークの路地の奥に、布の市場カトラー・ニールがある。間口の狭い店が、どこも天井まで布でふさがっている。
}
# speaker: narrator
一軒の奥で、白い口ひげの男が、電話を二台、両方の耳に当てていた。
# speaker: gt_govind
四十反、木曜。……そっちは三十反だ。木曜だと言っただろう
# speaker: narrator
電話を二台とも置くと、男はこちらを見ないまま、帳面に数字を書きつけた。
# speaker: gt_govind
# cutin: name
ゴーヴィンドだ。ここは問屋でね。布は反物のまま、北の町の店へ卸す。一枚ずつは売らない
# speaker: heroine
# reaction: heroine,exasperated,sweat
# voice: gt_delhi_cloth_shop_intro_001
入って三秒で、断られちゃった……
# speaker: gt_govind
見るだけなら、ただだ
# speaker: narrator
彼女は布の山を見上げた。生成りの綿、薄いモスリン、つやのある絹。一つの山の中にも、手ざわりの違う布が何枚も重なっている。
# speaker: heroine
# reaction: heroine,surprised,exclamation
# voice: gt_delhi_cloth_shop_intro_002
同じ白でも、全部ちがう白なんだ。……あ
# speaker: narrator
白い山のあいだに、一枚だけ、深い青がはさまっていた。
# speaker: heroine
# voice: gt_delhi_cloth_shop_intro_003
あの青いのも、反物ですか？
# speaker: gt_govind
# term: gt_term_saree
目がいいな。あれはサリーだ。バナーラスの絹
# speaker: narrator
ゴーヴィンドは青い布の端を、指先で少しだけめくった。銀色の小さな花が、点々と光る。
# speaker: gt_govind
# em: 織る
銀の花は、上から縫ったんじゃない。織るときに、銀の糸を一緒に織り込んである。バナーラスの織り方だ
# speaker: heroine
# reaction: heroine,happy,sparkle
# voice: gt_delhi_cloth_shop_intro_004
織り込んであるんだ……。じゃあ、この花は飾りじゃなくて、布そのものなんだね
# speaker: gt_govind
織ったのはイクバール。バナーラスの織り手でね。三十年、あいつの布を仕入れてる
# speaker: heroine
# voice: gt_delhi_cloth_shop_intro_005
三十年も。じゃあ、すごく仲がいいんですね
# speaker: gt_govind
声しか知らん。電話だけだ
# speaker: heroine
# reaction: heroine,surprised_big,interrobang
# voice: gt_delhi_cloth_shop_intro_006
えっ。一度も、会ったことがないんですか
# speaker: gt_govind
バナーラスは、ガンガーのほとりの町だそうだ。四十年、布は毎日見てきたが、あの町は見たことがない
# speaker: gt_govind
店を閉めたら行く。……そう言い続けて、二十年になる
# speaker: narrator
ゴーヴィンドは帳面を閉じ、青い布の端をもう一度だけ撫でた。
# speaker: gt_govind
バナーラスの名前には、登録がある。よそで織った布をバナーラスと呼ぶのは、嘘つきのすることだ。うちは、イクバールの布しかそう呼ばない
# speaker: gt_govind
……広げてみるか。広げたら、たいてい買うことになるがな
-> END

// 交渉の場面。何度でも入れる（# repeat: always）。サリーを買うと、もう流れない（# when:）。
// 選択肢の関係値と名刺は、サリーを手に入れる選択肢にだけ付ける（買うと選択肢が隠れるので、一度しか当たらない）。
=== gt_delhi_cloth_shop_haggle ===
# scene: encounter
# title: 青いサリーの値段
# at: shop gt_delhi_cloth_shop
# priority: -1
# repeat: always
# when: not outfit gt_saree_blue
# person: gt_govind
# sources: none
{ cond("time night"):
    # background: gt_bg_delhi_chandni_chowk_night
    # tint: off
    # speaker: narrator
    裸電球の下で、ゴーヴィンドが青い一枚を台に広げた。
- else:
    # background: gt_bg_delhi_chandni_chowk
    # speaker: narrator
    ゴーヴィンドが、青い一枚を台に広げた。
}
{ cond("seen gt_delhi_cloth_shop_haggle"):
    # speaker: gt_govind
    また来たか。青いのは、まだ売れてない。……売り急ぐ気も、ないがな
}
# speaker: narrator
深い青の上に、銀の花が散っている。広げると、思っていたよりずっと長い。
# speaker: heroine
# reaction: heroine,happy,sparkle
# voice: gt_delhi_cloth_shop_haggle_001
わ……。一枚の布なのに、川みたい
# speaker: narrator
彼女は布に手を伸ばしかけて、途中で止めた。
# speaker: gt_govind
二千八百
# speaker: heroine
# emotion: worried
# voice: gt_delhi_cloth_shop_haggle_002
……二千八百。旅のお金は、二人のお金だし。わたし一人の服に、それは
# speaker: narrator
黙って布を見ている彼女の横で、ふと、路地の老婦人の声を思い出した。
# speaker: gt_kamla
# remembered
デリーは押しの強い町だよ。欲しいものは、欲しいと言いなさい。黙っていたら、誰も気づかない。
# speaker: gt_govind
# term: gt_term_bargaining
値段は言った。値切るなら、次はそっちの番だ
* [Two thousand. That's all we can do. # option: haggle_hard # translation: 二千。それが精いっぱいです。]
    # outfit: gt_saree_blue
    # money: -2000
    # rel: spark +1
    # speaker: gt_govind
    二千？　問屋に向かって、問屋の値段を言うやつがあるか。……二千五百
    # speaker: narrator
    こちらが首を横に振るたびに、数字が下がった。二千三百。二千二百。ゴーヴィンドは天井を仰いだ。
    # speaker: gt_govind
    ……二千。これ以上は、イクバールに顔向けできん
    # speaker: narrator
    ゴーヴィンドは黙ってサリーを畳み、新聞紙で包んだ。織り手の話の続きは、もう出てこなかった。
    # speaker: heroine
    # reaction: heroine,surprised,exclamation
    # voice: gt_delhi_cloth_shop_haggle_003
    今の、ちょっとカムラさんみたいだった。値段が、目の前でどんどん溶けていくの
    # speaker: heroine
    # emotion: worried
    # voice: gt_delhi_cloth_shop_haggle_004
    安くなって、うれしい。……でも、イクバールさんの話、もう少し聞きたかったな
* [It's worth it. We'll pay your price. # option: pay_asking # translation: それだけの値打ちがあります。言い値で払います。]
    # outfit: gt_saree_blue
    # money: -2800
    # rel: affection +1
    # set: gt_delhi_govind_card
    # speaker: gt_govind
    値切らない客は、たいてい何か隠してる。何を隠してる
    # speaker: heroine
    # reaction: heroine,surprised,sweat
    # voice: gt_delhi_cloth_shop_haggle_005
    な、何も！　……たぶん
    # speaker: narrator
    ゴーヴィンドは鼻を鳴らし、サリーの端を裏返した。織り終わりの所で、銀の糸が一本だけ、小さく結んである。
    # speaker: gt_govind
    イクバールの癖だ。最後の一本を、必ずこう結ぶ。三十年、この結び目で、あいつの布だと分かる
    # speaker: narrator
    それから彼は名刺の裏に何か書きつけ、こちらの手に押しつけた。
    # speaker: gt_govind
    アーグラへ行くなら、ラフィークの店に寄れ。金の糸の刺繍屋だ。俺の名前を出せば、俺に売る値段で売る
    # speaker: heroine
    # emotion: smile
    # voice: gt_delhi_cloth_shop_haggle_006
    高かったのに、おまけのほうが大きい気がする
    # speaker: heroine
    # emotion: serious
    # voice: gt_delhi_cloth_shop_haggle_007
    ……でも、二人のお金なんだから。次は、わたしにも半分、決めさせてね
* [Tell him yourself. Do you want it? # option: ask_her # translation: 自分で言ってみて。欲しい？]
    # outfit: gt_saree_blue
    # money: -2400
    # rel: trust +1
    # speaker: heroine
    # reaction: heroine,surprised,question
    # voice: gt_delhi_cloth_shop_haggle_008
    えっ、わたし？
    # speaker: narrator
    彼女は布とこちらの顔を見比べ、それからゴーヴィンドに向き直った。
    # speaker: heroine
    # emotion: serious
    # voice: gt_delhi_cloth_shop_haggle_009
    欲しいです。この青が、すごく好きです
    # speaker: narrator
    帳面の上で、ゴーヴィンドのペンが止まった。
    # speaker: gt_govind
    欲しい人が着ると、布は長持ちする。……二千四百。好きだと言った分は、引いておく
    # speaker: heroine
    # reaction: heroine,happy,sparkle
    # voice: gt_delhi_cloth_shop_haggle_010
    値切ってないのに、安くなった……
    # speaker: heroine
    # emotion: smile
    # voice: gt_delhi_cloth_shop_haggle_011
    言ってよかった。……言わせてくれて、ありがとう
// デリーのフィナーレで、揚げ菓子屋から「ジャレビー百グラムで三回値切った」と聞いた後だけ。
* [Your best price? ... Your real best? ... One more time? # option: kamla_way # translation: いちばん安くて、いくら？　……本当のいちばんは？　……もう一回だけ。]
    # requires: battle gt_delhi_finale_battle
    # outfit: gt_saree_blue
    # money: -1900
    # speaker: gt_govind
    二千四百
    # speaker: narrator
    もう一度聞くと、二千二百。三度目を聞いたところで、ゴーヴィンドが初めて声を上げて笑った。
    # speaker: gt_govind
    三回聞くのは、旧市街のばあさんぐらいだ。誰に習った
    # speaker: heroine
    # reaction: heroine,teasing,music
    # voice: gt_delhi_cloth_shop_haggle_012
    ジャレビー百グラムで、三回値切った人です
    # speaker: gt_govind
    ……千九百。持っていけ。ばあさんが三人に増えたみたいで、くたびれる
    # speaker: heroine
    # emotion: smile
    # voice: gt_delhi_cloth_shop_haggle_013
    ふふ。カムラさん、ジャイプールでも、きっとこうしてるね
* [Let us think about it. # option: think_later # translation: 少し考えさせてください。]
    # later
    # speaker: gt_govind
    布は逃げない。俺もだ。……四十年、ここから動いてない
    # speaker: heroine
    # emotion: smile
    # voice: gt_delhi_cloth_shop_haggle_014
    ふふ。じゃあ、また来ます
    -> END
-
# speaker: narrator
包みを受け取ると、思ったより軽かった。一枚の布の重さだった。
# speaker: heroine
# emotion: smile
# voice: gt_delhi_cloth_shop_haggle_015
サリーって、どうやって巻くんだろう。……着る前に、だれかに教わらなきゃ
-> END
