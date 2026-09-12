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
  /* Geometry is always computed LTR (svg direction="ltr") so text-anchor is
     unambiguous. The time axis is mirrored by hand: earliest year on the RIGHT,
     value axis on the right, matching right-to-left reading order. */

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(v, hi)); }

  function renderLine(cfg, width) {
    var height = Math.max(250, Math.min(Math.round(width * 0.54), 420));
    var padT = 26;
    var padB = 40;
    var padR = 52;   /* value axis lives here, on the right */
    var padL = 14;

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
      return right - (x - xMin) / (xMax - xMin) * plotW;
    }
    function Y(y) { return base - (y / divide) / yTop * plotH; }

    var svg = [];
    svg.push('<svg viewBox="0 0 ' + width + ' ' + height + '" direction="ltr" role="img" aria-label="' +
      esc(cfg.alt || cfg.title || '') + '">');

    ticks.forEach(function (t) {
      var y = base - (t / yTop) * plotH;
      svg.push('<line class="ip-grid-line" x1="' + left + '" y1="' + y +
        '" x2="' + right + '" y2="' + y + '"/>');
      svg.push('<text class="ip-tick" x="' + (right + 8) + '" y="' + (y + 4) +
        '" text-anchor="start">' + num(t, cfg.decimals || 0) + '</text>');
    });

    var xTicks = cfg.xTicks && cfg.xTicks.length ? cfg.xTicks : [xMin, xMax];
    xTicks.forEach(function (t) {
      svg.push('<text class="ip-tick" x="' + clamp(X(t), left + 14, right - 14) +
        '" y="' + (height - 14) + '" text-anchor="middle">' + fa(t) + '</text>');
    });
    svg.push('<line class="ip-axis-line" x1="' + left + '" y1="' + base +
      '" x2="' + right + '" y2="' + base + '"/>');

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

    var hasHl = cfg.hlFrom != null && cfg.hlTo != null;

    svg.push('<path class="' + (hasHl ? 'ip-series-area' : 'ip-series-hl-area') +
      '" d="' + areaFor(pts) + '"/>');
    svg.push('<path class="' + (hasHl ? 'ip-series-line' : 'ip-series-hl') +
      '" d="' + pathFor(pts) + '" data-measure="1"/>');

    if (hasHl) {
      var seg = pts.filter(function (p) { return p[0] >= cfg.hlFrom && p[0] <= cfg.hlTo; });
      if (seg.length === 1) {
        svg.push('<circle class="ip-dot" cx="' + X(seg[0][0]) + '" cy="' + Y(seg[0][1]) + '" r="5"/>');
      } else if (seg.length > 1) {
        svg.push('<path class="ip-series-hl-area" d="' + areaFor(seg) + '"/>');
        svg.push('<path class="ip-series-hl" d="' + pathFor(seg) + '"/>');
        var tip = seg[seg.length - 1];
        svg.push('<circle class="ip-dot" cx="' + X(tip[0]) + '" cy="' + Y(tip[1]) + '" r="4.5"/>');
      }
    }

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

  /* ------------------------------------------------------------ bar charts */

  function renderBar(cfg, width) {
    var bars = cfg.bars || [];
    if (!bars.length) return '';
    var height = Math.max(250, Math.min(Math.round(width * 0.52), 400));
    var padT = 32;
    var padB = cfg.hasSublabels ? 56 : 42;
    var padR = 52;
    var padL = 14;
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
      svg.push('<text class="ip-tick" x="' + (right + 8) + '" y="' + (y + 4) +
        '" text-anchor="start">' + num(t, cfg.decimals || 0) + '</text>');
    });

    /* earliest / first item on the right */
    bars.forEach(function (b, i) {
      var cx = right - (i + 0.5) * slot;
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

  function draw(host, animate) {
    var cfg = charts[host.getAttribute('data-chart-id')];
    if (!cfg) return;
    var width = Math.max(280, Math.round(host.getBoundingClientRect().width) || 600);
    cfg._width = width;
    host.innerHTML = cfg.type === 'bar' ? renderBar(cfg, width) : renderLine(cfg, width);

    if (animate && !reduceMotion) {
      var line = host.querySelector('[data-measure]');
      if (line && line.getTotalLength) {
        var len = Math.ceil(line.getTotalLength());
        host.style.setProperty('--ip-len', len);
        line.style.strokeDasharray = len;
        var hl = host.querySelector('.ip-series-hl');
        if (hl && hl.getTotalLength) {
          var hlen = Math.ceil(hl.getTotalLength());
          hl.style.strokeDasharray = hlen;
          hl.style.strokeDashoffset = hlen;
        }
      }
      host.setAttribute('data-anim', 'pending');
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          var h = host.querySelector('.ip-series-hl');
          if (h) h.style.strokeDashoffset = 0;
          host.setAttribute('data-anim', 'run');
        });
      });
    }
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

    /* animate when scrolled into view, once */
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
    } else {
      hosts.forEach(function (h) {
        var cfg = charts[h.getAttribute('data-chart-id')];
        if (cfg) cfg._drawn = true;
      });
    }

    /* redraw on width change */
    var timer;
    function onResize() {
      clearTimeout(timer);
      timer = setTimeout(function () {
        hosts.forEach(function (host) {
          var cfg = charts[host.getAttribute('data-chart-id')];
          if (!cfg) return;
          var w = Math.round(host.getBoundingClientRect().width);
          if (Math.abs(w - (cfg._width || 0)) > 8) draw(host, false);
        });
      }, 180);
    }
    window.addEventListener('resize', onResize);
  }

  /* ------------------------------------------------------------- scrolly */

  function initScrolly() {
    var blocks = [].slice.call(document.querySelectorAll('.ip-scrolly'));
    blocks.forEach(function (block) {
      var steps = [].slice.call(block.querySelectorAll('.ip-step'));
      var host = block.querySelector('.ip-chart[data-chart-id]');
      var caption = block.querySelector('.ip-scrolly-caption');
      if (!steps.length) return;

      function activate(step) {
        steps.forEach(function (s) { s.classList.toggle('is-active', s === step); });
        if (caption) caption.textContent = step.getAttribute('data-caption') || '';
        if (!host) return;
        var cfg = charts[host.getAttribute('data-chart-id')];
        if (!cfg) return;
        var from = step.getAttribute('data-from');
        var to = step.getAttribute('data-to');
        cfg.hlFrom = from === null ? null : +from;
        cfg.hlTo = to === null ? null : +to;
        draw(host, false);
      }

      if (!('IntersectionObserver' in window)) {
        activate(steps[0]);
        return;
      }

      var io = new IntersectionObserver(function (entries) {
        var best = null;
        entries.forEach(function (entry) {
          if (entry.isIntersecting && (!best || entry.intersectionRatio > best.intersectionRatio)) {
            best = entry;
          }
        });
        if (best) activate(best.target);
      }, {
        rootMargin: '-45% 0px -45% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1]
      });

      steps.forEach(function (s) { io.observe(s); });
      activate(steps[0]);
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
