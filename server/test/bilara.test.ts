import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  MAX_CHUNK_WORDS,
  chunksFromBilara,
  cleanSegment,
  rootTitle,
  segmentKey,
  sourceForUid,
  type BilaraSutta,
} from '../src/import/bilara.js'

/* A trimmed prose sutta in the real Bilara shape (mn-style ids). */
const prose: BilaraSutta = {
  root_text: {
    'mn1:0.1': 'Majjhima Nikāya 1 ',
    'mn1:0.2': 'Mūlapariyāyasutta ',
    'mn1:1.1': 'Evaṁ me sutaṁ— ',
    'mn1:1.2': 'ekaṁ samayaṁ bhagavā viharati. ',
    'mn1:2.1': 'Tatra kho bhagavā bhikkhū āmantesi. ',
  },
  translation_text: {
    'mn1:0.1': 'Middle Discourses 1 ',
    'mn1:0.2': 'The Root of All Things ',
    'mn1:1.1': 'So I have heard. ',
    'mn1:1.2': 'At one time the Buddha was staying. ',
    'mn1:2.1': 'There the Buddha addressed the mendicants. ',
  },
  keys_order: ['mn1:0.1', 'mn1:0.2', 'mn1:1.1', 'mn1:1.2', 'mn1:2.1'],
}

/* Verse files number segments flat (`dhp1:1`), one uid per verse. */
const verse: BilaraSutta = {
  root_text: {
    'dhp1:0.1': 'Khuddakanikāya ',
    'dhp1:0.3': 'Yamakavagga ',
    'dhp1:1': 'Manopubbaṅgamā dhammā, ',
    'dhp1:2': 'manoseṭṭhā manomayā; ',
    'dhp2:1': 'Manopubbaṅgamā dhammā, ',
    'dhp2:2': 'manoseṭṭhā manomayā. ',
  },
  translation_text: {
    'dhp1:1': 'Intention is the leader of things; ',
    'dhp1:2': 'intention is first, <j>they’re made by intention. ',
    'dhp2:1': 'Intention is the leader of things; ',
    'dhp2:2': 'intention is first. ',
  },
  keys_order: ['dhp1:0.1', 'dhp1:0.3', 'dhp1:1', 'dhp1:2', 'dhp2:1', 'dhp2:2'],
}

test('prose: one chunk per paragraph, headers skipped, segments as lines', () => {
  const chunks = chunksFromBilara(prose)
  assert.equal(chunks.length, 2)
  assert.equal(chunks[0]!.original, 'Evaṁ me sutaṁ—\nekaṁ samayaṁ bhagavā viharati.')
  assert.equal(
    chunks[0]!.translation,
    'So I have heard. At one time the Buddha was staying.',
  )
  assert.equal(chunks[1]!.original, 'Tatra kho bhagavā bhikkhū āmantesi.')
})

test('verse: one chunk per verse, markup stripped', () => {
  const chunks = chunksFromBilara(verse)
  assert.equal(chunks.length, 2)
  assert.equal(chunks[0]!.original.split('\n').length, 2)
  assert.ok(chunks[0]!.translation!.includes('they’re made by intention.'))
  assert.ok(!chunks[0]!.translation!.includes('<j>'))
})

test('untranslated texts get null chunk translations', () => {
  const chunks = chunksFromBilara({ root_text: prose.root_text })
  assert.equal(chunks.length, 2)
  assert.equal(chunks[0]!.translation, null)
})

test('oversized paragraphs split at segment boundaries', () => {
  const line = Array.from({ length: 30 }, (_, i) => `pada${i}`).join(' ')
  const sutta: BilaraSutta = {
    root_text: {
      'x1:1.1': line,
      'x1:1.2': line,
      'x1:1.3': line,
      'x1:1.4': line,
    },
    keys_order: ['x1:1.1', 'x1:1.2', 'x1:1.3', 'x1:1.4'],
  }
  const chunks = chunksFromBilara(sutta)
  assert.ok(chunks.length > 1)
  for (const chunk of chunks) {
    const words = chunk.original.split(/\s+/).length
    assert.ok(words <= MAX_CHUNK_WORDS, `chunk has ${words} words`)
  }
})

test('segmentKey groups prose by paragraph and verse by uid', () => {
  assert.deepEqual(segmentKey('mn1:1.2'), { group: 'mn1:1', header: false })
  assert.deepEqual(segmentKey('snp1.8:2.1'), { group: 'snp1.8:2', header: false })
  assert.deepEqual(segmentKey('dhp1:1'), { group: 'dhp1', header: false })
  assert.deepEqual(segmentKey('mn1:0.2'), { group: 'mn1:0', header: true })
  assert.equal(segmentKey('no-colon'), null)
})

test('cleanSegment strips tags and tidies whitespace', () => {
  assert.equal(cleanSegment('  a  <j>b </j> c '), 'a b c')
})

test('rootTitle reads the 0.2 header', () => {
  assert.equal(rootTitle(prose), 'Mūlapariyāyasutta')
})

test('sourceForUid renders seed-style source lines', () => {
  assert.equal(sourceForUid('mn10'), 'Majjhima Nikāya 10')
  assert.equal(sourceForUid('snp1.8'), 'Sutta Nipāta 1.8')
  assert.equal(sourceForUid('dhp1-20'), 'Dhammapada 1–20')
  assert.equal(sourceForUid('sn56.11'), 'Saṃyutta Nikāya 56.11')
  assert.equal(sourceForUid('pli-tv-bu-vb-pj1'), null)
})
