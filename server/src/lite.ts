/**
 * Lite mode — the library and the reader as plain HTML documents, with no
 * JavaScript at all.
 *
 * E-reader browsers (the Kindle's experimental browser above all) run an
 * ancient WebKit that cannot parse the app's module bundle: the React app
 * renders a blank page there. Lite mode serves the same data — read through
 * the same projections the SPA reads — as documents an e-ink browser can
 * handle: links instead of click handlers, `<form method="get">` instead of
 * a live search box, one page per dictionary entry instead of a sidebar,
 * and pagination so a long sutta never becomes one enormous document.
 *
 * Legacy browsers land here three ways: the `nomodule` redirect in
 * `web/index.html` (the most reliable signal — a browser that ignores
 * `type="module"` cannot run the bundle), this module's user-agent check
 * for browsers with JavaScript off, and the `/lite` link in the footer.
 * `?full=1` on any page opts back out of the redirect.
 */

import crypto from 'node:crypto'
import type http from 'node:http'
import {
  defineWord,
  filterLibrary,
  groupLibrary,
  langHasDpd,
  literalGloss,
  mergeDefinitions,
  normalizeWord,
  requestGloss,
  searchLibrary,
  siteForHost,
  suttaCentralUrl,
  textDetail,
  textLibrary,
  wordDefinition,
  type Chunk,
  type Definition,
  type SiteConfig,
  type TextDetail,
  type TextSummary,
  type Word,
  type WordDefinitionState,
} from '@interlinear/shared'
import type { App } from './app.js'
import { escapeHtml } from './static.js'

/** Chunks (stanzas/paragraphs) per reader page — a Kindle renders a long
 * sutta far more happily in slices than in one 300-stanza document. */
export const CHUNKS_PER_PAGE = 12

/** Library entries per index page. */
export const LIBRARY_PAGE_SIZE = 60

/** How many times the word page may auto-refresh while an entry is being
 * written before it stops and offers a manual reload. */
const MAX_WORD_REFRESHES = 8

export type GlossMode = 'fluent' | 'literal' | 'off'

/* ------------------------------------------------------------------ */
/* Which browsers need lite mode                                       */
/* ------------------------------------------------------------------ */

/** E-reader tokens: these devices ship browsers that cannot run the app. */
const EREADERS = /\b(kindle|kobo|pocketbook|remarkable|nook|boox|inkbook|bookeen|tolino)\b/i

/**
 * Whether a user agent belongs to a browser too old (or too limited) to run
 * the module bundle. Deliberately narrow — a false positive would send a
 * capable browser to the plain-HTML version — and only a fallback: the
 * `nomodule` redirect catches legacy browsers by capability instead, while
 * this covers the ones with JavaScript turned off.
 */
export function isLegacyBrowser(userAgent: string | undefined): boolean {
  if (!userAgent) return false
  // Amazon's Fire tablets are modern Chromium and sometimes carry "Kindle".
  if (/\bSilk\//i.test(userAgent)) return false
  if (EREADERS.test(userAgent)) return true
  if (/\bMSIE \d|\bTrident\//i.test(userAgent)) return true
  // Pre-2012 WebKit: no ES6, no modules. Current engines report 537.36
  // (Chromium) or 605+ (Safari), so this only catches genuinely old ones.
  const webkit = /AppleWebKit\/(\d+)/i.exec(userAgent)
  return webkit ? Number(webkit[1]) < 537 : false
}

/**
 * The lite URL a legacy browser's request should be redirected to, or null
 * when the request should be served the normal app. Mirrors the SPA's
 * routes: `/` → `/lite`, `/text/<slug>` → `/lite/text/<slug>`. `?full=1`
 * opts out, so the escape hatch on every lite page keeps working.
 */
export function liteRedirectFor(
  url: string,
  userAgent: string | undefined,
): string | null {
  let parsed: URL
  try {
    parsed = new URL(url, 'http://localhost')
  } catch {
    return null // unparseable target: let the static handler answer it
  }
  if (parsed.searchParams.has('full')) return null
  if (parsed.pathname.startsWith('/lite')) return null
  if (!isLegacyBrowser(userAgent)) return null
  if (parsed.pathname === '/') return '/lite'
  const text = /^\/text\/([^/]+)\/?$/.exec(parsed.pathname)
  return text ? `/lite/text/${text[1]}` : null
}

/* ------------------------------------------------------------------ */
/* Page shell                                                          */
/* ------------------------------------------------------------------ */

/**
 * Deliberately primitive CSS: no flexbox, no grid, no custom properties, no
 * rem — an eight-year-old WebKit understands all of it. Interlinear words
 * stack with `inline-block`, which degrades into readable (if untidy) inline
 * text even where that fails. Black on white, since e-ink has no color.
 */
const LITE_CSS = `
body{margin:0;padding:0 14px 40px;background:#fff;color:#000;
  font-family:Georgia,"Times New Roman",serif;font-size:19px;line-height:1.5}
.wrap{max-width:44em;margin:0 auto}
a{color:#000}
h1,h2,h3{font-weight:normal;margin:16px 0 8px}
h1{font-size:26px}
h2{font-size:20px;border-bottom:1px solid #000;padding-bottom:2px}
h3{font-size:23px}
p{margin:10px 0}
ol,ul{margin:8px 0;padding-left:26px}
small{font-size:15px;color:#444}
.top{border-bottom:2px solid #000;margin-bottom:14px;padding:12px 0 8px}
.top a{text-decoration:none}
.brand{font-size:24px;margin:0}
.bar{font-size:15px;color:#444;margin:10px 0}
.bar b{background:#000;color:#fff;padding:1px 5px;font-weight:normal}
.note{border:1px solid #999;padding:8px 10px;font-size:16px}
.search{margin:14px 0}
.search input{font-size:18px;padding:5px;width:60%;border:1px solid #000}
.search button{font-size:18px;padding:5px 10px;border:1px solid #000;background:#fff}
.list{margin:0;padding:0;list-style:none}
.list li{margin:0;padding:7px 0;border-bottom:1px solid #ddd}
.list a{text-decoration:none}
.meta{display:block;font-size:14px;color:#555}
.words{margin:14px 0 6px}
.w{display:inline-block;vertical-align:bottom;text-align:center;
  margin:0 4px 12px 0;text-decoration:none}
.g{display:block;font-size:12px;line-height:1.25;color:#555}
.t{display:block;font-size:20px;line-height:1.3}
.raw{margin:14px 0;font-size:20px}
.tr{margin:4px 0 14px;color:#333;font-size:17px;font-style:italic}
.pager{margin:20px 0;font-size:17px;border-top:1px solid #999;padding-top:10px}
.foot{margin-top:24px;border-top:1px solid #999;padding-top:10px;
  font-size:14px;color:#444}
`

interface ShellOptions {
  title: string
  body: string
  /** Seconds until an automatic reload, for pages waiting on the worker. */
  refresh?: { seconds: number; url: string }
  noindex?: boolean
}

function shell(site: SiteConfig, options: ShellOptions): string {
  const head = [
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    options.noindex ? '<meta name="robots" content="noindex,nofollow">' : '',
    options.refresh
      ? `<meta http-equiv="refresh" content="${options.refresh.seconds}; url=${escapeHtml(options.refresh.url)}">`
      : '',
    `<title>${escapeHtml(options.title)}</title>`,
    `<link rel="icon" href="${escapeHtml(site.favicon)}">`,
    `<style>${LITE_CSS}</style>`,
  ].filter(Boolean)
  return `<!doctype html>
<html lang="en">
<head>
${head.join('\n')}
</head>
<body>
<div class="wrap">
<div class="top"><p class="brand"><a href="/lite">${escapeHtml(site.name)}</a></p></div>
${options.body}
<p class="foot">Lite mode — plain HTML for e-readers and old browsers.
<a href="/?full=1">Full version</a></p>
</div>
</body>
</html>
`
}

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

/** Build a URL with the given query parameters, dropping empty ones. The
 * result still needs escaping before it goes into an attribute. */
function url(path: string, params: Record<string, string | number | undefined>): string {
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join('&')
  return query ? `${path}?${query}` : path
}

function link(href: string, label: string): string {
  return `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`
}

/** One row of "Glosses: [Fluent] Literal Off"-style toggles: the active
 * option is marked rather than linked, so there is nothing to un-tap. */
function options(
  label: string,
  current: string,
  choices: Array<{ id: string; label: string; href: string }>,
): string {
  const rendered = choices.map((choice) =>
    choice.id === current
      ? `<b>${escapeHtml(choice.label)}</b>`
      : link(choice.href, choice.label),
  )
  return `${escapeHtml(label)}: ${rendered.join(' · ')}`
}

/** Clamp a `?p=` value to a real page number (1-based). */
export function pageParam(raw: string | null, pages: number): number {
  const page = Number(raw ?? '1')
  if (!Number.isFinite(page)) return 1
  return Math.min(Math.max(Math.trunc(page), 1), Math.max(pages, 1))
}

function pager(
  page: number,
  pages: number,
  href: (page: number) => string,
): string {
  if (pages <= 1) return ''
  const parts = [
    page > 1 ? link(href(page - 1), '‹ Previous') : '',
    `Page ${page} of ${pages}`,
    page < pages ? link(href(page + 1), 'Next ›') : '',
  ].filter(Boolean)
  return `<p class="pager">${parts.join(' &nbsp;·&nbsp; ')}</p>`
}

/* ------------------------------------------------------------------ */
/* The library                                                         */
/* ------------------------------------------------------------------ */

function libraryEntry(text: TextSummary): string {
  const meta = [text.source, text.origTitle ? text.lang : null]
    .filter((part): part is string => Boolean(part))
    .join(' · ')
  const title = text.origTitle ?? text.title
  const subtitle = text.origTitle ? text.title : null
  return `<li>${link(`/lite/text/${encodeURIComponent(text.slug)}`, title)}
${subtitle ? `<span class="meta">${escapeHtml(subtitle)}</span>` : ''}
${meta ? `<span class="meta">${escapeHtml(meta)}</span>` : ''}</li>`
}

export function renderLibraryPage(
  site: SiteConfig,
  texts: TextSummary[],
  view: { query: string; page: number },
): string {
  // A search reaches past the home-page kind caps, exactly as the app's
  // search box does; `onlyKind` still holds, so sutta.stream stays suttas.
  const searching = view.query.trim() !== ''
  const shown = searchLibrary(
    filterLibrary(searching ? { ...site, kindCaps: undefined } : site, texts),
    view.query,
  )
  // Group first, then paginate the flattened order, so the collections stay
  // in canonical order across pages.
  const ordered = site.groupedLibrary
    ? groupLibrary(shown).flatMap((group) => group.texts)
    : shown
  const pages = Math.max(Math.ceil(ordered.length / LIBRARY_PAGE_SIZE), 1)
  const page = Math.min(view.page, pages)
  const slice = ordered.slice((page - 1) * LIBRARY_PAGE_SIZE, page * LIBRARY_PAGE_SIZE)

  let listing: string
  if (slice.length === 0) {
    listing = searching
      ? `<p>Nothing matches “${escapeHtml(view.query.trim())}”.</p>`
      : '<p>The library is empty.</p>'
  } else if (site.groupedLibrary) {
    listing = groupLibrary(slice)
      .map(
        (group) =>
          `<h2>${escapeHtml(group.name)}</h2>
<ul class="list">${group.texts.map(libraryEntry).join('\n')}</ul>`,
      )
      .join('\n')
  } else {
    listing = `<ul class="list">${slice.map(libraryEntry).join('\n')}</ul>`
  }

  const body = `<p>${escapeHtml(site.description)}</p>
<form class="search" action="/lite" method="get">
<input type="text" name="q" value="${escapeHtml(view.query)}"
 placeholder="${escapeHtml(site.searchPlaceholder)}">
<button type="submit">Search</button>
</form>
${searching ? `<p class="bar">${ordered.length} match${ordered.length === 1 ? '' : 'es'} for “${escapeHtml(view.query.trim())}” · ${link('/lite', 'clear')}</p>` : ''}
${listing}
${pager(page, pages, (n) => url('/lite', { q: view.query || undefined, p: n > 1 ? n : undefined }))}`

  return shell(site, {
    title: searching ? `“${view.query.trim()}” — ${site.name}` : site.title,
    body,
  })
}

/* ------------------------------------------------------------------ */
/* The reader                                                          */
/* ------------------------------------------------------------------ */

function wordUrl(lang: string, word: string, slug: string, kind: string): string {
  return url(`/lite/word/${encodeURIComponent(lang)}/${encodeURIComponent(word)}`, {
    from: slug,
    k: kind === 'prose' ? undefined : kind,
  })
}

/** One chunk's words, each stacked over its gloss. Words link to their
 * dictionary page; punctuation-only tokens (which normalize to nothing)
 * stay plain. */
function renderWords(
  words: Word[],
  text: { lang: string; slug: string; kind: string },
  mode: GlossMode,
): string {
  const parts: string[] = []
  for (const word of words) {
    const key = normalizeWord(word.w)
    const gloss =
      mode === 'literal' ? (literalGloss(word.m) ?? word.g) : mode === 'off' ? '' : word.g
    const inner =
      (mode === 'off' ? '' : `<span class="g">${escapeHtml(gloss || ' ')}</span>`) +
      `<span class="t">${escapeHtml(word.w)}</span>`
    parts.push(
      key
        ? `<a class="w" href="${escapeHtml(wordUrl(text.lang, key, text.slug, text.kind))}">${inner}</a>`
        : `<span class="w">${inner}</span>`,
    )
    if (word.nl) parts.push('<br>')
  }
  return `<p class="words">${parts.join('\n')}</p>`
}

function renderChunk(
  chunk: Chunk,
  text: { lang: string; slug: string; kind: string },
  mode: GlossMode,
  translation: boolean,
): string {
  const body = chunk.words
    ? renderWords(chunk.words, text, mode)
    : `<p class="raw">${escapeHtml(chunk.original)}</p>`
  // An unglossed chunk always shows its translation — it is all the reader
  // has until the worker gets to it.
  const showTranslation = (translation || !chunk.words) && chunk.translation
  return `${body}${showTranslation ? `<p class="tr">${escapeHtml(chunk.translation!)}</p>` : ''}`
}

export function renderTextPage(
  site: SiteConfig,
  detail: TextDetail,
  view: { page: number; gloss: GlossMode; translation: boolean },
): string {
  const { text, chunks } = detail
  const pages = Math.max(Math.ceil(chunks.length / CHUNKS_PER_PAGE), 1)
  const page = Math.min(view.page, pages)
  const slice = chunks.slice((page - 1) * CHUNKS_PER_PAGE, page * CHUNKS_PER_PAGE)
  const base = `/lite/text/${encodeURIComponent(text.slug)}`
  const href = (over: { p?: number; g?: GlossMode; tr?: boolean }): string =>
    url(base, {
      p: (over.p ?? page) > 1 ? (over.p ?? page) : undefined,
      g: (over.g ?? view.gloss) === 'fluent' ? undefined : (over.g ?? view.gloss),
      tr: (over.tr ?? view.translation) ? 1 : undefined,
    })

  const status =
    text.status === 'unglossed'
      ? '<p class="note">This text has no word-by-word glosses yet — opening it has queued them. Reload in a few minutes.</p>'
      : text.status === 'glossing'
        ? `<p class="note">Glossing ${text.glossedCount}/${text.chunkCount} — reload to see new stanzas.</p>`
        : text.status === 'failed'
          ? '<p class="note">⚠ Glossing did not finish. The original text is shown below.</p>'
          : ''

  const scUrl = suttaCentralUrl(text)
  const heading = `${text.source ? `<p class="bar">${escapeHtml(text.source)}</p>` : ''}
<h3>${escapeHtml(text.origTitle ?? text.title)}</h3>
<p><small>${escapeHtml(text.origTitle ? text.title : text.lang)}${
    text.translator ? ` · Translation: ${escapeHtml(text.translator)}` : ''
  }</small></p>
${scUrl ? `<p><small>${link(scUrl, 'Parallels & more translations on SuttaCentral')}</small></p>` : ''}`

  const controls = `<p class="bar">${options('Glosses', view.gloss, [
    { id: 'fluent', label: 'Fluent', href: href({ g: 'fluent' }) },
    { id: 'literal', label: 'Literal', href: href({ g: 'literal' }) },
    { id: 'off', label: 'Off', href: href({ g: 'off' }) },
  ])}<br>
${options('Translation', view.translation ? 'on' : 'off', [
    { id: 'off', label: 'Hide', href: href({ tr: false }) },
    { id: 'on', label: 'Show', href: href({ tr: true }) },
  ])}</p>
<p class="bar">Tap any word for its dictionary entry.</p>`

  const body = `<p>${link('/lite', '‹ Library')}</p>
${heading}
${controls}
${status}
${slice.map((chunk) => renderChunk(chunk, text, view.gloss, view.translation)).join('\n')}
${pager(page, pages, (n) => href({ p: n }))}`

  return shell(site, {
    title: `${text.origTitle ?? text.title} — ${site.name}`,
    body,
  })
}

/* ------------------------------------------------------------------ */
/* The dictionary                                                      */
/* ------------------------------------------------------------------ */

function renderEntry(definition: Definition, word: string): string {
  const morphemes = definition.morphemes?.length
    ? `<h2>Built from</h2>
<ul>${definition.morphemes
        .map(
          (morpheme) =>
            `<li><b>${escapeHtml(morpheme.part)}</b> — ${escapeHtml(morpheme.kind)} · ${escapeHtml(morpheme.gloss)}<br><small>${escapeHtml(morpheme.note)}</small></li>`,
        )
        .join('\n')}</ul>`
    : ''
  // The page is already headed by the word as it stands in the text; the
  // entry only repeats it when the dictionary's headword differs (an
  // inflected form looked up under its lemma).
  const headword =
    definition.headword.toLowerCase() === word.toLowerCase()
      ? ''
      : `<h3>${escapeHtml(definition.headword)}</h3>`
  return `${headword}
<p><small>${escapeHtml(definition.grammar)}</small></p>
<ol>${definition.meanings.map((meaning) => `<li>${escapeHtml(meaning)}</li>`).join('')}</ol>
${morphemes}
${definition.analysis ? `<p><b>Analysis.</b> ${escapeHtml(definition.analysis)}</p>` : ''}
${definition.etymology ? `<p><b>Etymology.</b> ${escapeHtml(definition.etymology)}</p>` : ''}`
}

export function renderWordPage(
  site: SiteConfig,
  view: {
    lang: string
    word: string
    from: string | null
    /** Text-type preset of the text the word was tapped in. */
    kind: string
    /** The merged entry, when either tier has landed. */
    definition: Definition | null
    /** True while a tier is still being written. */
    pending: boolean
    error: string | null
    /** How many automatic reloads this page has already been through. */
    attempt: number
  },
): string {
  const back = view.from
    ? link(`/lite/text/${encodeURIComponent(view.from)}`, '‹ Back to the text')
    : link('/lite', '‹ Library')

  const reload = link(
    url(`/lite/word/${encodeURIComponent(view.lang)}/${encodeURIComponent(view.word)}`, {
      from: view.from ?? undefined,
      k: view.kind === 'prose' ? undefined : view.kind,
    }),
    'Try again',
  )

  let main: string
  let refresh: ShellOptions['refresh']
  if (view.definition) {
    main = renderEntry(view.definition, view.word)
  } else if (view.error) {
    main = `<p class="note">⚠ ${escapeHtml(view.error)} ${reload}</p>`
  } else if (!view.pending) {
    main = `<p class="note">No entry for this word yet. ${reload}</p>`
  } else if (view.attempt >= MAX_WORD_REFRESHES) {
    main = `<p class="note">Still being written. ${reload}</p>`
  } else {
    main = '<p class="note">Looking this word up — the page reloads by itself when the entry is ready.</p>'
    refresh = {
      seconds: 4,
      url: url(
        `/lite/word/${encodeURIComponent(view.lang)}/${encodeURIComponent(view.word)}`,
        {
          from: view.from ?? undefined,
          k: view.kind === 'prose' ? undefined : view.kind,
          try: view.attempt + 1,
        },
      ),
    }
  }

  const credit = langHasDpd(view.lang)
    ? `<p class="foot">Meanings from the ${link(
        `https://www.dpdict.net/?q=${encodeURIComponent(view.word)}`,
        'Digital Pāḷi Dictionary',
      )}; morphology and etymology by Claude.</p>`
    : '<p class="foot">Dictionary entry by Claude.</p>'

  return shell(site, {
    title: `${view.word} — ${site.name}`,
    noindex: true,
    refresh,
    body: `<p>${back}</p>
<h1>${escapeHtml(view.word)}</h1>
${main}
${credit}`,
  })
}

/* ------------------------------------------------------------------ */
/* Messages                                                            */
/* ------------------------------------------------------------------ */

export function renderMessagePage(
  site: SiteConfig,
  title: string,
  message: string,
): string {
  return shell(site, {
    title: `${title} — ${site.name}`,
    body: `<h1>${escapeHtml(title)}</h1>
<p>${escapeHtml(message)}</p>
<p>${link('/lite', '‹ Library')}</p>`,
  })
}

/* ------------------------------------------------------------------ */
/* The HTTP handler                                                    */
/* ------------------------------------------------------------------ */

/** Lite pages read the same projections the SPA reads, as an anonymous
 * visitor: reading is public, and nothing here mutates the library. */
const LITE_CTX = { internal: false, admin: false }

async function project<T>(
  app: App,
  name: string,
  params: Record<string, unknown>,
): Promise<T> {
  const result = await app.executeProjection({ name, params }, LITE_CTX)
  if (!result.ok) throw new Error(result.error.message)
  return result.value.result as T
}

/** Issue an intent as a plain visitor (so the dictionary's daily cap and the
 * gloss queue cap still apply); returns the error message, or null. */
async function send(app: App, type: string, input: unknown): Promise<string | null> {
  const result = await app.executeSend(
    { intentId: crypto.randomUUID(), type, input },
    LITE_CTX,
  )
  return result.ok ? null : result.error.message
}

function writeHtml(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  status: number,
  html: string,
  extraHeaders: Record<string, string> = {},
): void {
  res.writeHead(status, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-cache',
    ...extraHeaders,
  })
  res.end(req.method === 'HEAD' ? undefined : html)
}

function glossMode(raw: string | null): GlossMode {
  return raw === 'literal' || raw === 'off' ? raw : 'fluent'
}

/**
 * Serve `/lite`, `/lite/text/<slug>` and `/lite/word/<lang>/<word>`. Every
 * other path under `/lite` gets a lite 404 — the SPA fallback must never
 * answer here, or a legacy browser redirected to a typo'd lite URL would
 * bounce between the blank app and the redirect.
 */
export function createLiteHandler(app: App) {
  return async function serveLite(
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ): Promise<void> {
    const site = siteForHost(req.headers.host)
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405).end()
      return
    }
    try {
      // Everything (URL decoding included — a malformed %-escape throws)
      // stays inside the try: this handler is called fire-and-forget, so a
      // rejected promise would take the process down with it.
      const parsed = new URL(req.url ?? '/lite', 'http://localhost')
      const segments = decodeURIComponent(parsed.pathname)
        .split('/')
        .filter((segment) => segment !== '')

      // /lite
      if (segments.length === 1) {
        const texts = await project<TextSummary[]>(app, textLibrary.name, {})
        const query = parsed.searchParams.get('q') ?? ''
        const page = pageParam(parsed.searchParams.get('p'), Number.MAX_SAFE_INTEGER)
        writeHtml(req, res, 200, renderLibraryPage(site, texts, { query, page }))
        return
      }

      // /lite/text/<slug>
      if (segments.length === 3 && segments[1] === 'text') {
        const detail = await project<TextDetail | null>(app, textDetail.name, {
          slug: segments[2]!,
        })
        if (!detail) {
          writeHtml(
            req,
            res,
            404,
            renderMessagePage(site, 'Not found', 'This text does not exist (anymore).'),
          )
          return
        }
        // Imported texts wait unglossed until somebody reads them — the same
        // demand-driven glossing the app's reader triggers. Fire and forget:
        // a full queue is a normal outcome, and the text is readable anyway.
        if (detail.text.status === 'unglossed' || detail.text.status === 'failed') {
          await send(app, requestGloss.type, { id: detail.text.id })
        }
        const pages = Math.max(Math.ceil(detail.chunks.length / CHUNKS_PER_PAGE), 1)
        writeHtml(
          req,
          res,
          200,
          renderTextPage(site, detail, {
            page: pageParam(parsed.searchParams.get('p'), pages),
            gloss: glossMode(parsed.searchParams.get('g')),
            translation: parsed.searchParams.get('tr') === '1',
          }),
        )
        return
      }

      // /lite/word/<lang>/<word>
      if (segments.length === 4 && segments[1] === 'word') {
        const lang = segments[2]!
        const word = normalizeWord(segments[3]!)
        const from = parsed.searchParams.get('from')
        const kind = parsed.searchParams.get('k') ?? 'prose'
        const attempt = Math.max(Number(parsed.searchParams.get('try') ?? '0') || 0, 0)
        if (!word) {
          writeHtml(
            req,
            res,
            404,
            renderMessagePage(site, 'Not a word', 'There is nothing to look up here.'),
          )
          return
        }
        const hasDpd = langHasDpd(lang)
        const [dpd, fast] = await Promise.all([
          hasDpd
            ? project<WordDefinitionState>(app, wordDefinition.name, {
                lang,
                word,
                tier: 'dpd',
              })
            : Promise.resolve(null),
          project<WordDefinitionState>(app, wordDefinition.name, {
            lang,
            word,
            tier: 'fast',
          }),
        ])
        // Ask for whichever tier is missing, exactly as the sidebar does on
        // tap. A past failure is retried — but only on a visit the reader
        // made (attempt 0), never on one of this page's own refreshes, so a
        // word the LLM keeps failing costs one attempt per tap, not eight.
        const retry = (status: string): boolean =>
          status === 'none' || (status === 'failed' && attempt === 0)
        let error: string | null = null
        if (dpd && retry(dpd.status)) {
          await send(app, defineWord.type, { lang, word, kind, tier: 'dpd' })
        }
        const requested = retry(fast.status)
        if (requested) {
          error = await send(app, defineWord.type, { lang, word, kind, tier: 'fast' })
        }
        const definition = mergeDefinitions(
          dpd?.status === 'ready' ? dpd.definition : null,
          fast.status === 'ready' ? fast.definition : null,
        )
        // Worth waiting for: a tier that is being written, or one this
        // request just queued.
        const pending =
          requested || fast.status === 'pending' || dpd?.status === 'pending' 
        writeHtml(
          req,
          res,
          200,
          renderWordPage(site, {
            lang,
            word,
            from,
            kind,
            definition,
            pending: !definition && pending,
            error: definition
              ? null
              : (error ?? (fast.status === 'failed' && !requested ? fast.error : null)),
            attempt,
          }),
          { 'x-robots-tag': 'noindex, nofollow' },
        )
        return
      }

      writeHtml(
        req,
        res,
        404,
        renderMessagePage(site, 'Not found', 'There is no such page.'),
      )
    } catch (cause) {
      // A malformed URL is the visitor's mistake; anything else is ours.
      const bad = cause instanceof URIError
      const message = cause instanceof Error ? cause.message : String(cause)
      if (!bad) console.error('[lite]', message)
      writeHtml(
        req,
        res,
        bad ? 400 : 500,
        bad
          ? renderMessagePage(site, 'Bad address', 'That link is malformed.')
          : renderMessagePage(site, 'Something went wrong', message),
      )
    }
  }
}
