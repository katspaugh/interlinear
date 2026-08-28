import type { Definition } from '@interlinear/shared'

/* ------------------------------------------------------------------ */
/* Digital Pāḷi Dictionary lookups                                     */
/*                                                                     */
/* The 'dpd' definition tier is served by the DPD webapp's JSON API    */
/* (https://docs.dpdict.net/webapp/): a lookup returns in ~1s where a  */
/* generated LLM entry takes many seconds, so the reader gets a real   */
/* dictionary entry almost immediately and the LLM entry replaces it   */
/* when it lands. Results are cached in the definitions table like     */
/* every other tier, so each word hits dpdict.net at most once.        */
/* ------------------------------------------------------------------ */

const DPD_BASE_URL = process.env.DPD_BASE_URL ?? 'https://www.dpdict.net'
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
    // Homonyms come numbered ("dhamma 1.01") — fold them into one headword.
    const headword = stripTags(match[1]!).replace(/\s+\d+(\.\d+)?$/, '')
    entries.push({ headword, pos, meaning })
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
  const entries = parseSummaryEntries(response.summary_html)
  const readings = parseGrammarReadings(response.summary_html)
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

  const deconstruction = parseDeconstruction(response.dpd_html)

  return {
    headword,
    grammar,
    meanings: meanings.length > 0 ? meanings : ['(see grammar)'],
    analysis: deconstruction,
    etymology: null,
  }
}

/** Look a word up on dpdict.net. Returns null when DPD has no entry. */
export async function lookupDpd(word: string): Promise<Definition | null> {
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
