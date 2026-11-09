// The game's module for the place files (stories/places/*.ink; the unified event design, stage 3a).
// Authors do not edit it: every place file starts with INCLUDE modules.ink, and content:build
// compiles each place file with this text. To preview a place file in Inky, put a copy of this
// file next to it (content:build ignores such copies and always uses this one).
// Every variable the game sets is declared here; a place file declares no VAR.
VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR romance_stage = 1
VAR ending_reached = false
VAR memory_callback = ""
VAR confession_ready = false
VAR confession_result = "deferred"
VAR romance_result = "neutral"
VAR affection_delta = 0
VAR trust_delta = 0
VAR spark_delta = 0
VAR relationship_tone = "reserved"
VAR relationship_tone_before = "reserved"
VAR relationship_tone_after = "reserved"
VAR answer_correct = false
VAR battle_score = 0
// A battle in the one-flow form (stage 5): the game sets these as it returns from a call below.
VAR call_arg = 0
VAR quiz_correct = false
VAR reasoning_action = ""
VAR evidence_result = ""
EXTERNAL cond(text)

// Inky's stand-in (always false); the game binds the real cond.
=== function cond(text) ===
~ return false

// A battle's quiz (stage 5): `-> quiz(1) ->`. The game shows the quiz's screen at the one choice
// (hint, answer, right or wrong) and comes back with quiz_correct and battle_score set.
=== quiz(round) ===
~ call_arg = round
+ [quiz # call: quiz]
- ->->

// A special battle's stop point (stage 5): `-> reasoning ->`. The game shows the claim's screen and
// comes back with reasoning_action "press" (B's press) or "evidence" and evidence_result "success" or "failure".
=== reasoning ===
+ [reasoning # call: reasoning]
- ->->
