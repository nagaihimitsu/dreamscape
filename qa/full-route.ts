import assert from "node:assert/strict";
import {createGame,startDate,advanceDate,chooseDate,finishDate,validateGameState,confessionResult,type GameState} from "../src/domain/game";
import {startEpisode,getNextEpisode,getNextStoryBattle} from "../src/domain/chapter";
import {advanceTourismGuide,startTourismBattle,skipTourismGuide} from "../src/domain/tourism";
import {getActiveBattleContent,getReasoningContext,startBattle,advanceBattle,answerBattle,selectReasoningClue,submitBattleEvidence,leaveBattle} from "../src/domain/battle";
import {startCityEpilogue,advanceCityEpilogue} from "../src/domain/epilogue";
import {claimPendingRewards} from "../src/domain/rewards";
import {dates} from "../src/content";
function main(allCorrect: boolean) {
  let s=createGame("ユウ","ミオ");
  const seen:string[]=[];
  while (!s.completedCityIds.includes("milano")) {
    const sb=getNextStoryBattle(s);
    s=sb?startBattle(s,sb.battleId):startEpisode(s,getNextEpisode(s)!.id);
    while(s.activeTourism?.phase==="guide") s=allCorrect?advanceTourismGuide(s,s.revision):skipTourismGuide(s,s.revision);
    if(s.activeTourism) s=startTourismBattle(s,s.revision);
    assert.ok(s.activeBattle);
    seen.push(s.activeBattle.battleId);
    for(let frame=0;s.activeBattle?.phase!=="result";frame++) {
      assert.ok(frame<220,"battle stuck");
      const a=s.activeBattle!;
      const {battle,quiz}=getActiveBattleContent(a);
      if(a.phase==="reasoning") {
        assert.ok(getReasoningContext(s)!.claimText.length);
        for(const id of [...battle.reasoning!.correctClueIds].reverse()) s=selectReasoningClue(s,id,s.revision);
        s=submitBattleEvidence(s,s.revision);
      } else if(a.phase==="question") {
        const q=quiz.questions[a.roundIndex];
        const answer=allCorrect?q.correctOptionId:q.options.find(o=>o.id!==q.correctOptionId)!.id;
        s=answerBattle(s,answer,s.revision);
      } else s=advanceBattle(s,s.revision);
    }
    s=leaveBattle(s,s.revision);
    s=validateGameState(JSON.parse(JSON.stringify(s)));
  }
  assert.equal(seen.length,7);
  assert.equal(s.ap+s.pendingApRewards.reduce((n,r)=>n+r.remainingAp,0),allCorrect?24:15);
  s=startCityEpilogue(s,"milano",s.revision);
  while(s.activeEpilogue)s=advanceCityEpilogue(s,s.revision);
  assert.ok(s.viewedEpilogueCityIds.includes("milano"));
  assert.equal(s.playedDateIds.length,0);
  return s;
}
function date(s:GameState,id:string,amount=9999,picks=[0,0]) {
  let n=0;
  s=startDate(s,id,()=>n++%4===0?0:amount);
  assert.equal(s.activeDate?.dateId,id);
  for(let tick=0;s.activeDate;tick++){
    assert.ok(tick<100,id+" stuck");
    const f=s.activeDate.frame;
    if(f.choices.length)s=chooseDate(s,f.choices[picks[s.activeDate.choiceCount] ?? 0].index,s.revision);
    else if(f.ended)s=finishDate(s,s.revision);
    else s=advanceDate(s,s.revision);
  }
  return validateGameState(JSON.parse(JSON.stringify(s)));
}
main(false);
let s=main(true);
const early=date(s,"milano_cafe_01",5000);
assert.equal(confessionResult(early),"deferred");
const postponed=date(early,"milano_confession_01");
assert.equal(postponed.confessionStatus,"deferred");
assert.equal(date(postponed,"milano_reassurance_01").endingReached,false);
const rejectedSeed=date(s,"milano_san_satiro_date_01",0,[0,2]);
assert.equal(confessionResult(rejectedSeed),"rejected");
assert.equal(date(rejectedSeed,"milano_confession_01").confessionStatus,"rejected");
const normal=dates.filter(d=>d.kind==="normal"&&!d.legacyOnly);
assert.equal(normal.length,12);
for(const d of [...normal].reverse()){
  s=claimPendingRewards(s,s.revision);
  s=date(s,d.id);
}
assert.equal(s.ap,0);
assert.equal(confessionResult(s),"accepted");
s=date(s,"milano_confession_01");
assert.ok(s.endingReached);
console.log("OK: seven battles twice; 0/23 + skipped guides, 23/23 + read guides; evidence without observation; optional epilogue; 12 standard dates in reverse catalogue order; 24 AP spent; accepted/deferred/rejected confession and reassurance");
