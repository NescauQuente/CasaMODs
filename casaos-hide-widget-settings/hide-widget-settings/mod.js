/*
 * The widget column ends on the same line as the apps (shared by the Hide
 * Footer and Hide Widget Settings mods: whichever loads first runs it, the
 * same code in both). CasaOS sizes the column from the window height it
 * measured once when the page loaded, and where the apps end changes with the
 * CasaOS version and the footer; so this measures where the dashboard's
 * scrolling area (the apps) ends and where the column starts, and mod.css sizes
 * the column from --casamods-widget-column. Only on load, on resize and when
 * CasaOS renders a new column: two measurements, no per-frame work.
 */
(function () {
  'use strict';

  if (window.__casamodsWidgetColumn) return;
  window.__casamodsWidgetColumn = true;

  var root = document.documentElement, set = '';

  // the scrolling area the column sits in (the dashboard's, with the apps)
  function scroller(el) {
    for (var p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      var o = getComputedStyle(p).overflowY;
      if (o === 'auto' || o === 'scroll') return p;
    }
    return null;
  }

  function fit() {
    var bar = document.querySelector('.side-bar'), apps = bar && scroller(bar), v = '';
    // on phones (480px and less) CasaOS slides the column in over the apps: left as it is
    if (bar && apps && window.innerWidth > 480) {
      var end = apps.getBoundingClientRect().bottom;
      // and above the footer when it shows (on older CasaOS the apps run under it)
      var foot = document.querySelector('.brand-bar');
      var fr = foot && foot.getClientRects().length ? foot.getBoundingClientRect() : null;
      if (fr && fr.height) end = Math.min(end, fr.top - 12);
      var h = Math.floor(end - bar.getBoundingClientRect().top);
      if (h > 120) v = h + 'px';
    }
    if (v === set) return;
    set = v;
    if (v) root.style.setProperty('--casamods-widget-column', v);
    else root.style.removeProperty('--casamods-widget-column');
  }

  var pending = false, seen = null;
  function soon() {
    if (pending) return;
    pending = true;
    setTimeout(function () { pending = false; fit(); }, 150);
  }
  window.addEventListener('resize', soon);
  // the page changes all the time (a clock, a player): measure again only when
  // CasaOS renders a new column (after loading, after logging in again…)
  new MutationObserver(function () {
    var bar = document.querySelector('.side-bar');
    if (bar !== seen) {
      seen = bar;
      soon();
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
  fit();
})();
