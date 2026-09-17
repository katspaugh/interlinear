/**
 * Passages: the reading units a text is navigated by.
 *
 * Texts are stored in chunks — one per source paragraph or verse, which for
 * an imported sutta means one per Bilara segment. That granularity is right
 * for glossing (one LLM call per chunk) and wrong for reading: MN 1 is 194
 * chunks averaging seven words, most of them an elided repetition like
 * "tejaṁ …", so a chunk-per-entry index is a wall of numbers and a
 * chunk-per-block page is a sparse list of fragments.
 *
 * A passage is a run of consecutive chunks that adds up to something worth
 * scrolling to. Grouping is by word count rather than by a fixed number of
 * chunks, because chunk sizes vary by two orders of magnitude between texts
 * (MN 1's two-word fragments, MN 8's 371-word paragraph), and `maxPassages`
 * keeps the index scannable for a long text by raising the target instead of
 * letting the count grow.
 */

import type { Chunk } from './contracts.js'

export interface Passage {
  /** Position in the text, 0-based — what the index chips are numbered by. */
  idx: number
  chunks: Chunk[]
}

export interface PassageOptions {
  /** Words a passage accumulates before the next one starts. */
  targetWords: number
  /** Cap on how many passages a text is broken into. Raises the effective
   * target for long texts rather than letting the index grow without end. */
  maxPassages?: number
}

/** Words in a chunk: the glossed tokens when it has them, else whitespace
 * splitting — close enough, since this only sizes reading units. */
function wordCount(chunk: Chunk): number {
  if (chunk.words) return chunk.words.length
  const trimmed = chunk.original.trim()
  return trimmed === '' ? 0 : trimmed.split(/\s+/u).length
}

/**
 * Break chunks into passages of roughly `targetWords` each. Every chunk goes
 * into exactly one passage, in order; a trailing run too short to stand on
 * its own joins the passage before it.
 */
export function groupPassages(chunks: Chunk[], options: PassageOptions): Passage[] {
  if (chunks.length === 0) return []
  const counts = chunks.map(wordCount)
  const total = counts.reduce((sum, count) => sum + count, 0)
  const target = options.maxPassages
    ? Math.max(options.targetWords, Math.ceil(total / options.maxPassages))
    : options.targetWords

  const passages: Passage[] = []
  let current: Chunk[] = []
  let words = 0
  for (const [i, chunk] of chunks.entries()) {
    current.push(chunk)
    words += counts[i]!
    if (words >= target) {
      passages.push({ idx: passages.length, chunks: current })
      current = []
      words = 0
    }
  }
  if (current.length > 0) {
    const last = passages[passages.length - 1]
    // A stray tail — the closing line of a sutta, say — reads as part of the
    // passage it follows rather than as a passage of its own.
    if (last && words < target / 2) last.chunks.push(...current)
    else passages.push({ idx: passages.length, chunks: current })
  }
  return passages
}
