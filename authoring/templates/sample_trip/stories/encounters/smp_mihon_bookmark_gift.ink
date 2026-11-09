// 【任意：道中交流と品物】品物を渡す交流（options の requiresItemId と giftItemId）。
// - 品物を使う・渡す選択肢には # option: の安定IDを付け、カタログでその品物を持っていることを条件にする。
// - 渡さない選択肢は deferCompletion にして、あとでもう一度選べるようにする。
// - 英語の3択を1回、選択後は日本語の会話。品物の状態はゲーム側が変える。見本の品物は架空。
// - 【任意：頭の札】+1 は「本筋の後」。時計塔の対決の結果で「自由時間へ」を押すと始まる。
//   # when: で、しおりを持っているときだけ起きる（条件の書き方は docs/02 の「場面の時点と順番」）。
VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""

# at: visit mihon_clock_tower
# priority: +1
# when: item smp_mihon_three_bookmark held
# background: smp_bg_mihon_clock_tower
# speaker: narrator
時計塔を見上げる{heroine_name}の横で、ポケットの中の三時のしおりに指が触れた。
* [This is for you. # option: give # translation: これ、あなたに。]
    # speaker: heroine
    # reaction: heroine,surprised,exclamation
    「え、いいの？　……ありがとう。旅の日記に挟んでおくね」
    -> END
* [Shall we keep it in your guidebook? # option: guidebook # translation: あなたのガイドブックに挟もうか。]
    # speaker: heroine
    # emotion: happy
    「いいね。三時のページに挟もう。……あ、この本、三時のページなんてないや」
    -> END
* [I'll keep it a little longer. # option: later # translation: もう少し持っておきます。]
    # speaker: heroine
    「うん、持ってて。リリちゃんが選んでくれた一枚だもんね」
    -> END
