/**
 * Pure transforms for importing SuttaCentral's Bilara corpus: the segmented
 * Mahāsaṅgīti Pali root with Bhikkhu Sujato's aligned English translation
 * (both dedicated to the public domain). Fetching and database writes live
 * in cli.ts; everything here is a pure function of the API payloads.
 *
 * Segment ids look like `mn1:1.2` (uid, colon, dot-separated path). The
 * first path component numbers the paragraph/verse — that is the natural
 * gloss chunk. Components starting at `0` (`mn1:0.1`) are headers: the
 * collection line, the title, vagga names — used for metadata, not chunks.
 */

export interface BilaraSutta {
  root_text: Record<string, string>
  translation_text?: Record<string, string>
  keys_order?: string[]
}

export interface ImportChunk {
  /** Pali text, one segment per line (drives the interlinear line breaks). */
  original: string
  /** The aligned human translation of the chunk; null when untranslated. */
  translation: string | null
}

/** Longest chunk we send to the glosser in one call, in whitespace tokens.
 * Oversized paragraphs are split at segment boundaries. */
export const MAX_CHUNK_WORDS = 100

/** Strip Bilara inline markup (`<j>`, `<em>…`) and tidy whitespace. */
export function cleanSegment(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

interface SegmentKey {
  /** Grouping key: uid + first path component (`mn1:1`, `dhp2`). */
  group: string
  /** True for `0`-numbered header segments (titles, colophon lines). */
  header: boolean
}

/** Parse a segment id. Returns null for ids without a `:path` part. */
export function segmentKey(id: string): SegmentKey | null {
  const colon = id.lastIndexOf(':')
  if (colon === -1) return null
  const uid = id.slice(0, colon)
  const path = id.slice(colon + 1)
  const first = path.split('.')[0]!
  // Verse files number segments flat (`dhp1:1`) — the uid part (one verse)
  // is the group; prose files nest (`mn1:1.2`) — group by the paragraph.
  const group = path.includes('.') ? `${uid}:${first}` : uid
  return { group, header: first === '0' }
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length
}

interface Segment {
  root: string
  translation: string
}

function toChunk(segments: Segment[]): ImportChunk {
  const translation = segments
    .map((s) => s.translation)
    .filter((t) => t.length > 0)
    .join(' ')
  return {
    original: segments.map((s) => s.root).join('\n'),
    translation: translation || null,
  }
}

/** Split one paragraph's segments into chunks of at most MAX_CHUNK_WORDS
 * (a single oversized segment still becomes its own chunk). */
function splitOversized(segments: Segment[]): Segment[][] {
  const groups: Segment[][] = []
  let current: Segment[] = []
  let words = 0
  for (const segment of segments) {
    const n = wordCount(segment.root)
    if (current.length > 0 && words + n > MAX_CHUNK_WORDS) {
      groups.push(current)
      current = []
      words = 0
    }
    current.push(segment)
    words += n
  }
  if (current.length > 0) groups.push(current)
  return groups
}

/** Turn a Bilara payload into ordered gloss chunks: one chunk per
 * paragraph/verse, header segments skipped, oversized paragraphs split. */
export function chunksFromBilara(sutta: BilaraSutta): ImportChunk[] {
  const roots = sutta.root_text
  const translations = sutta.translation_text ?? {}
  const order = sutta.keys_order ?? Object.keys(roots)

  const groups: Segment[][] = []
  const byKey = new Map<string, Segment[]>()
  for (const id of order) {
    const key = segmentKey(id)
    if (!key || key.header) continue
    const root = cleanSegment(roots[id] ?? '')
    if (!root) continue
    const segment: Segment = {
      root,
      translation: cleanSegment(translations[id] ?? ''),
    }
    let group = byKey.get(key.group)
    if (!group) {
      group = []
      byKey.set(key.group, group)
      groups.push(group)
    }
    group.push(segment)
  }

  return groups.flatMap(splitOversized).map(toChunk)
}

/** The Pali title from the root `0.2` header segment — a fallback for when
 * suttaplex metadata is incomplete. */
export function rootTitle(sutta: BilaraSutta): string | null {
  const order = sutta.keys_order ?? Object.keys(sutta.root_text)
  const id = order.find((i) => i.endsWith(':0.2'))
  const title = id ? cleanSegment(sutta.root_text[id] ?? '') : ''
  return title || null
}

