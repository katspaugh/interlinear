import assert from 'node:assert/strict'
import { test } from 'node:test'
import { SEED_TEXTS } from '../src/seed-data.js'

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
