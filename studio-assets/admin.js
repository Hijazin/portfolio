/* MH Insights admin dashboard. Talks to the API at window.MH_INSIGHTS_ENDPOINT (set in insights.js). */
(function () {
  'use strict';
  var EP = window.MH_INSIGHTS_ENDPOINT || 'https://agents.retainly.dev/mh-insights/';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var TK = 'mhi_admin_token';
  var state = { tab: 'overview', range: '30d', w: 'desktop', visOffset: 0, timers: [] };

  function store(k, v) { try { v === undefined ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch (e) {} }
  function load(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function flag(cc) {
    if (!cc || !/^[A-Z]{2}$/.test(cc)) return '🌐';
    return String.fromCodePoint(0x1F1E6 + cc.charCodeAt(0) - 65, 0x1F1E6 + cc.charCodeAt(1) - 65);
  }
  var regionNames = null;
  try { regionNames = new Intl.DisplayNames(['en'], { type: 'region' }); } catch (e) {}
  function countryName(cc, fallback) {
    if (fallback) return fallback;
    if (!cc || cc === '??') return 'Unknown';
    try { return regionNames ? regionNames.of(cc) : cc; } catch (e) { return cc; }
  }
  function dur(s) {
    s = Math.round(s || 0);
    if (s < 60) return s + 's';
    var m = Math.floor(s / 60), r = s % 60;
    if (m < 60) return m + 'm' + (r ? ' ' + r + 's' : '');
    return Math.floor(m / 60) + 'h ' + (m % 60) + 'm';
  }
  function num(n) { return Number(n || 0).toLocaleString('en'); }
  function when(ts) {
    var d = new Date(ts * 1000), now = new Date();
    var t = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (d.toDateString() === now.toDateString()) return 'Today ' + t;
    return d.toLocaleDateString([], { day: 'numeric', month: 'short' }) + ' ' + t;
  }
  function clock(ts) { return new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
  function rangeLabel() { var o = $('#range').selectedOptions[0]; return o ? o.textContent : ''; }

  /* ---------- API ---------- */
  function api(q, params) {
    var u = EP + 'stats.php?q=' + encodeURIComponent(q);
    Object.keys(params || {}).forEach(function (k) { u += '&' + k + '=' + encodeURIComponent(params[k]); });
    return fetch(u, { headers: { Authorization: 'Bearer ' + load(TK) }, cache: 'no-store' }).then(function (r) {
      if (r.status === 401) { logout(); throw new Error('auth'); }
      return r.json();
    });
  }

  /* ---------- auth ---------- */
  function showLogin() { $('#app').hidden = true; $('#login').hidden = false; setTimeout(function () { $('#pw').focus(); }, 30); }
  function showApp() { $('#login').hidden = true; $('#app').hidden = false; go(state.tab); }
  function logout() {
    store(TK); store('mhi_admin_exp');
    state.timers.forEach(clearInterval); state.timers = [];
    showLogin();
  }
  $('#login-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = $('#login-btn'), err = $('#login-error');
    btn.disabled = true; err.textContent = '';
    fetch(EP + 'login.php', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ password: $('#pw').value }) })
      .then(function (r) { return r.json().then(function (j) { return { s: r.status, j: j }; }); })
      .then(function (res) {
        if (res.j && res.j.ok) {
          store(TK, res.j.token); store('mhi_admin_exp', String(res.j.exp));
          $('#pw').value = ''; startTimers(); showApp();
        } else {
          err.textContent = res.s === 429 ? 'Too many attempts. Try again in 15 minutes.' : 'Wrong password.';
        }
      })
      .catch(function () { err.textContent = 'Could not reach the insights server.'; })
      .then(function () { btn.disabled = false; });
  });
  $('#logout').addEventListener('click', logout);

  /* ---------- tabs & range ---------- */
  $$('.mhx-tabs button').forEach(function (b) { b.addEventListener('click', function () { go(b.dataset.tab); }); });
  function go(tab) {
    state.tab = tab;
    $$('.mhx-tabs button').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.tab === tab)); });
    $$('[data-panel]').forEach(function (p) { p.hidden = p.dataset.panel !== tab; });
    try { history.replaceState(null, '', '#' + tab); } catch (e) {}
    refresh();
  }
  $('#range').addEventListener('change', function () { state.range = this.value; state.visOffset = 0; refresh(); });
  function refresh() {
    $$('[data-range-label]').forEach(function (el) { el.textContent = rangeLabel(); });
    if (state.tab === 'overview') { loadOnline(); loadOverview(); }
    else if (state.tab === 'clicks') loadClicks();
    else if (state.tab === 'visitors') { state.visOffset = 0; loadVisitors(false); }
    else if (state.tab === 'heatmap') loadHeatmapPaths();
  }
  function startTimers() {
    state.timers.forEach(clearInterval);
    state.timers = [
      setInterval(function () { if (!document.hidden && state.tab === 'overview') loadOnline(); }, 15000),
      setInterval(function () { if (!document.hidden && state.tab === 'overview') loadOverview(); }, 60000)
    ];
  }

  /* ---------- bar list helper ---------- */
  function bars(el, rows, opt) {
    if (!rows.length) { el.innerHTML = '<li class="mhx-empty">No data yet.</li>'; return; }
    var max = Math.max.apply(null, rows.map(function (r) { return r.n; })) || 1;
    el.innerHTML = rows.map(function (r) {
      var pct = opt && opt.fixedMax ? (r.n / opt.fixedMax * 100) : (r.n / max * 100);
      return '<li><i style="width:' + Math.max(pct, 1.5).toFixed(1) + '%"></i>' + (r.pre || '') +
        '<span class="lbl" title="' + esc(r.title || r.label) + '">' + esc(r.label) + (r.small ? '<small>' + esc(r.small) + '</small>' : '') + '</span>' +
        (r.chip ? '<span class="mhx-chip">' + esc(r.chip) + '</span>' : '') +
        '<span class="num">' + esc(r.num != null ? r.num : num(r.n)) + '</span></li>';
    }).join('');
  }

  /* ---------- overview ---------- */
  function loadOnline() {
    api('online').then(function (d) {
      $('#online-count').textContent = d.count;
      $('#online-updated').textContent = 'updated ' + clock(d.now);
      var ul = $('#online-list');
      if (!d.sessions.length) { ul.innerHTML = '<li class="mhx-empty">Nobody right now.</li>'; return; }
      ul.innerHTML = d.sessions.map(function (s) {
        return '<li><span class="flag" title="' + esc(countryName(s.country, s.country_name)) + '">' + flag(s.country) + '</span>' +
          '<span class="path">' + esc(s.path) + '</span><span class="mhx-chip">' + esc(s.device) + '</span>' +
          '<span class="mhx-sub">' + dur(d.now - s.first_ts) + '</span></li>';
      }).join('');
    }).catch(function () {});
  }
  function loadOverview() {
    var r = { range: state.range };
    api('summary').then(function (d) {
      var labels = { today: 'Today', '7d': 'Last 7 days', '30d': 'Last 30 days' };
      $('#kpis').innerHTML = ['today', '7d', '30d'].map(function (k) {
        var s = d.summary[k];
        return '<div class="mhx-kpi"><h3>' + labels[k] + '</h3><dl><div><dt>Visitors</dt><dd>' + num(s.visitors) + '</dd></div>' +
          '<div><dt>Page views</dt><dd>' + num(s.pageviews) + '</dd></div><div><dt>Avg time on site</dt><dd class="sm">' + dur(s.avg_time_s) + '</dd></div></dl></div>';
      }).join('');
    }).catch(function () {});
    api('countries', r).then(function (d) {
      bars($('#countries'), d.countries.map(function (c) {
        return { pre: '<span class="flag">' + flag(c.cc) + '</span>', label: countryName(c.cc === '??' ? null : c.cc, c.name), n: +c.visitors, small: num(c.pageviews) + ' views' };
      }));
    }).catch(function () {});
    api('time', r).then(function (d) {
      $('#time-avg').textContent = 'avg ' + dur(d.avg_time_s) + ' · ' + num(d.sessions) + ' visits';
      var tot = d.sessions || 1;
      bars($('#time-dist'), d.buckets.map(function (b) {
        return { label: b.bucket, n: b.sessions, num: num(b.sessions) + ' · ' + Math.round(b.sessions / tot * 100) + '%' };
      }));
    }).catch(function () {});
    api('referrers', r).then(function (d) {
      bars($('#referrers'), d.referrers.map(function (x) { return { label: x.ref, n: +x.visitors }; }));
    }).catch(function () {});
    api('pages', r).then(function (d) {
      $('#pages tbody').innerHTML = d.pages.length ? d.pages.map(function (p) {
        return '<tr><td>' + esc(p.path) + '</td><td>' + num(p.pageviews) + '</td><td>' + num(p.visitors) + '</td><td>' + dur(p.avg_engaged_s) +
          '</td><td>' + (p.avg_scroll == null ? '–' : meter(p.avg_scroll)) + '</td><td>' + num(p.clicks) + '</td></tr>';
      }).join('') : '<tr><td colspan="6" class="mhx-sub">No data yet.</td></tr>';
    }).catch(function () {});
    api('scroll', r).then(function (d) {
      $('#scroll tbody').innerHTML = d.scroll.length ? d.scroll.map(function (s) {
        return '<tr><td>' + esc(s.path) + '</td><td>' + num(s.n) + '</td><td>' + meter(s.avg) + '</td><td>' + s.p25 + '%</td><td>' + s.p50 + '%</td><td>' + s.p75 + '%</td><td>' + s.p100 + '%</td></tr>';
      }).join('') : '<tr><td colspan="7" class="mhx-sub">No data yet.</td></tr>';
    }).catch(function () {});
  }
  function meter(v) { v = Math.round(+v || 0); return '<span class="mhx-meter"><i style="width:' + v + '%"></i></span>' + v + '%'; }

  /* ---------- clicks ---------- */
  function fillPaths(sel, paths, keepFirst) {
    var cur = sel.value;
    var opts = paths.map(function (p) { return '<option value="' + esc(p.path) + '">' + esc(p.path) + ' (' + num(p.clicks) + ' clicks)</option>'; }).join('');
    sel.innerHTML = (keepFirst ? '<option value="">All pages</option>' : '') + opts;
    if (cur && paths.some(function (p) { return p.path === cur; })) sel.value = cur;
  }
  function loadClicks() {
    var sel = $('#clicks-path');
    api('paths', { range: state.range }).then(function (d) { fillPaths(sel, d.paths, true); }).catch(function () {});
    var params = { range: state.range };
    if (sel.value) params.path = sel.value;
    api('elements', params).then(function (d) {
      var total = d.kinds.reduce(function (a, k) { return a + +k.n; }, 0);
      var out = d.outbound.reduce(function (a, k) { return a + +k.n; }, 0);
      $('#click-kpis').innerHTML =
        '<div class="mhx-stat"><b>' + num(total) + '</b><span>clicks recorded</span></div>' +
        '<div class="mhx-stat"><b>' + num(d.cv_downloads) + '</b><span>CV downloads</span></div>' +
        '<div class="mhx-stat"><b>' + num(out) + '</b><span>outbound link clicks</span></div>';
      bars($('#el-top'), d.top.map(function (t) {
        return { label: t.label, small: d.path ? (t.href || '') : (t.pages > 1 ? t.pages + ' pages' : t.path), title: (t.label || '') + (t.href ? ' → ' + t.href : ''), chip: t.kind || 'other', n: +t.n };
      }));
      bars($('#el-down'), d.downloads.map(function (t) { return { label: (t.href || '').split('/').pop() || t.href, title: t.href, n: +t.n, small: num(t.visitors) + ' visitors' }; }));
      bars($('#el-out'), d.outbound.map(function (t) {
        var host = t.href; try { host = new URL(t.href).host.replace(/^www\./, '') + new URL(t.href).pathname.replace(/\/$/, ''); } catch (e) {}
        return { label: t.label || host, small: host, title: t.href, n: +t.n };
      }));
      bars($('#el-kind'), d.kinds.map(function (k) { return { label: k.kind, n: +k.n }; }));
    }).catch(function () {});
  }
  $('#clicks-path').addEventListener('change', loadClicks);

  /* ---------- visitors ---------- */
  function loadVisitors(append) {
    api('visitors', { range: state.range, limit: 40, offset: state.visOffset }).then(function (d) {
      var ul = $('#visits');
      $('#vis-total').textContent = num(d.total) + ' visits · ' + rangeLabel();
      var html = d.visitors.map(function (v) {
        var j = v.journey.map(function (p) { return '<span title="' + esc(p.path) + '">' + esc(p.path) + '<em>' + dur(p.ms / 1000) + '</em></span>'; }).join('<span class="arr">→</span>');
        return '<li class="mhx-visit" data-sid="' + esc(v.sid) + '"><button type="button" aria-expanded="false">' +
          '<span class="flag" title="' + esc(countryName(v.country, v.country_name)) + '">' + flag(v.country) + '</span>' +
          '<span class="meta"><b>' + esc(when(v.first_ts)) + '</b><span>' + esc(countryName(v.country, v.country_name)) + '</span><span>' + esc(v.ref || 'direct') + '</span><span>' + esc(v.device || '') + '</span><span>' + num(v.pages) + ' page' + (v.pages == 1 ? '' : 's') + ' · ' + num(v.clicks) + ' click' + (v.clicks == 1 ? '' : 's') + '</span></span>' +
          '<span class="total">' + dur(v.total_ms / 1000) + '<small>engaged</small></span>' +
          '<span class="mhx-journey">' + (j || '<span>–</span>') + '</span></button></li>';
      }).join('');
      if (append) ul.insertAdjacentHTML('beforeend', html);
      else ul.innerHTML = html || '<li class="mhx-empty">No visits in this range yet.</li>';
      state.visOffset += d.visitors.length;
      $('#vis-more').hidden = state.visOffset >= d.total;
    }).catch(function () {});
  }
  $('#vis-more').addEventListener('click', function () { loadVisitors(true); });
  $('#visits').addEventListener('click', function (e) {
    var btn = e.target.closest('.mhx-visit > button');
    if (!btn) return;
    var li = btn.parentNode, open = btn.getAttribute('aria-expanded') === 'true';
    var det = li.querySelector('.mhx-visit-detail');
    btn.setAttribute('aria-expanded', String(!open));
    if (open) { if (det) det.hidden = true; return; }
    if (det) { det.hidden = false; return; }
    det = document.createElement('div');
    det.className = 'mhx-visit-detail';
    det.innerHTML = '<p class="mhx-sub">Loading clicks…</p>';
    li.appendChild(det);
    api('visitor', { sid: li.dataset.sid }).then(function (d) {
      det.innerHTML = d.clicks.length ? '<ol class="mhx-steps">' + d.clicks.map(function (c) {
        return '<li><time>' + clock(c.ts) + '</time><span class="what">' + (c.kind ? '<span class="mhx-chip">' + esc(c.kind) + '</span> ' : '') +
          esc(c.label || (c.href ? '' : 'Click on page')) + (c.href ? ' <small>→ ' + esc(c.href) + '</small>' : '') + ' <small>on ' + esc(c.path) + '</small></span></li>';
      }).join('') + '</ol>' : '<p class="mhx-sub">No clicks in this visit.</p>';
    }).catch(function () { det.innerHTML = '<p class="mhx-sub">Could not load clicks.</p>'; });
  });

  /* ---------- heatmap ---------- */
  var hm = { data: null, path: '', H: 0, W: 1440, scale: 1 };
  function loadHeatmapPaths() {
    api('paths', { range: state.range }).then(function (d) {
      var sel = $('#hm-path');
      fillPaths(sel, d.paths, false);
      if (!d.paths.length) { $('#hm-info').textContent = 'No tracked pages yet.'; return; }
      loadHeatmap();
    }).catch(function () {});
  }
  $('#hm-path').addEventListener('change', loadHeatmap);
  $$('.mhx-seg button').forEach(function (b) {
    b.addEventListener('click', function () {
      state.w = b.dataset.w;
      $$('.mhx-seg button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      loadHeatmap();
    });
  });
  $('#hm-dim').addEventListener('change', function () { $('#hm-stage').classList.toggle('dim', this.checked); });
  $('#hm-stage').classList.toggle('dim', $('#hm-dim').checked);

  function loadHeatmap() {
    var path = $('#hm-path').value;
    if (!path) return;
    api('clicks', { path: path, w: state.w, range: state.range }).then(function (d) {
      hm.data = d;
      $('#hm-info').textContent = num(d.total) + ' ' + state.w + ' clicks · ' + rangeLabel();
      var W = state.w === 'mobile' ? 390 : 1440, frame = $('#hm-frame');
      hm.W = W;
      hm.H = d.docH || 3000;
      frame.style.width = W + 'px';
      frame.style.height = hm.H + 'px';
      var src = path + (path.indexOf('?') < 0 ? '?' : '&') + 'heatmap=1';
      if (hm.path !== path + '|' + W) {
        hm.path = path + '|' + W;
        frame.onload = function () { measure(); setTimeout(measure, 900); setTimeout(measure, 2500); };
        frame.src = src;
      } else {
        layout();
      }
    }).catch(function () {});
  }
  function measure() {
    var f = $('#hm-frame');
    try {
      var doc = f.contentDocument, h = Math.max(doc.documentElement.scrollHeight, doc.body ? doc.body.scrollHeight : 0);
      // Avoid feedback loops with 100vh layouts: only grow to the real content height.
      if (h && Math.abs(h - hm.H) > 4) { hm.H = Math.min(h, 60000); f.style.height = hm.H + 'px'; }
    } catch (e) { /* cross-origin preview: keep recorded docH */ }
    layout();
  }
  function layout() {
    var stage = $('#hm-stage'), inner = $('#hm-inner'), box = $('#hm-box');
    var avail = stage.clientWidth - parseFloat(getComputedStyle(stage).paddingLeft) * 2;
    var s = Math.min(1, avail / hm.W);
    hm.scale = s;
    box.style.transform = 'scale(' + s + ')';
    inner.style.width = Math.floor(hm.W * s) + 'px';
    inner.style.height = Math.floor(hm.H * s) + 'px';
    draw();
  }
  window.addEventListener('resize', function () { if (state.tab === 'heatmap' && hm.data) layout(); });

  var palette = null;
  function getPalette() {
    if (palette) return palette;
    var c = document.createElement('canvas'); c.width = 256; c.height = 1;
    var g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 256, 0);
    gr.addColorStop(0.0, '#1d3cff'); gr.addColorStop(0.25, '#00d5ff'); gr.addColorStop(0.5, '#38e06b');
    gr.addColorStop(0.75, '#ffe14d'); gr.addColorStop(1, '#ff3b2f');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 1);
    palette = g.getImageData(0, 0, 256, 1).data;
    return palette;
  }
  function draw() {
    var cv = $('#hm-canvas'), d = hm.data;
    if (!d) return;
    var s = hm.scale, cw = Math.floor(hm.W * s), ch = Math.floor(hm.H * s);
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    // keep canvas area within mobile Safari limits (~16M px)
    while (cw * dpr * ch * dpr > 15e6 && dpr > 0.5) dpr -= 0.25;
    cv.width = Math.max(1, Math.floor(cw * dpr)); cv.height = Math.max(1, Math.floor(ch * dpr));
    cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
    var ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
    if (!d.points.length) return;
    var k = s * dpr, r = Math.max(10, (state.w === 'mobile' ? 22 : 30) * k);
    var maxN = d.points.reduce(function (m, p) { return Math.max(m, p[3]); }, 1);
    // 1) accumulate alpha
    d.points.forEach(function (p) {
      var x = p[0] * hm.W * k, y = (p[2] > 0 ? p[1] / p[2] * hm.H : p[1]) * k;
      var a = Math.min(1, 0.12 + 0.88 * Math.sqrt(p[3] / maxN));
      var g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(0,0,0,' + a + ')'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    });
    // 2) colourise alpha through the palette
    var img = ctx.getImageData(0, 0, cv.width, cv.height), px = img.data, pal = getPalette();
    for (var i = 3; i < px.length; i += 4) {
      var al = px[i];
      if (!al) continue;
      var o = al * 4;
      px[i - 3] = pal[o]; px[i - 2] = pal[o + 1]; px[i - 1] = pal[o + 2];
      px[i] = Math.min(235, 60 + al * 1.4);
    }
    ctx.putImageData(img, 0, 0);
  }

  /* ---------- boot ---------- */
  var h = (location.hash || '').slice(1);
  if (['overview', 'clicks', 'visitors', 'heatmap'].indexOf(h) >= 0) state.tab = h;
  var exp = +load('mhi_admin_exp') || 0;
  if (load(TK) && exp * 1000 > Date.now()) { startTimers(); showApp(); } else { logout(); }
})();
