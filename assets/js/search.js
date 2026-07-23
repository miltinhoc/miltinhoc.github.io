(function () {
  var grid = document.getElementById('posts');
  if (!grid) return;
  var input = document.getElementById('search');
  var cards = Array.prototype.slice.call(grid.querySelectorAll('.post-card'));
  var chips = Array.prototype.slice.call(document.querySelectorAll('#filters .chip'));
  var empty = document.getElementById('search-empty');
  var countEl = document.getElementById('post-count');
  var featuredWrap = document.getElementById('featured-wrap');
  var index = null;
  var pending = null;
  var activeTag = 'all';

  function load(cb) {
    if (index) { cb(index); return; }
    if (pending) { pending.push(cb); return; }
    pending = [cb];
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'search-index.json');
    xhr.onload = function () {
      var map = {};
      try {
        var entries = JSON.parse(xhr.responseText);
        for (var i = 0; i < entries.length; i++) map[entries[i].url] = entries[i];
      } catch (e) {}
      index = map;
      var cbs = pending; pending = null;
      for (var j = 0; j < cbs.length; j++) cbs[j](index);
    };
    xhr.onerror = function () { index = {}; var cbs = pending; pending = null; for (var j = 0; j < cbs.length; j++) cbs[j](index); };
    xhr.send();
  }

  function tagOk(card) {
    if (activeTag === 'all') return true;
    var tags = ' ' + (card.getAttribute('data-tags') || '') + ' ';
    return tags.indexOf(' ' + activeTag + ' ') !== -1;
  }

  function finish(shown) {
    if (empty) empty.hidden = shown !== 0;
    if (countEl) countEl.textContent = shown + (shown === 1 ? ' post' : ' posts');
    // The featured pick is a curated "start here"; hide it once a filter narrows the list.
    if (featuredWrap) {
      var filtering = activeTag !== 'all' || (input && input.value.trim() !== '');
      featuredWrap.style.display = filtering ? 'none' : '';
    }
  }

  function apply() {
    var q = input ? input.value.trim().toLowerCase() : '';
    if (!q) {
      var shown = 0;
      for (var i = 0; i < cards.length; i++) {
        var ok = tagOk(cards[i]);
        cards[i].style.display = ok ? '' : 'none';
        if (ok) shown++;
      }
      finish(shown);
      return;
    }
    load(function (idx) {
      // Query may have changed while the index was loading.
      if (input.value.trim().toLowerCase() !== q) return;
      var terms = q.split(/\s+/);
      var shown = 0;
      for (var i = 0; i < cards.length; i++) {
        var card = cards[i];
        var ok = tagOk(card);
        if (ok) {
          var entry = idx[card.getAttribute('data-url')];
          var hay = entry ? entry.text : card.textContent.toLowerCase();
          for (var t = 0; t < terms.length; t++) {
            if (hay.indexOf(terms[t]) === -1) { ok = false; break; }
          }
        }
        card.style.display = ok ? '' : 'none';
        if (ok) shown++;
      }
      finish(shown);
    });
  }

  if (input) input.addEventListener('input', apply);
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      chips.forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
      chip.setAttribute('aria-pressed', 'true');
      activeTag = chip.getAttribute('data-tag');
      apply();
    });
  });
  apply();
})();
