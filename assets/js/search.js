(function () {
  var grid = document.getElementById('posts');
  if (!grid) return;
  var input = document.getElementById('search');
  var cards = Array.prototype.slice.call(grid.querySelectorAll('.post-card'));
  var filters = document.getElementById('filters');
  var chips = Array.prototype.slice.call(document.querySelectorAll('#filters .chip'));
  var empty = document.getElementById('search-empty');
  var countEl = document.getElementById('post-count');
  var featuredWrap = document.getElementById('featured-wrap');
  var index = null;
  var pending = null;
  var activeTag = 'all';

  // Remember each card's original title/summary so highlighting can be undone.
  cards.forEach(function (card) {
    var t = card.querySelector('.post-card-title');
    var s = card.querySelector('.post-card-summary');
    card._title = t; card._titleText = t ? t.textContent : '';
    card._summary = s; card._summaryText = s ? s.textContent : '';
  });

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
        for (var i = 0; i < entries.length; i++) {
          var e = entries[i];
          e.hay = [e.title, e.tags, e.summary, e.body].join(' ').toLowerCase();
          e.bodyLc = (e.body || '').toLowerCase();
          map[e.url] = e;
        }
      } catch (err) {}
      done(map);
    };
    xhr.onerror = function () { done({}); };
    xhr.send();
    function done(map) {
      index = map;
      var cbs = pending; pending = null;
      for (var j = 0; j < cbs.length; j++) cbs[j](index);
    }
  }

  function esc(s) {
    return s.replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  // Wrap every occurrence of any term in <mark>; split() with a capture
  // group puts the matches at the odd indices.
  function mark(text, terms) {
    if (!terms.length) return esc(text);
    var re = new RegExp('(' + terms.map(escRe).join('|') + ')', 'gi');
    return text.split(re).map(function (part, i) {
      return i % 2 ? '<mark>' + esc(part) + '</mark>' : esc(part);
    }).join('');
  }

  // ~180 chars of body text around the first matching term, trimmed to words.
  function snippet(entry, terms) {
    var at = -1;
    for (var t = 0; t < terms.length; t++) {
      var k = entry.bodyLc.indexOf(terms[t]);
      if (k !== -1 && (at === -1 || k < at)) at = k;
    }
    if (at === -1) return null;
    var start = Math.max(0, at - 60);
    var end = Math.min(entry.body.length, at + 120);
    var s = entry.body.slice(start, end);
    if (start > 0) s = '…' + s.replace(/^\S*\s/, '');
    if (end < entry.body.length) s = s.replace(/\s\S*$/, '') + '…';
    return s;
  }

  function paint(card, terms, entry) {
    if (card._title) card._title.innerHTML = mark(card._titleText, terms);
    if (!card._summary) return;
    card._summary.classList.remove('is-snippet');
    if (terms.length && entry) {
      // If the summary doesn't mention the query, show where the body does.
      var inSummary = terms.some(function (t) { return card._summaryText.toLowerCase().indexOf(t) !== -1; });
      var snip = inSummary ? null : snippet(entry, terms);
      if (snip) {
        card._summary.innerHTML = mark(snip, terms);
        card._summary.classList.add('is-snippet');
        return;
      }
    }
    card._summary.innerHTML = mark(card._summaryText, terms);
  }

  // The featured post's grid card only shows while filtering; otherwise it
  // already sits in the featured slot above the grid.
  function tagOk(card, filtering) {
    if (!filtering && card.hasAttribute('data-featured')) return false;
    if (activeTag === 'all') return true;
    var tags = ' ' + (card.getAttribute('data-tags') || '') + ' ';
    return tags.indexOf(' ' + activeTag + ' ') !== -1;
  }

  // Mirror the filter state in the URL so it survives back/forward and can be shared.
  function syncUrl(q) {
    if (!window.history || !history.replaceState) return;
    var params = new URLSearchParams(location.search);
    if (q) params.set('q', q); else params.delete('q');
    if (activeTag !== 'all') params.set('tag', activeTag); else params.delete('tag');
    var qs = params.toString();
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
  }

  function finish(shown, q) {
    if (empty) empty.hidden = shown !== 0;
    if (countEl) countEl.textContent = shown + (shown === 1 ? ' post' : ' posts');
    // The featured pick is a curated "start here"; hide it once a filter narrows the list.
    if (featuredWrap) featuredWrap.style.display = (activeTag !== 'all' || q) ? 'none' : '';
    syncUrl(q);
  }

  function apply() {
    var raw = input ? input.value.trim() : '';
    var q = raw.toLowerCase();
    if (!q) {
      var shown = 0;
      for (var i = 0; i < cards.length; i++) {
        var ok = tagOk(cards[i], activeTag !== 'all');
        cards[i].hidden = !ok;
        paint(cards[i], [], null);
        if (ok) shown++;
      }
      finish(shown, '');
      return;
    }
    load(function (idx) {
      // Query may have changed while the index was loading.
      if (input.value.trim().toLowerCase() !== q) return;
      var terms = q.split(/\s+/);
      var shown = 0;
      for (var i = 0; i < cards.length; i++) {
        var card = cards[i];
        var ok = tagOk(card, true);
        var entry = idx[card.getAttribute('data-url')];
        if (ok) {
          var hay = entry ? entry.hay : card.textContent.toLowerCase();
          for (var t = 0; t < terms.length; t++) {
            if (hay.indexOf(terms[t]) === -1) { ok = false; break; }
          }
        }
        card.hidden = !ok;
        paint(card, ok ? terms : [], entry);
        if (ok) shown++;
      }
      finish(shown, raw);
    });
  }

  function selectTag(tag) {
    var match = null;
    chips.forEach(function (c) {
      var on = c.getAttribute('data-tag') === tag;
      c.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (on) match = c;
    });
    // A ?tag= that isn't one of the top-tag chips gets a chip of its own.
    if (!match && filters) {
      match = document.createElement('button');
      match.className = 'chip';
      match.type = 'button';
      match.setAttribute('data-tag', tag);
      match.setAttribute('aria-pressed', 'true');
      match.textContent = tag;
      filters.appendChild(match);
      bindChip(match);
      chips.push(match);
    }
    activeTag = tag;
  }

  function bindChip(chip) {
    chip.addEventListener('click', function () {
      selectTag(chip.getAttribute('data-tag'));
      apply();
    });
  }

  if (input) {
    input.addEventListener('input', apply);
    input.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      if (input.value) { input.value = ''; apply(); } else { input.blur(); }
    });
    // "/" focuses search from anywhere on the page (unless already typing).
    document.addEventListener('keydown', function (e) {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      var t = e.target;
      if (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      e.preventDefault();
      input.focus();
      input.select();
    });
  }
  chips.forEach(bindChip);

  var params = new URLSearchParams(location.search);
  if (params.get('tag')) selectTag(params.get('tag'));
  if (input && params.get('q')) input.value = params.get('q');
  apply();
})();
