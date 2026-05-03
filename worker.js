/**
 * PAC Explained — Cloudflare Worker
 *
 * Serves the PAC file reference site as a static HTML page.
 * Deploy with: wrangler deploy
 */

import html from './index.html';

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Serve the main page for / and /index.html
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return new Response(html, {
        headers: {
          'Content-Type': 'text/html; charset=UTF-8',
          'Cache-Control': 'public, max-age=3600',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
        },
      });
    }

    // Serve a sample proxy.pac for users who want to link to it
    if (url.pathname === '/sample.pac') {
      const pac = `function FindProxyForURL(url, host) {
  // Bypass proxy for plain hostnames (intranet)
  if (isPlainHostName(host)) return "DIRECT";

  // Bypass for RFC1918 private ranges
  var ip = dnsResolve(host);
  if (ip && (
    || isInNet(ip, "10.0.0.0",    "255.0.0.0")
    || isInNet(ip, "172.16.0.0",  "255.240.0.0")
    || isInNet(ip, "192.168.0.0", "255.255.0.0")
    || isInNet(ip, "127.0.0.0",   "255.0.0.0")
  )) return "DIRECT";

  // Route everything else through the proxy
  return "PROXY proxy.example.com:8080; DIRECT";
}`;
      return new Response(pac, {
        headers: {
          'Content-Type': 'application/x-ns-proxy-autoconfig',
          'Cache-Control': 'public, max-age=300',
        },
      });
    }

    // 404 for anything else
    return new Response('Not found', { status: 404 });
  },
};
