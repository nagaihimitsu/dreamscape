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
# background: gt_bg_agra_itimad_tomb
# speaker: enemy
「今日は無理。袖が短いのは、今日始まった話じゃないでしょう」
# speaker: narrator
イティマード・ウッダウラ廟の庭で、女性が電話を切った。白い壁の花模様へ向き直った顔は、まだ険しい。
# speaker: heroine
# emotion: worried
「大丈夫ですか。お仕事、戻らなくていいんですか？」
# speaker: enemy
「戻らないために切ったの。私はアミナ。仕立て屋だけど、さっきのは父。明日の袖を今日頼む名人」
# speaker: narrator
アミナはスマートフォンを裏返した。{heroine_name}は気遣うつもりで開いた口を、一度閉じる。
# speaker: heroine
# reaction: heroine,worried,sweat
「すみません。聞いてもないのに、戻る方へ背中を押しちゃった」
# speaker: enemy
「ええ。今日は押されない日にしたい」
# speaker: narrator
少し離れて壁を見ていると、アミナの方から声がかかった。
# speaker: enemy
「でも、ここへ来た理由も父なの。自分でも面倒くさいと思う」
# speaker: heroine
# reaction: heroine,surprised,question
「お父さんに会いに？」
# speaker: enemy
「違う。父がこの廟の話をしていたから。造営を頼んだヌール・ジャハーンにも、家族の話があるんだって。そこは聞きたくなった」
-> END

=== after_first ===
# background: gt_bg_agra_itimad_tomb
{ answer_correct:
# speaker: enemy
「ヌール・ジャハーンが父ギヤース・ベグのために。頼まれる側だけじゃなく、造ると決める側に娘がいるんだね」
- else:
# speaker: enemy
「皇妃ヌール・ジャハーンが父のために造営した廟。名前だけでは、二人の関係まで見えないね」
}
# speaker: heroine
「アミナさんのお父さんも、こんな花模様が好きなんですか？」
# speaker: enemy
「知らない。縫い目には詳しい。私の縫い目には、特に」
# speaker: narrator
彼女は口の端を上げた。{heroine_name}も、ようやく少し笑う。
# speaker: enemy
「見て。あの色の曲がるところ。布なら、どこを切るか考えるけど、これは石でしょう」
# speaker: narrator
二人は模様をよく見る。表面へ色を塗ることと、別の素材を組み込むこと。その違いが気になった。
-> END

=== after_second ===
# background: gt_bg_agra_itimad_tomb
{ answer_correct:
# speaker: heroine
# reaction: heroine,surprised,sparkle
「違う石をはめ込んで、花にするんだ。線を描くのとは、迷う場所も違いそう」
- else:
# speaker: heroine
# reaction: heroine,surprised,exclamation
「塗った色かと思った。ここは、色石をはめ込む象嵌なんだね」
}
# speaker: enemy
「細かいものを見ると、『何日かかった？』が先に出るの。休みなのに」
# speaker: heroine
# emotion: smile
「好きだから、でしょうか」
# speaker: enemy
「癖。好きだけで、納期は越えられない」
# speaker: narrator
即答され、彼女は笑いかけた顔を引っ込めた。アミナはそれを見て、声だけ少し緩める。
# speaker: enemy
「嫌いじゃないよ。今は、その格子の向こうを見たい。模様ばかり見ていると、部屋の方を忘れそう」
-> END

=== conclusion ===
# background: gt_bg_agra_itimad_tomb
{ answer_correct:
# speaker: heroine
「石の隙間から、光を通す。壁の模様が、その先の明るさも作ってるんだ」
- else:
# speaker: heroine
「格子は飾りだけじゃないんだね。透かして彫ったところから、室内へ光が入る」
}
{ battle_score == 3:
# speaker: enemy
「全部拾えたね。私の方は、さっきから袖の縫い代が頭に戻ってくる」
- else:
# speaker: enemy
「急いで全部分からなくてもいい。私は、あの光を見て帰る。それで今日は足りる」
}
# speaker: narrator
通知が鳴った。アミナは画面を読み、返事を打った。
# speaker: enemy
「『袖は明日。今日は好きな花の名前を送って』。そう返した」
# speaker: heroine
# emotion: smile
「お父さん、答えてくれそうですか？」
# speaker: enemy
# reaction: enemy,sigh
「袖の長さが来そう。来たら、明日読む」
# speaker: narrator
電話をしまい、彼女は光を見る方へ歩いた。二人に合わせて立ち止まることはしなかった。
# speaker: heroine
# reaction: heroine,exasperated,sweat
「『好きだから』って、簡単に言っちゃったな。わたしなら、好きなことほど休みたくないって思われたら、困るのに」
# speaker: narrator
こちらが隣の場所を空けると、彼女もそこで立ち止まった。アミナには声をかけず、それぞれに格子の向こうを見た。
-> END
