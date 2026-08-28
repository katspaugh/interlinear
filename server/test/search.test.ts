import assert from 'node:assert/strict'
import { test } from 'node:test'
import { matchesLibraryQuery, searchLibrary } from '@interlinear/shared'

const lib = [
  {
    id: 'sati',
    title: 'Mindfulness of Breathing',
    origTitle: 'Ānāpānassati Sutta',
    source: 'Majjhima Nikāya 118',
    lang: 'Pali',
  },
  {
    id: 'lion',
    title: 'Setting the Wheel in Motion',
    origTitle: 'Dhammacakkappavattana Sutta',
    source: 'Saṃyutta Nikāya 56.11',
    lang: 'Pali',
  },
  {
    id: 'kafka',
    title: 'Before the Law',
    origTitle: 'Vor dem Gesetz',
    source: 'Franz Kafka (1915)',
    lang: 'German',
  },
  {
    id: 'chekhov',
    title: 'Fat and Thin',
    origTitle: 'Толстый и тонкий',
    source: 'Антон Чехов (1883)',
    lang: 'Russian',
  },
]

const ids = (query: string) => searchLibrary(lib, query).map((t) => t.id)

test('matches by title, case-insensitively', () => {
  assert.deepEqual(ids('before the law'), ['kafka'])
})

test('matches by original-language title', () => {
  assert.deepEqual(ids('gesetz'), ['kafka'])
  assert.deepEqual(ids('Толстый'), ['chekhov'])
})

test('matches by author in source', () => {
  assert.deepEqual(ids('kafka'), ['kafka'])
})

test('matches by language', () => {
  assert.deepEqual(ids('german'), ['kafka'])
})

test('ignores diacritics in both text and query', () => {
  assert.deepEqual(ids('nikaya 118'), ['sati'])
  assert.deepEqual(ids('samyutta'), ['lion'])
  assert.deepEqual(ids('Ānāpānassati'), ['sati'])
})

test('expands Pali collection abbreviations', () => {
  assert.deepEqual(ids('MN 118'), ['sati'])
  assert.deepEqual(ids('sn 56.11'), ['lion'])
  assert.deepEqual(ids('mn'), ['sati'])
})

test('every term must match', () => {
  assert.deepEqual(ids('pali breathing'), ['sati'])
  assert.deepEqual(ids('pali kafka'), [])
})

test('a blank query matches everything', () => {
  assert.deepEqual(searchLibrary(lib, ''), lib)
  assert.deepEqual(searchLibrary(lib, '   '), lib)
})

test('handles null origTitle and source', () => {
  const bare = { title: 'Notes', origTitle: null, source: null, lang: 'English' }
  assert.equal(matchesLibraryQuery(bare, 'notes'), true)
  assert.equal(matchesLibraryQuery(bare, 'kafka'), false)
})
