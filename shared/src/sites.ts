/**
 * Multi-site branding. The same app serves several domains; the hostname
 * decides which "site" the visitor sees. A site is a skin plus a lens on the
 * shared library — all sites read and write the same texts, glosses, and
 * dictionary, so a definition generated on one enriches the others.
 *
 * The web app resolves its site from `location.hostname`; the server uses the
 * request's Host header to inject the right metadata into `index.html`.
 */

export interface SiteConfig {
  id: string
  /** Canonical apex domain (also matched with a `www.` prefix). */
  domain: string
  /** Wordmark text, e.g. shown in the header. */
  name: string
  /** Browser-tab / og:title. */
  title: string
  /** Meta description / og:description. */
  description: string
  /** Class added to <html>; '' for the default (blue) theme. */
  themeClass: string
  /** Browser chrome color (meta theme-color). */
  themeColor: string
  /** Favicon path. */
  favicon: string
  /** Absolute og:image URL, when the site has one. */
  ogImage?: string
  /** Placeholder for the library search box, naming what's searchable here. */
  searchPlaceholder: string
  /** Show only texts of this kind on the home page (undefined = all). */
  onlyKind?: string
  /** Cap how many texts of a kind the home page shows (kinds not listed are
   * uncapped). Lets interlinear.cc feature just a taste of the suttas while
   * sutta.stream carries the full collection. */
  kindCaps?: Record<string, number>
}

export const INTERLINEAR_SITE: SiteConfig = {
  id: 'interlinear',
  domain: 'interlinear.cc',
  name: 'interlinear',
  title: 'interlinear — read any text word by word',
  description:
    'Read any text in any language with an interlinear gloss above every ' +
    'word. Tap a word for a full dictionary entry: grammar, meanings, and ' +
    'etymology.',
  themeClass: '',
  themeColor: '#008acc',
  favicon: '/favicon.ico',
  ogImage: 'https://interlinear.cc/img/books.jpg',
  searchPlaceholder: 'Search by title, author, or language…',
  kindCaps: { sutta: 2 },
}

export const SUTTA_SITE: SiteConfig = {
  id: 'sutta',
  domain: 'sutta.stream',
  name: 'sutta.stream',
  title: 'sutta.stream — read the suttas in Pali, word by word',
  description:
    'Read the Buddha’s discourses in Pali with an interlinear gloss above ' +
    'every word. Tap any word for a full dictionary entry: grammar, ' +
    'meanings, doctrinal usage, and etymology.',
  themeClass: 'theme-sutta',
  themeColor: '#6e441f',
  favicon: '/favicon-sutta.svg',
  searchPlaceholder: 'Search by collection, number, or title…',
  onlyKind: 'sutta',
}

export const SITES: SiteConfig[] = [INTERLINEAR_SITE, SUTTA_SITE]

export const DEFAULT_SITE = INTERLINEAR_SITE

/**
 * Resolve the site for a hostname (or a Host header, which may carry a
 * port). Unknown hosts — localhost, previews, the .io domain — fall back to
 * the default interlinear site.
 */
export function siteForHost(host: string | undefined): SiteConfig {
  if (!host) return DEFAULT_SITE
  const hostname = host.split(':')[0]!.toLowerCase().replace(/^www\./, '')
  return SITES.find((site) => site.domain === hostname) ?? DEFAULT_SITE
}

/**
 * The site's lens on the shared library: `onlyKind` filters the library down
 * to one kind, `kindCaps` limits how many of a kind appear (keeping library
 * order, i.e. the earliest texts of that kind win).
 */
export function filterLibrary<T extends { kind: string }>(
  site: SiteConfig,
  texts: T[],
): T[] {
  const shown = site.onlyKind
    ? texts.filter((text) => text.kind === site.onlyKind)
    : texts
  const caps = site.kindCaps
  if (!caps) return shown
  const seen: Record<string, number> = {}
  return shown.filter((text) => {
    const cap = caps[text.kind]
    if (cap === undefined) return true
    seen[text.kind] = (seen[text.kind] ?? 0) + 1
    return seen[text.kind]! <= cap
  })
}
