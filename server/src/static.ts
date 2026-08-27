import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'

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

/** Serve the built web app (single-page app with client-side routing). */
export function createStaticHandler(root: string) {
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
