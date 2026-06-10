/**
 * PAC Explained — shared page shell
 *
 * Single source of truth for the document <head>, sidebar navigation, and
 * footer. Every page (home, about, privacy, …) is rendered by wrapping its
 * <main> content with renderPage(). This keeps the chrome identical across
 * the whole site and means a nav/footer change only has to be made once.
 *
 * The per-request CSP nonce is injected directly here (no {{NONCE}} token),
 * so the value matches the nonce sent in the Content-Security-Policy header.
 */

const SITE_ORIGIN = 'https://pac-file-explained.dev';

const FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,600;1,400&family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap';

/* ─── <head> ──────────────────────────────────────────────────────────────
   Mirrors the original index.html head, but title / description / canonical /
   Open Graph fields are per-page. Font loading stays non-render-blocking and
   the theme is applied before first paint to avoid a flash. */
function renderHead({ title, description, path, nonce, noAds }) {
  const canonical = SITE_ORIGIN + path;
  // AdSense policy: don't serve ads on error / no-content pages (e.g. 404).
  const adsTag = noAds ? '' : `<script async
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8036763385530087"
        crossorigin="anonymous"
        nonce="${nonce}"></script>`;
  return `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<meta name="description" content="${description}">

<link rel="canonical" href="${canonical}">
<meta property="og:type"         content="website">
<meta property="og:url"          content="${canonical}">
<meta property="og:title"        content="${title}">
<meta property="og:description"  content="${description}">
<meta name="twitter:card"        content="summary_large_image">
<meta name="twitter:title"       content="${title}">
<meta name="twitter:description" content="${description}">

<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🔀</text></svg>">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

<link rel="preload" as="style" id="gfonts-preload" href="${FONTS_HREF}">
<noscript><link rel="preload" as="font" href="${FONTS_HREF}"></noscript>

<link rel="preload" href="/styles.css?v=1" as="style">
<link rel="stylesheet" href="/styles.css?v=1">
${adsTag}

<script nonce="${nonce}">
(function(){
  var t = localStorage.getItem('pac-theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', t);
  var gf = document.getElementById('gfonts-preload');
  if (gf) { gf.rel = 'stylesheet'; }
})();
</script>
</head>`;
}

/* ─── Sidebar ───────────────────────────────────────────────────────────────
   Shared across every page. Section links are root-relative (/#anchor) so they
   navigate back to the home page from any sub-page; client.js highlights the
   active one while scrolling the home page. The "Resources" group links to the
   standalone pages. */
const SIDEBAR = `<nav id="sidebar" aria-label="Site navigation">
  <div class="nav-logo">
    <a href="/">
      <div class="nav-logo-name">pac explained</div>
      <div class="nav-logo-sub">PAC File Reference</div>
    </a>
    <button class="theme-toggle" title="Toggle theme" aria-label="Toggle theme">☀</button>
  </div>

  <div class="nav-footer">
    <a class="bmc-btn" href="https://buymeacoffee.com/abskulaity" target="_blank" rel="noopener">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
        <path d="M7 3.5C7 2.67 7.67 2 8.5 2S10 2.67 10 3.5 9.33 5 8.5 5 7 4.33 7 3.5z" opacity="0.6"/>
        <path d="M11 2.5C11 1.67 11.67 1 12.5 1S14 1.67 14 2.5 13.33 4 12.5 4 11 3.33 11 2.5z" opacity="0.6"/>
        <path d="M3 7h14v2h1.5A2.5 2.5 0 0 1 21 11.5v0A2.5 2.5 0 0 1 18.5 14H17a6 6 0 0 1-6 6H9A6 6 0 0 1 3 14V7z"/>
        <path d="M17 9.5h1.5a1 1 0 0 1 0 2H17v-2z" fill="rgba(0,0,0,0.2)"/>
      </svg>
  Buy me a coffee
</a>
    <a class="nav-gh" href="https://github.com/bunnis/pac-file-explained" target="_blank" rel="noopener">
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
      GitHub
    </a>
  </div>

  <div class="nav-controls">
    <button class="collapse-all-btn" id="collapseAllBtn" title="Collapse all">
      <span id="collapseIcon">−</span> Collapse all
    </button>
  </div>

  <div class="nav-group collapsed" id="ng-overview">
    <div class="nav-group-label" role="button" tabindex="0"
         aria-expanded="false" aria-controls="ng-overview-links">
      Overview<span class="nav-caret" aria-hidden="true">▾</span>
    </div>
    <div class="nav-group-links" id="ng-overview-links">
      <a href="/#about">About this site</a>
      <a href="/#intro">What is a PAC file?</a>
      <a href="/#quickstart">Quick start</a>
      <a href="/#return-values">Return values</a>
      <a href="/#proxy-chaining">Proxy chaining</a>
    </div>
  </div>

  <div class="nav-group collapsed" id="ng-functions">
    <div class="nav-group-label" role="button" tabindex="0"
         aria-expanded="false" aria-controls="ng-functions-links">
      Function reference<span class="nav-caret" aria-hidden="true">▾</span>
    </div>
    <div class="nav-group-links" id="ng-functions-links">
      <a href="/#isPlainHostName" class="fn-link">isPlainHostName()</a>
      <a href="/#dnsDomainIs" class="fn-link">dnsDomainIs()</a>
      <a href="/#localHostOrDomainIs" class="fn-link">localHostOrDomainIs()</a>
      <a href="/#isResolvable" class="fn-link">isResolvable()</a>
      <a href="/#isInNet" class="fn-link">isInNet()</a>
      <a href="/#dnsResolve" class="fn-link">dnsResolve()</a>
      <a href="/#myIpAddress" class="fn-link">myIpAddress()</a>
      <a href="/#dnsDomainLevels" class="fn-link">dnsDomainLevels()</a>
      <a href="/#shExpMatch" class="fn-link">shExpMatch()</a>
      <a href="/#weekdayRange" class="fn-link">weekdayRange()</a>
      <a href="/#dateRange" class="fn-link">dateRange()</a>
      <a href="/#timeRange" class="fn-link">timeRange()</a>
      <a href="/#alert-fn" class="fn-link">alert()</a>
    </div>
  </div>

  <div class="nav-group collapsed" id="ng-advanced">
    <div class="nav-group-label" role="button" tabindex="0"
         aria-expanded="false" aria-controls="ng-advanced-links">
      Advanced<span class="nav-caret" aria-hidden="true">▾</span>
    </div>
    <div class="nav-group-links" id="ng-advanced-links">
      <a href="/#perf">Compute-intensive functions</a>
      <a href="/#special">Special use cases</a>
    </div>
  </div>

  <div class="nav-group collapsed" id="ng-guides">
    <div class="nav-group-label" role="button" tabindex="0"
         aria-expanded="false" aria-controls="ng-guides-links">
      Guides<span class="nav-caret" aria-hidden="true">▾</span>
    </div>
    <div class="nav-group-links" id="ng-guides-links">
      <a href="/#best-practices">Best practices</a>
      <a href="/#security">Security</a>
      <a href="/#wpad">WPAD auto-discovery</a>
    </div>
  </div>

  <div class="nav-group collapsed" id="ng-devtools">
    <div class="nav-group-label" role="button" tabindex="0"
         aria-expanded="false" aria-controls="ng-devtools-links">
      Dev tools<span class="nav-caret" aria-hidden="true">▾</span>
    </div>
    <div class="nav-group-links" id="ng-devtools-links">
      <a href="/#testing">Testing &amp; debugging</a>
      <a href="/#troubleshooting">Troubleshooting</a>
    </div>
  </div>

  <div class="nav-group collapsed" id="ng-ref">
    <div class="nav-group-label" role="button" tabindex="0"
         aria-expanded="false" aria-controls="ng-ref-links">
      Examples<span class="nav-caret" aria-hidden="true">▾</span>
    </div>
    <div class="nav-group-links" id="ng-ref-links">
      <a href="/#examples">Common examples</a>
      <a href="/#live-tester">Live tester</a>
    </div>
  </div>

  <div class="nav-group collapsed" id="ng-resources">
    <div class="nav-group-label" role="button" tabindex="0"
         aria-expanded="false" aria-controls="ng-resources-links">
      Resources<span class="nav-caret" aria-hidden="true">▾</span>
    </div>
    <div class="nav-group-links" id="ng-resources-links">
      <a href="/faq">FAQ</a>
      <a href="/glossary">Glossary</a>
      <a href="/about">About</a>
      <a href="/contact">Contact</a>
    </div>
  </div>

</nav>`;

/* ─── Footer ────────────────────────────────────────────────────────────────
   Shared. The page-navigation row makes every standalone page reachable from
   every page (good for users and crawlers); the second row keeps the original
   spec references. */
const FOOTER = `<footer class="site-footer">
  <nav class="footer-nav" aria-label="Pages">
    <a href="/">Home</a> ·
    <a href="/about">About</a> ·
    <a href="/faq">FAQ</a> ·
    <a href="/glossary">Glossary</a> ·
    <a href="/contact">Contact</a> ·
    <a href="/privacy">Privacy Policy</a> ·
    <a href="/terms">Terms</a>
  </nav>
  <p>
    PAC Explained — community reference for Proxy Auto-Configuration.
    Inspired by the original <em>findproxyforurl.com</em>.
    Spec references:
    <a href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Proxy_servers_and_tunneling/Proxy_Auto-Configuration_PAC_file" target="_blank" rel="noopener">MDN</a> ·
    <a href="https://en.wikipedia.org/wiki/Proxy_auto-config" target="_blank" rel="noopener">Wikipedia</a> ·
    <a href="https://github.com/manugarg/pacparser" target="_blank" rel="noopener">pacparser</a> ·
    <a href="https://github.com/bunnis/pac-file-explained" target="_blank" rel="noopener">GitHub</a> ·
    <a href="https://buymeacoffee.com/abskulaity" target="_blank" rel="noopener">Buy me a coffee ☕</a>
  </p>
</footer>`;

/* ─── Full page ─────────────────────────────────────────────────────────── */
export function renderPage({ title, description, path, nonce, main, noAds }) {
  return `${renderHead({ title, description, path, nonce, noAds })}
<body>
<div class="site-wrapper">

${SIDEBAR}

<div class="content-area">
<main id="top">
${main}
</main>

${FOOTER}

</div><!-- /content-area -->
</div><!-- /site-wrapper -->

<script src="/client.js?v=1" nonce="${nonce}" defer></script>
</body>
</html>`;
}
