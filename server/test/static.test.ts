import assert from 'node:assert/strict'
import { test } from 'node:test'
import { INTERLINEAR_SITE, SUTTA_SITE, siteForHost } from '@interlinear/shared'
import { renderIndexHtml } from '../src/static.js'

test('siteForHost resolves domains, www prefixes, and ports', () => {
  assert.equal(siteForHost('interlinear.cc').id, 'interlinear')
  assert.equal(siteForHost('www.interlinear.cc').id, 'interlinear')
  assert.equal(siteForHost('sutta.stream').id, 'sutta')
  assert.equal(siteForHost('WWW.SUTTA.STREAM').id, 'sutta')
  assert.equal(siteForHost('sutta.stream:8080').id, 'sutta')
})

test('siteForHost falls back to interlinear for unknown hosts', () => {
  assert.equal(siteForHost(undefined).id, 'interlinear')
  assert.equal(siteForHost('localhost:5173').id, 'interlinear')
  assert.equal(siteForHost('interlinear.io').id, 'interlinear')
  assert.equal(siteForHost('evil.sutta.stream.example.com').id, 'interlinear')
})

// Mirrors the structure of web/index.html, multi-line attributes included.
const SHELL = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta
      name="description"
      content="Original description."
    />
    <link rel="icon" href="/favicon.ico" />
    <title>original title</title>
  </head>
  <body></body>
</html>
`

test('renderIndexHtml brands the shell for sutta.stream', () => {
  const html = renderIndexHtml(SHELL, SUTTA_SITE)
  assert.match(html, /<title>sutta\.stream — read the suttas in Pali, word by word<\/title>/)
  assert.doesNotMatch(html, /original title|Original description/)
  assert.match(html, /name="description"\s+content="Read the Buddha’s discourses/)
  assert.match(html, /<link rel="icon" href="\/favicon-sutta\.svg"/)
  assert.match(html, /property="og:url" content="https:\/\/sutta\.stream\/"/)
  assert.match(html, /property="og:title"/)
  assert.match(html, /name="theme-color" content="#6e441f"/)
  // Theme class stamped on <html> so the palette applies before JS runs.
  assert.match(html, /<html lang="en" class="theme-sutta">/)
  // No og:image configured for sutta.stream yet.
  assert.doesNotMatch(html, /og:image/)
  // The head is still well-formed.
  assert.match(html, /<\/head>/)
})

test('renderIndexHtml brands the shell for interlinear.cc', () => {
  const html = renderIndexHtml(SHELL, INTERLINEAR_SITE)
  assert.match(html, /<title>interlinear — read any text word by word<\/title>/)
  assert.match(html, /<link rel="icon" href="\/favicon\.ico"/)
  assert.match(html, /property="og:image" content="https:\/\/interlinear\.cc\/img\/books\.jpg"/)
  // Default theme: no class added to <html>.
  assert.match(html, /<html lang="en">/)
})
