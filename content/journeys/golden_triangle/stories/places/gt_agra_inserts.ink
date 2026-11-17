INCLUDE modules.ink
-> DONE

// アーグラの差し込み。【4】の時点を使う。

// 【4】到着の会話の後：デリーの階段井戸の動画が、もう届いている
=== gt_agra_arrive_reel ===
# scene: talk
# at: arrive agra
# priority: +1
# when: date gt_delhi_date_agrasen_baoli
# sources: none
# background: gt_bg_agra_hotel_hub
# bgm: gt_jalandhar
# speaker: narrator
帳場の前で、彼女がサミールに声をかけた。とたんに彼は携帯の画面を見て、彼女を見て、もう一度画面を見た。
# speaker: gt_samir
# recall: gt_album_d55
# voice: gt_agra_arrive_reel_samir_001
失礼ですが……デリーの階段井戸の動画の方ですよね？　最後の、『きゃー？』の
# speaker: heroine
# reaction: heroine,surprised_big,interrobang
# voice: gt_agra_arrive_reel_001
な、なんで知ってるんですか！
# speaker: gt_samir
# voice: gt_agra_arrive_reel_samir_002
アーグラの宿の者は、みんな見ています。うちの白鳥の動画より、再生が多いんです。少し悔しいくらい
{ cond("flag gt_delhi_baoli_player_pigeon"):
    # speaker: gt_samir
    # voice: gt_agra_arrive_reel_samir_003
    布を広げて飛び出す、鳩の役の方も。……あれは、旦那さまですよね？
    # speaker: heroine
    # reaction: heroine,exasperated,sweat
    # voice: gt_agra_arrive_reel_002
    旦那さまじゃないです！　鳩の役の人です！
- else:
    # speaker: gt_samir
    # voice: gt_agra_arrive_reel_samir_004
    新婚旅行の思い出が、もう動画になっているなんて。お幸せに
    # speaker: heroine
    # reaction: heroine,exasperated,sweat
    # voice: gt_agra_arrive_reel_003
    新婚じゃないです……！　有名なのは、鳩と、質問みたいな悲鳴だけです
}
# speaker: narrator
サミールは満足そうにうなずき、何かを書き留めた。たぶん、また誤解が一つ増えた。
-> END
