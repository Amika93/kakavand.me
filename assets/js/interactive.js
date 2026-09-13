/* =============================================================================
   Interactive long-form post runtime.
   Charts (inline SVG), scroll-linked steps, reveal cards, prediction widget.
   No external dependencies.
   ========================================================================== */

(function () {
  'use strict';

  var FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

  function fa(value) {
    return String(value).replace(/[0-9]/g, function (d) {
      return FA_DIGITS.charAt(+d);
    });
  }

  function num(value, decimals) {
    var fixed = (decimals ? value.toFixed(decimals) : Math.round(value).toString());
    var parts = fixed.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '٬');
    return fa(parts.join('٫'));
  }

  function esc(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------- scales */

  function niceStep(rough) {
    var exp = Math.floor(Math.log(rough) / Math.LN10);
    var pow = Math.pow(10, exp);
    var frac = rough / pow;
    var nice = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 2.5 ? 2.5 : frac <= 5 ? 5 : 10;
    return nice * pow;
  }

  function axisTicks(max, target) {
    if (!(max > 0)) return [0, 1];
    var step = niceStep(max / (target || 4));
    var ticks = [];
    for (var v = 0; v <= max * 1.0000001; v += step) ticks.push(v);
    if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
    return ticks;
  }

  /* ----------------------------------------------------------- line charts */
  /* Charts read left-to-right even though the page is RTL: time runs forward
     to the right and the value axis sits on the left, which is how a time
     series is read. svg direction="ltr" keeps text-anchor unambiguous. */

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(v, hi)); }

  function renderLine(cfg, width) {
    var height = Math.max(250, Math.min(Math.round(width * 0.54), 420));
    var padT = 26;
    var padB = 40;
    var padR = 16;
    var padL = 52;   /* value axis lives here, on the left */

    var pts = cfg.points.slice().sort(function (a, b) { return a[0] - b[0]; });
    var xs = pts.map(function (p) { return p[0]; });
    var ys = pts.map(function (p) { return p[1]; });
    var xMin = Math.min.apply(null, xs);
    var xMax = Math.max.apply(null, xs);
    var divide = cfg.divide || 1;
    var yTopRaw = cfg.yMax != null ? cfg.yMax : Math.max.apply(null, ys);
    var ticks = axisTicks(yTopRaw / divide, cfg.tickCount || 4);
    var yTop = ticks[ticks.length - 1];

    var plotW = width - padL - padR;
    var plotH = height - padT - padB;
    var left = padL;
    var right = padL + plotW;
    var base = padT + plotH;

    function X(x) {
      if (xMax === xMin) return left + plotW / 2;
      return left + (x - xMin) / (xMax - xMin) * plotW;
    }
    function Y(y) { return base - (y / divide) / yTop * plotH; }

    function pathFor(list) {
      return list.map(function (p, i) {
        return (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1);
      }).join(' ');
    }

    function areaFor(list) {
      if (!list.length) return '';
      return pathFor(list) +
        ' L' + X(list[list.length - 1][0]).toFixed(1) + ' ' + base.toFixed(1) +
        ' L' + X(list[0][0]).toFixed(1) + ' ' + base.toFixed(1) + ' Z';
    }

    /* stash the scales so the highlight can be moved without a re-render */
    cfg._pts = pts;
    cfg._xMin = xMin;
    cfg._xMax = xMax;
    cfg._X = X;
    cfg._Y = Y;
    cfg._path = pathFor;
    cfg._area = areaFor;

    var svg = [];
    svg.push('<svg viewBox="0 0 ' + width + ' ' + height + '" direction="ltr" role="img" aria-label="' +
      esc(cfg.alt || cfg.title || '') + '">');

    ticks.forEach(function (t) {
      var y = base - (t / yTop) * plotH;
      svg.push('<line class="ip-grid-line" x1="' + left + '" y1="' + y +
        '" x2="' + right + '" y2="' + y + '"/>');
      svg.push('<text class="ip-tick" x="' + (left - 8) + '" y="' + (y + 4) +
        '" text-anchor="end">' + num(t, cfg.decimals || 0) + '</text>');
    });

    var xTicks = cfg.xTicks && cfg.xTicks.length ? cfg.xTicks : [xMin, xMax];
    xTicks.forEach(function (t) {
      svg.push('<text class="ip-tick" x="' + clamp(X(t), left + 14, right - 14) +
        '" y="' + (height - 14) + '" text-anchor="middle">' + fa(t) + '</text>');
    });
    svg.push('<line class="ip-axis-line" x1="' + left + '" y1="' + base +
      '" x2="' + right + '" y2="' + base + '"/>');

    /* full series, muted; the highlight rides on top and is updated in place */
    svg.push('<path class="ip-series-area" d="' + areaFor(pts) + '"/>');
    svg.push('<path class="ip-series-line" d="' + pathFor(pts) + '" data-measure="1"/>');
    svg.push('<path class="ip-series-hl-area" data-hl="area" d=""/>');
    svg.push('<path class="ip-series-hl" data-hl="line" d=""/>');
    svg.push('<circle class="ip-dot" data-hl="dot" r="4.5" cx="-99" cy="-99" opacity="0"/>');

    (cfg.annotations || []).forEach(function (a) {
      var match = pts.filter(function (p) { return p[0] === a.x; })[0];
      if (!match) return;
      var x = X(match[0]);
      var y = Y(match[1]);
      var dy = a.dy != null ? a.dy : -16;
      var half = String(a.text).length * 3.6 + 6;
      var tx = clamp(x, left + half, right - half);
      svg.push('<line class="ip-anno-line" x1="' + x + '" y1="' + y +
        '" x2="' + x + '" y2="' + (y + dy) + '"/>');
      svg.push('<circle class="ip-dot" cx="' + x + '" cy="' + y + '" r="3.5"/>');
      svg.push('<text class="ip-anno-text' + (a.strong ? ' is-strong' : '') +
        '" x="' + tx + '" y="' + (y + dy - 5) +
        '" text-anchor="middle" direction="rtl">' + esc(a.text) + '</text>');
    });

    svg.push('</svg>');
    return svg.join('');
  }

  /* Moves the accent band without touching the DOM structure, so stepping
     through a scrolly never re-renders (and never flickers) the chart. */
  function updateHighlight(host, cfg) {
    if (!cfg._pts) return;
    var area = host.querySelector('[data-hl="area"]');
    var line = host.querySelector('[data-hl="line"]');
    var dot = host.querySelector('[data-hl="dot"]');
    if (!area || !line || !dot) return;

    var from = cfg.hlFrom;
    var to = cfg.hlTo;
    if (from == null || to == null) { from = cfg._xMin; to = cfg._xMax; }

    var seg = cfg._pts.filter(function (p) { return p[0] >= from && p[0] <= to; });
    if (!seg.length) {
      area.setAttribute('d', '');
      line.setAttribute('d', '');
      dot.setAttribute('opacity', '0');
      return;
    }
    area.setAttribute('d', cfg._area(seg));
    line.setAttribute('d', cfg._path(seg));
    var tip = seg[seg.length - 1];
    dot.setAttribute('cx', cfg._X(tip[0]).toFixed(1));
    dot.setAttribute('cy', cfg._Y(tip[1]).toFixed(1));
    dot.setAttribute('opacity', '1');
  }

  /* ------------------------------------------------------------ bar charts */

  function renderBar(cfg, width) {
    var bars = cfg.bars || [];
    if (!bars.length) return '';
    var height = Math.max(250, Math.min(Math.round(width * 0.52), 400));
    var padT = 32;
    var padB = cfg.hasSublabels ? 56 : 42;
    var padR = 16;
    var padL = 52;   /* value axis on the left, same as the line charts */
    var divide = cfg.divide || 1;
    var maxVal = Math.max.apply(null, bars.map(function (b) { return b.value; }));
    var ticks = axisTicks(maxVal / divide, cfg.tickCount || 4);
    var yTop = ticks[ticks.length - 1];
    var plotW = width - padL - padR;
    var plotH = height - padT - padB;
    var left = padL;
    var right = padL + plotW;
    var base = padT + plotH;
    var slot = plotW / bars.length;
    var barW = Math.min(slot * 0.6, 58);

    var svg = [];
    svg.push('<svg viewBox="0 0 ' + width + ' ' + height + '" direction="ltr" role="img" aria-label="' +
      esc(cfg.alt || cfg.title || '') + '">');

    ticks.forEach(function (t) {
      var y = base - (t / yTop) * plotH;
      svg.push('<line class="ip-grid-line" x1="' + left + '" y1="' + y +
        '" x2="' + right + '" y2="' + y + '"/>');
      svg.push('<text class="ip-tick" x="' + (left - 8) + '" y="' + (y + 4) +
        '" text-anchor="end">' + num(t, cfg.decimals || 0) + '</text>');
    });

    /* earliest / first item on the left */
    bars.forEach(function (b, i) {
      var cx = left + (i + 0.5) * slot;
      var h = (b.value / divide) / yTop * plotH;
      var y = base - h;
      var cls = 'ip-bar' + (b.hl ? ' is-hl' : '') + (b.alt ? ' is-alt' : '');
      svg.push('<rect class="' + cls + '" x="' + (cx - barW / 2) + '" y="' + y +
        '" width="' + barW + '" height="' + Math.max(h, 1) + '" rx="3" style="transition-delay:' +
        (i * 55) + 'ms"/>');
      if (b.showValue !== false) {
        var vd = cfg.valueDecimals != null ? cfg.valueDecimals : (cfg.decimals || 0);
        svg.push('<text class="ip-value-label" x="' + cx + '" y="' + (y - 8) +
          '" text-anchor="middle">' + num(b.value / divide, vd) +
          (cfg.valueSuffix ? esc(cfg.valueSuffix) : '') + '</text>');
      }
      svg.push('<text class="ip-bar-label" x="' + cx + '" y="' +
        (base + 20) + '" text-anchor="middle" direction="rtl">' + fa(b.label) + '</text>');
      if (b.sublabel) {
        svg.push('<text class="ip-bar-label" x="' + cx + '" y="' + (base + 38) +
          '" text-anchor="middle" direction="rtl">' + esc(b.sublabel) + '</text>');
      }
    });

    svg.push('<line class="ip-axis-line" x1="' + left + '" y1="' + base +
      '" x2="' + right + '" y2="' + base + '"/>');
    svg.push('</svg>');
    return svg.join('');
  }

  /* --------------------------------------------------------- chart plumbing */

  var charts = {};

  function animateLines(host) {
    var lines = [];
    var main = host.querySelector('[data-measure]');
    var hl = host.querySelector('.ip-series-hl');
    if (main) lines.push(main);
    if (hl) lines.push(hl);

    lines.forEach(function (l) {
      if (!l.getTotalLength) return;
      var len = Math.ceil(l.getTotalLength());
      if (!len) return;
      l.style.strokeDasharray = len;
      l.style.strokeDashoffset = len;
    });

    host.setAttribute('data-anim', 'pending');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        lines.forEach(function (l) { l.style.strokeDashoffset = '0'; });
        host.setAttribute('data-anim', 'run');
        /* Clear the dash once the reveal finishes, otherwise a later
           highlight change would be clipped to the old path length. */
        setTimeout(function () {
          lines.forEach(function (l) {
            l.style.strokeDasharray = '';
            l.style.strokeDashoffset = '';
          });
          host.removeAttribute('data-anim');
        }, 1800);
      });
    });
  }

  function draw(host, animate) {
    var cfg = charts[host.getAttribute('data-chart-id')];
    if (!cfg) return;
    var width = Math.max(280, Math.round(host.getBoundingClientRect().width) || 600);
    cfg._width = width;
    host.innerHTML = cfg.type === 'bar' ? renderBar(cfg, width) : renderLine(cfg, width);
    if (cfg.type !== 'bar') updateHighlight(host, cfg);
    if (animate && !reduceMotion) {
      if (cfg.type === 'bar') {
        host.setAttribute('data-anim', 'pending');
        requestAnimationFrame(function () {
          requestAnimationFrame(function () { host.setAttribute('data-anim', 'run'); });
        });
      } else {
        animateLines(host);
      }
    }
  }

  /* Highlight-only update: no re-render, so stepping never flickers. */
  function setRange(host, from, to) {
    var cfg = charts[host.getAttribute('data-chart-id')];
    if (!cfg || cfg.type === 'bar') return;
    if (cfg.hlFrom === from && cfg.hlTo === to) return;
    cfg.hlFrom = from;
    cfg.hlTo = to;
    updateHighlight(host, cfg);
  }

  function initCharts() {
    var hosts = [].slice.call(document.querySelectorAll('.ip-chart[data-chart-id]'));
    if (!hosts.length) return;

    hosts.forEach(function (host) {
      var id = host.getAttribute('data-chart-id');
      var script = document.getElementById('ip-data-' + id);
      if (!script) return;
      try {
        charts[id] = JSON.parse(script.textContent);
      } catch (err) {
        return;
      }
      charts[id]._drawn = false;
      draw(host, false);
    });

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var host = entry.target;
          var cfg = charts[host.getAttribute('data-chart-id')];
          if (cfg && !cfg._drawn) {
            cfg._drawn = true;
            draw(host, true);
          }
          io.unobserve(host);
        });
      }, { threshold: 0.25 });
      hosts.forEach(function (h) { io.observe(h); });
    }

    var timer;
    window.addEventListener('resize', function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        hosts.forEach(function (host) {
          var cfg = charts[host.getAttribute('data-chart-id')];
          if (!cfg) return;
          var w = Math.round(host.getBoundingClientRect().width);
          if (Math.abs(w - (cfg._width || 0)) > 8) draw(host, false);
        });
      }, 180);
    });
  }

  /* ------------------------------------------------------------- scrolly */
  /* Exactly one step is active at any time: the one crossing the reading
     line. Driven by scroll position rather than IntersectionObserver, so the
     paragraph and the chart change on the same frame at every screen size. */

  function initScrolly() {
    var blocks = [].slice.call(document.querySelectorAll('.ip-scrolly'));
    if (!blocks.length) return;

    var stacked = window.matchMedia('(max-width: 859px)');

    blocks.forEach(function (block) {
      var steps = [].slice.call(block.querySelectorAll('.ip-step'));
      var host = block.querySelector('.ip-chart[data-chart-id]');
      var sticky = block.querySelector('.ip-scrolly-sticky');
      var caption = block.querySelector('.ip-scrolly-caption');
      if (!steps.length) return;

      var current = -1;
      var ticking = false;

      /* Where a step counts as "being read". On the stacked layout the chart
         sits on top, so aim below it instead of at the bare middle. */
      function readingLine() {
        var vh = window.innerHeight;
        if (!stacked.matches || !sticky) return vh * 0.5;
        var bottom = sticky.getBoundingClientRect().bottom;
        var top = Math.max(0, Math.min(bottom, vh));
        return top + (vh - top) * 0.42;
      }

      function pick() {
        var line = readingLine();
        var best = 0;
        var bestDist = Infinity;
        for (var i = 0; i < steps.length; i++) {
          var r = steps[i].getBoundingClientRect();
          if (r.top <= line && r.bottom >= line) return i;
          var d = r.top > line ? r.top - line : line - r.bottom;
          if (d < bestDist) { bestDist = d; best = i; }
        }
        return best;
      }

      function apply(i) {
        if (i === current) return;
        current = i;
        var step = steps[i];
        steps.forEach(function (s) { s.classList.toggle('is-active', s === step); });
        if (caption) caption.textContent = step.getAttribute('data-caption') || '';
        if (!host) return;
        var from = step.getAttribute('data-from');
        var to = step.getAttribute('data-to');
        setRange(host, from === null ? null : +from, to === null ? null : +to);
      }

      function onScroll() {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () {
          apply(pick());
          ticking = false;
        });
      }

      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
      apply(pick());
    });
  }

  /* -------------------------------------------------------------- reveal */

  function initReveals() {
    [].slice.call(document.querySelectorAll('.ip-reveal')).forEach(function (card) {
      var btn = card.querySelector('.ip-reveal-btn');
      var body = card.querySelector('.ip-reveal-body');
      if (!btn || !body) return;
      btn.addEventListener('click', function () {
        body.hidden = false;
        card.classList.add('is-open');
        btn.setAttribute('aria-expanded', 'true');
      });
    });
  }

  /* ------------------------------------------------------------- predict */

  function storeKey(name) { return 'ip-predict:' + name; }

  function readChoice(name) {
    try { return window.localStorage.getItem(storeKey(name)); } catch (e) { return null; }
  }

  function writeChoice(name, value) {
    try { window.localStorage.setItem(storeKey(name), value); } catch (e) { /* ignore */ }
  }

  function showResult(name, choice) {
    [].slice.call(document.querySelectorAll('.ip-verdict[data-predict="' + name + '"]'))
      .forEach(function (box) {
        var panes = [].slice.call(box.querySelectorAll('[data-option]'));
        var matched = false;
        panes.forEach(function (pane) {
          var mine = pane.getAttribute('data-option') === choice;
          pane.hidden = !mine;
          if (mine) matched = true;
        });
        var fallback = box.querySelector('[data-fallback]');
        if (fallback) fallback.hidden = matched;
        var label = box.querySelector('[data-choice-label]');
        if (label) {
          var btn = document.querySelector('.ip-option[data-option="' + choice + '"]');
          label.textContent = btn ? btn.getAttribute('data-short') || btn.textContent.trim() : '';
          label.parentNode.hidden = !btn;
        }
      });
  }

  function initPredict() {
    [].slice.call(document.querySelectorAll('.ip-predict')).forEach(function (widget) {
      var name = widget.getAttribute('data-predict') || 'default';
      var options = [].slice.call(widget.querySelectorAll('.ip-option'));
      var ack = widget.querySelector('.ip-predict-ack');

      function select(value, fromStore) {
        options.forEach(function (o) {
          o.setAttribute('aria-pressed', String(o.getAttribute('data-option') === value));
        });
        if (ack) ack.hidden = false;
        if (!fromStore) writeChoice(name, value);
        showResult(name, value);
      }

      options.forEach(function (o) {
        o.addEventListener('click', function () { select(o.getAttribute('data-option'), false); });
      });

      var saved = readChoice(name);
      if (saved) select(saved, true);
    });
  }

  /* ------------------------------------------------------------ progress */

  function initProgress() {
    var bar = document.querySelector('.ip-progress span');
    if (!bar) return;
    var article = document.querySelector('.ip-post');
    if (!article) return;
    var ticking = false;

    function update() {
      var rect = article.getBoundingClientRect();
      var total = rect.height - window.innerHeight;
      var done = total > 0 ? Math.min(Math.max(-rect.top / total, 0), 1) : 0;
      bar.style.width = (done * 100).toFixed(2) + '%';
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ---------------------------------------------------------------- boot */

  function boot() {
    initCharts();
    initScrolly();
    initReveals();
    initPredict();
    initProgress();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
