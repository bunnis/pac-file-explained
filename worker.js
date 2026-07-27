/**
 * PAC Explained — Cloudflare Worker
 *
 * Serves the PAC file reference site with a per-request CSP nonce,
 * correct security headers, and dedicated routes for CSS and JS assets.
 *
 * Every HTML page is rendered through the shared shell in shell.js, which
 * supplies the <head>, sidebar, and footer. Each page is just a <main>
 * content fragment in ./pages/*.html:
 *
 *   pages/home.html      → /              (the full reference + live tester)
 *   pages/about.html     → /about
 *   pages/faq.html       → /faq
 *   pages/glossary.html  → /glossary
 *   pages/contact.html   → /contact
 *   pages/privacy.html   → /privacy
 *   pages/terms.html     → /terms
 *   pages/404.html       → fallback (HTTP 404)
 *
 *   styles.css           ← all site CSS (served at /styles.css)
 *   client.js            ← all site JS  (served at /client.js)
 */

import { renderPage } from './shell.js';

// Reference pages (the split-up single-page reference)
import home            from './pages/home.html';
import functions       from './pages/functions.html';
import performance     from './pages/performance.html';
import specialCases    from './pages/special-cases.html';
import bestPractices   from './pages/best-practices.html';
import security        from './pages/security.html';
import wpad            from './pages/wpad.html';
import testing         from './pages/testing.html';
import troubleshooting from './pages/troubleshooting.html';
import examples        from './pages/examples.html';
import tester          from './pages/tester.html';

// Standalone pages
import about    from './pages/about.html';
import faq      from './pages/faq.html';
import glossary from './pages/glossary.html';
import contact  from './pages/contact.html';
import privacy  from './pages/privacy.html';
import terms    from './pages/terms.html';
import notFound from './pages/404.html';

import css      from './styles.css';
import clientJs from './client.js';
import adsTxt   from './ads.txt';

/* ─── Page registry ─────────────────────────────────────────────────────────
   Maps a request path to the metadata + content fragment for that page.
   `navLabel` is the short label used in the prev/next reading-flow nav. */
const PAGES = {
  '/': {
    title: 'PAC Explained — Proxy Auto-Configuration Reference',
    description: 'The complete Proxy Auto-Configuration (PAC) file reference. Every function, best practices, security, WPAD, testing tools, and a live tester. pac-file-explained.dev — community replacement for findproxyforurl.com.',
    navLabel: 'Overview',
    main: home,
  },
  '/functions': {
    title: 'PAC function reference — PAC Explained',
    description: 'Every built-in PAC helper function with signatures, parameters, and examples: isPlainHostName, dnsDomainIs, isInNet, dnsResolve, shExpMatch, weekdayRange, plus the IPv6-aware Ex extensions.',
    navLabel: 'Function reference',
    main: functions,
  },
  '/performance': {
    title: 'PAC performance & DNS cost — PAC Explained',
    description: 'Which PAC helper functions trigger blocking DNS lookups, the cost of each, and how to order checks so proxy auto-configuration stays fast.',
    navLabel: 'Performance',
    main: performance,
  },
  '/special-cases': {
    title: 'Advanced PAC patterns — PAC Explained',
    description: 'Advanced PAC file patterns: load balancing by client IP or hostname hash, geo-routing by subnet, and URL path-based routing.',
    navLabel: 'Special use cases',
    main: specialCases,
  },
  '/best-practices': {
    title: 'PAC file best practices — PAC Explained',
    description: 'Ten rules for reliable, fast, maintainable PAC files: DNS-free checks first, resolve once, guard failures, a catch-all return, and the correct MIME type.',
    navLabel: 'Best practices',
    main: bestPractices,
  },
  '/security': {
    title: 'PAC file security — PAC Explained',
    description: 'PAC file security risks and how to mitigate them: MITM injection over HTTP, WPAD poisoning, credential exposure, DNS rebinding, and HTTPS path stripping.',
    navLabel: 'Security',
    main: security,
  },
  '/wpad': {
    title: 'WPAD auto-discovery — PAC Explained',
    description: 'How browsers find PAC files automatically via DHCP option 252 and DNS, how to host wpad.dat with the right MIME type, and why WPAD can be a security risk.',
    navLabel: 'WPAD',
    main: wpad,
  },
  '/testing': {
    title: 'Testing & debugging PAC files — PAC Explained',
    description: 'How to test and debug PAC files with pacparser/pactester, the Firefox browser console, and Chrome netlog before deploying to production.',
    navLabel: 'Testing & debugging',
    main: testing,
  },
  '/troubleshooting': {
    title: 'PAC troubleshooting — PAC Explained',
    description: 'Fixes for common PAC file bugs: myIpAddress returning 127.0.0.1, HTTPS path stripping, caching, wrong MIME type, isInNet failures, and alert() breaking evaluation.',
    navLabel: 'Troubleshooting',
    main: troubleshooting,
  },
  '/examples': {
    title: 'PAC file examples — PAC Explained',
    description: 'Real-world PAC file examples: corporate bypass-internal/proxy-external, split-tunnel by protocol, time-based routing, and SOCKS5 with HTTP fallback.',
    navLabel: 'Examples',
    main: examples,
  },
  '/tester': {
    title: 'Live PAC file tester — PAC Explained',
    description: 'Paste a PAC file and evaluate it against any URL right in your browser. All PAC helper functions are simulated and no data is sent anywhere.',
    navLabel: 'Live tester',
    main: tester,
  },
  '/about': {
    title: 'About — PAC Explained',
    description: 'Who maintains PAC Explained, why it exists, and how its content is sourced and kept accurate. An independent, open-source PAC file reference.',
    main: about,
  },
  '/faq': {
    title: 'PAC file FAQ — PAC Explained',
    description: 'Frequently asked questions about Proxy Auto-Configuration (PAC) files: HTTPS path matching, myIpAddress, WPAD, performance, testing, and more.',
    main: faq,
  },
  '/glossary': {
    title: 'PAC & proxy glossary — PAC Explained',
    description: 'Plain-language definitions of PAC and proxy terms: FindProxyForURL, DIRECT, PROXY, SOCKS, WPAD, RFC 1918, MIME type, MITM, and more.',
    main: glossary,
  },
  '/contact': {
    title: 'Contact — PAC Explained',
    description: 'Get in touch with the maintainer of PAC Explained for questions, corrections, or feedback about the PAC file reference.',
    main: contact,
  },
  '/privacy': {
    title: 'Privacy Policy — PAC Explained',
    description: 'How PAC Explained handles data, the third-party services it uses (Google AdSense, Cloudflare analytics, Google Fonts), and your privacy choices.',
    main: privacy,
  },
  '/terms': {
    title: 'Terms of Use — PAC Explained',
    description: 'The terms under which you may use PAC Explained and its content, including the no-warranty notice for code examples and security guidance.',
    main: terms,
  },
};

/* Reference reading order — drives the prev/next page nav. */
const REF_ORDER = [
  '/', '/functions', '/performance', '/special-cases', '/best-practices',
  '/security', '/wpad', '/testing', '/troubleshooting', '/examples', '/tester',
];

/* Canonical paths included in sitemap.xml (all real pages). */
const SITEMAP_PATHS = [
  ...REF_ORDER,
  '/about', '/faq', '/glossary', '/contact', '/privacy', '/terms',
];

/* ─── Nonce ────────────────────────────────────────────────────────────────
   Generates a cryptographically random, base64-encoded nonce for each HTTP
   response. The nonce is injected into the HTML and into the
   Content-Security-Policy header so the browser only executes scripts that
   carry the matching nonce attribute. Every response gets a unique nonce —
   this is why HTML pages are served with Cache-Control: no-store.
*/
function generateNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

/* ─── CSP builder ──────────────────────────────────────────────────────────
   script-src
     • 'nonce-{N}'      — allows only the <script> tags that carry the matching
                          nonce attribute.
     • 'strict-dynamic' — nonced scripts may load further scripts (e.g. AdSense
                          loads its sub-scripts); those are transitively trusted.
                          The host allowlist below is a fallback for older
                          browsers without strict-dynamic support.
*/
function buildCSP(nonce) {
  const directives = {
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
      'https://adservice.google.com',
      // Google consent message (AdSense Privacy & messaging CMP):
      'https://fundingchoicesmessages.google.com',
    ],

    'style-src': [
      "'self'",
      "'unsafe-inline'",          // required — AdSense injects inline styles
      'https://fonts.googleapis.com',
    ],

    'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],

    'img-src': ["'self'", 'data:', 'https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://www.google.com https://*.adtrafficquality.google'],

    'connect-src': [
      "'self'",
      'https://cloudflareinsights.com',
      'https://pagead2.googlesyndication.com',
      'https://googleads.g.doubleclick.net',
      'https://ep1.adtrafficquality.google',
      'https://ep2.adtrafficquality.google',
      'https://adservice.google.com',
      'https://www.google.com',
      'https://fundingchoicesmessages.google.com',
    ],

    'frame-src': [
      'https://googleads.g.doubleclick.net',
      'https://tpc.googlesyndication.com',
      'https://pagead2.googlesyndication.com',
      'https://ep2.adtrafficquality.google',
      'https://www.google.com',
      // Google consent message can render in an iframe:
      'https://fundingchoicesmessages.google.com',
    ],

    'object-src':  ["'none'"],
    'base-uri':    ["'self'"],
    'form-action': ["'self'"],
  };

  return Object.entries(directives)
    .map(([k, v]) => `${k} ${v.join(' ')}`)
    .join('; ');
}

/* ─── HTML page response ────────────────────────────────────────────────────
   Renders a page through the shell with a fresh nonce and the full set of
   security headers. Used for every HTML route, including the 404 fallback. */
function servePage(path, meta, status = 200, noAds = false) {
  const nonce = generateNonce();

  // Reading-flow prev/next for the reference pages.
  let prev, next;
  const i = REF_ORDER.indexOf(path);
  if (i !== -1) {
    const p = REF_ORDER[i - 1];
    const n = REF_ORDER[i + 1];
    if (p) prev = { href: p, label: PAGES[p].navLabel };
    if (n) next = { href: n, label: PAGES[n].navLabel };
  }

  const body = renderPage({
    title:       meta.title,
    description: meta.description,
    path,
    nonce,
    main:        meta.main,
    noAds,
    noIndex:     meta.noIndex,
    // Reference pages get TechArticle structured data in the shell.
    isRefPage:   i !== -1 && path !== '/',
    prev,
    next,
  });

  return new Response(body, {
    status,
    headers: {
      'Content-Type':  'text/html; charset=UTF-8',
      // Must not cache: nonce changes on every response.
      'Cache-Control': 'no-store',

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
      'Content-Security-Policy-Report-Only': "require-trusted-types-for 'script'",
    },
  });
}

/* ─── Common asset headers (shared by CSS and JS responses) ─────────────── */
const ASSET_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  // One year cache + one week stale-while-revalidate.
  // Bump the ?v= query (e.g. styles.css?v=2) to bust the cache on changes.
  'Cache-Control': 'public, max-age=31536000, stale-while-revalidate=604800',
};

/* ─── Fetch handler ─────────────────────────────────────────────────────── */
export default {
  async fetch(request) {
    const url = new URL(request.url);

    /* ── Canonical host: www → apex ───────────────────────────────────── */
    if (url.hostname === 'www.pac-file-explained.dev') {
      url.hostname = 'pac-file-explained.dev';
      return Response.redirect(url.toString(), 301);
    }

    /* ── /styles.css ──────────────────────────────────────────────────── */
    if (url.pathname === '/styles.css') {
      return new Response(css, {
        headers: {
          'Content-Type': 'text/css; charset=UTF-8',
          ...ASSET_HEADERS,
        },
      });
    }

    /* ── /client.js ───────────────────────────────────────────────────── */
    if (url.pathname === '/client.js') {
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

    /* ── /sitemap.xml ─────────────────────────────────────────────────── */
    if (url.pathname === '/sitemap.xml') {
      const origin  = 'https://pac-file-explained.dev';
      const entries = SITEMAP_PATHS.map((p) => {
        const priority = p === '/' ? '1.0' : '0.7';
        return `  <url>
    <loc>${origin}${p}</loc>
    <changefreq>monthly</changefreq>
    <priority>${priority}</priority>
  </url>`;
      }).join('\n');

      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`;

      return new Response(sitemap, {
        headers: {
          'Content-Type': 'application/xml; charset=UTF-8',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    /* ── /ads.txt ─────────────────────────────────────────────────────── */
    if (url.pathname === '/ads.txt') {
      return new Response(adsTxt, {
        headers: {
          'Content-Type': 'text/plain; charset=UTF-8',
          'Cache-Control': 'public, max-age=86400',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }

    /* ── HTML pages (home + standalone pages) ─────────────────────────── */
    // One canonical URL per page: 301 /index.html and trailing-slash
    // variants to the clean path instead of serving duplicate 200s.
    const path = url.pathname;
    let canonicalPath = path;
    if (canonicalPath === '/index.html') canonicalPath = '/';
    if (canonicalPath.length > 1 && canonicalPath.endsWith('/')) {
      canonicalPath = canonicalPath.replace(/\/+$/, '') || '/';
    }

    if (PAGES[canonicalPath]) {
      if (canonicalPath !== path) {
        url.pathname = canonicalPath;
        return Response.redirect(url.toString(), 301);
      }
      return servePage(canonicalPath, PAGES[canonicalPath]);
    }

    /* ── 404 fallback (styled page, no ads on error pages) ────────────── */
    return servePage(url.pathname, {
      title: 'Page not found — PAC Explained',
      description: 'The page you requested could not be found on PAC Explained.',
      main: notFound,
      noIndex: true,
    }, 404, true);
  },
};
