import { siteForHost, type SiteConfig } from '@interlinear/shared'

/** The site (branding + library lens) this browser is looking at. */
export const site: SiteConfig = siteForHost(window.location.hostname)

/** Apply site-wide bits that live outside the React tree. */
export function applySite(): void {
  if (site.themeClass) document.documentElement.classList.add(site.themeClass)
  // In production the server injects the right <title> into index.html;
  // this covers dev and any stale-cached shell.
  document.title = site.title
}
