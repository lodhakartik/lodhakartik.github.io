/* ============================================================
   Learning World — classic-game bridge
   Lets the original standalone games (which keep their own URLs
   and their own local star counts) report NEW stars earned in
   this session into the current Learning World profile as XP.
   Loaded by each game AFTER engine.js.  No-op if no profile
   exists, so the games still work perfectly on their own.
   ============================================================ */
window.LWB = (function () {
  "use strict";
  var baseline = null;   // the game's star total when the page loaded
  var lastSeen = 0;

  function active() { return window.LW && LW.Store && LW.Store.current(); }

  return {
    /* Call from the game's setStars(n).  The first call sets a
       baseline (no award) so previously-saved stars aren't
       double-counted; every star added afterwards this session
       feeds the profile. */
    onStars: function (total, skill, xpEach) {
      total = total || 0;
      if (baseline === null) { baseline = total; lastSeen = total; return; }
      if (!active()) { lastSeen = total; return; }
      var delta = total - lastSeen;
      lastSeen = total;
      if (delta > 0) {
        LW.addStar(delta);
        LW.awardXP((xpEach || 3) * delta);
        if (skill) LW.bumpStat(skill, delta);
      }
    }
  };
})();
