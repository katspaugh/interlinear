import type { DatabaseSync } from 'node:sqlite'
import type { Definition } from '@interlinear/shared'

/* ------------------------------------------------------------------ */
/* Digital Pāḷi Dictionary lookups                                     */
/*                                                                     */
/* The 'dpd' definition tier is a real dictionary lookup, served from  */
/* one of two backends behind the same lookupDpd():                    */
/*                                                                     */
/* - Local (preferred): DPD's released mobile SQLite database, baked   */
/*   into the Docker image and read in-process via node:sqlite — set   */
/*   DPD_DB_PATH. Sub-millisecond, offline, and richer: it carries     */
/*   construction, root meanings, and Sanskrit cognates, so the local  */
/*   entry gets an etymology line too.                                 */
/* - Remote (fallback): the DPD webapp's JSON API                      */
/*   (https://docs.dpdict.net/webapp/), parsed from its summary HTML.  */
/*   ~1s per lookup; used automatically when no local DB is present    */
/*   (e.g. local development).                                         */
/*                                                                     */
/* Results are cached in the definitions table like every other tier,  */
/* so each backend serves a given word at most once.                   */
/* ------------------------------------------------------------------ */

const DPD_BASE_URL = process.env.DPD_BASE_URL ?? 'https://www.dpdict.net'
const DPD_DB_PATH = process.env.DPD_DB_PATH
const DPD_TIMEOUT_MS = 10_000
/** dhamma alone has 15+ homonyms — keep the instant entry skimmable. */
const MAX_MEANINGS = 8

interface DpdResponse {
  summary_html: string
  dpd_html: string
}

interface SummaryEntry {
  headword: string
  pos: string
  meaning: string
}

interface GrammarReading {
  lemma: string
  pos: string
  features: string
}

/** Homonyms come numbered ("dhamma 1.01") — fold them into one headword. */
function stripHomonymNumber(lemma: string): string {
  return lemma.replace(/\s+\d+(\.\d+)?$/, '')
}

/* ------------------------------------------------------------------ */
/* Shared assembly                                                     */
/* ------------------------------------------------------------------ */

/** Assemble the app's Definition shape from parsed DPD data — the common
 * final step of both backends. Null = DPD has no entry. */
export function assembleDefinition(
  word: string,
  entries: SummaryEntry[],
  readings: GrammarReading[],
  deconstruction: string | null,
  etymology: string | null = null,
): Definition | null {
  if (entries.length === 0 && readings.length === 0) return null

  const headword = readings[0]?.lemma ?? entries[0]?.headword ?? word

  const grammarParts: string[] = []
  for (const reading of readings.slice(0, 4)) {
    grammarParts.push(`${reading.features} of ${reading.lemma} (${reading.pos})`)
  }
  if (readings.length > 4) grammarParts.push('…')
  const summaryPos = entries.find((e) => e.headword === headword)?.pos ?? entries[0]?.pos
  const grammar = grammarParts.length > 0 ? grammarParts.join('; ') : (summaryPos ?? '')

  const manyHeadwords = new Set(entries.map((e) => e.headword)).size > 1
  const meanings = entries
    .slice(0, MAX_MEANINGS)
    .map((e) => (manyHeadwords ? `${e.headword} (${e.pos}): ${e.meaning}` : e.meaning))
  if (entries.length > MAX_MEANINGS) meanings.push('…')

  return {
    headword,
    grammar,
    meanings: meanings.length > 0 ? meanings : ['(see grammar)'],
    analysis: deconstruction,
    etymology,
  }
}

/* ------------------------------------------------------------------ */
/* Local backend: DPD's released mobile SQLite database                */
/* ------------------------------------------------------------------ */

/** One dpd_headwords row, as the local backend reads it. */
export interface DpdHeadwordRow {
  lemma_1: string
  pos: string
  meaning_1: string
  meaning_2: string
  meaning_lit: string
  construction: string
  sanskrit: string
  root_key: string
}

export interface DpdRootRow {
  root: string
  root_meaning: string
}

/** The lookup table's JSON columns for one inflected form. */
export interface DpdLookupRow {
  /** JSON int[] of dpd_headwords ids, or ''. */
  headwords: string
  /** JSON [[lemma, pos, "features"], …], or ''. */
  grammar: string
  /** JSON string[] of word breakups, or ''. */
  deconstructor: string
}

function parseJsonColumn<T>(column: string | null | undefined): T | null {
  if (!column) return null
  try {
    return JSON.parse(column) as T
  } catch {
    return null
  }
}

/** Map database rows to a Definition. Exported for tests. */
export function rowsToDefinition(
  word: string,
  lookup: DpdLookupRow,
  headwords: DpdHeadwordRow[],
  roots: DpdRootRow[],
): Definition | null {
  const entries: SummaryEntry[] = headwords
    .map((h) => ({
      headword: stripHomonymNumber(h.lemma_1),
      pos: h.pos,
      meaning:
        (h.meaning_1 || h.meaning_2) +
        (h.meaning_lit ? `; lit. ${h.meaning_lit}` : ''),
    }))
    .filter((e) => e.meaning !== '')

  const readings: GrammarReading[] = (
    parseJsonColumn<[string, string, string][]>(lookup.grammar) ?? []
  ).map(([lemma, pos, features]) => ({ lemma, pos, features }))

  const deconstruction =
    parseJsonColumn<string[]>(lookup.deconstructor)?.slice(0, 3).join('; ') || null

  // Etymology for the main headword, from fields the webapp summary lacks:
  // the construction, the root with its meaning, and the Sanskrit cognate.
  const headword = readings[0]?.lemma ?? entries[0]?.headword
  const main = headwords.find((h) => stripHomonymNumber(h.lemma_1) === headword)
  const etymologyParts: string[] = []
  const construction = main?.construction.split('\n')[0]?.trim()
  if (construction && construction !== deconstruction) {
    etymologyParts.push(construction)
  }
  if (main?.root_key) {
    const root = roots.find((r) => r.root === main.root_key)
    if (root) {
      etymologyParts.push(`from ${stripHomonymNumber(root.root)} '${root.root_meaning}'`)
    }
  }
  if (main?.sanskrit) etymologyParts.push(`Sanskrit ${main.sanskrit}`)

  return assembleDefinition(
    word,
    entries,
    readings,
    deconstruction,
    etymologyParts.length > 0 ? etymologyParts.join('; ') : null,
  )
}

/** undefined = not tried yet; null = unavailable (fall back to HTTP). */
let localDb: DatabaseSync | null | undefined

async function getLocalDb(): Promise<DatabaseSync | null> {
  if (localDb !== undefined) return localDb
  if (!DPD_DB_PATH) return (localDb = null)
  try {
    // Lazy import: node:sqlite is experimental on Node 22 and prints a
    // warning when loaded, so only touch it when a local DB is configured.
    const { DatabaseSync: Database } = await import('node:sqlite')
    const db = new Database(DPD_DB_PATH, { readOnly: true })
    db.prepare('select lookup_key from lookup limit 1').get()
    console.log(`[dpd] using local database at ${DPD_DB_PATH}`)
    localDb = db
  } catch (cause) {
    console.error(
      `[dpd] cannot open DPD_DB_PATH=${DPD_DB_PATH}; falling back to ${DPD_BASE_URL}:`,
      cause,
    )
    localDb = null
  }
  return localDb
}

function lookupDpdLocal(db: DatabaseSync, word: string): Definition | null {
  const lookup = db
    .prepare(`select headwords, grammar, deconstructor from lookup where lookup_key = ?`)
    .get(word) as DpdLookupRow | undefined
  if (!lookup) return null

  const ids = parseJsonColumn<number[]>(lookup.headwords)?.slice(0, MAX_MEANINGS + 1) ?? []
  const headwords: DpdHeadwordRow[] = []
  const rootKeys = new Set<string>()
  const headwordQuery = db.prepare(
    `select lemma_1, pos, meaning_1, meaning_2, meaning_lit, construction, sanskrit, root_key
     from dpd_headwords where id = ?`,
  )
  for (const id of ids) {
    const row = headwordQuery.get(id) as DpdHeadwordRow | undefined
    if (!row) continue
    headwords.push(row)
    if (row.root_key) rootKeys.add(row.root_key)
  }

  const rootQuery = db.prepare(`select root, root_meaning from dpd_roots where root = ?`)
  const roots: DpdRootRow[] = []
  for (const key of rootKeys) {
    const row = rootQuery.get(key) as DpdRootRow | undefined
    if (row) roots.push(row)
  }

  return rowsToDefinition(word, lookup, headwords, roots)
}

/* ------------------------------------------------------------------ */
/* Remote backend: the dpdict.net webapp API                           */
/* ------------------------------------------------------------------ */

function decodeEntities(html: string): string {
  return html
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
}

/** The lexical rows of the summary: headword, part of speech, bold meaning
 * (plus any trailing "; lit. …" note). Grammar/deconstructor/variants rows
 * carry no meaning and are parsed separately. */
export function parseSummaryEntries(summaryHtml: string): SummaryEntry[] {
  const entries: SummaryEntry[] = []
  for (const block of summaryHtml.split(/<p class="summary">/).slice(1)) {
    const match =
      /<a class="summary-link"[^>]*>([\s\S]*?)<\/a>([\s\S]*?)<b>([\s\S]*?)<\/b>([\s\S]*?)<a class="summary-link"/.exec(
        block,
      )
    if (!match) continue
    const pos = stripTags(match[2]!).replace(/\.$/, '')
    // Rows labeled grammar./variants./deconstructor. have no <b> meaning, so
    // they never reach here; this guards against future summary shapes.
    if (['grammar', 'variants', 'deconstructor'].includes(pos)) continue
    const meaning = stripTags(match[3]! + match[4]!).replace(/;$/, '')
    entries.push({ headword: stripHomonymNumber(stripTags(match[1]!)), pos, meaning })
  }
  return entries
}

/** The grammar row hides its readings in an HTML comment of Python tuples:
 * `[('bhikkhu', 'noun', ['masc', 'voc', 'pl']), …]`. */
export function parseGrammarReadings(summaryHtml: string): GrammarReading[] {
  const comment = /grammar\.\s*<!--([\s\S]*?)-->/.exec(summaryHtml)
  if (!comment) return []
  const readings: GrammarReading[] = []
  const decoded = decodeEntities(comment[1]!)
  const tuple = /\('([^']*)',\s*'([^']*)',\s*\[([^\]]*)\]\)/g
  for (let m = tuple.exec(decoded); m; m = tuple.exec(decoded)) {
    const features = m[3]!
      .split(',')
      .map((f) => f.trim().replace(/^'|'$/g, ''))
      .filter(Boolean)
      .join(' ')
    readings.push({ lemma: m[1]!, pos: m[2]!, features })
  }
  return readings
}

/** The deconstructor's word breakup ("se + yathā + api") lives only in the
 * full dictionary HTML, as the first <p> after the deconstructor heading. */
export function parseDeconstruction(dpdHtml: string): string | null {
  const match =
    /<h3 class="dpd" id="deconstructor:[^"]*">[\s\S]*?<p>([\s\S]*?)<\/p>/.exec(dpdHtml)
  if (!match) return null
  const text = stripTags(match[1]!)
  return text || null
}

/** Assemble the app's Definition shape from a DPD response; null = no entry. */
export function parseDpdResponse(word: string, response: DpdResponse): Definition | null {
  return assembleDefinition(
    word,
    parseSummaryEntries(response.summary_html),
    parseGrammarReadings(response.summary_html),
    parseDeconstruction(response.dpd_html),
  )
}

async function lookupDpdRemote(word: string): Promise<Definition | null> {
  const url = `${DPD_BASE_URL}/search_json?q=${encodeURIComponent(word)}`
  const response = await fetch(url, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(DPD_TIMEOUT_MS),
  })
  if (!response.ok) {
    throw new Error(`DPD lookup failed: HTTP ${response.status}`)
  }
  const body = (await response.json()) as DpdResponse
  return parseDpdResponse(word, body)
}

/** Look a word up in the DPD. Returns null when DPD has no entry. */
export async function lookupDpd(word: string): Promise<Definition | null> {
  const db = await getLocalDb()
  return db ? lookupDpdLocal(db, word) : lookupDpdRemote(word)
}
