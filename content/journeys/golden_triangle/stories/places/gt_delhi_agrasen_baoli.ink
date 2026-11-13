INCLUDE modules.ink
-> DONE

// アグラセン・キ・バオリのデート（噛み合いの選択は2回）。
// ここで撮られた短い動画は、アーグラの到着の後と、ジャイプールのフィナーレの後で話題になる（差し込み【4】）。
// 鳩の役が主人公のとき（gt_delhi_baoli_player_pigeon）は、布を広げる所がミニゲーム「鳩の役」（# minigame: cloth_flap、
// 手伝いの knot gt_delhi_agrasen_baoli_pigeon_flap）。どの結果でも、ジャスミートの本物の悲鳴で動画が撮れる。

// 【3】
=== gt_delhi_date_agrasen_baoli ===
# scene: date
# title: 本物の悲鳴
# when: episodes delhi >= 1
# hint: デリーの観光を一つ終えてから
# background: gt_bg_delhi_agrasen_baoli
# speaker: narrator
ガラス張りのビルに囲まれた路地の奥に、それは突然口を開けていた。石の階段が、まっすぐ地面の下へ下りていく。両側の壁には、アーチの形のくぼみが何層も並んでいる。
アグラセン・キ・バオリ。階段で水面まで下りる、昔の井戸だ。今は水が涸れて、底には鳩の声だけが溜まっている。
# speaker: heroine
# reaction: heroine,surprised,sparkle
# voice: gt_delhi_date_agrasen_baoli_001
すごい……。上のビルの音が、ここから急に聞こえなくなる。町の真ん中に、穴が空いてるみたい
# speaker: narrator
階段の途中で、大学生くらいの二人が言い争っていた。携帯を構えた青年と、白いドゥパッターを頭からかぶった女の子。
# speaker: gt_delhi_agrasen_young_man
ジャスミート、今のは悲鳴じゃない。あくびだ
# speaker: gt_jasmeet
# cutin: name
本当に怖くないのに、本物の声なんか出ないってば
# speaker: narrator
青年が、二人に気づいた。正確には、彼女に。
# speaker: gt_kunal
# cutin: name
クナールです。こっちはジャスミート。怖い動画を撮って、ネットに載せてるんです。お願いがあります。一人で底まで下りていく外国の旅行者、の役。最後に悲鳴を一つ。三十秒で終わります
# speaker: heroine
# reaction: heroine,exasperated,sweat
# voice: gt_delhi_date_agrasen_baoli_002
わたし？　悲鳴なんて、人生で上げたことないかも……
* [「自分が幽霊をやる」 # option: play_ghost]
    # profile: playful
    # memory: gt_delhi_date_agrasen_baoli_memory
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        # voice: gt_delhi_date_agrasen_baoli_003
        幽霊……。ほんとに驚いて、階段で転んだらどうするの
        # speaker: narrator
        結局、こちらは途中のくぼみに隠れることになった。彼女は一段ごとに、くぼみの数を数えながら下りてきた。どこにいるか、最初から分かっている顔だった。
    - else:
        # speaker: narrator
        ジャスミートのドゥパッターを借りて頭からかぶり、途中のくぼみに身を隠した。彼女が一人で階段を下りてくる。足音が近づく。今だ。
        飛び出した瞬間、彼女は悲鳴のかわりに、思いきり吹き出した。
        # speaker: heroine
        # reaction: heroine,teasing_big,music
        # voice: gt_delhi_date_agrasen_baoli_004
        ご、ごめんなさいっ。足、見えてた。いつもの靴だったから、ふふっ
    }
    # speaker: gt_kunal
    カット。……幽霊は、靴を履き替えてください
* [「一緒に下まで降りよう」 # option: go_down_together]
    # profile: attentive
    # memory: gt_delhi_date_agrasen_baoli_memory
    { romance_result == "negative":
        # speaker: heroine
        # voice: gt_delhi_date_agrasen_baoli_005
        一緒だと、一人の旅行者の役にならないよ。でも、うしろにはいてね
    - else:
        # speaker: heroine
        # emotion: smile
        # voice: gt_delhi_date_agrasen_baoli_006
        うん。一人じゃないなら、やってみる。でも、役の上では一人ってことにしてね
    }
    # speaker: narrator
    カメラに映らないぎりぎりの所を、こちらは半歩うしろからついていった。
* [「彼女はやらないと思う」と断る # option: refuse_for_her]
    # profile: bold
    # memory: gt_delhi_date_agrasen_baoli_memory
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        # voice: gt_delhi_date_agrasen_baoli_007
        待って。勝手に決めないで。……やるかどうかは、わたしが決める
    - else:
        # speaker: heroine
        # emotion: serious
        # voice: gt_delhi_date_agrasen_baoli_008
        心配してくれて、ありがとう。でも、やるかどうかは、わたしが決めたいな
    }
    # speaker: heroine
    # voice: gt_delhi_date_agrasen_baoli_009
    怖いけど、ちょっとやってみたい。こういうの、旅じゃないと、たぶん一生やらないから
-
# speaker: narrator
一段下りるごとに、空気が冷たくなっていく。上の路地の暑さが、嘘みたいだった。彼女は小さな声で、段を数えている。
# speaker: gt_jasmeet
ここ、出るって言われてるんですよ。昔は底に黒い水が溜まっていて、その水に呼ばれて、飛び込んだ人がいたって。……言い伝えですけど
# speaker: heroine
# emotion: worried
# voice: gt_delhi_date_agrasen_baoli_010
水がなくなっても、話だけは残ってるんだ。……今それ、聞きたくなかったな
# speaker: narrator
底に着いた。涸れた井戸の口には柵があり、覗き込むと、丸い暗がりがずっと下まで続いている。クナールが手で合図をした。本番だ。
# speaker: heroine
# voice: gt_delhi_date_agrasen_baoli_011
きゃ、きゃー……？
# speaker: gt_kunal
カット。それは悲鳴じゃない。質問だ
# speaker: heroine
# reaction: heroine,exasperated,sweat
# voice: gt_delhi_date_agrasen_baoli_012
質問……。だって、何に向かって叫べばいいのか、分からなくて
# speaker: narrator
# se: pigeon_flutter
もう一度、と彼女が井戸の方を向いた、そのときだった。すぐ横のくぼみから、灰色の塊が、羽音ごと顔の前に飛び出した。
# speaker: heroine
# reaction: heroine,surprised_big,interrobang
# photo: gt_album_d55 # photo_caption: 鳩が顔の前に、本物の悲鳴
# shake: window
# size: large
# voice: gt_delhi_date_agrasen_baoli_013
きゃああああっ！
# speaker: narrator
本物だった。悲鳴は井戸の壁に跳ね返り、階段を駆け上がり、上の路地まで届いた。鳩は何事もなかったように、反対側のくぼみに収まった。
# speaker: gt_kunal
それだ！　撮れた！　今のが、今日の一番！
# speaker: narrator
クナールが飛び上がる。その後ろで、ジャスミートが拍手をしていた。笑ってはいたけれど、拍手は、ほんの少しだけ遅かった。
* [「次は、ジャスミートさんの番だ」 # option: jasmeet_turn]
    # profile: attentive
    # set: gt_delhi_baoli_player_pigeon
    { romance_result == "negative":
        # speaker: gt_jasmeet
        ……同情なら、いらない
        # speaker: heroine
        # voice: gt_delhi_date_agrasen_baoli_014
        同情じゃないよ。本物、聞いてみたいだけ。鳩の役なら、ここにちょうどいい人がいるし
    - else:
        # speaker: heroine
        # reaction: heroine,surprised,sparkle
        # voice: gt_delhi_date_agrasen_baoli_015
        わたしも、今そう言おうと思ってた。鳩の役なら、ここにちょうどいい人がいるし
    }
* [「最高の悲鳴だった」と褒める # option: praise_scream]
    # profile: playful
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,shy_deep,gloom
        # voice: gt_delhi_date_agrasen_baoli_016
        その話、もうしないで。恥ずかしくて、井戸に入りたい
    - else:
        # speaker: heroine
        # reaction: heroine,teasing,question
        # voice: gt_delhi_date_agrasen_baoli_017
        褒めてないよね、それ。ふふ
    }
    # speaker: narrator
    彼女はそこで、ジャスミートの顔に気づいた。
    # speaker: heroine
    # voice: gt_delhi_date_agrasen_baoli_018
    クナールさん。これ、ジャスミートさんの動画だよね。もう一回、撮ろう。今度は、本物の鳩なしで
* [「本物の悲鳴は、一回きりだね」 # option: once_only]
    # profile: provocative
    # set: gt_delhi_baoli_player_pigeon
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        # voice: gt_delhi_date_agrasen_baoli_019
        そういう言い方、ジャスミートさんの前でしないで。……鳩さえいれば、何回でも出るよ
    - else:
        # speaker: heroine
        # voice: gt_delhi_date_agrasen_baoli_020
        そうかな。……鳩さえいれば、何回でも出ると思うよ
    }
    # speaker: heroine
    # emotion: smile
    # voice: gt_delhi_date_agrasen_baoli_021
    ジャスミートさん、もう一回やろう。鳩の役なら、ここにちょうどいい人がいるし
-
{ cond("flag gt_delhi_baoli_player_pigeon"):
    -> gt_delhi_agrasen_baoli_pigeon_flap ->
- else:
    # speaker: narrator
    彼女がくぼみに隠れた。ドゥパッターを両手で広げて、羽ばたく準備をしている。たぶん、鳩のつもりだ。
    # speaker: narrator
    # se: cloth_flap
    ジャスミートが階段を下りてくる。三、二、一。白い布が、ばさりと広がった。
}
# speaker: gt_jasmeet
きゃあああっ！
# speaker: narrator
二本目の本物が、井戸の底から空へ抜けていった。ジャスミートは自分の声に驚いて、それから、お腹を抱えて笑い出した。
# speaker: gt_jasmeet
出た！　本当に出た！　……ねえ、今の、わたしの方がすごかったでしょ？
# speaker: heroine
# reaction: heroine,happy,music
# voice: gt_delhi_date_agrasen_baoli_022
うん、負けた。わたしのは、質問だったもん
# speaker: narrator
動画は、ジャスミートの悲鳴で締めることになった。
# speaker: gt_kunal
あなたの、質問みたいな悲鳴。おまけとして、最後に入れたいです
# speaker: narrator
彼女は少し考えてから、うなずいた。
# speaker: heroine
# voice: gt_delhi_date_agrasen_baoli_023
顔は、ちょっとだけ隠してね
# speaker: narrator
帰りは、上り。百段を過ぎたあたりで、彼女の息が上がってきた。
# speaker: heroine
# voice: gt_delhi_date_agrasen_baoli_024
この階段、百八段あるんだって。日本だと、百八って煩悩の数なんだよ。大みそかに、鐘を百八回つくでしょ
# speaker: heroine
# emotion: teasing
# voice: gt_delhi_date_agrasen_baoli_025
一段上るごとに、煩悩が一個ずつ消えてたらいいな。上に着いたら、わたし、もう何も欲しくなくなってるかも
# speaker: narrator
最後の一段を上りきると、路地の暑さと車の音が、いっぺんに戻ってきた。彼女は膝に手をついて、しばらく黙っていた。
# speaker: heroine
# reaction: heroine,exasperated,sweat
# pause: 700
# voice: gt_delhi_date_agrasen_baoli_026
……だめだ。冷たいものが飲みたい。煩悩、一個も減ってない
-> END

// 【3】手伝いの knot：鳩の役が主人公のとき（噛み合いでない、場面の中の選択）。
// 選択肢の代わりにミニゲーム「鳩の役」：足音がくぼみの前の段に来たときに布を広げる。結果の選択肢に関係値は付けない。
// どの結果も、戻った先のジャスミートの本物の悲鳴へつながる（後の動画の話：布を広げて飛び出す鳩の役）。
=== gt_delhi_agrasen_baoli_pigeon_flap ===
# speaker: narrator
鳩の役は、こちらだった。くぼみに隠れ、ドゥパッターを両手に持って、羽ばたく準備をする。
# speaker: narrator
# minigame: cloth_flap auto perfect
上から、ジャスミートの足音が下りてくる。一段、また一段。くぼみの前の段まで、あと少し。
* [布を広げた：ちょうど目の前で # option: perfect]
    # speaker: narrator
    三、二、一。白い布が、ばさりと広がった。
* [布を広げた：早すぎた # option: early]
    # speaker: narrator
    早すぎた。広げた布は、ジャスミートがまだ何段も上にいるうちに、ばさりと鳴った。
    # speaker: gt_jasmeet
    見えてるよ。鳩にしては、大きすぎ
    # speaker: narrator
    # se: pigeon_flutter
    彼女が笑いかけた、そのとき。布の音に驚いた本物の鳩が、くぼみの奥から、こちらの肩を越えて飛び出した。
* [布を広げた：遅すぎた # option: late]
    # speaker: narrator
    遅かった。足音は、もうくぼみの前を過ぎていた。広げた布が、ジャスミートの背中のすぐ後ろで、ばさりと鳴る。振り返った彼女の目の前いっぱいに、白い布があった。
* [布を広げられなかった # option: frozen]
    # speaker: narrator
    手が、動かなかった。足音はくぼみの前を通り過ぎ、少し下で止まった。
    ジャスミートが引き返してきて、そっと、くぼみを覗き込む。目が合った。
    # se: cloth_flap
    驚いたのは、こちらが先だった。飛びのいた拍子に、ドゥパッターが勝手に、ばさりと広がった。
- ->->
