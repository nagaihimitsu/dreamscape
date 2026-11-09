INCLUDE modules.ink
-> DONE

// アグラセン・キ・バオリのデート（噛み合いの選択は2回）。
// ここで撮られた短い動画は、アーグラの到着の後と、ジャイプールのフィナーレの後で話題になる（差し込み【4】）。

// 【3】
=== gt_delhi_date_agrasen_baoli ===
# scene: date
# title: 本物の悲鳴
# when: episodes delhi >= 1
# background: gt_bg_delhi_agrasen_baoli
# speaker: narrator
ガラス張りのビルに囲まれた路地の奥に、それは突然口を開けていた。石の階段が、まっすぐ地面の下へ下りていく。両側の壁には、アーチの形のくぼみが何層も並んでいる。
アグラセン・キ・バオリ。階段で水面まで下りる、昔の井戸だ。今は水が涸れて、底には鳩の声だけが溜まっている。
# speaker: heroine
# reaction: heroine,surprised,sparkle
「すごい……。上のビルの音が、ここから急に聞こえなくなる。町の真ん中に、穴が空いてるみたい」
# speaker: narrator
階段の途中で、大学生くらいの二人が、携帯を構えて言い争っていた。監督らしい青年がクナール。白いドゥパッターを頭からかぶった女の子がジャスミート。怖い動画を撮って、ネットに載せるのだという。
クナール「ジャスミート、今のは悲鳴じゃない。あくびだ」
ジャスミート「本当に怖くないのに、本物の声なんか出ないってば」
クナールが、二人に気づいた。正確には、彼女に。
クナール「お願いがあります。一人で底まで下りていく外国の旅行者、の役。最後に悲鳴を一つ。三十秒で終わります」
# speaker: heroine
# reaction: heroine,exasperated,sweat
「わたし？　悲鳴なんて、人生で上げたことないかも……」
* [「自分が幽霊をやる」 # option: play_ghost]
    # profile: playful
    # memory: gt_delhi_date_agrasen_baoli_memory
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        「幽霊……。ほんとに驚いて、階段で転んだらどうするの」
        # speaker: narrator
        結局、こちらは途中のくぼみに隠れることになった。彼女は一段ごとに、くぼみの数を数えながら下りてきた。どこにいるか、最初から分かっている顔だった。
    - else:
        # speaker: narrator
        ジャスミートのドゥパッターを借りて頭からかぶり、途中のくぼみに身を隠した。彼女が一人で階段を下りてくる。足音が近づく。今だ。
        飛び出した瞬間、彼女は悲鳴のかわりに、思いきり吹き出した。
        # speaker: heroine
        # reaction: heroine,teasing_big,music
        「ご、ごめんなさいっ。足、見えてた。いつもの靴だったから、ふふっ」
    }
    # speaker: narrator
    クナール「カット。……幽霊は、靴を履き替えてください」
* [「一緒に下まで降りよう」 # option: go_down_together]
    # profile: attentive
    # memory: gt_delhi_date_agrasen_baoli_memory
    { romance_result == "negative":
        # speaker: heroine
        「一緒だと、一人の旅行者の役にならないよ。でも、うしろにはいてね」
    - else:
        # speaker: heroine
        # emotion: smile
        「うん。一人じゃないなら、やってみる。でも、役の上では一人ってことにしてね」
    }
    # speaker: narrator
    カメラに映らないぎりぎりの所を、こちらは半歩うしろからついていった。
* [「彼女はやらないと思う」と断る # option: refuse_for_her]
    # profile: bold
    # memory: gt_delhi_date_agrasen_baoli_memory
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        「待って。勝手に決めないで。……やるかどうかは、わたしが決める」
    - else:
        # speaker: heroine
        # emotion: serious
        「心配してくれて、ありがとう。でも、やるかどうかは、わたしが決めたいな」
    }
    # speaker: heroine
    「怖いけど、ちょっとやってみたい。こういうの、旅じゃないと、たぶん一生やらないから」
-
# speaker: narrator
一段下りるごとに、空気が冷たくなっていく。上の路地の暑さが、嘘みたいだった。彼女は小さな声で、段を数えている。
ジャスミート「ここ、出るって言われてるんですよ。昔は底に黒い水が溜まっていて、その水に呼ばれて、飛び込んだ人がいたって。……言い伝えですけど」
# speaker: heroine
# emotion: worried
「水がなくなっても、話だけは残ってるんだ。……今それ、聞きたくなかったな」
# speaker: narrator
底に着いた。涸れた井戸の口には柵があり、覗き込むと、丸い暗がりがずっと下まで続いている。クナールが手で合図をした。本番だ。
# speaker: heroine
「きゃ、きゃー……？」
# speaker: narrator
クナール「カット。それは悲鳴じゃない。質問だ」
# speaker: heroine
# reaction: heroine,exasperated,sweat
「質問……。だって、何に向かって叫べばいいのか、分からなくて」
# speaker: narrator
もう一度、と彼女が井戸の方を向いた、そのときだった。すぐ横のくぼみから、灰色の塊が、羽音ごと顔の前に飛び出した。
# speaker: heroine
# reaction: heroine,surprised_big,interrobang
「きゃああああっ！」
# speaker: narrator
本物だった。悲鳴は井戸の壁に跳ね返り、階段を駆け上がり、上の路地まで届いた。鳩は何事もなかったように、反対側のくぼみに収まった。
クナール「それだ！　撮れた！　今のが、今日の一番！」
クナールが飛び上がる。その後ろで、ジャスミートが拍手をしていた。笑ってはいたけれど、拍手は、ほんの少しだけ遅かった。
* [「次は、ジャスミートさんの番だ」 # option: jasmeet_turn]
    # profile: attentive
    # set: gt_delhi_baoli_player_pigeon
    { romance_result == "negative":
        # speaker: narrator
        ジャスミート「……同情なら、いらない」
        # speaker: heroine
        「同情じゃないよ。本物、聞いてみたいだけ。鳩の役なら、ここにちょうどいい人がいるし」
    - else:
        # speaker: heroine
        # reaction: heroine,surprised,sparkle
        「わたしも、今そう言おうと思ってた。鳩の役なら、ここにちょうどいい人がいるし」
    }
* [「最高の悲鳴だった」と褒める # option: praise_scream]
    # profile: playful
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,shy_deep,gloom
        「その話、もうしないで。恥ずかしくて、井戸に入りたい」
    - else:
        # speaker: heroine
        # reaction: heroine,teasing,question
        「褒めてないよね、それ。ふふ」
    }
    # speaker: narrator
    彼女はそこで、ジャスミートの顔に気づいた。
    # speaker: heroine
    「クナールさん。これ、ジャスミートさんの動画だよね。もう一回、撮ろう。今度は、本物の鳩なしで」
* [「本物の悲鳴は、一回きりだね」 # option: once_only]
    # profile: provocative
    # set: gt_delhi_baoli_player_pigeon
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        「そういう言い方、ジャスミートさんの前でしないで。……鳩さえいれば、何回でも出るよ」
    - else:
        # speaker: heroine
        「そうかな。……鳩さえいれば、何回でも出ると思うよ」
    }
    # speaker: heroine
    # emotion: smile
    「ジャスミートさん、もう一回やろう。鳩の役なら、ここにちょうどいい人がいるし」
-
{ cond("flag gt_delhi_baoli_player_pigeon"):
    # speaker: narrator
    鳩の役は、こちらだった。くぼみに隠れ、ドゥパッターを両手で広げて、羽ばたく準備をする。
- else:
    # speaker: narrator
    彼女がくぼみに隠れた。ドゥパッターを両手で広げて、羽ばたく準備をしている。たぶん、鳩のつもりだ。
}
# speaker: narrator
ジャスミートが階段を下りてくる。三、二、一。白い布が、ばさりと広がった。
ジャスミート「きゃあああっ！」
二本目の本物が、井戸の底から空へ抜けていった。ジャスミートは自分の声に驚いて、それから、お腹を抱えて笑い出した。
ジャスミート「出た！　本当に出た！　……ねえ、今の、わたしの方がすごかったでしょ？」
# speaker: heroine
# reaction: heroine,happy,music
「うん、負けた。わたしのは、質問だったもん」
# speaker: narrator
動画は、ジャスミートの悲鳴で締めることになった。彼女の「質問みたいな悲鳴」は、おまけとして最後に入れたいとクナールが言い、彼女は少し考えてから、うなずいた。顔は、ちょっとだけ隠してね、と付け足して。
帰りは、上り。百段を過ぎたあたりで、彼女の息が上がってきた。
# speaker: heroine
「この階段、百八段あるんだって。日本だと、百八って煩悩の数なんだよ。大みそかに、鐘を百八回つくでしょ」
# speaker: heroine
# emotion: teasing
「一段上るごとに、煩悩が一個ずつ消えてたらいいな。上に着いたら、わたし、もう何も欲しくなくなってるかも」
# speaker: narrator
最後の一段を上りきると、路地の暑さと車の音が、いっぺんに戻ってきた。彼女は膝に手をついて、しばらく黙っていた。
# speaker: heroine
# reaction: heroine,exasperated,sweat
「……だめだ。冷たいものが飲みたい。煩悩、一個も減ってない」
-> END
