/**
 * Library grouping for large collections: once a site carries hundreds of
 * suttas, the home page groups them by collection, derived from each text's
 * `source` line. Search lives in search.ts; these pure functions only
 * organize what search (or the full library) returns.
 */

/** Group label from a source line: everything before the first number.
 * "Majjhima Nikāya 10" → "Majjhima Nikāya"; null/unnumbered → "Other". */
export function collectionOf(source: string | null): string {
  if (!source) return 'Other'
  const name = source.replace(/\s*\d[\s\S]*$/, '').trim()
  return name || 'Other'
}

/** First number in a source line, for canonical ordering within a
 * collection: "Saṃyutta Nikāya 56.11" → 56.11, "Dhammapada 1–20" → 1. */
export function sourceNumber(source: string | null): number {
  const match = source?.match(/(\d+(?:\.\d+)?)/)
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY
}

/** Canonical order of the Pali collections; unknown groups sort after, in
 * alphabetical order. */
const COLLECTION_ORDER = [
  'Dīgha Nikāya',
  'Majjhima Nikāya',
  'Saṃyutta Nikāya',
  'Aṅguttara Nikāya',
  'Khuddakapāṭha',
  'Dhammapada',
  'Udāna',
  'Itivuttaka',
  'Sutta Nipāta',
  'Theragāthā',
  'Therīgāthā',
]

function collectionRank(name: string): number {
  const idx = COLLECTION_ORDER.indexOf(name)
  return idx === -1 ? COLLECTION_ORDER.length : idx
}

export interface LibraryGroup<T> {
  name: string
  texts: T[]
}

/** Group texts by collection, both levels in canonical order. */
export function groupLibrary<T extends { source: string | null }>(
  texts: T[],
): LibraryGroup<T>[] {
  const groups = new Map<string, T[]>()
  for (const text of texts) {
    const name = collectionOf(text.source)
    const group = groups.get(name)
    if (group) group.push(text)
    else groups.set(name, [text])
  }
  return [...groups.entries()]
    .sort(([a], [b]) => collectionRank(a) - collectionRank(b) || a.localeCompare(b))
    .map(([name, entries]) => ({
      name,
      texts: entries.sort(
        (a, b) => sourceNumber(a.source) - sourceNumber(b.source),
      ),
    }))
}
