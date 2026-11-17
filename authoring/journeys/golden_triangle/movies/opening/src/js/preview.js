/* Watching the movie in a browser: fits the stage in the window and plays it with the music.
   This file is only for people looking at the page. Frame capture (render.mjs opens the page with ?render=1)
   never runs it: there the time comes from renderAt(t) alone. */
(function () {
  "use strict";
  const GT = window.GT, q = new URLSearchParams(location.search);
  if (q.get("render") || q.has("t")) return;

  const fit = document.getElementById("fit"), controls = document.getElementById("controls");
  const play = document.getElementById("c_play"), seek = document.getElementById("c_seek"), out = document.getElementById("c_time");
  controls.hidden = false;
  const resize = () => { const k = Math.min(innerWidth / GT.W, (innerHeight - 52) / GT.H); fit.style.transform = `translate(${(innerWidth - GT.W * k) / 2}px, 0) scale(${k})`; };
  addEventListener("resize", resize); resize();

  const audio = new Audio("../music/segment.flac"); audio.preload = "auto";   // the music sits beside src/; silent if it is not there
  let playing = false, startedAt = 0, startT = 0;
  const show = t => { const f = Math.min(GT.FRAMES - 1, Math.max(0, Math.round(t * GT.FPS))); window.renderAt(f / GT.FPS); seek.value = f; out.textContent = `${(f / GT.FPS).toFixed(3)} s / f${f}`; };
  const stop = () => { playing = false; audio.pause(); play.textContent = "再生"; };
  const tick = now => {
    if (!playing) return;
    const t = startT + (now - startedAt) / 1000;
    if (t >= GT.DUR) { show(GT.DUR); stop(); return; }
    show(t); requestAnimationFrame(tick);
  };
  play.addEventListener("click", () => {
    if (playing) { stop(); return; }
    startT = seek.value >= GT.FRAMES - 1 ? 0 : seek.value / GT.FPS;
    playing = true; play.textContent = "停止"; startedAt = performance.now();
    try { audio.currentTime = startT; audio.play().catch(() => {}); } catch (e) { /* no music: play silently */ }
    requestAnimationFrame(tick);
  });
  seek.addEventListener("input", () => { stop(); show(seek.value / GT.FPS); });
  GT.ready.then(() => show(0));
})();
