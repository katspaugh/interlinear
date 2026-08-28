/**
 * SuttaCentral cross-links. Imported texts use SuttaCentral uids as slugs
 * (mn10, snp1.8), so their page is one concatenation away; the hand-glossed
 * seeds have friendly slugs (metta-sutta), so their uid is derived from the
 * `source` line instead. The reader links each sutta to its SuttaCentral
 * page — parallels, alternative translations, manuscripts — and the site
 * footer credits the corpus.
 */

/** uid prefix ↔ long collection name, as written in `source` lines. */
export const PALI_COLLECTIONS: Record<string, string> = {
  dn: 'Dīgha Nikāya',
  mn: 'Majjhima Nikāya',
  sn: 'Saṃyutta Nikāya',
  an: 'Aṅguttara Nikāya',
  kp: 'Khuddakapāṭha',
  dhp: 'Dhammapada',
  ud: 'Udāna',
  iti: 'Itivuttaka',
  snp: 'Sutta Nipāta',
  thag: 'Theragāthā',
  thig: 'Therīgāthā',
}

/** "snp1.8" → "Sutta Nipāta 1.8"; "dhp1-20" → "Dhammapada 1–20"; null for
 * unknown collections. Used by the importer to write seed-style sources. */
export function sourceForUid(uid: string): string | null {
  const match = uid.match(/^([a-z]+)([\d.-]+)$/)
  if (!match) return null
  const name = PALI_COLLECTIONS[match[1]!]
  if (!name) return null
  return `${name} ${match[2]!.replace(/-/g, '–')}`
}

/** SuttaCentral's Dhammapada pages are one per vagga, addressed by verse
 * range (dhp1-20) — a seed quoting verses 153–154 links to dhp146-156. */
const DHP_VAGGAS: Array<[number, number]> = [
  [1, 20], [21, 32], [33, 43], [44, 59], [60, 75], [76, 89], [90, 99],
  [100, 115], [116, 128], [129, 145], [146, 156], [157, 166], [167, 178],
  [179, 196], [197, 208], [209, 220], [221, 234], [235, 255], [256, 272],
  [273, 289], [290, 305], [306, 319], [320, 333], [334, 359], [360, 382],
  [383, 423],
]

/** A slug that already is a SuttaCentral uid (longer prefixes first, and a
 * digit must follow, so "anapanassati-sutta" doesn't match "an"). */
const UID_SLUG = /^(?:dhp|snp|thag|thig|iti|dn|mn|sn|an|kp|ud)\d[\d.-]*$/

/**
 * The SuttaCentral uid for a text, or null when there isn't one (user texts,
 * fiction, unrecognized sources).
 */
export function suttaCentralUid(slug: string, source: string | null): string | null {
  if (UID_SLUG.test(slug)) return slug
  const match = source?.match(/^(.*?)\s+(\d[\d.–-]*)$/)
  if (!match) return null
  const name = match[1]!.trim()
  const entry = Object.entries(PALI_COLLECTIONS).find(([, n]) => n === name)
  if (!entry) return null
  const prefix = entry[0]
  const number = match[2]!.replace(/–/g, '-')
  if (prefix === 'dhp') {
    const verse = Number(number.split(/[.-]/)[0])
    const vagga = DHP_VAGGAS.find(([from, to]) => verse >= from && verse <= to)
    return vagga ? `dhp${vagga[0]}-${vagga[1]}` : null
  }
  return `${prefix}${number}`
}

/** The text's SuttaCentral page URL, or null for non-sutta texts. */
export function suttaCentralUrl(text: {
  slug: string
  source: string | null
  kind: string
}): string | null {
  if (text.kind !== 'sutta') return null
  const uid = suttaCentralUid(text.slug, text.source)
  return uid ? `https://suttacentral.net/${uid}` : null
}
