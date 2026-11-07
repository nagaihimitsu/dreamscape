VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR romance_stage = 1
VAR ending_reached = false

# background: gt_bg_delhi_hotel_hub
# speaker: narrator
宿は住宅街の路地にあった。隣の古い家から段ボールが次々に運び出され、路地の真ん中では、プラスチックの椅子に座った小柄な老婦人が、落花生を割りながら運び手たちに指図している。将軍みたいに。
# speaker: narrator
カムラ、七十九歳。この家に六十年住み、数日のうちに、ジャイプールの息子の家へ移る。そこまでを三十秒で言い切ると、彼女は{heroine_name}のガイドブックを取り上げ、写真がきれいすぎる、と鼻を鳴らした。
# speaker: heroine
# reaction: heroine,exasperated,sweat
「わたしのガイドブック、初対面で不合格になった……」
# speaker: narrator
カムラは段ボールの切れ端に、ヒンディー語で五行書いた。わたしのデリー、と言って、一行ずつぶっきらぼうに訳してくれる。赤い城、暗くなってから。クトゥブ・ミナール、鉄の柱、もう抱けない、腹立たしい。フマユーン廟、東の門から三本目の木陰。ジャーマー・マスジド、朝のニハーリー、階段の下の店。
# speaker: narrator
五行目だけは、場所の名前がなかった。月が水に落ちた所で、最後の買い物。意味を聞いても、説明したらつまらない、と言うだけだ。出かけるときは、運転手とは喧嘩になるから、地下鉄の女性車両に乗るのだ、と。
# speaker: narrator
それから彼女は、{heroine_name}の後ろに立つこちらを顎で示した。あんたの連れ、さっきから黙ってるね。いい男は黙ってるもんだ。
{ ending_reached:
    # speaker: heroine
    # reaction: heroine,shy,blush
    「こ、恋人です。……人に言うの、まだ慣れてなくて」
- else:
    # speaker: heroine
    # reaction: heroine,surprised_big,blush
    「た、旅の連れです！　……今の、通訳しないでくださいね」
}
# speaker: narrator
カムラは笑わず、落花生を一粒、{heroine_name}の手のひらに載せた。デリーは押しの強い町だよ。欲しいものは、欲しいと言いなさい。黙っていたら、誰も気づかない。
# speaker: heroine
# reaction: heroine,teasing,music
「……はい、覚えておきます。それにしても、地図というより暗号だね。せっかくなら全部回って、解いてみたいな。……ね、一緒に解いてくれる？」
-> END
