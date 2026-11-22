/* MH Insights: first-party,cookieless analytics. Sends nothing with DNT/GPC. */
window.MH_INSIGHTS_ENDPOINT = window.MH_INSIGHTS_ENDPOINT || 'https://agents.retainly.dev/mh-insights/';
(function (w,d,n,L) {
var ss,de = d.documentElement;
try {ss = w.sessionStorage;} catch (e) {}
function get(k) {try {return ss.getItem(k);} catch (e) {}}
function set(k,v) {try {ss.setItem(k,v);} catch (e) {}}
if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(L.hostname)) {
w.MH_INSIGHTS_ENDPOINT = 'http://127.0.0.1:8790/';
if (/[?&]insights=dev/.test(L.search)) set('mhi_dev','1');
if (!get('mhi_dev')) return;
}
if (/^\/admin/.test(L.pathname) || w.top !== w || n.doNotTrack == '1' || w.doNotTrack == '1' ||
n.globalPrivacyControl || !n.sendBeacon || !w.JSON) return;

function id(l) {
var a = new Uint8Array(l),s = '';
(w.crypto || w.msCrypto).getRandomValues(a);
for (var i = 0; i < l; i++) s += (a[i] % 36).toString(36);
return s;
}
var sid = get('mhi_s') || id(16),pv = id(12),path = L.pathname;
set('mhi_s',sid);
var url = w.MH_INSIGHTS_ENDPOINT + 'collect.php';
function send(e) {
try {n.sendBeacon(url,JSON.stringify({s: sid,v: pv,e: e}));} catch (x) {}
}
function now() {return Date.now();}

var tz = '';
try {tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';} catch (e) {}
send([{t: 'pageview',path: path,ref: d.referrer,vw: w.innerWidth,vh: w.innerHeight,lang: n.language,tz: tz}]);

// Engaged time: visible tab with input in the last 30s.
var act = 0,lastIn = now(),maxPct = 0,lastClk = 0,nClk = 0;
function input() {lastIn = now();}
['mousemove','keydown','scroll','touchstart','pointerdown','wheel'].forEach(function (t) {
w.addEventListener(t,input,{passive: true,capture: true});
});
setInterval(function () {if (!d.hidden && now() - lastIn < 30000) act += 1000;},1000);
function ms() {var a = act; act = 0; return a;}
function ping() {if (!d.hidden) send([{t: 'ping',path: path,ms: ms()}]);}
setInterval(ping,20000);

function depth() {
var h = Math.max(de.scrollHeight,d.body ? d.body.scrollHeight : 0);
var p = h ? Math.min(100,Math.round((w.scrollY + w.innerHeight) / h * 100)) : 0;
if (p > maxPct) maxPct = p;
}
w.addEventListener('scroll',depth,{passive: true});
w.addEventListener('load',depth);
function flush(end) {
depth();
send([{t: 'engage',path: path,ms: ms(),end: end ? 1 : 0},{t: 'scroll',path: path,pct: maxPct}]);
}
d.addEventListener('visibilitychange',function () {d.hidden ? flush(0) : (input(),ping());});
w.addEventListener('pagehide',function () {flush(1);});

d.addEventListener('click',function (e) {
var t = now();
if (t - lastClk < 150 || ++nClk > 80) return;
lastClk = t;
var el = e.target && e.target.closest ? e.target.closest('a,button,[data-open],[data-open-image],[data-yt],[role=button],summary,input[type=submit]') : null;
var x = e.pageX,y = e.pageY;
if (!x && !y && el) {var r = el.getBoundingClientRect(); x = r.left + r.width / 2 + w.scrollX; y = r.top + r.height / 2 + w.scrollY;}
var ev = {t: 'click',path: path,x: x / (de.scrollWidth || w.innerWidth),y: y,docH: de.scrollHeight,vw: w.innerWidth};
if (el) {
var a = el.closest('a'),img = el.querySelector('img'),h = '',u = null,k;
ev.label = (el.getAttribute('aria-label') || el.innerText || el.value || el.title || (img && img.alt) || '').replace(/\s+/g,' ').trim().slice(0,80);
if (a && a.href) {
try {u = new URL(a.href);} catch (x2) {}
if (u) h = /^(mailto|tel):/.test(u.protocol) ? u.protocol : u.host === L.host ? u.pathname : u.origin + u.pathname;
}
var ext = u && /^https?:/.test(u.protocol) && u.host !== L.host;
k = /\.pdf$/i.test(h) || (a && a.hasAttribute('download')) ? 'download'
: /youtu\.?be|vimeo/i.test(h) || el.closest('[data-yt],.mk-yt') ? 'video'
: el.closest('[data-open-image],[data-open]') ? 'gallery'
: ext ? 'external'
: el.closest('nav,header,footer') ? 'nav'
: el.closest('.button,button') || /^(mailto|tel)/.test(h) ? 'cta' : 'other';
ev.href = h; ev.kind = k;
}
send([ev]);
},true);
})(window,document,navigator,location);
