import assert from 'node:assert/strict'
import { test } from 'node:test'
import { splitChunks, tokenizeChunk } from '@interlinear/shared'
import { SEED_TEXTS } from '../src/seed-data.js'
import { RAW_SEED_TEXTS } from '../src/seed-data-raw.js'

test('seed texts are well-formed', () => {
  assert.ok(SEED_TEXTS.length >= 3)
  const slugs = new Set(SEED_TEXTS.map((t) => t.slug))
  assert.equal(slugs.size, SEED_TEXTS.length, 'slugs are unique')

  for (const text of SEED_TEXTS) {
    assert.ok(text.chunks.length > 0, `${text.slug} has chunks`)
    for (const [idx, chunk] of text.chunks.entries()) {
      assert.ok(chunk.lines.length > 0, `${text.slug}#${idx} has lines`)
      assert.ok(chunk.translation.trim().length > 0, `${text.slug}#${idx} has translation`)
      for (const line of chunk.lines) {
        assert.ok(line.length > 0)
        for (const [w, g] of line) {
          assert.ok(w.trim().length > 0, `${text.slug}#${idx} token nonempty`)
          assert.ok(g.trim().length > 0, `${text.slug}#${idx} gloss for "${w}" nonempty`)
          assert.ok(!/\s/.test(w), `${text.slug}#${idx} token "${w}" has no spaces`)
        }
      }
    }
  }
})

test('raw seed texts are well-formed and tokenizable', () => {
  assert.ok(RAW_SEED_TEXTS.length >= 3)
  const slugs = new Set([...SEED_TEXTS, ...RAW_SEED_TEXTS].map((t) => t.slug))
  assert.equal(
    slugs.size,
    SEED_TEXTS.length + RAW_SEED_TEXTS.length,
    'slugs are unique across glossed and raw seeds',
  )

  for (const text of RAW_SEED_TEXTS) {
    const chunks = splitChunks(text.text)
    assert.ok(chunks.length > 0, `${text.slug} has chunks`)
    for (const [idx, chunk] of chunks.entries()) {
      const tokens = tokenizeChunk(chunk)
      assert.ok(tokens.length > 1, `${text.slug}#${idx} tokenizes into words`)
      for (const token of tokens) {
        // A very long token means unsegmented text (e.g. Japanese without
        // wakachigaki spaces) — it would gloss as one giant "word".
        assert.ok(
          token.w.length <= 30,
          `${text.slug}#${idx} token "${token.w}" is suspiciously long`,
        )
      }
    }
  }
})
