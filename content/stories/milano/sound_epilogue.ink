VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR romance_stage = 1
VAR ending_reached = false

# background: milano_darsena_finale
# speaker: narrator
放送が終わったダルセナで、彼女は左の掌を開いた。さっきの網目はもう消えている。
# speaker: player
「最後に自分で話すって、いつ決めた？」
# speaker: heroine
「あの人が椅子を空けてくれたとき。座ってみたら、水がよく聴こえたから。」
{
- ending_reached:
# speaker: heroine
# emotion: shy
「帰ったら、うちで聴こう。恋人の声って、録ると他人みたいか、試したい。」
- romance_stage >= 3:
# speaker: heroine
# emotion: teasing
「今の話も録りたかった？　もう一回聞いてくれたら、違う答えを言うかも。」
- romance_stage == 2:
# speaker: heroine
# emotion: smile
「次はそっちの好きな音も教えて。十秒、私が黙ってるから。」
- else:
# speaker: heroine
「いまは、マイクなしで少しだけ歩きたいです。一緒にどうですか。」
}
# speaker: narrator
上着がかすかに鳴った。彼女は袖を押さえなかった。
-> END
