import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  INTERLINEAR_SITE,
  SUTTA_SITE,
  type Definition,
  type TextDetail,
  type TextSummary,
} from '@interlinear/shared'
import {
  CHUNKS_PER_PAGE,
  createLiteHandler,
  isLegacyBrowser,
  LIBRARY_PAGE_SIZE,
  liteRedirectFor,
  pageParam,
  renderLibraryPage,
  renderTextPage,
  renderWordPage,
} from '../src/lite.js'

/* ---------------- browser detection ---------------- */

const KINDLE_PW =
  'Mozilla/5.0 (X11; U; Linux armv7l like Android; en-us) AppleWebKit/531.2+ ' +
  '(KHTML, like Gecko) Version/5.0 Safari/533.2+ Kindle/3.0+'
const CHROME =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
const SAFARI_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 ' +
  '(KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
const FIRE_TABLET =
  'Mozilla/5.0 (Linux; Android 9; KFMAWI) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Silk/126.3.2 like Chrome/126.0.6478.186 Safari/537.36'

test('isLegacyBrowser spots e-readers and ancient engines', () => {
  assert.equal(isLegacyBrowser(KINDLE_PW), true)
  assert.equal(isLegacyBrowser('Mozilla/5.0 (Kobo Touch) AppleWebKit/534.30'), true)
  assert.equal(isLegacyBrowser('Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1)'), true)
  assert.equal(isLegacyBrowser('Mozilla/5.0 (Windows NT 10.0; Trident/7.0; rv:11.0)'), true)
})

test('isLegacyBrowser leaves modern browsers alone', () => {
  assert.equal(isLegacyBrowser(CHROME), false)
  assert.equal(isLegacyBrowser(SAFARI_IOS), false)
  // Amazon's Fire tablets are modern Chromium, whatever "Kindle" they carry.
  assert.equal(isLegacyBrowser(FIRE_TABLET), false)
  assert.equal(isLegacyBrowser('Mozilla/5.0 (Linux; Android 14; Kindle Fire) Silk/1.0'), false)
  assert.equal(isLegacyBrowser(undefined), false)
  assert.equal(isLegacyBrowser('curl/8.7.1'), false)
})

test('liteRedirectFor mirrors the SPA routes for legacy browsers', () => {
  assert.equal(liteRedirectFor('/', KINDLE_PW), '/lite')
  assert.equal(liteRedirectFor('/text/mn10', KINDLE_PW), '/lite/text/mn10')
  assert.equal(liteRedirectFor('/text/mn10/', KINDLE_PW), '/lite/text/mn10')
  assert.equal(liteRedirectFor('/?x=1', KINDLE_PW), '/lite')
})

test('liteRedirectFor leaves everything else alone', () => {
  assert.equal(liteRedirectFor('/', CHROME), null)
  assert.equal(liteRedirectFor('/text/mn10', CHROME), null)
  // The escape hatch on every lite page.
  assert.equal(liteRedirectFor('/?full=1', KINDLE_PW), null)
  // No redirect loops: lite pages and assets are served as they are.
  assert.equal(liteRedirectFor('/lite/text/mn10', KINDLE_PW), null)
  assert.equal(liteRedirectFor('/assets/index-abc123.js', KINDLE_PW), null)
  assert.equal(liteRedirectFor('/favicon.ico', KINDLE_PW), null)
})

test('pageParam clamps junk to a real page', () => {
  assert.equal(pageParam(null, 5), 1)
  assert.equal(pageParam('3', 5), 3)
  assert.equal(pageParam('0', 5), 1)
  assert.equal(pageParam('-2', 5), 1)
  assert.equal(pageParam('99', 5), 5)
  assert.equal(pageParam('two', 5), 1)
})

/* ---------------- fixtures ---------------- */

function summary(over: Partial<TextSummary> = {}): TextSummary {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    slug: 'mn10',
    title: 'Mindfulness Meditation',
    origTitle: 'Satipaṭṭhānasutta',
    source: 'Majjhima Nikāya 10',
    lang: 'Pali',
    kind: 'sutta',
    status: 'ready',
    builtin: true,
    translator: 'Bhikkhu Sujato',
    chunkCount: 1,
    glossedCount: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    preview: null,
    ...over,
  }
}

function detail(over: Partial<TextDetail['text']> = {}, chunks?: TextDetail['chunks']): TextDetail {
  return {
    text: summary(over),
    chunks: chunks ?? [
      {
        idx: 0,
        original: 'Ekāyano ayaṃ, bhikkhave, maggo',
        words: [
          { w: 'Ekāyano', g: 'one-way-going', m: [
            { s: 'eka', k: 'stem', g: 'one' },
            { s: 'ayana', k: 'stem', g: 'going' },
            { s: 'o', k: 'ending', g: '' },
          ] },
          { w: 'ayaṃ,', g: 'this' },
          { w: 'bhikkhave,', g: 'monks', nl: true },
          { w: 'maggo', g: 'path' },
        ],
        translation: 'This is the one way, monks.',
      },
    ],
  }
}

/* ---------------- the library ---------------- */

test('renderLibraryPage lists texts as links, grouped by collection', () => {
  const html = renderLibraryPage(
    SUTTA_SITE,
    [summary(), summary({ id: '00000000-0000-4000-8000-000000000002', slug: 'dhp1-20', title: 'Pairs', origTitle: 'Yamakavagga', source: 'Dhammapada 1–20' })],
    { query: '', page: 1 },
  )
  assert.match(html, /<h2>Majjhima Nikāya<\/h2>/)
  assert.match(html, /<h2>Dhammapada<\/h2>/)
  assert.match(html, /href="\/lite\/text\/mn10"/)
  assert.match(html, /Satipaṭṭhānasutta/)
  // No JavaScript at all — that is the whole point of lite mode.
  assert.doesNotMatch(html, /<script/)
  // And an escape hatch back to the app.
  assert.match(html, /href="\/\?full=1"/)
})

test('renderLibraryPage filters by site and by query', () => {
  const texts = [
    summary(),
    summary({ id: '00000000-0000-4000-8000-000000000003', slug: 'kafka', title: 'Die Verwandlung', origTitle: null, source: 'Franz Kafka', lang: 'German', kind: 'fiction' }),
  ]
  // sutta.stream shows suttas only.
  const sutta = renderLibraryPage(SUTTA_SITE, texts, { query: '', page: 1 })
  assert.doesNotMatch(sutta, /Verwandlung/)
  // interlinear.cc shows everything.
  const both = renderLibraryPage(INTERLINEAR_SITE, texts, { query: '', page: 1 })
  assert.match(both, /Verwandlung/)
  // Search runs over the same fields the app's box searches (here: "mn 10").
  const found = renderLibraryPage(SUTTA_SITE, texts, { query: 'mn 10', page: 1 })
  assert.match(found, /href="\/lite\/text\/mn10"/)
  const empty = renderLibraryPage(SUTTA_SITE, texts, { query: 'nothing here', page: 1 })
  assert.match(empty, /Nothing matches/)
})

test('renderLibraryPage paginates', () => {
  const many = Array.from({ length: LIBRARY_PAGE_SIZE * 2 + 10 }, (_, i) =>
    summary({ id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`, slug: `mn${i}`, source: `Majjhima Nikāya ${i}` }),
  )
  const first = renderLibraryPage(SUTTA_SITE, many, { query: '', page: 1 })
  assert.match(first, /Page 1 of 3/)
  assert.match(first, /href="\/lite\?p=2"/)
  assert.doesNotMatch(first, /Previous/)
  const last = renderLibraryPage(SUTTA_SITE, many, { query: '', page: 3 })
  assert.match(last, /Page 3 of 3/)
  assert.doesNotMatch(last, /Next/)
})

/* ---------------- the reader ---------------- */

test('renderTextPage stacks each word over its gloss and links it', () => {
  const html = renderTextPage(SUTTA_SITE, detail(), {
    page: 1,
    gloss: 'fluent',
    translation: false,
  })
  assert.match(html, /<span class="g">one-way-going<\/span><span class="t">Ekāyano<\/span>/)
  // Words link to their dictionary page (percent-encoded, diacritics and
  // all), carrying the language and the text's preset.
  assert.match(html, /href="\/lite\/word\/Pali\/ek%C4%81yano\?from=mn10&amp;k=sutta"/)
  // Verse layout survives.
  assert.match(html, /<br>/)
  assert.match(html, /Parallels &amp; more translations on SuttaCentral/)
  assert.doesNotMatch(html, /<script/)
})

test('renderTextPage honours the gloss and translation toggles', () => {
  const literal = renderTextPage(SUTTA_SITE, detail(), {
    page: 1,
    gloss: 'literal',
    translation: true,
  })
  assert.match(literal, /one·going/)
  assert.match(literal, /This is the one way, monks\./)
  const off = renderTextPage(SUTTA_SITE, detail(), {
    page: 1,
    gloss: 'off',
    translation: false,
  })
  assert.doesNotMatch(off, /one-way-going/)
  assert.doesNotMatch(off, /This is the one way/)
  assert.match(off, /<span class="t">Ekāyano<\/span>/)
})

test('renderTextPage paginates long texts and keeps the reading options', () => {
  const chunks = Array.from({ length: CHUNKS_PER_PAGE * 2 + 1 }, (_, idx) => ({
    idx,
    original: `stanza ${idx}`,
    words: [{ w: `word${idx}`, g: `gloss${idx}` }],
    translation: null,
  }))
  const html = renderTextPage(SUTTA_SITE, detail({}, chunks), {
    page: 2,
    gloss: 'off',
    translation: true,
  })
  assert.match(html, /Page 2 of 3/)
  assert.match(html, new RegExp(`word${CHUNKS_PER_PAGE}`))
  assert.doesNotMatch(html, /word0\b/)
  // Next/previous carry the reader's toggles.
  assert.match(html, /href="\/lite\/text\/mn10\?p=3&amp;g=off&amp;tr=1"/)
})

test('renderTextPage shows the original when a chunk has no glosses yet', () => {
  const html = renderTextPage(
    SUTTA_SITE,
    detail({ status: 'unglossed', glossedCount: 0 }, [
      { idx: 0, original: 'Evaṃ me sutaṃ', words: null, translation: 'So I have heard.' },
    ]),
    { page: 1, gloss: 'fluent', translation: false },
  )
  assert.match(html, /Evaṃ me sutaṃ/)
  // An unglossed chunk always shows its translation — it is all there is.
  assert.match(html, /So I have heard\./)
  assert.match(html, /no word-by-word glosses yet/)
})

test('renderTextPage escapes text content', () => {
  const html = renderTextPage(
    INTERLINEAR_SITE,
    detail({ title: '<script>alert(1)</script>', origTitle: null, kind: 'prose' }, [
      { idx: 0, original: '', words: [{ w: '<b>x</b>', g: '"quoted" & <i>y</i>' }], translation: null },
    ]),
    { page: 1, gloss: 'fluent', translation: false },
  )
  assert.doesNotMatch(html, /<script>alert/)
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/)
  assert.match(html, /&lt;b&gt;x&lt;\/b&gt;/)
  assert.match(html, /&quot;quoted&quot; &amp; &lt;i&gt;y&lt;\/i&gt;/)
})

/* ---------------- the dictionary ---------------- */

const ENTRY: Definition = {
  headword: 'sati',
  grammar: 'feminine noun, nominative singular',
  meanings: ['mindfulness', 'memory'],
  analysis: null,
  etymology: 'from √sar, to remember',
  morphemes: [{ part: 'sar', kind: 'root', gloss: 'remember', note: 'the same root as Sanskrit smṛti.' }],
}

test('renderWordPage renders a ready entry with its credit', () => {
  const html = renderWordPage(SUTTA_SITE, {
    lang: 'Pali',
    word: 'sati',
    from: 'mn10',
    kind: 'sutta',
    definition: ENTRY,
    pending: false,
    error: null,
    attempt: 0,
  })
  // The page is headed by the word already; the entry doesn't repeat it.
  assert.equal(html.match(/sati<\/h[13]>/g)?.length, 1)
  assert.match(html, /<h1>sati<\/h1>/)
  assert.match(html, /<li>mindfulness<\/li>/)
  assert.match(html, /Built from/)
  assert.match(html, /from √sar, to remember/)
  assert.match(html, /Digital Pāḷi Dictionary/)
  assert.match(html, /href="\/lite\/text\/mn10"/)
  // Nothing to refresh once the entry is here.
  assert.doesNotMatch(html, /http-equiv="refresh"/)
  assert.doesNotMatch(html, /<script/)
})

test('renderWordPage reloads itself while the entry is being written', () => {
  const html = renderWordPage(SUTTA_SITE, {
    lang: 'Pali',
    word: 'sati',
    from: 'mn10',
    kind: 'sutta',
    definition: null,
    pending: true,
    error: null,
    attempt: 2,
  })
  assert.match(html, /http-equiv="refresh" content="4; url=\/lite\/word\/Pali\/sati\?from=mn10&amp;k=sutta&amp;try=3"/)
  assert.match(html, /Looking this word up/)
  // Dictionary pages are per-visitor work; keep crawlers off them.
  assert.match(html, /name="robots" content="noindex,nofollow"/)
})

test('renderWordPage gives up refreshing and offers a manual reload', () => {
  const html = renderWordPage(SUTTA_SITE, {
    lang: 'Pali',
    word: 'sati',
    from: null,
    kind: 'sutta',
    definition: null,
    pending: true,
    error: null,
    attempt: 8,
  })
  assert.doesNotMatch(html, /http-equiv="refresh"/)
  assert.match(html, /Still being written/)
  assert.match(html, />Try again<\/a>/)
})

test('renderWordPage shows the lookup error', () => {
  const html = renderWordPage(INTERLINEAR_SITE, {
    lang: 'German',
    word: 'wort',
    from: 'kafka',
    kind: 'fiction',
    definition: null,
    pending: false,
    error: 'the dictionary’s daily budget is spent — please try again tomorrow',
    attempt: 0,
  })
  assert.match(html, /daily budget is spent/)
  assert.doesNotMatch(html, /http-equiv="refresh"/)
  // No DPD for German.
  assert.doesNotMatch(html, /Digital Pāḷi Dictionary/)
})

test('renderWordPage shows the dictionary headword when it differs', () => {
  const html = renderWordPage(SUTTA_SITE, {
    lang: 'Pali',
    word: 'satiyā',
    from: 'mn10',
    kind: 'sutta',
    definition: ENTRY,
    pending: false,
    error: null,
    attempt: 0,
  })
  assert.match(html, /<h1>satiyā<\/h1>/)
  assert.match(html, /<h3>sati<\/h3>/)
})

test('renderWordPage stops waiting when there is nothing on the way', () => {
  const html = renderWordPage(SUTTA_SITE, {
    lang: 'Pali',
    word: 'sati',
    from: 'mn10',
    kind: 'sutta',
    definition: null,
    pending: false,
    error: null,
    attempt: 0,
  })
  assert.doesNotMatch(html, /http-equiv="refresh"/)
  assert.match(html, /No entry for this word yet/)
})

/* ---------------- the handler ---------------- */

interface FakeResponse {
  statusCode: number
  headers: Record<string, string>
  body: string
  headersSent: boolean
  writeHead(status: number, headers?: Record<string, string>): FakeResponse
  end(chunk?: string): void
}

function fakeResponse(): FakeResponse {
  return {
    statusCode: 0,
    headers: {},
    body: '',
    headersSent: false,
    writeHead(status, headers) {
      this.statusCode = status
      Object.assign(this.headers, headers ?? {})
      this.headersSent = true
      return this
    },
    end(chunk) {
      if (chunk !== undefined) this.body = chunk
    },
  }
}

/** A stand-in for the IntentEffect server: projections answer from a map,
 * intents are recorded. Lets the routing be tested without a database. */
function stubApp(projections: Record<string, unknown>) {
  const sent: Array<{ type: string; input: unknown }> = []
  const app = {
    executeProjection: async (body: { name: string; params: unknown }) => ({
      ok: true as const,
      value: { result: projections[body.name], cursor: 0 },
    }),
    executeSend: async (body: { type: string; input: unknown }) => {
      sent.push({ type: body.type, input: body.input })
      return { ok: true as const, value: {} }
    },
  }
  return { app: app as unknown as Parameters<typeof createLiteHandler>[0], sent }
}

async function request(
  app: Parameters<typeof createLiteHandler>[0],
  url: string,
  method = 'GET',
): Promise<FakeResponse> {
  const res = fakeResponse()
  await createLiteHandler(app)(
    { url, method, headers: { host: 'sutta.stream' } } as never,
    res as never,
  )
  return res
}

test('the handler routes the library, the reader, and the dictionary', async () => {
  const { app, sent } = stubApp({
    'texts.library': [summary()],
    'texts.detail': detail(),
    'words.definition': { status: 'none', definition: null, error: null },
  })

  const library = await request(app, '/lite')
  assert.equal(library.statusCode, 200)
  assert.match(library.headers['content-type']!, /text\/html/)
  assert.match(library.body, /href="\/lite\/text\/mn10"/)

  const reader = await request(app, '/lite/text/mn10')
  assert.equal(reader.statusCode, 200)
  assert.match(reader.body, /Satipaṭṭhānasutta/)

  const word = await request(app, '/lite/word/Pali/sati')
  assert.equal(word.statusCode, 200)
  assert.equal(word.headers['x-robots-tag'], 'noindex, nofollow')
  // Both tiers are requested, exactly as the app's sidebar does on tap.
  assert.deepEqual(
    sent.filter((intent) => intent.type === 'word.define').map((intent) => (intent.input as { tier: string }).tier),
    ['dpd', 'fast'],
  )
})

test('the handler queues glossing for an unglossed text, as the reader does', async () => {
  const { app, sent } = stubApp({
    'texts.detail': detail({ status: 'unglossed', glossedCount: 0 }),
  })
  const res = await request(app, '/lite/text/mn10')
  assert.equal(res.statusCode, 200)
  assert.deepEqual(sent, [
    { type: 'text.requestGloss', input: { id: summary().id } },
  ])
})

test('the handler answers bad requests without falling over', async () => {
  const { app } = stubApp({ 'texts.detail': null, 'texts.library': [] })
  assert.equal((await request(app, '/lite/text/gone')).statusCode, 404)
  assert.equal((await request(app, '/lite/nonsense/deep')).statusCode, 404)
  // A malformed %-escape used to throw out of a fire-and-forget handler.
  const malformed = await request(app, '/lite/text/%zz')
  assert.equal(malformed.statusCode, 400)
  assert.match(malformed.body, /Bad address/)
  // Punctuation-only "words" have nothing to look up.
  assert.equal((await request(app, '/lite/word/Pali/%E2%80%94')).statusCode, 404)
  assert.equal((await request(app, '/lite', 'POST')).statusCode, 405)
})

test('the handler surfaces a projection failure as a page, not a hang', async () => {
  const app = {
    executeProjection: async () => {
      throw new Error('the database is on fire')
    },
    executeSend: async () => ({ ok: true as const, value: {} }),
  } as unknown as Parameters<typeof createLiteHandler>[0]
  const res = await request(app, '/lite')
  assert.equal(res.statusCode, 500)
  assert.match(res.body, /Something went wrong/)
})
