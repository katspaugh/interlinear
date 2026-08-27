/**
 * Built-in sample texts (Pali suttas), pre-glossed so the app is usable
 * without an ANTHROPIC_API_KEY. Each chunk is one stanza; each line is a
 * list of [original, gloss] pairs.
 */

export type SeedLine = Array<[string, string]>

export interface SeedChunk {
  lines: SeedLine[]
  translation: string
}

export interface SeedText {
  slug: string
  title: string
  origTitle: string
  source: string
  lang: string
  kind: string
  chunks: SeedChunk[]
}

export const SEED_TEXTS: SeedText[] = [
  {
    slug: 'metta-sutta',
    title: 'The Discourse on Loving-Kindness',
    origTitle: 'Karaṇīyamettā Sutta',
    source: 'Sutta Nipāta 1.8',
    lang: 'Pali',
    kind: 'sutta',
    chunks: [
      {
        lines: [
          [
            ['Karaṇīyamatthakusalena,', 'to be done by one skilled in good'],
            ['yantaṃ', 'that which'],
            ['santaṃ', 'peaceful'],
            ['padaṃ', 'state'],
            ['abhisamecca;', 'having fully understood'],
          ],
          [
            ['Sakko', 'able'],
            ['ujū', 'upright'],
            ['ca', 'and'],
            ['suhujū', 'thoroughly upright'],
            ['ca,', 'and'],
            ['suvaco', 'easy to speak to'],
            ['cassa', 'and he should be'],
            ['mudu', 'gentle'],
            ['anatimānī.', 'not conceited'],
          ],
        ],
        translation:
          'This should be done by one skilled in the good, having understood that peaceful state: one should be able, upright, thoroughly upright, easy to instruct, gentle, and not conceited.',
      },
      {
        lines: [
          [
            ['Santussako', 'content'],
            ['ca', 'and'],
            ['subharo', 'easy to support'],
            ['ca,', 'and'],
            ['appakicco', 'with few duties'],
            ['ca', 'and'],
            ['sallahukavutti;', 'of frugal ways'],
          ],
          [
            ['Santindriyo', 'with calmed senses'],
            ['ca', 'and'],
            ['nipako', 'prudent'],
            ['ca,', 'and'],
            ['appagabbho', 'not impudent'],
            ['kulesvananugiddho.', 'not greedy among families'],
          ],
        ],
        translation:
          'Content and easy to support, with few duties and frugal habits, with calmed senses and prudent, not impudent, not greedy among the families that support him.',
      },
      {
        lines: [
          [
            ['Na', 'not'],
            ['ca', 'and'],
            ['khuddamācare', 'should do a mean thing'],
            ['kiñci,', 'anything'],
            ['yena', 'by which'],
            ['viññū', 'the wise'],
            ['pare', 'others'],
            ['upavadeyyuṃ;', 'might reproach'],
          ],
          [
            ['Sukhino', 'happy'],
            ['va', 'indeed'],
            ['khemino', 'secure'],
            ['hontu,', 'may they be'],
            ['sabbasattā', 'all beings'],
            ['bhavantu', 'may they become'],
            ['sukhitattā.', 'happy in heart'],
          ],
        ],
        translation:
          'And let one not do the slightest thing for which the wise might reproach one. May all beings be happy and secure; may all beings be happy at heart.',
      },
      {
        lines: [
          [
            ['Ye', 'whatever'],
            ['keci', 'whatsoever'],
            ['pāṇabhūtatthi,', 'living beings there are'],
            ['tasā', 'trembling'],
            ['vā', 'or'],
            ['thāvarā', 'firm'],
            ['vā', 'or'],
            ['anavasesā;', 'without exception'],
          ],
          [
            ['Dīghā', 'long'],
            ['vā', 'or'],
            ['ye', 'which'],
            ['va', 'or'],
            ['mahantā,', 'great'],
            ['majjhimā', 'middle-sized'],
            ['rassakā', 'short'],
            ['aṇukathūlā.', 'minute or bulky'],
          ],
        ],
        translation:
          'Whatever living beings there are — frail or firm, without exception — the long or the large, the middle-sized, the short, the subtle or the gross.',
      },
      {
        lines: [
          [
            ['Diṭṭhā', 'seen'],
            ['vā', 'or'],
            ['ye', 'those which'],
            ['va', 'or'],
            ['adiṭṭhā,', 'unseen'],
            ['ye', 'those which'],
            ['va', 'or'],
            ['dūre', 'far'],
            ['vasanti', 'dwell'],
            ['avidūre;', 'near'],
          ],
          [
            ['Bhūtā', 'born'],
            ['va', 'or'],
            ['sambhavesī', 'seeking birth'],
            ['va,', 'or'],
            ['sabbasattā', 'all beings'],
            ['bhavantu', 'may they become'],
            ['sukhitattā.', 'happy in heart'],
          ],
        ],
        translation:
          'Seen or unseen, dwelling far or near, born or seeking birth — may all beings be happy at heart.',
      },
      {
        lines: [
          [
            ['Na', 'not'],
            ['paro', 'one'],
            ['paraṃ', 'another'],
            ['nikubbetha,', 'should deceive'],
            ['nātimaññetha', 'should not despise'],
            ['katthaci', 'anywhere'],
            ['na', 'not'],
            ['kañci;', 'anyone'],
          ],
          [
            ['Byārosanā', 'out of anger'],
            ['paṭighasaññā,', 'with thoughts of aversion'],
            ['nāññamaññassa', 'not for one another'],
            ['dukkhamiccheyya.', 'should wish suffering'],
          ],
        ],
        translation:
          'Let none deceive another, nor despise anyone anywhere; let none through anger or thoughts of aversion wish suffering upon another.',
      },
      {
        lines: [
          [
            ['Mātā', 'a mother'],
            ['yathā', 'just as'],
            ['niyaṃ', 'her own'],
            ['puttamāyusā', 'child, with her life'],
            ['ekaputtamanurakkhe;', 'would protect her only child'],
          ],
          [
            ['Evampi', 'even so'],
            ['sabbabhūtesu,', 'toward all beings'],
            ['mānasaṃ', 'a mind'],
            ['bhāvaye', 'one should cultivate'],
            ['aparimāṇaṃ.', 'boundless'],
          ],
        ],
        translation:
          'Just as a mother would protect her only child with her own life, even so let one cultivate a boundless mind toward all beings.',
      },
      {
        lines: [
          [
            ['Mettañca', 'and loving-kindness'],
            ['sabbalokasmi,', 'toward the whole world'],
            ['mānasaṃ', 'a mind'],
            ['bhāvaye', 'one should cultivate'],
            ['aparimāṇaṃ;', 'boundless'],
          ],
          [
            ['Uddhaṃ', 'above'],
            ['adho', 'below'],
            ['ca', 'and'],
            ['tiriyañca,', 'and across'],
            ['asambādhaṃ', 'unobstructed'],
            ['averamasapattaṃ.', 'without enmity or rivalry'],
          ],
        ],
        translation:
          'Let one cultivate a boundless mind of loving-kindness toward the whole world: above, below, and across — unobstructed, without enmity, without rivalry.',
      },
      {
        lines: [
          [
            ['Tiṭṭhaṃ', 'standing'],
            ['caraṃ', 'walking'],
            ['nisinno', 'sitting'],
            ['va,', 'or'],
            ['sayāno', 'lying down'],
            ['yāvatāssa', 'as long as one is'],
            ['vitamiddho;', 'free from drowsiness'],
          ],
          [
            ['Etaṃ', 'this'],
            ['satiṃ', 'mindfulness'],
            ['adhiṭṭheyya,', 'one should resolve upon'],
            ['brahmametaṃ', 'this a divine'],
            ['vihāramidhamāhu.', 'abiding here they call'],
          ],
        ],
        translation:
          'Standing, walking, sitting, or lying down, as long as one is free of drowsiness, let one resolve upon this mindfulness: this, they say, is the divine abiding here and now.',
      },
      {
        lines: [
          [
            ['Diṭṭhiñca', 'and to views'],
            ['anupaggamma,', 'not resorting'],
            ['sīlavā', 'virtuous'],
            ['dassanena', 'with insight'],
            ['sampanno;', 'endowed'],
          ],
          [
            ['Kāmesu', 'toward sense pleasures'],
            ['vinaya', 'having removed'],
            ['gedhaṃ,', 'greed'],
            ['na', 'not'],
            ['hi', 'indeed'],
            ['jātuggabbhaseyya', 'surely to a womb'],
            ['punaretīti.', 'does one come again'],
          ],
        ],
        translation:
          'Not falling into views, virtuous, endowed with insight, having subdued greed for sense pleasures — one surely comes no more to lie in a womb.',
      },
    ],
  },
  {
    slug: 'dhammapada-1-2',
    title: 'The Pairs',
    origTitle: 'Yamakavagga',
    source: 'Dhammapada 1–2',
    lang: 'Pali',
    kind: 'sutta',
    chunks: [
      {
        lines: [
          [
            ['Manopubbaṅgamā', 'preceded by mind'],
            ['dhammā,', 'phenomena'],
            ['manoseṭṭhā', 'having mind as chief'],
            ['manomayā;', 'made of mind'],
          ],
          [
            ['Manasā', 'with a mind'],
            ['ce', 'if'],
            ['paduṭṭhena,', 'corrupted'],
            ['bhāsati', 'one speaks'],
            ['vā', 'or'],
            ['karoti', 'one acts'],
            ['vā;', 'or'],
          ],
          [
            ['Tato', 'then'],
            ['naṃ', 'him'],
            ['dukkhamanveti,', 'suffering follows'],
            ['cakkaṃva', 'like the wheel'],
            ['vahato', 'of the ox drawing'],
            ['padaṃ.', 'the foot'],
          ],
        ],
        translation:
          'Mind precedes all phenomena; mind is their chief, they are mind-made. If one speaks or acts with a corrupted mind, suffering follows as the cart-wheel follows the foot of the ox.',
      },
      {
        lines: [
          [
            ['Manopubbaṅgamā', 'preceded by mind'],
            ['dhammā,', 'phenomena'],
            ['manoseṭṭhā', 'having mind as chief'],
            ['manomayā;', 'made of mind'],
          ],
          [
            ['Manasā', 'with a mind'],
            ['ce', 'if'],
            ['pasannena,', 'clear'],
            ['bhāsati', 'one speaks'],
            ['vā', 'or'],
            ['karoti', 'one acts'],
            ['vā;', 'or'],
          ],
          [
            ['Tato', 'then'],
            ['naṃ', 'him'],
            ['sukhamanveti,', 'happiness follows'],
            ['chāyāva', 'like a shadow'],
            ['anapāyinī.', 'never departing'],
          ],
        ],
        translation:
          'Mind precedes all phenomena; mind is their chief, they are mind-made. If one speaks or acts with a clear mind, happiness follows like a never-departing shadow.',
      },
    ],
  },
  {
    slug: 'ovada-patimokkha',
    title: 'The Teaching of the Buddhas',
    origTitle: 'Ovādapāṭimokkha',
    source: 'Dhammapada 183',
    lang: 'Pali',
    kind: 'sutta',
    chunks: [
      {
        lines: [
          [
            ['Sabbapāpassa', 'of all evil'],
            ['akaraṇaṃ,', 'the non-doing'],
            ['kusalassa', 'of the wholesome'],
            ['upasampadā;', 'the undertaking'],
          ],
          [
            ['Sacittapariyodapanaṃ,', 'purifying one’s own mind'],
            ['etaṃ', 'this'],
            ['buddhāna', 'of the Buddhas'],
            ['sāsanaṃ.', 'the teaching'],
          ],
        ],
        translation:
          'Not to do any evil, to cultivate the wholesome, to purify one’s own mind — this is the teaching of the Buddhas.',
      },
    ],
  },
]
