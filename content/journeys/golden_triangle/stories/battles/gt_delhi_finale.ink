INCLUDE modules.ink
# background: gt_bg_delhi_red_fort
# speaker: narrator
赤い城、暗くなってから。カムラの一覧の一行目が気になって、二人はもう一度、レッド・フォートの城門の前に来ていた。そこへ、宿の主人から電話が入った。
# speaker: gt_delhi_hotel_owner
隣のカムラさんのお孫さんが、お二人を探しています
# background: gt_bg_delhi_hotel_hub
# speaker: narrator
急いで宿に戻ると、路地が騒がしかった。半分だけ荷を積んだトラック。集まった近所の人たち。段ボールには、どれも「JAIPUR」と書いてある。
# speaker: narrator
その真ん中で、しわの寄ったワイシャツの青年が電話に向かって怒鳴っていた。ヒンディー語と英語が、一文ごとに入れ替わる。
# speaker: narrator
宿の主人が、こちらを指さした。青年が電話を切り、まっすぐ歩いてくる。
# speaker: enemy
# cutin: name
アマンです。カムラの孫です。この前、路地で祖母と話していたのは、あなたたちですね
# speaker: heroine
# reaction: heroine,surprised,question
はい。……カムラさんに、何か？
# speaker: enemy
朝から、いないんです。携帯は段ボールの上に置きっぱなし。明日の朝六時には、ジャイプールへ発つのに
# speaker: narrator
アマンの目が、{heroine_name}の鞄に向いた。疑いを隠す余裕もない目だった。
# speaker: enemy
祖母に何を言ったんですか。どこかへ連れていく約束でも？　観光客についていく人じゃないんです
# speaker: heroine
# emotion: serious
何も。……これを、もらっただけです
# speaker: narrator
デリーに着いた日に、カムラが書いてくれた見どころの一覧。五行の場所と、一行ずつの妙な注釈。アマンは読み進めるほど、顔をこわばらせた。
# speaker: enemy
『鉄の柱、もう抱けない、腹立たしい』『東の門から三本目の木陰』……。最近、祖母は亡くなった祖父に話しかけるんです。これも、きっと
# speaker: narrator
彼は警察と病院の番号を探し始めた。指が震えて、二度、画面を押し間違える。
# speaker: heroine
待ってください。あの日のカムラさん、すごくはっきりしてました。オートの運転手とはすぐ喧嘩になるから、出かけるときは地下鉄の女性車両に乗るんだって
# speaker: enemy
# reaction: enemy,anger
女性車両？　そんなもの、あるわけない。……ほら。やっぱり、話がおかしいんです
-> quiz(1) ->
# background: gt_bg_delhi_hotel_hub
{ quiz_correct:
    # speaker: narrator
    アマンは黙って携帯で調べ、画面を見つめたまま動かなくなった。
    # speaker: enemy
    ……先頭車両。本当だ。知らなかった。祖母は、一人で地下鉄に乗れるんだ
- else:
    # speaker: narrator
    宿の娘が、窓から身を乗り出した。
    # speaker: gt_delhi_hotel_daughter
    アマン兄さん、女性車両はあるよ。先頭の車両
    # speaker: enemy
    ……知らなかった。祖母は、一人で地下鉄に乗れるんだ
}
# speaker: narrator
病院の番号を押しかけていた指が、止まった。混乱した老人ではなく、自分の足で出かけた人。そう思い直すまでに、少し時間がかかった。
# speaker: heroine
地下鉄に乗れるなら、どこへだって行けます。……それと、この一覧、最後の行だけ場所の名前がないんです
# speaker: narrator
五行目。カムラの字は、そこだけ大きかった。
# speaker: narrator
# letter: note
月が水に落ちた所で、最後の買い物
# speaker: enemy
旧市街に川なんてない。池もない。……祖母は、また昔の話を
# speaker: heroine
# emotion: serious
昔の話なら、昔の地図で読めばいいんだと思います
-> quiz(2) ->
# background: gt_bg_delhi_chandni_chowk
{ quiz_correct:
    # speaker: heroine
    # local_word: gt_delhi_word_chandni
    チャンドニー・チョーク。月光の広場。昔の池に、月が映ったから
- else:
    # speaker: enemy
    # local_word: gt_delhi_word_chandni
    ……チャンドニー・チョーク。月光の広場か。池なんて、とっくにないのに
}
# speaker: narrator
アマンがオートリキシャを止めた。
# speaker: gt_delhi_auto_driver
メーターは壊れてるよ
# speaker: narrator
アマンは即座に聞き返した。
# speaker: enemy
いつ壊れた。今朝か？　さっきか？
# speaker: narrator
値段が半分になるまで、三十秒。{heroine_name}は思わず小さく笑った。言い方が、路地で会ったカムラにそっくりだった。
# speaker: narrator
夜のチャンドニー・チョークは、昼より人が多い。揚げたてのパラーターの匂い。自転車リキシャの鈴。ショールの老婦人なら、百人はいる。
# speaker: narrator
アマンが写真を見せて回る。三軒目の揚げ菓子屋で、店主が手を打った。
# speaker: gt_delhi_sweet_shopkeeper
ああ、あのばあさんか。ジャレビー百グラムで三回値切った。それから聞かれたよ。一年分の香辛料を、一番安く買えるのはどこかって
# speaker: enemy
一年分……？　ジャイプールにも店はあるのに
-> quiz(3) ->
# background: gt_bg_delhi_chandni_chowk
{ quiz_correct:
    # speaker: heroine
    カーリー・バーオリー。通りの西の端の、香辛料の市場です
- else:
    # speaker: enemy
    カーリー・バーオリーだ。西の端の、香辛料の卸の通り。……子どもの頃、祖母に連れていかれた
}
# speaker: narrator
西へ歩くにつれて、空気が辛くなった。唐辛子の袋の山。三人そろって、くしゃみが止まらない。
# speaker: narrator
年配の問屋が、目を細めて覚えていた。
# speaker: gt_delhi_spice_trader
来たよ。ガラムマサラを一年分。ジャイプールのは甘すぎるんだそうだ
# speaker: gt_delhi_spice_trader
それと、城の灯りは何時から始まるか聞かれた。三十分前に出ていったよ
# speaker: narrator
アマンは香辛料の袋に手をつき、深く息を吐いた。
# speaker: enemy
祖母は、誰にも何も頼まない人なんです。結婚式の準備で、家族はみんな僕に頼みごとをする。祖母だけは何も言わない。だから、何を考えてるのか分からない
# speaker: heroine
カムラさん、迷子じゃないと思います。行きたい所に、一つずつ行ってるだけ
# speaker: enemy
# reaction: enemy,anger
八十近い人が、夜の旧市街で一人ですよ。何かあったら、あなたが責任を取れるんですか
# speaker: heroine
# emotion: serious
……取れません。だから、一緒に探してるんです
# speaker: narrator
アマンは言い返しかけて、やめた。代わりに、城の方角を見た。
# speaker: enemy
でも、城はもう閉まってる。日が暮れたら入れない
# speaker: narrator
{heroine_name}は一覧を開いた。一行目。赤い城、と書いた横の注釈は、最初の日からずっと気になっていた。
# speaker: narrator
# letter: note
赤い城――暗くなってから
-> quiz(4) ->
# background: gt_bg_delhi_red_fort
{ quiz_correct:
    # speaker: heroine
    夜の光と音のショー。城の中を歩きながら見るんです。暗くなってから、です
- else:
    # speaker: enemy
    光と音のショーか。城の中を歩いて回る……。暗くなってから、って、そういうことか
}
# speaker: narrator
ラホール門で、次の回の券を三枚買う。暗い城壁に光が走り、録音の声が、皇帝たちの時代を語り始めた。
# speaker: narrator
観客の列について歩きながら、アマンが首を振る。
# speaker: enemy
祖父は堅物だったんです。映画も見ない人だった。こんなものに、祖母を連れてきたはずがない
# speaker: heroine
でも、一覧の一行目は、ここなんです
# speaker: enemy
六十年前ですよ。光のショーなんて、あったはずがない。祖母の思い出は、どこかで混ざってるんです
# speaker: narrator
光が、内謁の間の白いアーチを照らし出した。その奥に、まだ誰の姿も見えない。
-> quiz(5) ->
# background: gt_bg_delhi_red_fort
{ quiz_correct:
    # speaker: heroine
    一九六五年に始まってます。アジアで最初のころの、光と音のショー。カムラさんの記憶は、混ざってなんかいません
- else:
    # speaker: narrator
    案内の係員が、小声で教えてくれた。
    # speaker: gt_delhi_red_fort_guide
    最初のショーは一九六五年です。アジアで一番早いころのものですよ
}
# speaker: enemy
……六十年前。祖母は、十九だ
# speaker: narrator
内謁の間のアーチの下、光の届かない端の段に、小さな人影が座っていた。膝の上に、香辛料の袋。唇が動いている。
# speaker: narrator
# photo: gt_album_d79 # photo_caption: 光と音のショー、内謁の間の小さな人影
駆け出しかけたアマンの前に、{heroine_name}が立った。
# speaker: heroine
# emotion: serious
一分だけ。……待ってください
# speaker: narrator
# quiet: scene
録音の声の切れ目に、カムラの声が聞こえた。
# speaker: gt_kamla
プラカーシュ。あの冬の夜、ここで言ったでしょう。暗いから顔が見えない、なんてずるい言い方で。わたしは返事をしなかった。恥ずかしくて。それから六十年、一度も
# speaker: gt_kamla
# pause: 1000
……わたしも。わたしも、です。遅くなったけど
# speaker: narrator
アマンが、息を止めた。光が移り、三人の姿が照らし出される。カムラが振り向いた。
# speaker: gt_kamla
……あんたが連れてきたの
# speaker: heroine
はい。黙っていなくなるのは、自由とは違うと思ったから。カムラさんが何を言いに来たのか、アマンさんは知らないままになるところでした
# speaker: gt_kamla
生意気な外国の娘だね
# speaker: narrator
カムラの声は怒っていた。けれど、孫が隣に座るのを、止めはしなかった。
# speaker: enemy
# local_word: gt_delhi_word_dadi
ダーディー。……最初から教えて。祖父が、何を言ったのか
# speaker: narrator
# pause: 1200
長い沈黙のあと、カムラは香辛料の袋を膝から下ろした。
# speaker: gt_kamla
千九百六十六年の、冬。……ここ、もっと暗かったのよ
{
- battle_score == 5:
    # speaker: enemy
    あなたの読み、全部合ってました。孫の僕より、祖母のことを分かってたみたいだ
- battle_score >= 3:
    # speaker: enemy
    いくつか外したけど、たどり着いた。祖母の地図の読み方は、僕には一行もできなかった
- else:
    # speaker: enemy
    あなたが間違えたところは、僕が調べて追いついた。……二人で、やっと一人前でしたね
}
# speaker: narrator
二人はそっと、観客の列へ戻った。背中のほうで、カムラの声が、話の続きをしている。
# speaker: gt_kamla
そこの二人。明日の朝六時。見送りに来るなら、遅れないで。……来なくてもいいけど
# speaker: heroine
# reaction: heroine,exasperated,sweat
……嫌われちゃったかな
# speaker: heroine
# emotion: smile
でも、言ってよかった。たぶん、わたしにも言えることが一つ増えた
-> END
