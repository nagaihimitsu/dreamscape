INCLUDE modules.ink
# background: gt_bg_agra_agra_fort
# speaker: narrator
川に面した八角形の塔。白い大理石の欄干の向こうに、遠くタージ・マハルが霞んで見える。
# speaker: narrator
旗を掲げた添乗員の後ろで、ツアーの一行が出口へ流れていく。ただ一人、鳥打ち帽の老人だけが、床にあぐらをかいて動かなかった。
# speaker: gt_agra_fort_old_man
断る
# speaker: narrator
添乗員の若い女性が、携帯を二台握ったまま頭を下げる。胸の名札にはリヤとある。
# speaker: gt_riya
# cutin: name
大佐、バスが出ます。ジャイプールまで五時間なんです
# speaker: gt_agra_fort_old_man
シャー・ジャハーンは、この塔に八年座っていた。わしは八十分でいい。これは座り込みだ。平和的な抗議である
# speaker: narrator
老人の視線が、近くにいた{heroine_name}たちを捉えた。背筋がさらに伸びる。
# speaker: gt_agra_fort_old_man
ちょうどいい。君たちを国際監視団に任命する。この抗議が平和的であることを見届けたまえ
# speaker: heroine
# reaction: heroine,surprised_big,interrobang
こ、国際……？　わたしたち、ただの観光客です
# speaker: enemy
# cutin: name
ドゥッガル。退役した陸軍大佐だ。観光客でも、目は二つある。十分だ
# speaker: narrator
リヤが、すがるような目でこちらを見た。{heroine_name}は、おそるおそる大佐の隣にしゃがむ。
# speaker: heroine
あの、大佐。何に抗議されてるんですか？
# speaker: enemy
閉じ込める者すべてにだ。この塔の主を閉じ込めたのが誰だったか、知っているかね
-> quiz(1) ->
# background: gt_bg_agra_agra_fort
{ quiz_correct:
    # speaker: enemy
    そう、実の息子だ。……そして今、わしを閉じ込めようとしているのは、旅行会社のバスだ
- else:
    # speaker: enemy
    実の息子、アウラングゼーブだよ。……そして今、わしを閉じ込めようとしているのは、旅行会社のバスだ
}
# speaker: narrator
リヤの二台の携帯が、同時に鳴った。会社と、バスの運転手らしい。
# speaker: enemy
# reaction: enemy,anger
娘さん、旗を振っていればいいと思うな。わしは命令される側を四十年やってきた
# speaker: heroine
# emotion: serious
大佐。……リヤさんに、その言い方はひどいと思います。リヤさんは、ほかの人たちを五時間運ばなきゃいけないんです
# speaker: narrator
大佐の眉が跳ね上がった。監視団が抗議するとは、予定になかったらしい。
# speaker: enemy
……監視団の意見を記録する。リヤ君、今のは失礼した
# speaker: narrator
大佐はポケットから飴を出して、口に入れた。生姜の匂い。さっきから三つ目だ。顔色が、塔の大理石と同じくらい白い。
# speaker: enemy
では、監視団に問う。閉じ込められた皇帝の世話を、最後までしたのは誰だったと思う
-> quiz(2) ->
# background: gt_bg_agra_agra_fort
{ quiz_correct:
    # speaker: enemy
    娘だ。ジャハーナーラー。……娘というのは、ありがたいものだ
- else:
    # speaker: enemy
    娘のジャハーナーラーだよ。……娘というのは、ありがたいものだ
}
# speaker: enemy
うちの娘はな、わしとバスに乗るときだけは、必ず一番前の席を取ってくれた。理由は聞かずに
# speaker: narrator
生姜の飴。白い顔。駐車場の方を見ようとしない目。一番前の席。{heroine_name}の中で、ばらばらだったものがつながった。
# speaker: heroine
# emotion: worried
……大佐。もしかして、車、苦手ですか？
# speaker: enemy
# reaction: enemy,anger
軍人に向かって何を言うか！
# speaker: narrator
怒鳴った声は、すぐにしぼんだ。大佐は欄干の向こうのタージを見たまま、小さく言った。
# speaker: enemy
……後ろの席だと、十分でだめなんだ。今日の座席表では、わしは最後列だ。言えるか、そんなこと。若い娘さんの前で、元大佐が
# speaker: narrator
リヤは電話中で、こちらの話には気づいていない。大佐は咳払いをして、声を大きくした。
# speaker: enemy
それに、わしがここに残る正当な理由はほかにもある。この城には、今も軍がいるのだ
-> quiz(3) ->
# background: gt_bg_agra_agra_fort
{ quiz_correct:
    # speaker: heroine
    はい。城の一部は、今も陸軍の区域ですよね。……だったら大佐、城の守りは万全です。大佐が座っている必要はないと思います
- else:
    # speaker: enemy
    城の一部は、今も陸軍が使っている。……つまり、わしがいなくても守りは万全ということか。理屈では負けたな
}
# speaker: narrator
大佐が言い返す言葉を探している間に、{heroine_name}はリヤのそばへ行き、小声で何か話した。
# speaker: narrator
リヤの顔が、ぱっと明るくなる。彼女は旗を下ろし、大佐の前に立った。
# speaker: gt_riya
大佐。ジャイプールまでの道中、一番前の席で、窓の外の解説をお願いできませんか。皆さん、大佐のお話を聞きたがっています
# speaker: enemy
……任務とあらば
# speaker: narrator
大佐は立ち上がり、帽子をかぶり直した。座り込みは終わった。抗議の成果として、最前列の席と、解説係の肩書きが残った。
{
- battle_score == 3:
    # speaker: enemy
    監視団の報告は完璧だった。君は軍でも通用する。……車酔いの件は、報告書から削除するように
- battle_score == 2:
    # speaker: enemy
    二問正解。監視団としては合格だ。……車酔いの件は、報告書から削除するように
- else:
    # speaker: enemy
    歴史の点数はともかく、観察力は一級だった。……車酔いの件は、報告書から削除するように
}
# speaker: narrator
大佐はポケットから生姜の飴を一つ出し、{heroine_name}の手に載せた。監視団への勲章だそうだ。
# speaker: heroine
# reaction: heroine,exasperated,sweat
勲章、ちょっと辛い……
# speaker: narrator
出口へ向かう一行の先頭で、大佐が誰より大きな声で、城の説明を始めていた。リヤが振り返り、こちらに小さく手を合わせた。
-> END
