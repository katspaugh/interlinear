import assert from 'node:assert/strict'
import { test } from 'node:test'
import { collectionOf, groupLibrary, sourceNumber } from '@interlinear/shared'

function entry(source: string | null, slug = 'x') {
  return { source, slug }
}

test('collectionOf strips the number from a source line', () => {
  assert.equal(collectionOf('Majjhima Nikāya 10'), 'Majjhima Nikāya')
  assert.equal(collectionOf('Dhammapada 1–20'), 'Dhammapada')
  assert.equal(collectionOf(null), 'Other')
})

test('sourceNumber orders within a collection', () => {
  assert.equal(sourceNumber('Saṃyutta Nikāya 56.11'), 56.11)
  assert.equal(sourceNumber('Dhammapada 21–32'), 21)
  assert.equal(sourceNumber(null), Number.POSITIVE_INFINITY)
})

test('groupLibrary orders collections canonically and texts numerically', () => {
  const groups = groupLibrary([
    entry('Dhammapada 21–32', 'dhp21-32'),
    entry('Majjhima Nikāya 10', 'mn10'),
    entry('Dhammapada 1–20', 'dhp1-20'),
    entry('Majjhima Nikāya 2', 'mn2'),
    entry(null, 'loose'),
  ])
  assert.deepEqual(
    groups.map((g) => g.name),
    ['Majjhima Nikāya', 'Dhammapada', 'Other'],
  )
  assert.deepEqual(
    groups[0]!.texts.map((t) => t.slug),
    ['mn2', 'mn10'],
  )
  assert.deepEqual(
    groups[1]!.texts.map((t) => t.slug),
    ['dhp1-20', 'dhp21-32'],
  )
})
