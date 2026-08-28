/**
 * Text utilities shared by client and server: chunking pasted Pali text and
 * normalizing surface forms for dictionary lookups. Pure string functions —
 * no dependencies — so the same behavior applies on both sides of the wire.
 */

/** Split pasted Pali text into gloss units (stanzas/paragraphs) on blank lines. */
export function splitChunks(pali: string): string[] {
  return pali
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n+/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0)
}

export interface Token {
  w: string
  nl?: boolean
}

/**
 * Split one chunk (stanza/paragraph) into whitespace tokens, marking tokens
 * that end a line with `nl` so the interlinear view can preserve verse layout.
 */
export function tokenizeChunk(pali: string): Token[] {
  const lines = pali
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
  return lines.flatMap((line, lineIdx) => {
    const words = line.split(/\s+/).filter((w) => w.length > 0)
    return words.map((w, wordIdx) => {
      const isLineEnd = wordIdx === words.length - 1 && lineIdx < lines.length - 1
      return isLineEnd ? { w, nl: true } : { w }
    })
  })
}

/**
 * Normalize a surface form for use as a dictionary-cache key: lowercase,
 * strip punctuation (including daṇḍas, quotes, and CJK punctuation — but
 * not the long-vowel mark ー, which is part of Japanese words) while keeping
 * diacritics (ā ī ū ṁ ṃ ṅ ñ ṭ ḍ ṇ ḷ) intact.
 */
export function normalizeWord(word: string): string {
  return word
    .toLowerCase()
    .replace(/[.,;:!?"'’‘“”„()\[\]{}…—–\-।॥|/\\0-9]/g, '')
    .replace(/[。、！？：；，．・‥〜～「」『』（）〈〉《》【】〔〕]/g, '')
    .trim()
}

/**
 * Whether a text's language is covered by the Digital Pāḷi Dictionary — the
 * only language with an instant offline-dictionary tier ('dpd').
 */
export function langHasDpd(lang: string): boolean {
  const normalized = lang.trim().toLowerCase()
  return normalized === 'pali' || normalized === 'pāli' || normalized === 'pāḷi'
}

/** Slugify a sutta title for URLs, transliterating Pali diacritics to ASCII. */
export function slugify(title: string): string {
  const ascii = title
    .toLowerCase()
    .replace(/[āàáâã]/g, 'a')
    .replace(/[īìíî]/g, 'i')
    .replace(/[ūùúû]/g, 'u')
    .replace(/[ṁṃ]/g, 'm')
    .replace(/[ṅñ]/g, 'n')
    .replace(/[ṭ]/g, 't')
    .replace(/[ḍ]/g, 'd')
    .replace(/[ṇ]/g, 'n')
    .replace(/[ḷ]/g, 'l')
    .replace(/[ś]/g, 's')
  return (
    ascii
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64) || 'sutta'
  )
}
