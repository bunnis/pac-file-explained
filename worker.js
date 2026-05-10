/**
 * PAC Explained — Cloudflare Worker
 *
 * Serves the PAC file reference site with a per-request CSP nonce,
 * correct security headers, and dedicated routes for CSS and JS assets.
 *
 * Project layout expected by this worker:
 *   index.html        ← page template ({{NONCE}} replaced at request time)
 *   styles.css        ← all site CSS (served at /styles.css)
 *   assets/client.js  ← all site JS  (served at /assets/client.js)
 *
 */

import html     from './index.html';
import css      from './styles.css';
import clientJs from './client.js';

/* ─── Nonce ────────────────────────────────────────────────────────────────
   Generates a cryptographically random, base64-encoded nonce for each HTTP
   response. The nonce is injected into the HTML (replacing {{NONCE}}) and
   into the Content-Security-Policy header so the browser only executes
   scripts that carry the matching nonce attribute.
   Every response therefore gets a unique nonce — this is why the HTML page
   is served with Cache-Control: no-store.
*/
function generateNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

/* ─── CSP builder ──────────────────────────────────────────────────────────
   Builds the full Content-Security-Policy header value.

   Key design decisions
   ────────────────────
   script-src
     • 'nonce-{N}'      — allows only the two <script> tags in index.html
                          that carry the matching nonce attribute.
     • 'strict-dynamic' — the nonced scripts may dynamically load additional
                          scripts (e.g. AdSense loads its sub-scripts); those
                          child scripts are transitively trusted without needing
                          their own nonce. In browsers that support it, the
                          host allowlist entries below are ignored; they are
                          kept only as a fallback for older browsers.
     • No 'unsafe-inline' — inline event handlers (onclick=…) are blocked;
                          all event wiring is done in client.js instead.

   connect-src
     Extended to include the AdSense/DoubleClick domains that were previously
     blocked, causing the console CSP errors shown in Lighthouse.

   frame-src
     Added https://pagead2.googlesyndication.com which AdSense needs for
     framing and was missing from the original policy.

   style-src
     No 'unsafe-inline' — all inline style="" attributes have been moved to
     CSS classes in styles.css.
*/
function buildCSP(nonce) {
  const d = {
    'default-src': ["'self'"],

    'script-src': [
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      // Fallback allowlist for browsers without nonce/strict-dynamic support:
      'https://pagead2.googlesyndication.com',
      'https://partner.googleadservices.com',
      'https://tpc.googlesyndication.com',
      'https://www.googletagservices.com',
      'https://static.cloudflareinsights.com',
    ],

    'style-src': [
      "'self'",
	  "'unsafe-inline'",          // required — AdSense injects inline styles
      'https://fonts.googleapis.com',
    ],

    'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],

    'img-src': ["'self'", 'data:', 'https:'],

    'connect-src': [
      "'self'",
      'https://cloudflareinsights.com',
      'https://pagead2.googlesyndication.com',
      'https://googleads.g.doubleclick.net',
      'https://ep1.adtrafficquality.google',
	  'https://ep2.adtrafficquality.google',
      'https://adservice.google.com',
	  'https://www.google.com',
    ],

    'frame-src': [
      'https://googleads.g.doubleclick.net',
      'https://tpc.googlesyndication.com',
      'https://pagead2.googlesyndication.com',
	  'https://ep2.adtrafficquality.google',
	  'https://www.google.com',
    ],

    'object-src':  ["'none'"],
    'base-uri':    ["'self'"],
    'form-action': ["'self'"],
  };

  return Object.entries(d)
    .map(([k, v]) => `${k} ${v.join(' ')}`)
    .join('; ');
}

/* ─── Common asset headers (shared by CSS and JS responses) ─────────────── */
const ASSET_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  // One day cache + one week stale-while-revalidate.
  // Bump the filename (e.g. styles.v2.css) to bust the cache on breaking changes.
  'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
};

/* ─── Fetch handler ─────────────────────────────────────────────────────── */
export default {
  async fetch(request) {
    const url = new URL(request.url);

    /* ── /styles.css ──────────────────────────────────────────────────── */
    if (url.pathname === '/styles.css') {
      return new Response(css, {
        headers: {
          'Content-Type': 'text/css; charset=UTF-8',
          ...ASSET_HEADERS,
        },
      });
    }

    /* ── /assets/client.js ────────────────────────────────────────────── */
    if (url.pathname === '/assets/client.js') {
      return new Response(clientJs, {
        headers: {
          'Content-Type': 'application/javascript; charset=UTF-8',
          ...ASSET_HEADERS,
        },
      });
    }

    /* ── /sample.pac ──────────────────────────────────────────────────── */
    if (url.pathname === '/sample.pac') {
      const pac = [
        'function FindProxyForURL(url, host) {',
        '  // Bypass proxy for plain hostnames (intranet)',
        '  if (isPlainHostName(host)) return "DIRECT";',
        '',
        '  // Bypass for RFC1918 private ranges',
        '  var ip = dnsResolve(host);',
        '  if (ip && (',
        '       isInNet(ip, "10.0.0.0",    "255.0.0.0")',
        '    || isInNet(ip, "172.16.0.0",  "255.240.0.0")',
        '    || isInNet(ip, "192.168.0.0", "255.255.0.0")',
        '    || isInNet(ip, "127.0.0.0",   "255.0.0.0")',
        '  )) return "DIRECT";',
        '',
        '  // Route everything else through the proxy',
        '  return "PROXY proxy.example.com:8080; DIRECT";',
        '}',
      ].join('\n');

      return new Response(pac, {
        headers: {
          'Content-Type':  'application/x-ns-proxy-autoconfig',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }
	
	/* ── Main page (/ and /index.html) ───────────────────────────────── */
    if (url.pathname === '/' || url.pathname === '/index.html') {
      const nonce = generateNonce();
      const page  = html.replace(/\{\{NONCE\}\}/g, nonce);

      return new Response(page, {
        headers: {
          'Content-Type':           'text/html; charset=UTF-8',
          // Must not cache: nonce changes on every response.
          'Cache-Control':          'no-store',

          // Security headers
          'X-Content-Type-Options':       'nosniff',
          'X-Frame-Options':              'DENY',
          'Referrer-Policy':              'strict-origin-when-cross-origin',
          'Cross-Origin-Opener-Policy':   'same-origin-allow-popups',
          'Cross-Origin-Resource-Policy': 'same-origin',
          'Permissions-Policy':           'camera=(), microphone=(), geolocation=()',

          // Primary CSP (enforcing)
          'Content-Security-Policy': buildCSP(nonce),

          // Trusted Types — report-only until confirmed compatible with AdSense.
          // Promote to enforcing once you verify no violations appear in your
          // reporting endpoint.
          'Content-Security-Policy-Report-Only': "require-trusted-types-for 'script'",
        },
      });
    }

    /* ── 404 Never used ────────────────────────────────────────────────── */
    return new Response('Not found', { status: 404 });
  },
};
