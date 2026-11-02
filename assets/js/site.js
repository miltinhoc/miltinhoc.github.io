// Theme toggle. Fires a `themechange` event so theme-aware widgets
// (Mermaid diagrams, giscus) can repaint.
(function () {
  var btn = document.querySelector('.theme-toggle');
  if (!btn) return;
  var meta = document.querySelector('meta[name="theme-color"]');
  btn.addEventListener('click', function () {
    var cur = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    var next = cur === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
    if (meta) meta.setAttribute('content', next === 'light' ? '#f7f7f9' : '#0d0d11');
    var giscus = document.querySelector('iframe.giscus-frame');
    if (giscus) giscus.contentWindow.postMessage({ giscus: { setConfig: { theme: next } } }, 'https://giscus.app');
    document.dispatchEvent(new CustomEvent('themechange', { detail: next }));
  });
})();

// TOC scroll-spy (sidebar only; the mobile TOC is a plain list).
(function () {
  var toc = document.querySelector('.toc');
  if (!toc) return;
  var links = toc.querySelectorAll('a');
  var map = new Map();
  links.forEach(function (a) {
    var el = document.getElementById(a.getAttribute('href').slice(1));
    if (el) map.set(el, a);
  });
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      var link = map.get(entry.target);
      if (!link || !entry.isIntersecting) return;
      links.forEach(function (l) { l.classList.remove('active'); });
      link.classList.add('active');
      if (toc.scrollHeight > toc.clientHeight) {
        var top = link.offsetTop;
        if (top < toc.scrollTop + 40) {
          toc.scrollTop = top - 40;
        } else if (top + link.offsetHeight > toc.scrollTop + toc.clientHeight - 40) {
          toc.scrollTop = top + link.offsetHeight - toc.clientHeight + 40;
        }
      }
    });
  }, { rootMargin: '-80px 0px -70% 0px', threshold: 0 });
  map.forEach(function (_, el) { io.observe(el); });
})();

// Mobile TOC: collapse again after jumping to a section.
(function () {
  var box = document.querySelector('.toc-mobile');
  if (!box) return;
  box.addEventListener('click', function (e) {
    if (e.target.closest('a')) box.open = false;
  });
})();

// Reading progress bar along the bottom edge of the sticky header.
(function () {
  var body = document.querySelector('.post-page .post-body');
  var header = document.querySelector('.site-header');
  if (!body || !header) return;
  var bar = document.createElement('div');
  bar.className = 'reading-progress';
  bar.setAttribute('aria-hidden', 'true');
  header.appendChild(bar);
  var queued = false;
  function update() {
    queued = false;
    var r = body.getBoundingClientRect();
    var total = r.height - window.innerHeight + header.offsetHeight;
    // Nothing to track when the whole post fits on screen.
    var p = total > 0 ? (header.offsetHeight - r.top) / total : 0;
    bar.style.transform = 'scaleX(' + Math.min(1, Math.max(0, p)) + ')';
  }
  function queue() { if (!queued) { queued = true; requestAnimationFrame(update); } }
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  update();
})();

// "#" anchor on hover for each section heading; clicking also copies the link.
(function () {
  var heads = document.querySelectorAll('.post-body :is(h2, h3, h4)[id]');
  heads.forEach(function (h) {
    var a = document.createElement('a');
    a.className = 'heading-anchor';
    a.href = '#' + h.id;
    a.setAttribute('aria-label', 'Link to this section');
    a.textContent = '#';
    a.addEventListener('click', function () {
      var url = location.href.split('#')[0] + '#' + h.id;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(function () {
          a.classList.add('copied');
          setTimeout(function () { a.classList.remove('copied'); }, 1400);
        }, function () {});
      }
    });
    h.appendChild(a);
  });
})();

// Click-to-zoom for screenshots and diagrams, in a native <dialog>
// (focus trap + Esc to close come for free).
(function () {
  var root = document.querySelector('.post-body');
  if (!root || typeof HTMLDialogElement === 'undefined') return;
  var dlg = document.createElement('dialog');
  dlg.className = 'lightbox';
  dlg.setAttribute('aria-label', 'Enlarged view');
  dlg.innerHTML = '<button class="lightbox-close" type="button" aria-label="Close">&times;</button><div class="lightbox-body"></div>';
  document.body.appendChild(dlg);
  var holder = dlg.querySelector('.lightbox-body');

  function zoomable(el) {
    var img = el.closest('img');
    if (img && root.contains(img) && !img.closest('a')) return img;
    var fig = el.closest('.diagram');
    if (fig && fig.querySelector('svg')) return fig;
    return null;
  }
  function open(target) {
    holder.innerHTML = '';
    var node;
    if (target.tagName === 'IMG') {
      node = new Image();
      node.src = target.currentSrc || target.src;
      node.alt = target.alt;
    } else {
      node = target.querySelector('svg').cloneNode(true);
      node.removeAttribute('style');
      node.removeAttribute('width');
      node.removeAttribute('height');
      holder.classList.add('is-diagram');
    }
    holder.appendChild(node);
    dlg.showModal();
  }

  root.querySelectorAll('img').forEach(function (img) {
    if (img.closest('a')) return;
    img.classList.add('zoomable');
    img.tabIndex = 0;
    img.setAttribute('role', 'button');
    img.setAttribute('aria-label', (img.alt ? img.alt + ' - ' : '') + 'enlarge image');
  });
  root.addEventListener('click', function (e) {
    var t = zoomable(e.target);
    if (t) open(t);
  });
  root.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var t = zoomable(e.target);
    if (t) { e.preventDefault(); open(t); }
  });
  // Any click closes it -- on the image, the backdrop, or the button.
  dlg.addEventListener('click', function () { dlg.close(); });
  dlg.addEventListener('close', function () {
    holder.innerHTML = '';
    holder.classList.remove('is-diagram');
  });
})();

// Mermaid diagrams (```mermaid fences). The library is only fetched on pages
// that have one, and diagrams re-render with the site palette on theme toggle.
(function () {
  var nodes = Array.prototype.slice.call(document.querySelectorAll('pre.mermaid'));
  if (!nodes.length) return;
  nodes.forEach(function (n) { n.setAttribute('data-src', n.textContent); });
  var css = function (name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  };
  import('https://cdn.jsdelivr.net/npm/mermaid@11.17.2/dist/mermaid.esm.min.mjs').then(function (mod) {
    var mermaid = mod.default;
    function render() {
      var dark = document.documentElement.getAttribute('data-theme') !== 'light';
      var bg = css('--bg'), card = css('--bg-card'), elev = css('--bg-elev');
      var fg = css('--fg'), dim = css('--fg-dim'), mute = css('--fg-mute'), accent = css('--accent');
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: 'base',
        fontFamily: css('--sans'),
        themeVariables: {
          darkMode: dark,
          background: bg,
          fontFamily: css('--sans'),
          fontSize: '15px',
          textColor: fg,
          lineColor: dim,
          primaryColor: elev,
          primaryTextColor: fg,
          primaryBorderColor: accent,
          secondaryColor: card,
          secondaryTextColor: fg,
          secondaryBorderColor: mute,
          tertiaryColor: card,
          tertiaryTextColor: fg,
          tertiaryBorderColor: mute,
          mainBkg: elev,
          nodeBorder: accent,
          clusterBkg: card,
          clusterBorder: mute,
          edgeLabelBackground: card,
          noteBkgColor: card,
          noteTextColor: fg,
          noteBorderColor: mute,
          actorBkg: elev,
          actorBorder: accent,
          actorTextColor: fg,
          actorLineColor: mute,
          signalColor: dim,
          signalTextColor: fg,
          labelBoxBkgColor: elev,
          labelBoxBorderColor: accent,
          labelTextColor: fg,
          loopTextColor: fg,
          activationBkgColor: card,
          activationBorderColor: accent,
          sequenceNumberColor: bg
        }
      });
      nodes.forEach(function (n) {
        n.removeAttribute('data-processed');
        n.textContent = n.getAttribute('data-src');
      });
      return mermaid.run({ nodes: nodes, suppressErrors: true });
    }
    render();
    document.addEventListener('themechange', render);
  }, function (err) {
    // CDN unreachable: leave the diagram source visible as a code block.
    console.warn('mermaid failed to load', err);
  });
})();

// Tags page: the tag cloud filters the sections below instead of jumping past
// it. The #t-<slug> hash stays the source of truth, so links from post pages,
// reloads and back/forward all land on the same filtered view.
(function () {
  var cloud = document.querySelector('.tags-page .tag-cloud');
  if (!cloud) return;
  var pills = Array.prototype.slice.call(cloud.querySelectorAll('a[data-tag]'));
  var sections = Array.prototype.slice.call(document.querySelectorAll('.tag-section[data-tag]'));
  var status = document.querySelector('.tag-status');

  function fromHash() {
    var h = decodeURIComponent(location.hash.slice(1));
    return sections.some(function (s) { return s.getAttribute('data-tag') === h; }) ? h : 'all';
  }
  function show(tag) {
    pills.forEach(function (p) {
      if (p.getAttribute('data-tag') === tag) p.setAttribute('aria-current', 'true');
      else p.removeAttribute('aria-current');
    });
    sections.forEach(function (s) {
      s.hidden = tag !== 'all' && s.getAttribute('data-tag') !== tag;
    });
    if (!status) return;
    status.textContent = '';
    status.hidden = tag === 'all';
    if (tag === 'all') return;
    var pill = cloud.querySelector('a[data-tag="' + tag + '"]');
    var name = document.createElement('strong');
    name.textContent = pill.firstChild.textContent;
    var reset = document.createElement('a');
    reset.href = '#all';
    reset.textContent = 'show all tags';
    status.append('Filtered by ', name, ' · ', reset);
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || !(cloud.contains(a) || (status && status.contains(a)))) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    var tag = a.getAttribute('data-tag') || 'all';
    if (tag === fromHash()) return;
    history.pushState(null, '', tag === 'all' ? location.pathname + location.search : '#' + tag);
    show(tag);
    // On phones the cloud fills the screen: bring the results up to meet the tap.
    if (tag !== 'all' && status.getBoundingClientRect().top > window.innerHeight * 0.6) {
      var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
      status.scrollIntoView({ block: 'start', behavior: still ? 'auto' : 'smooth' });
    }
  });
  window.addEventListener('popstate', function () { show(fromHash()); });

  var initial = fromHash();
  show(initial);
  // Arriving via #t-<slug>: the browser jumped to the heading, past the cloud.
  // Show the whole page from the top when the results still fit on screen
  // below the cloud; otherwise start at the "Filtered by" line.
  if (initial !== 'all') {
    requestAnimationFrame(function () {
      if (status.getBoundingClientRect().top + window.scrollY < window.innerHeight * 0.6) {
        window.scrollTo(0, 0);
      } else {
        status.scrollIntoView({ block: 'start' });
      }
    });
  }
})();
