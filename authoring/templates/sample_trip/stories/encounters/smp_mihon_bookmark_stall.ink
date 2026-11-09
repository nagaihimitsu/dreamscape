// 【任意：道中交流と品物】品物を受け取る交流（encounters/catalog.json の completionItemId）。
// - 主人公の返答は英語の3択を1回。訳は角括弧の中に # translation: で書く。正誤は付けない。
// - 品物や費用のルールがある交流は、各選択肢に # option: で安定IDを付け、カタログの options と結ぶ。
// - 選択後の会話は日本語で、どの枝も最後まで進む。# effect や所持金・品物の操作はInkに書かない（ゲーム側が行う）。
// - 他の人物の言葉は、誰の発言かが分かる地の文に入れる。見本の人物と品物は架空。
// - 【任意：頭の札】ファイルの頭（VAR の後、最初の文の前）の # at: と # priority: で、起きる時点と順番を決める。
//   -1 は「着いてすぐ、本筋（案内・観察・対決）の前」。地図で時計塔へ出発すると、この交流から始まる。
VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""

# at: visit mihon_clock_tower
# priority: -1
# background: smp_bg_mihon_clock_tower
# speaker: narrator
時計塔の下で、小さな女の子が布の上に手描きのしおりを並べている。どれも、針が三時を指していた。
# speaker: narrator
女の子「リリっていうの。トーマの妹。一枚ずつ、おまけでどうぞ」
* [Could I have one, please? # option: ask # translation: 一枚もらえますか。]
    # speaker: narrator
    リリはいちばん針のまっすぐな一枚を選んで、こちらの手のひらにのせた。
    # speaker: heroine
    # emotion: smile
    「いちばんまっすぐなのを選んでくれたね。わたしが描いたら、絶対曲がる」
    -> END
* [Did you draw these yourself? # option: drawn # translation: これ、自分で描いたの？]
    # speaker: narrator
    リリ「うん。兄ちゃんが直す前に、止まった時計を残しておきたくて」。リリは一枚を差し出した。
    # speaker: heroine
    「残しておきたい、か。……その気持ち、わかる気がする」
    -> END
* [Maybe next time. # option: later # translation: また今度にします。]
    # speaker: narrator
    リリは怒らずに、しおりを一枚だけ取り分けた。リリ「来られるときに、ね」
    # speaker: heroine
    「この街の子だね。言い方が、もう三時」
    -> END
