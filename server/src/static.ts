import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { siteForHost, type SiteConfig } from '@interlinear/shared'

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

/**
 * Brand the SPA shell for the site the request landed on: title, meta
 * description, favicon, and social-preview (Open Graph) tags — so a
 * sutta.stream link unfurls as sutta.stream, not as interlinear.
 */
export function renderIndexHtml(html: string, site: SiteConfig): string {
  const social = [
    `<meta property="og:site_name" content="${escapeHtml(site.name)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="https://${site.domain}/" />`,
    `<meta property="og:title" content="${escapeHtml(site.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(site.description)}" />`,
    ...(site.ogImage
      ? [`<meta property="og:image" content="${escapeHtml(site.ogImage)}" />`]
      : []),
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="theme-color" content="${escapeHtml(site.themeColor)}" />`,
  ].join('\n    ')
  return html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(site.title)}</title>`)
    .replace(
      /(<meta[^>]*name="description"[\s\S]*?content=")[^"]*(")/,
      (_m, before: string, after: string) =>
        `${before}${escapeHtml(site.description)}${after}`,
    )
    .replace(
      /(<link rel="icon" href=")[^"]*(")/,
      (_m, before: string, after: string) => `${before}${site.favicon}${after}`,
    )
    .replace('</head>', `  ${social}\n  </head>`)
}

/** Serve the built web app (single-page app with client-side routing). */
export function createStaticHandler(root: string) {
  // index.html is rendered per site; the built file only changes with a
  // deploy, so cache the branded shells for the process's lifetime.
  const indexCache = new Map<string, string>()

  return (req: http.IncomingMessage, res: http.ServerResponse): void => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405).end()
      return
    }
    const url = new URL(req.url ?? '/', 'http://localhost')
    const requested = path.normalize(decodeURIComponent(url.pathname))
    let filePath = path.join(root, requested)
    if (!filePath.startsWith(root)) {
      res.writeHead(403).end()
      return
    }
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(root, 'index.html') // SPA fallback
    }
    if (!fs.existsSync(filePath)) {
      res.writeHead(404).end('web app not built — run: pnpm build')
      return
    }

    if (filePath === path.join(root, 'index.html')) {
      const site = siteForHost(req.headers.host)
      let html = indexCache.get(site.id)
      if (html === undefined) {
        html = renderIndexHtml(fs.readFileSync(filePath, 'utf8'), site)
        indexCache.set(site.id, html)
      }
      res.writeHead(200, {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-cache',
      })
      res.end(req.method === 'HEAD' ? undefined : html)
      return
    }

    const ext = path.extname(filePath).toLowerCase()
    const immutable = requested.startsWith(`${path.sep}assets${path.sep}`)
    res.writeHead(200, {
      'content-type': MIME[ext] ?? 'application/octet-stream',
      'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    })
    if (req.method === 'HEAD') {
      res.end()
      return
    }
    fs.createReadStream(filePath).pipe(res)
  }
}
