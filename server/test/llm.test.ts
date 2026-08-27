import assert from 'node:assert/strict'
import { test } from 'node:test'
import { z } from 'zod'
import { parseJsonResult } from '../src/llm.js'

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
