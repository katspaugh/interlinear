/**
 * Library search: one query box filters the home-page cards. A text matches
 * when every whitespace-separated term of the query is found in its title,
 * original-language title, source (author, or a sutta's collection and
 * number), or language — case- and diacritic-insensitively, so "nikaya"
 * finds "Nikāya" and "samyutta" finds "Saṃyutta".
 *
 * For suttas the `source` field carries the collection and number
 * ("Majjhima Nikāya 10"), and standard collection abbreviations are
 * expanded so "mn 10" finds it too.
 */

/** Standard Pali collection abbreviations → the collection name as it
 * appears in a sutta's `source`, pre-normalized (lowercase, no diacritics). */
const PALI_COLLECTIONS: Record<string, string> = {
  dn: 'digha nikaya',
  mn: 'majjhima nikaya',
  sn: 'samyutta nikaya',
  an: 'anguttara nikaya',
  kn: 'khuddaka nikaya',
  dhp: 'dhammapada',
  snp: 'sutta nipata',
  ud: 'udana',
  iti: 'itivuttaka',
  thag: 'theragatha',
  thig: 'therigatha',
}

/** Lowercase and strip diacritics (NFD + drop combining marks). */
export function normalizeSearchText(value: string): string {
  return value.normalize('NFD').replace(/\p{M}+/gu, '').toLowerCase()
}

/** The card fields the library search box looks at. */
export interface SearchableText {
  title: string
  origTitle: string | null
  source: string | null
  lang: string
}

export function matchesLibraryQuery(text: SearchableText, query: string): boolean {
  const haystack = normalizeSearchText(
    [text.title, text.origTitle, text.source, text.lang]
      .filter((part): part is string => part !== null)
      .join(' • '),
  )
  return query
    .split(/\s+/u)
    .filter((term) => term !== '')
    .every((raw) => {
      const term = normalizeSearchText(raw)
      if (haystack.includes(term)) return true
      const collection = PALI_COLLECTIONS[term]
      return collection !== undefined && haystack.includes(collection)
    })
}

/** Texts matching the query, in library order; a blank query matches all. */
export function searchLibrary<T extends SearchableText>(texts: T[], query: string): T[] {
  if (query.trim() === '') return texts
  return texts.filter((text) => matchesLibraryQuery(text, query))
}
