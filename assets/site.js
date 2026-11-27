  /* Audit fix G11: hero schematic zoom toggle. */
  (function () {
    document.querySelectorAll('.diagram-zoom').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var wrap = document.getElementById(btn.getAttribute('aria-controls'));
        if (!wrap) return;
        var zoomed = wrap.classList.toggle('zoomed');
        btn.setAttribute('aria-expanded', zoomed ? 'true' : 'false');
        btn.textContent = zoomed ? 'Zoom out' : 'Zoom in';
      });
    });
  })();
  (function () {
    var svg = document.querySelector('.schem-svg');
    if (!svg) return;
    var reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduceQuery.matches) return;

    var mainPath = document.getElementById('pulse-path');
    var optPath = document.getElementById('opt-path');
    var pulseMain = document.getElementById('pulse-main');
    var pulseOpt = document.getElementById('pulse-opt');
    var acq = document.getElementById('acq-plate');
    var acqLink = document.getElementById('acq-link-path');
    var pulseAcq = document.getElementById('pulse-acq');
    if (!mainPath || !optPath || !pulseMain || !pulseOpt || !acq || !acqLink || !pulseAcq) return;
    pulseAcq.style.visibility = 'hidden';

    var nodeEls = Array.prototype.slice.call(svg.querySelectorAll('.node'));
    var centers = nodeEls.map(function (n) {
      var m = /translate\(([-\d.]+)[ ,]+([-\d.]+)\)/.exec(n.getAttribute('transform') || '');
      return m ? { x: parseFloat(m[1]), y: parseFloat(m[2]) } : { x: 0, y: 0 };
    });

    var L = mainPath.getTotalLength();
    var optL = optPath.getTotalLength();
    var nodeAt = centers.map(function (c) {
      var best = 0, bestD = Infinity, steps = 500, i, l, p, dx, dy, d;
      for (i = 0; i <= steps; i++) {
        l = L * i / steps;
        p = mainPath.getPointAtLength(l);
        dx = p.x - c.x; dy = p.y - c.y; d = dx * dx + dy * dy;
        if (d < bestD) { bestD = d; best = l; }
      }
      return best;
    });

    var MAIN_MS = 1867, OPT_MS = 407, LIT_SPAN = 34;
    var ACQ_MS = 347, acqLen = acqLink.getTotalLength(), acqAnimStart = null;
    function randJourneys() { return 8 + Math.floor(Math.random() * 5); }
    var nextAcq = randJourneys();
    var elapsed = 0, lastTs = null, lastLap = 0, raf = null, running = false;

    function frame(ts) {
      if (!running) { raf = null; lastTs = null; return; }
      if (lastTs === null) lastTs = ts;
      elapsed += Math.min(ts - lastTs, 100);
      lastTs = ts;
      var t = elapsed;

      var prog = (t % MAIN_MS) / MAIN_MS * L;
      var lap = Math.floor(t / MAIN_MS);
      var p = mainPath.getPointAtLength(prog);
      pulseMain.setAttribute('cx', p.x.toFixed(1));
      pulseMain.setAttribute('cy', p.y.toFixed(1));

      var po = optPath.getPointAtLength((t % OPT_MS) / OPT_MS * optL);
      pulseOpt.setAttribute('cx', po.x.toFixed(1));
      pulseOpt.setAttribute('cy', po.y.toFixed(1));

      nodeAt.forEach(function (nl, i) {
        var d = Math.abs(prog - nl);
        if (d > L / 2) d = L - d;
        nodeEls[i].classList.toggle('lit', d < LIT_SPAN);
      });

      if (acqAnimStart !== null) {
        var ap = (t - acqAnimStart) / ACQ_MS;
        if (ap >= 1) {
          acqAnimStart = null;
          pulseAcq.style.visibility = 'hidden';
          acqLink.classList.remove('active');
          acq.classList.add('lit');
          window.setTimeout(function () { acq.classList.remove('lit'); }, 1900);
        } else {
          var pp = acqLink.getPointAtLength(ap * acqLen);
          pulseAcq.setAttribute('cx', pp.x.toFixed(1));
          pulseAcq.setAttribute('cy', pp.y.toFixed(1));
        }
      }

      if (lap !== lastLap) {
        lastLap = lap;
        if (lap >= nextAcq && acqAnimStart === null) {
          acqAnimStart = t;
          pulseAcq.style.visibility = 'visible';
          acqLink.classList.add('active');
          nextAcq = lap + randJourneys();
        }
      }
      raf = window.requestAnimationFrame(frame);
    }

    function play() {
      if (reduceQuery.matches) return;
      running = true;
      svg.classList.add('live');
      if (!raf) raf = window.requestAnimationFrame(frame);
    }
    function pause() {
      running = false;
      if (raf) window.cancelAnimationFrame(raf);
      raf = null; lastTs = null;
    }

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) play(); else pause();
      }, { threshold: 0.12 });
      io.observe(svg);
    } else {
      play();
    }

    if (typeof reduceQuery.addEventListener === 'function') {
      reduceQuery.addEventListener('change', function (e) {
        if (e.matches) { pause(); svg.classList.remove('live'); }
      });
    }
  })();