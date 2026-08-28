import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  textDetail,
  textLibrary,
  wordDefinition,
  type TextDetail,
  type TextSummary,
  type WordDefinitionState,
} from '@interlinear/shared'

const summary: TextSummary = {
  id: '5e0c4bcb-9a68-4e0b-a3f7-8f2a44a11111',
  slug: 'test-text',
  title: 'Test',
  origTitle: null,
  source: null,
  lang: 'Pali',
  kind: 'sutta',
  status: 'glossing',
  builtin: false,
  translator: null,
  chunkCount: 2,
  glossedCount: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  preview: null,
}

test('textLibrary reducers update counts and remove texts', () => {
  const added = textLibrary.reducers['text.added']!
  const glossed = textLibrary.reducers['text.chunkGlossed']!
  const removed = textLibrary.reducers['text.removed']!

  let state: TextSummary[] = []
  state = added(state, summary, {}) as TextSummary[]
  state = added(state, summary, {}) as TextSummary[] // duplicate event is a no-op
  assert.equal(state.length, 1)

  state = glossed(
    state,
    { textId: summary.id, idx: 0, words: [], translation: '', glossedCount: 2, status: 'ready' },
    {},
  ) as TextSummary[]
  assert.equal(state[0]!.status, 'ready')
  assert.equal(state[0]!.glossedCount, 2)

  state = removed(state, { id: summary.id }, {}) as TextSummary[]
  assert.equal(state.length, 0)
})

test('textDetail applies chunk glosses only to the matching text', () => {
  const glossed = textDetail.reducers['text.chunkGlossed']!
  const detail: TextDetail = {
    text: summary,
    chunks: [
      { idx: 0, original: 'a b', words: null, translation: null },
      { idx: 1, original: 'c d', words: null, translation: null },
    ],
  }
  const words = [{ w: 'a', g: 'x' }, { w: 'b', g: 'y' }]

  const other = glossed(
    detail,
    { textId: '00000000-0000-4000-8000-000000000000', idx: 0, words, translation: 't', glossedCount: 1, status: 'glossing' },
    { slug: 'test-text' },
  ) as TextDetail
  assert.equal(other.chunks[0]!.words, null)

  const updated = glossed(
    detail,
    { textId: summary.id, idx: 0, words, translation: 't', glossedCount: 1, status: 'glossing' },
    { slug: 'test-text' },
  ) as TextDetail
  assert.deepEqual(updated.chunks[0]!.words, words)
  assert.equal(updated.chunks[1]!.words, null)
  assert.equal(updated.text.glossedCount, 1)
})

test('wordDefinition reducers filter by lang, word, and tier params', () => {
  const defined = wordDefinition.reducers['word.defined']!
  const none: WordDefinitionState = { status: 'none', definition: null, error: null }
  const definition = {
    headword: 'mettā',
    grammar: 'f. noun',
    meanings: ['loving-kindness'],
    analysis: null,
    etymology: null,
  }
  const params = { lang: 'Pali', word: 'mettā', tier: 'fast' as const }

  const missWord = defined(
    none,
    { lang: 'Pali', word: 'other', tier: 'fast', definition },
    params,
  ) as WordDefinitionState
  assert.equal(missWord.status, 'none')

  const missTier = defined(
    none,
    { lang: 'Pali', word: 'mettā', tier: 'deep', definition },
    params,
  ) as WordDefinitionState
  assert.equal(missTier.status, 'none')

  const hit = defined(
    none,
    { lang: 'Pali', word: 'mettā', tier: 'fast', definition },
    params,
  ) as WordDefinitionState
  assert.equal(hit.status, 'ready')
  assert.equal(hit.definition?.headword, 'mettā')
})
