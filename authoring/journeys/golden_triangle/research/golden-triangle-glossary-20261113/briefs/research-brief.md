# Common brief: photo + facts + one-line text for 旅の図鑑 terms (India journey)

Repository /home/user/dreamscape is READ-ONLY for you: do not edit, create or move any file in it. Write only inside
<作業用フォルダ>/terms/ (your batch folder given below).

## The card
A travel-game encyclopedia card: ONE image + ONE Japanese line (`lineJa`, aim ≤ 40 Japanese characters, hard max 60), shown
when the term appears in the story. The user wants each line to give an Indian "へー！" fact — something that changes how a
Japanese traveller sees the thing (e.g. for the cow: sacred in Hinduism, so beef is rarely eaten and McDonald's in India
has no beef burgers). Even well-known things are welcome if the line has such an Indian angle. Plain, natural Japanese in
the style of these existing lines:
- ゴルガッパ: 薄く揚げた空洞の玉に、酸っぱく辛い香草水を注いで一口で食べる屋台の軽食。
- ニンブー・ミルチ: レモンと青唐辛子を糸に通した魔よけ。車や店の入口に下げ、悪い目を防ぐ。
- 首を揺らすしぐさ: 首を左右に小さく傾けるしぐさ。場面により「はい」「いいよ」「分かった」。
- ジャイヴァーナ: ジャイガル城にある、車輪のついた巨大な大砲。1720年に城の鋳造所で造られた。
Rules for the line: only facts your sources support; say 「〜とされる」「言い伝え」 for beliefs/legends; no numbers that sources
disagree on; and NEVER write what a term's "must not mention" note forbids (those are quiz answers the player has not seen).

## Facts
For each term find 1–3 sources (prefer official/government, museums, established newspapers in English or Indian languages,
academic pages; Wikipedia only as a supplement). Quote the supporting sentence(s) verbatim with title, publisher, URL, date.

## Image
Find ONE best freely licensed image per term on Wikimedia Commons or Flickr. Search in English AND Indian languages (Hindi,
Urdu, Punjabi, Rajasthani/Hindi, Bengali, Tamil, etc. as relevant; uploaders often title files in their own script).
- Licences: only CC0, public domain (PD-Art etc.), CC BY, CC BY-SA (any version). On Commons read the raw wikitext
  (https://commons.wikimedia.org/w/index.php?title=File:NAME&action=raw) for the licence template; for Flickr transfers
  require a FlickreviewR "reviewed-pass"/LicenseReview line; for Flickr-only photos read the licence link on the photo page.
  Reject NC/ND/GFDL-only/unknown. Distrust "own work" files that look like professional/press/studio photos.
- People: an unrelated person's face must not be the subject; small or turned-away faces are OK (report where).
  Report brand signs, number plates, watermarks/date stamps and their pixel positions.
- If no photo of the thing exists, propose (in order): the same thing elsewhere; a related photo (say what it shows, for a
  photo note); or "none".
- Download the chosen image (about 1280 px wide is enough; Commons thumbnails:
  https://upload.wikimedia.org/wikipedia/commons/thumb/H/HH/NAME/1280px-NAME where H/HH come from md5 of the
  underscored file name; or the original if smaller). Commons rate-limits (429): wait 10–20 s between downloads and retry.
  Flickr static images cannot be fetched with curl here: use your web-fetch tool on the image URL (the harness saves the
  bytes and tells you the saved path), then copy that file. Do NOT fake a browser User-Agent or Referer.
  Save as <batch folder>/<term id>.<ext>. Verify the file is really an image (`file`), not an HTML error page.

## Output
Write <batch folder>/result.json: an array of objects, one per term, with:
{ "id", "nameJa", "aliasJa" (or null), "category", "lineJa", "lineChars", "photoNoteJa" (only if the image is not the thing
itself, else null), "altJa" (Japanese description of what the image shows),
"image": { "file", "commonsOrFlickrPage", "title", "author", "license", "licenseUrl", "licenseEvidence" (verbatim template
or link text), "flickrReview" (verbatim or null), "originalSize", "downloadedSize", "date", "place", "description",
"facesSignsPlates", "suggestedCrop" (x,y,w,h in the downloaded file or null), "notes" } or null,
"facts": [ { "publisher", "title", "url", "date", "quote" } ], "notes" }
Then reply with a short summary: which terms have no image, which have weak facts, anything I must check.
