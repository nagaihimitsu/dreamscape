VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR romance_stage = 1
VAR ending_reached = false

# background: gt_bg_delhi_hotel_hub
# speaker: narrator
夜更け、宿の部屋。アーグラ行きの荷造りは半分で止まり、{heroine_name}は段ボールの切れ端を眺めていた。五行のデリー。全部、行った。
# speaker: narrator
戸を叩く音。アマンが、素焼きの小さなカップのチャイを三つ、器用に指に挟んで立っていた。
# speaker: enemy
「さっきは、失礼なことを言いました。あなたたちが祖母を連れ出したと決めつけて」
# speaker: heroine
「いえ。……わたしも、アマンさんの立場だったら、同じことを言ったと思います」
# speaker: enemy
「祖母は、零時まで話しました。祖父が六十年前に何を言ったか。自分が何を言わなかったか」
# speaker: narrator
家族の間では、二人は親の決めた縁談で結婚したことになっていた。本当は、城の暗がりで始まった話だった。
# speaker: enemy
「僕の結婚は、親が紹介してくれた相手です。不満はない。でも、どう話せばいいか、まだ分からない」
# speaker: enemy
「祖母に言われました。どう出会ったかより、毎日ちゃんと言葉にしなさい、と。……六十年言わなかった人が、言うんですよ」
# speaker: heroine
# reaction: heroine,smile,music
「説得力、ありますね。経験者の言葉だもん」
# speaker: narrator
アマンはチャイを置き、折りたたんだ紙を差し出した。結婚式の案内。場所はジャイプールの旧市街。日付は、ちょうど二人がジャイプールにいるころだった。
# speaker: enemy
「祖母が、あの生意気な娘を呼べと。……『来なくてもいい』とも言ってましたけど。たぶん、来いという意味です」
# speaker: heroine
# emotion: serious
「ありがとうございます。……行くかどうか、少しだけ考えさせてください。自分で決めたいので」
# speaker: enemy
「祖母が喜びそうな返事だ」
# speaker: narrator
アマンが帰ったあと、{heroine_name}はチャイの最後の一口を飲み干し、窓の外を見た。路地のトラックは、もう全部積み終わっている。
{
- ending_reached:
    # speaker: heroine
    # emotion: smile
    「ねえ。わたし、言いたいことは、言いたいときに言うね。六十年後じゃなくて」
    # speaker: heroine
    # reaction: heroine,shy,blush
    「……今も、一つ言いたいけど。それは明日、起きてからにする」
- romance_stage >= 3:
    # speaker: heroine
    「六十年って、長いね。……わたしは、そんなに待たせたくないな。誰を、とは言わないけど」
- romance_stage == 2:
    # speaker: heroine
    「言いそびれたことって、あとから重くなるんだね。わたしも、今日のうちに一つ言っておく。……付き合ってくれて、ありがとう」
- else:
    # speaker: heroine
    「旅の連れに言うことじゃないかもしれないけど。今日、一人じゃなくてよかった」
}
# speaker: narrator
翌朝六時。車の窓が下り、カムラが顔を出した。見送りに来た二人を見ても、表情は変えない。
# speaker: narrator
アーグラでも、言いたいことは言いなさい。それだけ言って、窓は上がった。車が角を曲がるまで、後ろの窓の小さな手は、ずっと揺れていた。
# speaker: heroine
# reaction: heroine,teasing,music
「……『来なくてもいい』って言った人が、一番長く手を振ってた」
-> END
