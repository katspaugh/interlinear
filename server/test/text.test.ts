import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  normalizeWord,
  slugify,
  splitChunks,
  tokenizeChunk,
} from '@interlinear/shared'

test('splitChunks splits on blank lines and trims', () => {
  const chunks = splitChunks('One stanza\nline two\n\n\nSecond stanza\r\n\r\nThird')
  assert.deepEqual(chunks, ['One stanza\nline two', 'Second stanza', 'Third'])
})

test('splitChunks drops empty input', () => {
  assert.deepEqual(splitChunks('  \n \n '), [])
})

test('tokenizeChunk marks line-final tokens with nl', () => {
  const tokens = tokenizeChunk('Sabbapāpassa akaraṇaṃ,\nkusalassa upasampadā;')
  assert.deepEqual(tokens, [
    { w: 'Sabbapāpassa' },
    { w: 'akaraṇaṃ,', nl: true },
    { w: 'kusalassa' },
    { w: 'upasampadā;' },
  ])
})

test('normalizeWord lowercases and strips punctuation but keeps diacritics', () => {
  assert.equal(normalizeWord('Sukhitattā.'), 'sukhitattā')
  assert.equal(normalizeWord('“cassa,”'), 'cassa')
  assert.equal(normalizeWord('sāsanaṃ॥'), 'sāsanaṃ')
})

test('slugify transliterates diacritics', () => {
  assert.equal(slugify('Karaṇīyamettā Sutta'), 'karaniyametta-sutta')
  assert.equal(slugify('  ---  '), 'sutta')
})
