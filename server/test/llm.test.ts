import assert from 'node:assert/strict'
import { test } from 'node:test'
import { z } from 'zod'
import { parseJsonResult, sanitizeMorphs } from '../src/llm.js'

const schema = z.object({ glosses: z.array(z.string()), translation: z.string() })

test('parseJsonResult reads a bare JSON object', () => {
  const result = parseJsonResult(schema, '{"glosses":["a","b"],"translation":"t"}')
  assert.deepEqual(result.glosses, ['a', 'b'])
})

test('parseJsonResult tolerates fences and surrounding prose', () => {
  const text = 'Here you go:\n```json\n{"glosses":["x"],"translation":"y"}\n```\nDone.'
  const result = parseJsonResult(schema, text)
  assert.equal(result.translation, 'y')
})

test('parseJsonResult rejects missing or malformed JSON', () => {
  assert.throws(() => parseJsonResult(schema, 'no json here'))
  assert.throws(() => parseJsonResult(schema, '{"glosses": [broken'))
  assert.throws(() => parseJsonResult(schema, '{"wrong": true}'))
})

test('sanitizeMorphs converts LLM nulls to the compact contract shape', () => {
  const morphs = sanitizeMorphs('paduṭṭhena', [
    { s: 'pa', k: 'prefix', g: 'forth', sandhi: null },
    { s: 'duṭṭh', k: 'root', g: 'spoiled', sandhi: null },
    { s: 'ena', k: 'ending', g: null, sandhi: null },
  ])
  assert.deepEqual(morphs, [
    { s: 'pa', k: 'prefix', g: 'forth' },
    { s: 'duṭṭh', k: 'root', g: 'spoiled' },
    { s: 'ena', k: 'ending' },
  ])
})

test('sanitizeMorphs drops misaligned or uninformative segmentations', () => {
  // Segments that do not concatenate back to the token (missing punctuation).
  assert.equal(
    sanitizeMorphs('dhammā,', [
      { s: 'dhamm', k: 'root', g: 'phenomena' },
      { s: 'ā', k: 'ending' },
    ]),
    undefined,
  )
  // Single-segment and absent segmentations carry no information.
  assert.equal(sanitizeMorphs('ce', [{ s: 'ce', k: 'root', g: 'if' }]), undefined)
  assert.equal(sanitizeMorphs('ce', null), undefined)
  assert.equal(sanitizeMorphs('ce', undefined), undefined)
})
