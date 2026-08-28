import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  INTERLINEAR_SITE,
  SUTTA_SITE,
  filterLibrary,
  type SiteConfig,
} from '@interlinear/shared'

const lib = [
  { id: 'a', kind: 'sutta' },
  { id: 'b', kind: 'sutta' },
  { id: 'c', kind: 'fiction' },
  { id: 'd', kind: 'sutta' },
  { id: 'e', kind: 'fiction' },
]

test('sutta.stream shows only suttas, uncapped', () => {
  assert.deepEqual(
    filterLibrary(SUTTA_SITE, lib).map((t) => t.id),
    ['a', 'b', 'd'],
  )
})

test('interlinear.cc caps suttas but keeps everything else', () => {
  assert.deepEqual(INTERLINEAR_SITE.kindCaps, { sutta: 2 })
  assert.deepEqual(
    filterLibrary(INTERLINEAR_SITE, lib).map((t) => t.id),
    ['a', 'b', 'c', 'e'],
  )
})

test('filterLibrary without a lens returns the library as-is', () => {
  const site = { ...INTERLINEAR_SITE, kindCaps: undefined } as SiteConfig
  assert.deepEqual(filterLibrary(site, lib), lib)
})
