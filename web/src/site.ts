import { siteForHost, type SiteConfig } from '@interlinear/shared'

/** The site (branding + library lens) this browser is looking at. */
export const site: SiteConfig = siteForHost(window.location.hostname)

/** Apply site-wide bits that live outside the React tree. */
export function applySite(): void {
  // In production the server stamps the theme class on <html> and injects
  // the right <title> into index.html before first paint; this covers dev
  // and any stale-cached shell (classList.add is a no-op when present).
  if (site.themeClass) document.documentElement.classList.add(site.themeClass)
  document.title = site.title
}
