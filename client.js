/**
 * PAC Explained — assets/client.js
 * Served at /assets/client.js by the Cloudflare Worker.
 *
 * All event wiring is done here via addEventListener — there are no
 * onclick/onkeydown attributes in index.html, which lets the CSP
 * drop 'unsafe-inline' from script-src entirely.
 */

/* ═══════════════════════════════════════ THEME ═══ */

function toggleTheme() {
  var current = document.documentElement.getAttribute('data-theme');
  var next    = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('pac-theme', next);
  updateToggleIcon(next);
}

function updateToggleIcon(theme) {
  var btn = document.querySelector('.theme-toggle');
  if (btn) btn.textContent = theme === 'dark' ? '☀' : '☾';
}

/* Wire the theme toggle button */
var themeBtn = document.querySelector('.theme-toggle');
if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

/* Sync the icon with whatever data-theme the inline script already set
   (the inline script sets data-theme to prevent FOUC, but can't call
   updateToggleIcon because it runs before this file loads). */
updateToggleIcon(document.documentElement.getAttribute('data-theme') || 'light');

/* ═══════════════════════════════════════ NAV COLLAPSE ═══ */

/*
 * Collapse/expand nav groups via event delegation on the sidebar.
 * Previously each .nav-group-label had onclick="toggleGroup('ng-...')" —
 * that required 'unsafe-inline' in script-src. Delegation removes that need.
 */
var sidebar = document.getElementById('sidebar');
if (sidebar) {
  sidebar.addEventListener('click', function (e) {
    var label = e.target.closest('.nav-group-label');
    if (!label) return;
    var group = label.closest('.nav-group');
    if (group) group.classList.toggle('collapsed');
  });
}

/* ═══════════════════════════════════════ ACTIVE NAV STATE ═══ */

var anchors  = document.querySelectorAll('.anchor-target[id], section[id]');
var navLinks = document.querySelectorAll('nav a[href^="#"]');

/*
 * FIX (forced reflow): the original code called
 *   navLinks.forEach(l => l.classList.remove('active'))
 * on every intersection — touching every link on every scroll event.
 * We now track a single reference and only touch two elements per event.
 *
 * The requestAnimationFrame wrapper batches the DOM writes so the
 * IntersectionObserver callback never reads layout after invalidating styles.
 */
var _activeLink = null;

var io = new IntersectionObserver(function (entries) {
  entries.forEach(function (e) {
    if (!e.isIntersecting) return;
    requestAnimationFrame(function () {
      if (_activeLink) _activeLink.classList.remove('active');
      _activeLink = document.querySelector('nav a[href="#' + e.target.id + '"]');
      if (_activeLink) {
        _activeLink.classList.add('active');
        var grp = _activeLink.closest('.nav-group');
        if (grp && grp.classList.contains('collapsed')) {
          grp.classList.remove('collapsed');
        }
      }
    });
  });
}, { rootMargin: '-8% 0px -78% 0px' });

anchors.forEach(function (a) { io.observe(a); });

/* ═══════════════════════════════════════ COPY BUTTONS ═══ */

/*
 * Event delegation on document — handles every .copy-btn regardless of
 * when it appears in the DOM. Previously each button had onclick="copyCode(this)".
 */
document.addEventListener('click', function (e) {
  var btn = e.target.closest('.copy-btn');
  if (!btn) return;
  var block = btn.closest('.code-block');
  if (!block) return;
  var pre = block.querySelector('pre');
  if (!pre) return;

  navigator.clipboard.writeText(pre.innerText).then(function () {
    btn.textContent = 'copied!';
    btn.classList.add('copied');
    setTimeout(function () {
      btn.textContent = 'copy';
      btn.classList.remove('copied');
    }, 2000);
  });
});

/* ═══════════════════════════════════════ PAC LIVE TESTER ═══ */
var _pacPolicy = (window.trustedTypes && window.trustedTypes.createPolicy)
  ? window.trustedTypes.createPolicy('pac-evaluator', {
      createScript: function(s) { return s; }
    })
  : null;

function simulatePAC(code, testUrl, testHost) {
  if (!testHost) {
    try { testHost = new URL(testUrl).hostname; } catch (_) { testHost = testUrl; }
  }

  /* ── Helper function implementations ── */

  function isPlainHostName(h) { return !h.includes('.'); }

  function dnsDomainIs(h, domain) {
    return h.toLowerCase().endsWith(domain.toLowerCase());
  }

  function localHostOrDomainIs(h, hdom) {
    return h === hdom || (!h.includes('.') && hdom.startsWith(h + '.'));
  }

  function isResolvable(h) {
    return /^[a-zA-Z0-9._-]+$/.test(h) && h.length > 0;
  }

  function dnsResolve(h) {
    if (/^\d+\.\d+\.\d+\.\d+$/.test(h)) return h; // already an IP
    if (/\.(internal|local|corp|lan|intranet)$/.test(h)) return '10.0.0.1'; // simulate internal
    return ''; // external — simulate resolution failure for accurate subnet tests
  }

  function myIpAddress() { return '192.168.1.100'; /* simulated */ }

  function dnsDomainLevels(h) { return (h.match(/\./g) || []).length; }

  function shExpMatch(str, pattern) {
    var rx = '^' + pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.') + '$';
    return new RegExp(rx, 'i').test(str);
  }

  function ip2num(ip) {
    return ip.split('.').reduce(function (a, b) {
      return (a << 8 | parseInt(b, 10)) >>> 0;
    }, 0);
  }

  function isInNet(host, pattern, mask) {
    if (!host) return false;
    try {
      return (ip2num(host) & ip2num(mask)) === (ip2num(pattern) & ip2num(mask));
    } catch (_) { return false; }
  }

  function weekdayRange(wd1, wd2, gmt) {
    var days   = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
    var useGmt = (wd2 === 'GMT' || gmt === 'GMT');
    var today  = useGmt ? new Date().getUTCDay() : new Date().getDay();
    var d1     = days.indexOf(wd1);
    var d2     = (typeof wd2 === 'string' && days.indexOf(wd2) >= 0) ? days.indexOf(wd2) : d1;
    return d1 <= d2 ? (today >= d1 && today <= d2) : (today >= d1 || today <= d2);
  }

  function dateRange() {
    var months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    var args   = Array.prototype.slice.call(arguments);
    var useGmt = args[args.length - 1] === 'GMT';
    if (useGmt) args.pop();
    var now = new Date();
    var m   = useGmt ? now.getUTCMonth()      : now.getMonth();
    var d   = useGmt ? now.getUTCDate()       : now.getDate();
    var y   = useGmt ? now.getUTCFullYear()   : now.getFullYear();
    if (args.length === 1) {
      var v = args[0];
      if (typeof v === 'number' && v > 31) return y === v;
      if (typeof v === 'number') return d === v;
      if (typeof v === 'string') return m === months.indexOf(v);
    }
    return true; // simplified for multi-arg cases
  }

  function timeRange() {
    var args = Array.prototype.slice.call(arguments).filter(function (x) { return typeof x === 'number'; });
    var now  = new Date();
    var cur  = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    if (args.length === 1) return cur >= args[0] * 3600 && cur < (args[0] + 1) * 3600;
    if (args.length === 2) return cur >= args[0] * 3600 && cur < args[1] * 3600;
    if (args.length === 4) return cur >= args[0] * 3600 + args[1] * 60 && cur < args[2] * 3600 + args[3] * 60;
    if (args.length === 6) return cur >= args[0] * 3600 + args[1] * 60 + args[2] && cur < args[3] * 3600 + args[4] * 60 + args[5];
    return true;
  }

  function alert(msg) { console.log('[PAC alert]', msg); }

  var wrapArgs = [
    'isPlainHostName','dnsDomainIs','localHostOrDomainIs','isResolvable',
    'dnsResolve','myIpAddress','dnsDomainLevels','shExpMatch','isInNet',
    'weekdayRange','dateRange','timeRange','alert',
    'url','host',
  ];
  var wrapVals = [
    isPlainHostName, dnsDomainIs, localHostOrDomainIs, isResolvable,
    dnsResolve, myIpAddress, dnsDomainLevels, shExpMatch, isInNet,
    weekdayRange, dateRange, timeRange, alert,
    testUrl, testHost,
  ];

  // eslint-disable-next-line no-new-func
  var fnBody = code + '\nreturn FindProxyForURL(url, host);';
  var fn = new Function(wrapArgs, _pacPolicy ? _pacPolicy.createScript(fnBody) : fnBody);
  return fn.apply(null, wrapVals);
}

function runPAC() {
  var code = document.getElementById('pac-input').value.trim();
  var url  = document.getElementById('test-url').value.trim();
  var host = document.getElementById('test-host').value.trim();
  var el   = document.getElementById('pac-result');

  el.className   = 'tester-result';
  el.textContent = 'Evaluating…';

  try {
    var result     = simulatePAC(code, url, host);
    el.textContent = result;
    el.classList.add('ok');
  } catch (err) {
    el.textContent = 'Error: ' + err.message;
    el.classList.add('err');
  }
}

/* Tester button and keyboard shortcuts */
var runBtn = document.querySelector('.tester-run');
if (runBtn) runBtn.addEventListener('click', runPAC);

var pacInput = document.getElementById('pac-input');
if (pacInput) {
  pacInput.addEventListener('keydown', function (e) {
    if (e.ctrlKey && e.key === 'Enter') runPAC();
  });
}

var testUrlInput = document.getElementById('test-url');
if (testUrlInput) {
  testUrlInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') runPAC();
  });
}
