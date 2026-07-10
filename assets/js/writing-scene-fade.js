/* =========================================================================
   GrokitLabs writing system — writing-scene-fade.js
   Fades the corner scene (rendered server-side by
   _includes/writing-scene.html) when it would visually overlap real
   content while scrolling, and fades it back in the instant it's clear.
   Gracefully does nothing if .scene-corner isn't on the page.

   USAGE: <script src="/assets/js/writing-scene-fade.js" defer></script>
   ========================================================================= */
(function () {
  function init() {
    var scene = document.querySelector('.scene-corner');
    if (!scene) return;

    var selectors = '.step, .promise, .player, .folder, .say, h1, h2, .sub, .byline, .foot';
    var ticking = false;

    function overlaps(a, b) {
      return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
    }

    function shrink(rect, insetPct) {
      var dx = rect.width * insetPct;
      var dy = rect.height * insetPct;
      return { left: rect.left + dx, right: rect.right - dx, top: rect.top + dy, bottom: rect.bottom - dy };
    }

    function check() {
      ticking = false;
      // most of the box is transparent padding around the art; only test the
      // inner ~56% where the rocket/cloud/glow actually render, so it hides
      // ONLY on genuine visual overlap, not whenever a card's empty corner is near.
      var sceneRect = shrink(scene.getBoundingClientRect(), 0.22);
      var els = document.querySelectorAll(selectors);
      var collide = false;
      for (var i = 0; i < els.length; i++) {
        var r = els[i].getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) continue; // offscreen, skip
        if (overlaps(sceneRect, r)) { collide = true; break; }
      }
      scene.classList.toggle('is-hidden', collide);
    }

    function requestCheck() {
      if (!ticking) { window.requestAnimationFrame(check); ticking = true; }
    }

    window.addEventListener('scroll', requestCheck, { passive: true });
    window.addEventListener('resize', requestCheck);
    check();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
