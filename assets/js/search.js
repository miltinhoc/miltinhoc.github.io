(function () {
  var input = document.getElementById('search');
  if (!input) return;
  var cards = Array.prototype.slice.call(document.querySelectorAll('.post-card'));
  var empty = document.getElementById('search-empty');
  var index = null;
  var pending = null;

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

  function apply(q) {
    q = q.trim().toLowerCase();
    if (!q) {
      for (var i = 0; i < cards.length; i++) cards[i].style.display = '';
      if (empty) empty.hidden = true;
      return;
    }
    load(function (idx) {
      // Query may have changed while the index was loading.
      if (input.value.trim().toLowerCase() !== q) return;
      var terms = q.split(/\s+/);
      var shown = 0;
      for (var i = 0; i < cards.length; i++) {
        var card = cards[i];
        var entry = idx[card.getAttribute('data-url')];
        var hay = entry ? entry.text : card.textContent.toLowerCase();
        var ok = true;
        for (var t = 0; t < terms.length; t++) {
          if (hay.indexOf(terms[t]) === -1) { ok = false; break; }
        }
        card.style.display = ok ? '' : 'none';
        if (ok) shown++;
      }
      if (empty) empty.hidden = shown !== 0;
    });
  }

  input.addEventListener('input', function () { apply(input.value); });
})();
