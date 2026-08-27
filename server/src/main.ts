import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createApp } from './app.js'
import { seed } from './seed.js'
import { createStaticHandler } from './static.js'
import { GlossWorker } from './worker.js'

const connectionString =
  process.env.DATABASE_URL ?? 'postgres://dev:dev@localhost:5432/interlinear'
const port = Number(process.env.PORT ?? 3001)

const here = path.dirname(fileURLToPath(import.meta.url))
const webDist = path.resolve(here, '../../web/dist')

const { app, store } = await createApp(connectionString)
await seed(store.pool)
await app.start()

const worker = new GlossWorker(app, store.pool)
worker.start()

const serveStatic = createStaticHandler(webDist)

const server = http.createServer((req, res) => {
  const url = req.url ?? '/'
  if (url === '/healthz') {
    res.writeHead(200, { 'content-type': 'text/plain' }).end('ok')
    return
  }
  if (url.startsWith('/_intenteffect')) {
    // New gloss/definition work may have been recorded by this request —
    // have the worker check shortly after it commits.
    if (req.method === 'POST' && url.startsWith('/_intenteffect/send')) {
      res.on('finish', () => worker.kick())
    }
    app.nodeHandler(req, res)
    return
  }
  serveStatic(req, res)
})

server.listen(port, '0.0.0.0', () => {
  console.log(`interlinear.io listening on :${port}`)
})

async function shutdown(): Promise<void> {
  worker.stop()
  server.close()
  await app.close()
  process.exit(0)
}
process.on('SIGINT', () => void shutdown())
process.on('SIGTERM', () => void shutdown())
