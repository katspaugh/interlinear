import assert from 'node:assert/strict'
import { test } from 'node:test'
import { SEED_TEXTS } from '../src/seed-data.js'
import { FICTION_SEED_TEXTS } from '../src/seed-data-fiction.js'
import { MN_SEED_TEXTS } from '../src/seed-data-mn.js'

const ALL_SEEDS = [...SEED_TEXTS, ...MN_SEED_TEXTS, ...FICTION_SEED_TEXTS]

test('seed texts are well-formed', () => {
  assert.ok(SEED_TEXTS.length >= 3)
  assert.ok(MN_SEED_TEXTS.length === 12)
  assert.ok(FICTION_SEED_TEXTS.length >= 3)
  const slugs = new Set(ALL_SEEDS.map((t) => t.slug))
  assert.equal(slugs.size, ALL_SEEDS.length, 'slugs are unique')

  for (const text of ALL_SEEDS) {
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
          // A very long token means unsegmented text (e.g. Japanese without
          // wakachigaki spaces) — it would render as one giant "word".
          // (Pali dvandva compounds legitimately get long — the four-requisites
          // compound in MN 6 runs to 62 chars.)
          assert.ok(w.length <= 64, `${text.slug}#${idx} token "${w}" is suspiciously long`)
        }
      }
    }
  }
})
