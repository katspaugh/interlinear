import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  parseDeconstruction,
  parseDpdResponse,
  parseGrammarReadings,
  parseSummaryEntries,
} from '../src/dpd.js'

/* Trimmed captures of real dpdict.net /search_json responses. */

const BHIKKHAVE_SUMMARY = `<p class="summary">
    <a class="summary-link" href="#bhikkhave">
        bhikkhave
    </a>
    masc.
    <b>monks</b>
    <a class="summary-link" href="#bhikkhave">►</a>
</p><p class="summary">
    <a class="summary-link" href="#bhikkhu">
        bhikkhu
    </a>
    masc.
    <b>monk; monastic; mendicant; fully ordained monk</b>; lit. beggar
    <a class="summary-link" href="#bhikkhu">►</a>
</p><p class="summary">
    <a class="summary-link" href="#grammar: bhikkhave">
        bhikkhave
    </a>
    grammar.
    <!-- [(&#39;bhikkhu&#39;, &#39;noun&#39;, [&#39;masc&#39;, &#39;voc&#39;, &#39;pl&#39;])] -->
    <a class="summary-link" href="#grammar: bhikkhave">►</a>
</p><p class="summary">
    <a class="summary-link" href="#variants: bhikkhave">
        bhikkhave
    </a>
    variants.
    <a class="summary-link" href="#variants: bhikkhave">►</a>
</p>`

const SEYYATHAPI_SUMMARY = `<p class="summary">
    <a class="summary-link" href="#seyyathāpi">
        seyyathāpi
    </a>
    sandhi.
    <b>just like; as if; imagine if</b>
    <a class="summary-link" href="#seyyathāpi">►</a>
</p>`

const SEYYATHAPI_DPD_HTML = `<h3 class="dpd" id="deconstructor: seyyathāpi">deconstructor: seyyathāpi</h3>
<div class="dpd">
  <p>
     se + yathā + api
  </p>
  <p class="dpd-footer">These word breakups are code-generated.</p>
</div>`

const DHAMMA_SUMMARY = `<p class="summary">
    <a class="summary-link" href="#dhamma_1_01">
        dhamma 1.01
    </a>
    masc.
    <b>nature; character</b>
    <a class="summary-link" href="#dhamma_1_01">►</a>
</p><p class="summary">
    <a class="summary-link" href="#dhamma_1_02">
        dhamma 1.02
    </a>
    masc.
    <b>quality; characteristic; trait</b>
    <a class="summary-link" href="#dhamma_1_02">►</a>
</p>`

test('parseSummaryEntries reads headword, pos, and meaning with lit. note', () => {
  const entries = parseSummaryEntries(BHIKKHAVE_SUMMARY)
  assert.deepEqual(entries, [
    { headword: 'bhikkhave', pos: 'masc', meaning: 'monks' },
    {
      headword: 'bhikkhu',
      pos: 'masc',
      meaning: 'monk; monastic; mendicant; fully ordained monk; lit. beggar',
    },
  ])
})

test('parseSummaryEntries folds numbered homonyms into one headword', () => {
  const entries = parseSummaryEntries(DHAMMA_SUMMARY)
  assert.equal(entries.length, 2)
  assert.ok(entries.every((e) => e.headword === 'dhamma'))
})

test('parseGrammarReadings decodes the tuples hidden in the comment', () => {
  assert.deepEqual(parseGrammarReadings(BHIKKHAVE_SUMMARY), [
    { lemma: 'bhikkhu', pos: 'noun', features: 'masc voc pl' },
  ])
  assert.deepEqual(parseGrammarReadings(SEYYATHAPI_SUMMARY), [])
})

test('parseDeconstruction extracts the word breakup', () => {
  assert.equal(parseDeconstruction(SEYYATHAPI_DPD_HTML), 'se + yathā + api')
  assert.equal(parseDeconstruction('<h3>no deconstructor here</h3>'), null)
})

test('parseDpdResponse assembles a definition for an inflected form', () => {
  const definition = parseDpdResponse('bhikkhave', {
    summary_html: BHIKKHAVE_SUMMARY,
    dpd_html: '',
  })
  assert.ok(definition)
  assert.equal(definition.headword, 'bhikkhu')
  assert.equal(definition.grammar, 'masc voc pl of bhikkhu (noun)')
  // Two distinct headwords → meanings carry their headword.
  assert.deepEqual(definition.meanings, [
    'bhikkhave (masc): monks',
    'bhikkhu (masc): monk; monastic; mendicant; fully ordained monk; lit. beggar',
  ])
  assert.equal(definition.analysis, null)
  assert.equal(definition.etymology, null)
})

test('parseDpdResponse includes the deconstruction for sandhi words', () => {
  const definition = parseDpdResponse('seyyathāpi', {
    summary_html: SEYYATHAPI_SUMMARY,
    dpd_html: SEYYATHAPI_DPD_HTML,
  })
  assert.ok(definition)
  assert.equal(definition.headword, 'seyyathāpi')
  assert.equal(definition.grammar, 'sandhi')
  assert.deepEqual(definition.meanings, ['just like; as if; imagine if'])
  assert.equal(definition.analysis, 'se + yathā + api')
})

test('parseDpdResponse returns null when DPD has no entry', () => {
  const definition = parseDpdResponse('zzzqqq', {
    summary_html: '',
    dpd_html: '<h3 class="dpd">No results found. </h3>',
  })
  assert.equal(definition, null)
})
