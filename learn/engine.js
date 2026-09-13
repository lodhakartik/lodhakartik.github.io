/* ============================================================
   Learning World — shared engine (single source of truth)
   Profiles + progress store, XP/levels, rewards, speech, audio,
   effects, export/import, and a reusable no-fail Quiz runner
   with spaced repetition.  Local-first (no server needed);
   the Store layer is isolated so cloud sync can be added later.
   ============================================================ */
window.LW = (function () {
  "use strict";

  /* ---------------- Store (local-first) ---------------- */
  var KEY = "learnworld_v1";
  function blank() { return { version: 1, currentId: null, profiles: {} }; }
  var state;
  try { state = JSON.parse(localStorage.getItem(KEY)) || blank(); } catch (e) { state = blank(); }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  function uid() { return "p" + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36); }
  function normalize(p) {
    p.xp = p.xp || 0; p.stickers = p.stickers || []; p.badges = p.badges || [];
    p.prog = p.prog || {}; p.stars = p.stars || 0; return p;
  }
  var Store = {
    createProfile: function (name, pet) {
      var id = uid();
      state.profiles[id] = normalize({ id: id, name: name, pet: pet, created: Date.now() });
      state.currentId = id; persist(); return state.profiles[id];
    },
    list: function () { return Object.keys(state.profiles).map(function (k) { return state.profiles[k]; }); },
    current: function () { return state.currentId && state.profiles[state.currentId] ? normalize(state.profiles[state.currentId]) : null; },
    setCurrent: function (id) { if (state.profiles[id]) { state.currentId = id; persist(); } },
    remove: function (id) { delete state.profiles[id]; if (state.currentId === id) state.currentId = null; persist(); },
    save: persist,
    exportCode: function () { try { return btoa(unescape(encodeURIComponent(JSON.stringify(state)))); } catch (e) { return ""; } },
    importCode: function (code) {
      try { var s = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
        if (s && s.profiles) { state = s; persist(); return true; } } catch (e) {}
      return false;
    }
  };

  /* ---------------- XP / levels / rewards ---------------- */
  var XP_PER_LEVEL = 40;
  function levelInfo(xp) {
    var lvl = 1 + Math.floor(xp / XP_PER_LEVEL);
    var into = xp % XP_PER_LEVEL;
    return { level: lvl, into: into, span: XP_PER_LEVEL, pct: Math.round(into / XP_PER_LEVEL * 100) };
  }
  // pet grows visually with level: extra sparkle/crown handled in UI; stage name here
  function petStage(level) { return level >= 12 ? 3 : (level >= 6 ? 2 : (level >= 3 ? 1 : 0)); }

  function awardXP(n) {
    var p = Store.current(); if (!p) return { leveledUp: false };
    var before = levelInfo(p.xp).level;
    p.xp += n; Store.save();
    var after = levelInfo(p.xp).level;
    return { leveledUp: after > before, level: after, before: before };
  }
  function addStar(n) { var p = Store.current(); if (!p) return 0; p.stars += (n || 1); Store.save(); return p.stars; }
  function addSticker(s) { var p = Store.current(); if (!p) return false; if (p.stickers.indexOf(s) === -1) { p.stickers.push(s); Store.save(); return true; } return false; }
  function addBadge(b) { var p = Store.current(); if (!p) return false; if (p.badges.indexOf(b) === -1) { p.badges.push(b); Store.save(); return true; } return false; }
  function setProg(key, val) { var p = Store.current(); if (!p) return; p.prog[key] = val; Store.save(); }
  function getProg(key, dflt) { var p = Store.current(); if (!p) return dflt; return (key in p.prog) ? p.prog[key] : dflt; }
  // per-skill counters (used for badges + reporting from classic games)
  function bumpStat(key, by) { var p = Store.current(); if (!p) return; p.prog.stats = p.prog.stats || {}; p.prog.stats[key] = (p.prog.stats[key] || 0) + (by || 1); Store.save(); }
  function stats() { var p = Store.current(); return (p && p.prog.stats) || {}; }

  /* ---------------- Speech ---------------- */
  var voice = null;
  function pickVoice() { try { var vs = window.speechSynthesis.getVoices();
    for (var i = 0; i < vs.length; i++) { if (/en[-_]/i.test(vs[i].lang)) { voice = vs[i]; break; } }
    if (!voice && vs.length) voice = vs[0]; } catch (e) {} }
  if ("speechSynthesis" in window) { pickVoice(); window.speechSynthesis.onvoiceschanged = pickVoice; }
  function say(text, rate) { if (!("speechSynthesis" in window)) return;
    try { window.speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(text);
      u.rate = rate || 0.85; u.pitch = 1.12; if (voice) u.voice = voice; window.speechSynthesis.speak(u); } catch (e) {} }

  /* ---------------- Audio (chime) ---------------- */
  var actx = null;
  function chime(good) { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    var notes = good ? [523, 659, 784] : [392, 330];
    notes.forEach(function (f, i) { var o = actx.createOscillator(), g = actx.createGain();
      o.type = "sine"; o.frequency.value = f; o.connect(g); g.connect(actx.destination);
      var t = actx.currentTime + i * 0.11; g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.22, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      o.start(t); o.stop(t + 0.22); }); } catch (e) {} }
  function fanfare() { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    [523, 659, 784, 1047].forEach(function (f, i) { var o = actx.createOscillator(), g = actx.createGain();
      o.type = "triangle"; o.frequency.value = f; o.connect(g); g.connect(actx.destination);
      var t = actx.currentTime + i * 0.14; g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.start(t); o.stop(t + 0.32); }); } catch (e) {} }

  /* ---------------- FX (confetti) ---------------- */
  function confetti(n) { var em = ["⭐","🌟","✨","🎉","🎊","🌼"];
    for (var i = 0; i < (n || 16); i++) { var el = document.createElement("div"); el.className = "confetti";
      el.textContent = em[i % em.length]; el.style.left = (Math.random() * 100) + "vw";
      el.style.animationDuration = (1.6 + Math.random() * 1.4) + "s"; el.style.fontSize = (22 + Math.random() * 22) + "px";
      document.body.appendChild(el); (function (x) { setTimeout(function () { x.remove(); }, 3200); })(el); } }

  /* ---------------- helpers ---------------- */
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function pickN(arr, n) { return shuffle(arr.slice()).slice(0, n); }
  function esc(s) { return (window.CSS && CSS.escape) ? CSS.escape(s) : String(s).replace(/"/g, '\\"'); }

  /* ---------------- Quiz runner (no-fail + spaced re-test) ----------------
     opts = {
       mount:   DOM element to render into
       items:   array of item keys (the pool to draw targets from)
       length:  trials per round (default 12)
       build:   function(targetKey, numChoices) -> {
                  prompt, stim (HTML), sayStart(), choices:[{key,cls,html}],
                  correct, winSay(), fixSay()
                }
       xpPerCorrect: default 4
       onCorrect: optional(targetKey, firstTry)
       onDone:  function(summary)
     }
  --------------------------------------------------------------- */
  function runQuiz(opts) {
    var mount = opts.mount;
    var LEN = opts.length || 12;
    var XP = opts.xpPerCorrect == null ? 4 : opts.xpPerCorrect;
    var queue = shuffle(opts.items.slice());
    var trials = 0, correctCount = 0, xpEarned = 0, leveled = false;

    function numChoices() { return Math.min(4, 2 + Math.floor(correctCount / 3)); }

    function finish() {
      if (opts.onDone) opts.onDone({ trials: trials, correct: correctCount, xp: xpEarned, leveledUp: leveled });
    }

    function next() {
      if (trials >= LEN) { finish(); return; }
      if (!queue.length) queue = shuffle(opts.items.slice());
      var target = queue.shift();
      var n = numChoices();
      var T = opts.build(target, n);
      trials++;

      var mpct = Math.round(trials / LEN * 100);
      mount.innerHTML =
        '<div class="mini-wrap"><div class="mini-bar"><div class="mini-fill" style="width:' + mpct + '%"></div></div>' +
          '<span class="mini-txt">' + trials + ' / ' + LEN + '</span></div>' +
        '<p class="prompt">' + T.prompt + '</p>' +
        '<div class="stim" id="lwstim">' + T.stim + '</div>' +
        '<button class="replay" id="lwreplay">🔊 Hear again</button>' +
        '<div class="choices' + (T.choices.length === 3 ? ' three' : '') + '" id="lwchoices"></div>';
      var wrap = mount.querySelector("#lwchoices");
      T.choices.forEach(function (c) {
        var b = document.createElement("button");
        b.className = "choice " + c.cls; b.innerHTML = c.html; b.setAttribute("data-key", c.key);
        wrap.appendChild(b);
      });
      mount.querySelector("#lwstim").onclick = T.sayStart;
      mount.querySelector("#lwreplay").onclick = T.sayStart;
      setTimeout(T.sayStart, 300);

      var answered = false, penalized = false;
      wrap.querySelectorAll(".choice").forEach(function (tile) {
        tile.onclick = function () {
          if (answered) return;
          if (tile.getAttribute("data-key") === T.correct) {
            answered = true;
            tile.classList.add("correct"); chime(true); confetti(14);
            if (!penalized) {
              correctCount++; addStar(1);
              var r = awardXP(XP); xpEarned += XP; if (r.leveledUp) leveled = true;
              if (opts.onCorrect) opts.onCorrect(target, true);
              if (T.winSay) T.winSay();
            } else { if (T.fixSay) T.fixSay(); }
            var off = penalized ? 2 : 6; // missed -> sooner
            queue.splice(Math.min(off, queue.length), 0, target);
            setTimeout(next, 1500);
          } else {
            tile.classList.add("wrong"); tile.style.pointerEvents = "none"; chime(false);
            penalized = true;
            var ct = wrap.querySelector('[data-key="' + esc(T.correct) + '"]');
            if (ct) ct.classList.add("reveal");
            if (T.fixSay) T.fixSay();
          }
        };
      });
    }
    next();
  }

  /* ---------------- public API ---------------- */
  return {
    Store: Store,
    levelInfo: levelInfo, petStage: petStage,
    awardXP: awardXP, addStar: addStar, addSticker: addSticker, addBadge: addBadge,
    setProg: setProg, getProg: getProg, bumpStat: bumpStat, stats: stats,
    say: say, chime: chime, fanfare: fanfare, confetti: confetti,
    shuffle: shuffle, pickN: pickN,
    runQuiz: runQuiz
  };
})();
