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
  /** Show only texts of this kind on the home page (undefined = all). */
  onlyKind?: string
}

export const INTERLINEAR_SITE: SiteConfig = {
  id: 'interlinear',
  domain: 'interlinear.cc',
  name: 'interlinear',
  title: 'interlinear — read any text word by word',
  description:
    'Read Pali suttas — and any other text in any language — with an ' +
    'interlinear gloss above every word and word-by-word dictionary lookups.',
  themeClass: '',
  themeColor: '#008acc',
  favicon: '/favicon.ico',
  ogImage: 'https://interlinear.cc/img/books.jpg',
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
