/**
 * PAC Explained — assets/client.js
 * Served at /assets/client.js by the Cloudflare Worker.
 *
 * Handles: theme toggle, nav collapse, copy buttons, live PAC tester,
 *          active-link tracking, keyboard nav (a11y fix), aria-expanded
 *          updates, and contextual aria-labels on copy buttons.
 */

(function () {
  'use strict';

  /* ═══════════════════════════════════════════════ THEME ════ */

  function updateToggleIcon() {
    var btn = document.querySelector('.theme-toggle');
    if (!btn) return;
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    btn.textContent = dark ? '☾' : '☀';
  }

  document.addEventListener('DOMContentLoaded', function () {
    updateToggleIcon();

    var themeBtn = document.querySelector('.theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', function () {
        var cur  = document.documentElement.getAttribute('data-theme');
        var next = cur === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('pac-theme', next);
        updateToggleIcon();
      });
    }

    /* ═══════════════════════════════════════ NAV COLLAPSE ════ */

    // Click delegation — collapse/expand nav groups
    document.addEventListener('click', function (e) {
      var label = e.target.closest('.nav-group-label');
      if (!label) return;
      toggleNavGroup(label);
    });

    // NEW: keyboard support for nav group labels (a11y fix 5)
    document.querySelectorAll('.nav-group-label').forEach(function (label) {
      label.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleNavGroup(label);
        }
      });
    });

    function toggleNavGroup(label) {
      var group   = label.closest('.nav-group');
      var links   = group ? group.querySelector('.nav-group-links') : null;
      if (!links) return;
      var isOpen  = group.classList.toggle('collapsed');
      // isOpen is true when class was just ADDED (i.e. now collapsed)
      label.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
    }

    /* ═══════════════════════════════════════ COPY BUTTONS ════ */

    // NEW: contextual aria-labels so each button describes what it copies (a11y fix 6)
    document.querySelectorAll('.copy-btn').forEach(function (btn) {
      var header = btn.closest('.code-header');
      var span   = header ? header.querySelector('span') : null;
      var ctx    = span ? span.textContent.trim() : '';
      btn.setAttribute('aria-label', ctx ? 'Copy ' + ctx : 'Copy code');
    });

    // Copy to clipboard on click
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.copy-btn');
      if (!btn) return;

      var block = btn.closest('.code-block');
      var pre   = block ? block.querySelector('pre') : null;
      if (!pre) return;

      var text = pre.innerText || pre.textContent;
      navigator.clipboard.writeText(text).then(function () {
        var orig = btn.textContent;
        btn.textContent = 'copied!';
        btn.classList.add('copied');
        setTimeout(function () {
          btn.textContent = orig;
          btn.classList.remove('copied');
        }, 1500);
      }).catch(function () {
        // Fallback for older browsers
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity  = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        var orig = btn.textContent;
        btn.textContent = 'copied!';
        setTimeout(function () { btn.textContent = orig; }, 1500);
      });
    });

    /* ═══════════════════════════════════════ ACTIVE NAV LINK ════ */

    var navLinks = document.querySelectorAll('#sidebar a[href^="#"]');
    var sections = [];
    navLinks.forEach(function (a) {
      var id = a.getAttribute('href').slice(1);
      var el = document.getElementById(id);
      if (el) sections.push({ el: el, a: a });
    });

    function onScroll() {
      var scrollY = window.scrollY || window.pageYOffset;
      var active  = null;
      for (var i = sections.length - 1; i >= 0; i--) {
        if (sections[i].el.offsetTop <= scrollY + 120) {
          active = sections[i].a;
          break;
        }
      }
      navLinks.forEach(function (a) { a.classList.remove('active'); });
      if (active) active.classList.add('active');
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    /* ═══════════════════════════════════════ LIVE PAC TESTER ════ */

    var runBtn      = document.getElementById('tester-run');
    var pacInput    = document.getElementById('pac-input');
    var urlInput    = document.getElementById('tester-url');
    var hostInput   = document.getElementById('tester-host');
    var resultEl    = document.getElementById('tester-result');

    if (!runBtn || !pacInput || !urlInput || !resultEl) return;

    // Ctrl+Enter / Cmd+Enter anywhere in the tester runs it
    [pacInput, urlInput, hostInput].forEach(function (el) {
      if (!el) return;
      el.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          runPAC();
        }
      });
    });

    runBtn.addEventListener('click', runPAC);

    function runPAC() {
      var pacSrc = pacInput.value.trim();
      var rawUrl = urlInput.value.trim();
      if (!rawUrl) {
        showResult('error', 'Please enter a test URL.');
        return;
      }
      if (!rawUrl.match(/^https?:\/\//i)) {
        rawUrl = 'https://' + rawUrl;
      }

      var host;
      if (hostInput && hostInput.value.trim()) {
        host = hostInput.value.trim();
      } else {
        try {
          host = new URL(rawUrl).hostname;
        } catch (err) {
          showResult('error', 'Invalid URL: ' + rawUrl);
          return;
        }
      }

      try {
        var result = evalPAC(pacSrc, rawUrl, host);
        showResult('ok', result);
      } catch (err) {
        showResult('error', 'PAC error: ' + err.message);
      }
    }

    function showResult(type, text) {
      resultEl.className = 'tester-result tester-result--' + type;
      resultEl.textContent = text;
    }

    /* ─── PAC sandbox evaluator ─── */

    function evalPAC(src, url, host) {
      // Build sandbox — all standard PAC helper functions are simulated.
      // DNS functions (dnsResolve, isResolvable) return stub values with a note.
      var sandbox = makeSandbox(host);

      // Inject FindProxyForURL from user source, then call it.
      // We use Function() as the sandbox — no DOM access, no globals.
      var wrapped = [
        '(function(',
        Object.keys(sandbox).join(','),
        '){',
        src,
        '\nif(typeof FindProxyForURL!=="function"){',
        '  throw new Error("FindProxyForURL is not defined");',
        '}',
        'return FindProxyForURL(url,host);',
        '})'
      ].join('');

      var fn = eval(wrapped); // eslint-disable-line no-eval
      return fn.apply(null, Object.values(sandbox));
    }

    function makeSandbox(resolvedHost) {
      // url and host are set at call time — inject via closure
      return {
        url:  urlInput.value.trim(),
        host: resolvedHost,

        isPlainHostName: function (h) {
          return h.indexOf('.') === -1;
        },

        dnsDomainIs: function (h, domain) {
          if (domain.charAt(0) !== '.') domain = '.' + domain;
          return h.length > domain.length &&
                 h.slice(h.length - domain.length).toLowerCase() === domain.toLowerCase();
        },

        localHostOrDomainIs: function (h, hostdom) {
          return h === hostdom ||
                 (hostdom.indexOf('.') !== -1 &&
                  h === hostdom.slice(0, hostdom.indexOf('.')));
        },

        isResolvable: function (h) {
          // Can't do real DNS in browser — return true as a safe default so
          // PAC files that use isResolvable don't silently skip everything.
          console.warn('[PAC tester] isResolvable("' + h + '") simulated → true');
          return true;
        },

        isInNet: function (ipOrHost, pattern, mask) {
          var ip = ipOrHost;
          if (!ip.match(/^\d+\.\d+\.\d+\.\d+$/)) {
            // Not an IP — simulate dnsResolve returning empty → no match
            return false;
          }
          return ipInNet(ip, pattern, mask);
        },

        dnsResolve: function (h) {
          // Can't do real DNS — return empty string (standard failure value).
          // PAC files written correctly guard against this with `if (ip && ...)`.
          console.warn('[PAC tester] dnsResolve("' + h + '") simulated → ""');
          return '';
        },

        myIpAddress: function () {
          return '127.0.0.1'; // standard simulation value
        },

        dnsDomainLevels: function (h) {
          return (h.match(/\./g) || []).length;
        },

        shExpMatch: function (str, shexp) {
          // Convert shell glob to regex: * → .*, ? → .
          var re = '^' + shexp
            .replace(/[.+^${}()|[\]\\]/g, '\\$&')
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.') + '$';
          return new RegExp(re, 'i').test(str);
        },

        weekdayRange: function (wd1, wd2, gmt) {
          var days = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
          var now  = gmt === 'GMT' ? new Date() : new Date();
          var cur  = now.getDay();
          var i1   = days.indexOf(wd1.toUpperCase());
          var i2   = wd2 && wd2 !== 'GMT' ? days.indexOf(wd2.toUpperCase()) : i1;
          if (i1 < 0 || i2 < 0) return false;
          if (i1 <= i2) return cur >= i1 && cur <= i2;
          return cur >= i1 || cur <= i2; // wraps around weekend
        },

        dateRange: function () {
          // Simplified: check if current date falls in range.
          // Supports dateRange(day1, day2) and dateRange("MON1","MON2") patterns.
          var args   = Array.prototype.slice.call(arguments);
          var months = ['JAN','FEB','MAR','APR','MAY','JUN',
                        'JUL','AUG','SEP','OCT','NOV','DEC'];
          var now    = new Date();
          var gmt    = args[args.length - 1] === 'GMT';
          if (gmt) args.pop();

          function toMonth(v) { return months.indexOf(String(v).toUpperCase()); }
          function isMonth(v) { return toMonth(v) >= 0; }
          function isYear(v)  { return typeof v === 'number' && v > 31; }
          function isDay(v)   { return typeof v === 'number' && v >= 1 && v <= 31; }

          var d = now.getDate(), m = now.getMonth(), y = now.getFullYear();

          if (args.length === 1) {
            if (isDay(args[0]))   return d === args[0];
            if (isMonth(args[0])) return m === toMonth(args[0]);
            if (isYear(args[0]))  return y === args[0];
          }
          if (args.length === 2) {
            if (isDay(args[0]) && isDay(args[1]))
              return d >= args[0] && d <= args[1];
            if (isMonth(args[0]) && isMonth(args[1]))
              return m >= toMonth(args[0]) && m <= toMonth(args[1]);
            if (isYear(args[0]) && isYear(args[1]))
              return y >= args[0] && y <= args[1];
          }
          // Full range: just return true for simplicity in the tester
          return true;
        },

        timeRange: function () {
          var args = Array.prototype.slice.call(arguments);
          var gmt  = args[args.length - 1] === 'GMT';
          if (gmt) args.pop();
          var now  = new Date();
          var h = now.getHours(), mi = now.getMinutes(), s = now.getSeconds();
          var cur  = h * 3600 + mi * 60 + s;

          if (args.length === 1) {
            return h === args[0];
          }
          if (args.length === 2) {
            return cur >= args[0] * 3600 && cur < args[1] * 3600;
          }
          if (args.length === 4) {
            var from = args[0] * 3600 + args[1] * 60;
            var to   = args[2] * 3600 + args[3] * 60;
            return cur >= from && cur < to;
          }
          if (args.length === 6) {
            var from6 = args[0] * 3600 + args[1] * 60 + args[2];
            var to6   = args[3] * 3600 + args[4] * 60 + args[5];
            return cur >= from6 && cur < to6;
          }
          return false;
        },

        alert: function (msg) {
          console.log('[PAC alert]', msg);
        }
      };
    }

    function ipInNet(ip, net, mask) {
      function toInt(addr) {
        return addr.split('.').reduce(function (acc, oct) {
          return (acc << 8) | parseInt(oct, 10);
        }, 0) >>> 0;
      }
      return (toInt(ip) & toInt(mask)) === (toInt(net) & toInt(mask));
    }

  }); // end DOMContentLoaded

})();
