# PAC Explained

> The complete Proxy Auto-Configuration (PAC) file reference — a community replacement for the now-offline **findproxyforurl.com**.

[![Buy me a coffee](https://img.shields.io/badge/Buy%20me%20a%20coffee-%E2%98%95-ffdd00?style=flat&labelColor=101010)](https://buymeacoffee.com/abskulaity)
[![Cloudflare Workers](https://img.shields.io/badge/Hosted%20on-Cloudflare%20Workers-f38020?style=flat&logo=cloudflare&logoColor=white)](https://workers.cloudflare.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-5af0a8?style=flat)](LICENSE)

---

## What is this?

**findproxyforurl.com** was for years the go-to reference for anyone writing or debugging PAC files. When it went offline, it left a real gap — most alternative documentation is scattered across MDN, decade-old MSDN articles, and forum threads.

This site fills that gap. It covers everything findproxyforurl.com did, and more:

- **Full function reference** — every PAC helper function with signatures, parameters, and examples
- **Return values** — `DIRECT`, `PROXY`, `SOCKS4`, `SOCKS5` explained
- **Proxy chaining** — how the browser evaluates fallback chains left-to-right
- **Compute-intensive functions** — which functions trigger DNS and how to avoid unnecessary lookups
- **Best practices** — 10 rules for reliable, fast, maintainable PAC files
- **Security** — MITM risks, WPAD poisoning, credential exposure, DNS rebinding
- **WPAD auto-discovery** — how browsers find PAC files via DHCP and DNS
- **Testing & debugging** — `pacparser`, Firefox DevTools, Chrome netlog
- **Troubleshooting** — common bugs: `myIpAddress()` returning 127.0.0.1, HTTPS path stripping, caching, silent failures
- **Special use cases** — load balancing by IP octet, hostname hash, geo-routing, path-based routing
- **Live in-browser tester** — paste your PAC file and evaluate it against any URL, no data sent anywhere

---

## Live site

👉 **[pac-file-explained.dev](https://pac-file-explained.dev)** 

---

## Repository structure

```
pac-file-explained/
├── shell.js         # Shared page shell: <head>, sidebar nav, footer
├── pages/           # One <main> content fragment per page
│   ├── home.html    #   /            full reference + live tester
│   ├── about.html   #   /about
│   ├── faq.html     #   /faq
│   ├── glossary.html#   /glossary
│   ├── contact.html #   /contact
│   ├── privacy.html #   /privacy
│   ├── terms.html   #   /terms
│   └── 404.html     #   styled 404 fallback
├── styles.css       # All site CSS (served at /styles.css)
├── client.js        # All site JS  (served at /client.js)
├── worker.js        # Cloudflare Worker: routing, CSP nonce, sitemap, ads.txt
├── ads.txt          # AdSense authorised sellers
├── wrangler.toml    # Wrangler deployment configuration
└── README.md        # This file
```

No build tools, no dependencies, no bundlers. Each page is a plain HTML
fragment in `pages/`; the Worker wraps it with the shared shell in `shell.js`
(adding the `<head>`, sidebar, footer, and a per-request CSP nonce) and serves
it. Editing content means editing one fragment — the chrome lives in one place.

---

## Deploy to Cloudflare Workers

Cloudflare Workers has a generous free tier (100,000 requests/day) and deploys globally in seconds.

### Prerequisites

- A [Cloudflare account](https://dash.cloudflare.com/sign-up) (free)
- [Node.js](https://nodejs.org) 18+

### Steps

**1. Install Wrangler**

```bash
npm install -g wrangler
```

**2. Log in to Cloudflare**

```bash
wrangler login
```

**3. Clone this repo**

```bash
git clone https://github.com/bunnis/pac-file-explained.git
cd pac-file-explained
```

**4. Deploy**

```bash
wrangler deploy
```

Wrangler will output a `*.workers.dev` URL where your site is live immediately.

### Local development

```bash
wrangler dev
```

Opens a local preview at `http://localhost:8787` with hot reload.

### Add a custom domain

Once deployed, go to **Cloudflare Dashboard → Workers & Pages → your worker → Settings → Domains & Routes → Add Custom Domain**.

Or add a route directly to `wrangler.toml`:

```toml
routes = [
  { pattern = "pac-file-explained.com/*", zone_name = "pac-file-explained.com" }
]
```

---

## Deploy to other platforms

The pages are assembled at request time by the Cloudflare Worker (`worker.js` +
`shell.js`), so it isn't a drop-in static folder anymore. To host elsewhere,
pre-render each route — for every entry in the Worker's `PAGES` map, render
`shell.renderPage()` to a static `.html` file (e.g. `/privacy` → `privacy/index.html`)
and upload the result plus `styles.css`, `client.js`, `ads.txt`, and `sitemap.xml`
to any static host (GitHub Pages, Netlify, Vercel, a CDN, etc.).

---

## Contributing

Contributions are welcome. This is a reference site — accuracy and clarity matter more than anything else.

### What's useful

- **Bug fixes** — incorrect function descriptions, wrong return values, broken examples
- **Missing content** — browser-specific behaviour, edge cases, newer PAC features
- **Better examples** — real-world PAC patterns that aren't covered yet
- **Typos and clarity** — cleaner wording is always welcome

### How to contribute

1. Fork the repo
2. Make your changes in the relevant `pages/*.html` fragment (or `shell.js` for nav/footer)
3. Test locally with `wrangler dev` (the pages are composed by the Worker)
4. Open a pull request with a clear description of what changed and why

### Reporting issues

Open a [GitHub Issue](https://github.com/bunnis/pac-file-explained/issues) with:
- What's wrong or missing
- The correct information (with a source if possible)

---

## References

- [MDN — PAC file documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/Proxy_servers_and_tunneling/Proxy_Auto-Configuration_PAC_file)
- [Wikipedia — Proxy auto-config](https://en.wikipedia.org/wiki/Proxy_auto-config)
- [pacparser — CLI PAC file tester](https://github.com/manugarg/pacparser)
- [Cloudflare PAC best practices](https://developers.cloudflare.com/cloudflare-one/networks/resolvers-and-proxies/proxy-endpoints/best-practices/)

---

## Support

If this site saved you time, consider buying me a coffee:

[![Buy me a coffee](https://img.shields.io/badge/Buy%20me%20a%20coffee-%E2%98%95-ffdd00?style=for-the-badge&labelColor=101010)](https://buymeacoffee.com/abskulaity)

---

## License

[MIT](LICENSE) — free to use, fork, and adapt.
