import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  sourceForUid,
  suttaCentralUid,
  suttaCentralUrl,
} from '@interlinear/shared'

test('sourceForUid renders seed-style source lines', () => {
  assert.equal(sourceForUid('mn10'), 'Majjhima Nikāya 10')
  assert.equal(sourceForUid('snp1.8'), 'Sutta Nipāta 1.8')
  assert.equal(sourceForUid('dhp1-20'), 'Dhammapada 1–20')
  assert.equal(sourceForUid('sn56.11'), 'Saṃyutta Nikāya 56.11')
  assert.equal(sourceForUid('pli-tv-bu-vb-pj1'), null)
})

test('imported slugs are already uids', () => {
  assert.equal(suttaCentralUid('mn1', 'Majjhima Nikāya 1'), 'mn1')
  assert.equal(suttaCentralUid('snp1.8', null), 'snp1.8')
  assert.equal(suttaCentralUid('dhp21-32', null), 'dhp21-32')
})

test('seed slugs derive the uid from the source line', () => {
  assert.equal(suttaCentralUid('metta-sutta', 'Sutta Nipāta 1.8'), 'snp1.8')
  assert.equal(suttaCentralUid('satipatthana-sutta', 'Majjhima Nikāya 10'), 'mn10')
  assert.equal(suttaCentralUid('four-noble-truths', 'Saṃyutta Nikāya 56.11'), 'sn56.11')
  assert.equal(suttaCentralUid('bahiya', 'Udāna 1.10'), 'ud1.10')
})

test('Dhammapada verses map to their vagga page', () => {
  assert.equal(suttaCentralUid('dhammapada-1-2', 'Dhammapada 1–2'), 'dhp1-20')
  assert.equal(suttaCentralUid('gahakaraka', 'Dhammapada 153–154'), 'dhp146-156')
  assert.equal(suttaCentralUid('three-marks', 'Dhammapada 277–279'), 'dhp273-289')
  assert.equal(suttaCentralUid('ovada-patimokkha', 'Dhammapada 183'), 'dhp179-196')
})

test('sutta-like slugs without a digit do not false-match a uid prefix', () => {
  // "anapanassati-sutta" starts with "an" but is not the uid an…
  assert.equal(
    suttaCentralUid('anapanassati-sutta', 'Majjhima Nikāya 118'),
    'mn118',
  )
  assert.equal(suttaCentralUid('mangala-sutta', 'Sutta Nipāta 2.4'), 'snp2.4')
})

test('suttaCentralUrl covers suttas only', () => {
  assert.equal(
    suttaCentralUrl({ slug: 'mn1', source: 'Majjhima Nikāya 1', kind: 'sutta' }),
    'https://suttacentral.net/mn1',
  )
  assert.equal(
    suttaCentralUrl({ slug: 'kumo-no-ito', source: null, kind: 'fiction' }),
    null,
  )
  assert.equal(
    suttaCentralUrl({ slug: 'my-pasted-text', source: 'somewhere', kind: 'sutta' }),
    null,
  )
})
