import assert from 'node:assert/strict'
import { test } from 'node:test'
import { groupPassages, type Chunk } from '@interlinear/shared'

function chunk(idx: number, words: number, glossed = true): Chunk {
  const text = Array.from({ length: words }, (_, i) => `w${idx}_${i}`)
  return {
    idx,
    original: text.join(' '),
    words: glossed ? text.map((w) => ({ w, g: 'gloss' })) : null,
    translation: null,
  }
}

test('groupPassages keeps every chunk, in order', () => {
  const chunks = Array.from({ length: 40 }, (_, i) => chunk(i, 7))
  const passages = groupPassages(chunks, { targetWords: 90, maxPassages: 20 })
  assert.deepEqual(
    passages.flatMap((passage) => passage.chunks.map((c) => c.idx)),
    chunks.map((c) => c.idx),
  )
  assert.deepEqual(
    passages.map((passage) => passage.idx),
    passages.map((_, i) => i),
  )
})

test('groupPassages folds the fragments of an MN 1 into readable units', () => {
  // MN 1 as stored: 194 chunks averaging seven words, most of them an
  // elided repetition. One chip per chunk is the wall of numbers this
  // grouping exists to prevent.
  const chunks = Array.from({ length: 194 }, (_, i) => chunk(i, 7))
  const passages = groupPassages(chunks, { targetWords: 90, maxPassages: 20 })
  assert.ok(passages.length <= 20, `expected at most 20 passages, got ${passages.length}`)
  assert.ok(passages.length >= 10, `expected a real breakdown, got ${passages.length}`)
})

test('groupPassages raises the target rather than growing the index', () => {
  // A long text (62 chunks of 68 words, like MN 12) still fits the cap.
  const chunks = Array.from({ length: 62 }, (_, i) => chunk(i, 68))
  const passages = groupPassages(chunks, { targetWords: 90, maxPassages: 20 })
  assert.ok(passages.length <= 20, `expected at most 20 passages, got ${passages.length}`)
  // Without a cap, the target alone decides: 4216 words in pages of 400.
  const uncapped = groupPassages(chunks, { targetWords: 400 })
  assert.equal(uncapped.length, 10)
})

test('groupPassages leaves a chunk longer than the target on its own', () => {
  const chunks = [chunk(0, 371), chunk(1, 20), chunk(2, 200)]
  const passages = groupPassages(chunks, { targetWords: 90 })
  assert.deepEqual(
    passages.map((passage) => passage.chunks.map((c) => c.idx)),
    [[0], [1, 2]],
  )
})

test('groupPassages joins a short tail to the passage before it', () => {
  // 100 + 100 + 10 words: the last chunk is no passage of its own.
  const passages = groupPassages([chunk(0, 100), chunk(1, 100), chunk(2, 10)], {
    targetWords: 90,
  })
  assert.equal(passages.length, 2)
  assert.deepEqual(passages[1]!.chunks.map((c) => c.idx), [1, 2])
})

test('groupPassages sizes unglossed chunks the same as glossed ones', () => {
  // A text still waiting for the gloss worker breaks into the same passages
  // it will have once glossed — the index does not jump when they land.
  const sizes = [7, 7, 40, 120, 9, 60, 7, 7]
  const shape = (glossed: boolean) =>
    groupPassages(
      sizes.map((words, i) => chunk(i, words, glossed)),
      { targetWords: 90 },
    ).map((passage) => passage.chunks.map((c) => c.idx))
  assert.deepEqual(shape(false), shape(true))
  assert.deepEqual(shape(true), [
    [0, 1, 2, 3],
    [4, 5, 6, 7],
  ])
})

test('groupPassages handles the trivial texts', () => {
  assert.deepEqual(groupPassages([], { targetWords: 90 }), [])
  const one = groupPassages([chunk(0, 5)], { targetWords: 90 })
  assert.equal(one.length, 1)
  assert.deepEqual(one[0]!.chunks.map((c) => c.idx), [0])
  // An empty chunk still belongs somewhere.
  const empty = groupPassages([{ idx: 0, original: '', words: null, translation: null }], {
    targetWords: 90,
  })
  assert.equal(empty.length, 1)
})
