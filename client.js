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

      showResult('pending', 'Evaluating…');
      runBtn.disabled = true;

      evalPAC(pacSrc, rawUrl, host, function (result, errMsg) {
        runBtn.disabled = false;
        if (errMsg) {
          showResult('error', 'PAC error: ' + errMsg);
        } else {
          showResult('ok', result);
        }
      });
    }

    function showResult(type, text) {
      resultEl.className = 'tester-result tester-result--' + type;
      resultEl.textContent = text;
    }

    /* ─── PAC sandbox evaluator (blob-script, no eval) ────────────────────
     *
     * The page CSP uses 'strict-dynamic', which means scripts injected by an
     * already-trusted (nonce-bearing) script are themselves trusted — no
     * 'unsafe-eval' needed.  client.js is loaded with a nonce, so the
     * <script src="blob:…"> we create here is allowed to execute.
     *
     * Flow:
     *  1. Register a unique global callback on window.
     *  2. Build a self-contained JS blob: PAC helpers + user PAC source +
     *     a try/catch that calls FindProxyForURL and fires the callback.
     *  3. Inject a <script src="blob:…"> into <head>.
     *  4. The blob script executes, fires the callback synchronously, then
     *     we clean up the element, the blob URL, and the global.
     */
    function evalPAC(src, url, host, done) {
      // Unique key avoids collisions if Run is clicked in quick succession
      var cbKey = '__pac_cb_' + Date.now() + '_' + Math.floor(Math.random() * 1e9);

      window[cbKey] = function (result, errMsg) {
        delete window[cbKey];
        if (script.parentNode) script.parentNode.removeChild(script);
        URL.revokeObjectURL(blobUrl);
        done(result, errMsg);
      };

      var blobSrc = buildBlobSrc(src, url, host, cbKey);
      var blob    = new Blob([blobSrc], { type: 'application/javascript' });
      var blobUrl = URL.createObjectURL(blob);
      var script  = document.createElement('script');

      script.src = blobUrl;
      script.onerror = function () {
        delete window[cbKey];
        URL.revokeObjectURL(blobUrl);
        done(null, 'Script blocked — see browser console for CSP details.');
      };

      document.head.appendChild(script);
    }

    /* Builds the complete blob JS string:
     *   [PAC helper stubs] + [user PAC source] + [execute & callback] */
    function buildBlobSrc(src, url, host, cbKey) {

      // All helper implementations, fully self-contained (no outer-scope refs).
      // Minified to one expression per line so the string stays manageable.
      var helpers = [
        // Subnet helper used by isInNet
        'function _ipInt(a){return a.split(".").reduce(function(x,o){return(x<<8)|parseInt(o,10);},0)>>>0;}',

        // Standard PAC helpers
        'function isPlainHostName(h){return h.indexOf(".")===-1;}',

        'function dnsDomainIs(h,d){if(d.charAt(0)!==".") d="."+d;' +
          'return h.length>d.length&&h.slice(h.length-d.length).toLowerCase()===d.toLowerCase();}',

        'function localHostOrDomainIs(h,hd){' +
          'return h===hd||(hd.indexOf(".")!==-1&&h===hd.slice(0,hd.indexOf(".")));}',

        // DNS stubs — real DNS is impossible in a browser sandbox
        'function isResolvable(h){return true;}',
        'function dnsResolve(h){return "";}',
        'function myIpAddress(){return "127.0.0.1";}',

        'function isInNet(ip,pat,mask){' +
          'if(!/^\\d+\\.\\d+\\.\\d+\\.\\d+$/.test(ip)) return false;' +
          'return(_ipInt(ip)&_ipInt(mask))===(_ipInt(pat)&_ipInt(mask));}',

        'function dnsDomainLevels(h){return(h.match(/\\./g)||[]).length;}',

        'function shExpMatch(s,p){' +
          'var r="^"+p.replace(/[.+^${}()|[\\]\\\\]/g,"\\\\$&")' +
          '.replace(/\\*/g,".*").replace(/\\?/g,".")+"$";' +
          'return new RegExp(r,"i").test(s);}',

        'function weekdayRange(w1,w2,gmt){' +
          'var D=["SUN","MON","TUE","WED","THU","FRI","SAT"];' +
          'var c=new Date().getDay();' +
          'var i1=D.indexOf(w1.toUpperCase());' +
          'var i2=w2&&w2!=="GMT"?D.indexOf(w2.toUpperCase()):i1;' +
          'if(i1<0||i2<0) return false;' +
          'return i1<=i2?c>=i1&&c<=i2:c>=i1||c<=i2;}',

        'function dateRange(){' +
          'var a=Array.prototype.slice.call(arguments);' +
          'var M=["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];' +
          'var gmt=a[a.length-1]==="GMT";if(gmt)a.pop();' +
          'var n=new Date();var d=n.getDate(),m=n.getMonth(),y=n.getFullYear();' +
          'function tm(v){return M.indexOf(String(v).toUpperCase());}' +
          'function im(v){return tm(v)>=0;}' +
          'function iy(v){return typeof v==="number"&&v>31;}' +
          'function id(v){return typeof v==="number"&&v>=1&&v<=31;}' +
          'if(a.length===1){if(id(a[0]))return d===a[0];if(im(a[0]))return m===tm(a[0]);if(iy(a[0]))return y===a[0];}' +
          'if(a.length===2){' +
          '  if(id(a[0])&&id(a[1]))return d>=a[0]&&d<=a[1];' +
          '  if(im(a[0])&&im(a[1]))return m>=tm(a[0])&&m<=tm(a[1]);' +
          '  if(iy(a[0])&&iy(a[1]))return y>=a[0]&&y<=a[1];}' +
          'return true;}',

        'function timeRange(){' +
          'var a=Array.prototype.slice.call(arguments);' +
          'var gmt=a[a.length-1]==="GMT";if(gmt)a.pop();' +
          'var n=new Date();var h=n.getHours(),mi=n.getMinutes(),s=n.getSeconds();' +
          'var c=h*3600+mi*60+s;' +
          'if(a.length===1)return h===a[0];' +
          'if(a.length===2)return c>=a[0]*3600&&c<a[1]*3600;' +
          'if(a.length===4){var f=a[0]*3600+a[1]*60;var t=a[2]*3600+a[3]*60;return c>=f&&c<t;}' +
          'if(a.length===6){var f6=a[0]*3600+a[1]*60+a[2];var t6=a[3]*3600+a[4]*60+a[5];return c>=f6&&c<t6;}' +
          'return false;}',

        // Silence alert — no browser pop-ups in the tester
        'var alert=function(){};',
      ].join('\n');

      // Execute block: call FindProxyForURL and fire the window callback.
      // JSON.stringify handles all quoting/escaping of url and host safely.
      var exec = [
        '(function(){',
        '  try{',
        '    if(typeof FindProxyForURL!=="function")',
        '      throw new Error("FindProxyForURL is not defined in the PAC source");',
        '    var r=FindProxyForURL(' + JSON.stringify(url) + ',' + JSON.stringify(host) + ');',
        '    window[' + JSON.stringify(cbKey) + '](String(r),null);',
        '  }catch(e){',
        '    window[' + JSON.stringify(cbKey) + '](null,e.message);',
        '  }',
        '})();',
      ].join('\n');

      return helpers + '\n' + src + '\n' + exec;
    }

  }); // end DOMContentLoaded

})();
