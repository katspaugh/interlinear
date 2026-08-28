import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  literalGloss,
  morphsAlign,
  PALI_PREFIXES,
  paliPrefixReference,
  type Morph,
} from '@interlinear/shared'

const manopubbangama: Morph[] = [
  { s: 'Mano', k: 'stem', g: 'mind' },
  { s: 'pubbaṅ', k: 'stem', g: 'before' },
  { s: 'gam', k: 'root', g: 'going' },
  { s: 'ā', k: 'ending' },
]

test('morphsAlign requires exact concatenation to the surface form', () => {
  assert.ok(morphsAlign('Manopubbaṅgamā', manopubbangama))
  // Capitalization, diacritics, and punctuation all count.
  assert.ok(!morphsAlign('manopubbaṅgamā', manopubbangama))
  assert.ok(!morphsAlign('Manopubbaṅgamā,', manopubbangama))
  assert.ok(!morphsAlign('Manopubbaṅgamā', manopubbangama.slice(0, 3)))
  assert.ok(!morphsAlign('Manopubbaṅgamā', []))
})

test('literalGloss joins morpheme glosses with a middle dot', () => {
  assert.equal(literalGloss(manopubbangama), 'mind·before·going')
})

test('literalGloss marks sandhi seams with a plus', () => {
  const dukkhamanveti: Morph[] = [
    { s: 'du', k: 'prefix', g: 'bad' },
    { s: 'kkham', k: 'root', g: 'misery' },
    { s: 'anv', k: 'prefix', g: 'along', sandhi: true },
    { s: 'eti,', k: 'root', g: 'goes' },
  ]
  assert.equal(literalGloss(dukkhamanveti), 'bad·misery + along·goes')
})

test('literalGloss yields null when segmentation adds nothing', () => {
  assert.equal(literalGloss(undefined), null)
  // A single glossed morpheme is no more informative than the fluent gloss.
  assert.equal(
    literalGloss([
      { s: 'dhamm', k: 'root', g: 'phenomena' },
      { s: 'ā', k: 'ending' },
    ]),
    null,
  )
})

test('the Pali prefix table is well-formed', () => {
  const forms = PALI_PREFIXES.map((p) => p.form)
  assert.equal(new Set(forms).size, forms.length, 'duplicate prefix forms')
  for (const prefix of PALI_PREFIXES) {
    assert.ok(prefix.form.length > 0)
    assert.ok(prefix.imagery.length > 0)
    assert.ok(prefix.cognates.length > 0)
    assert.ok(prefix.example.length > 0)
  }
  const reference = paliPrefixReference()
  assert.ok(reference.includes('sam/saṁ-:'))
  assert.equal(reference.split('\n').length, PALI_PREFIXES.length)
})
