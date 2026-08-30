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
  /** Credit for the chunk translations, when they are someone's published
   * translation (e.g. Bhikkhu Sujato's) rather than written for the seed. */
  translator?: string
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
    slug: 'mangala-sutta',
    title: 'The Discourse on Blessings',
    origTitle: 'Maṅgala Sutta',
    source: 'Sutta Nipāta 2.4',
    lang: 'Pali',
    kind: 'sutta',
    chunks: [
      {
        lines: [
          [
            ['Bahū', 'many'],
            ['devā', 'gods'],
            ['manussā', 'humans'],
            ['ca,', 'and'],
            ['maṅgalāni', 'blessings'],
            ['acintayuṃ;', 'have pondered'],
          ],
          [
            ['Ākaṅkhamānā', 'longing for'],
            ['sotthānaṃ,', 'well-being'],
            ['brūhi', 'tell'],
            ['maṅgalamuttamaṃ.', 'the highest blessing'],
          ],
        ],
        translation:
          'Many gods and humans have pondered blessings, longing for well-being: tell us the highest blessing.',
      },
      {
        lines: [
          [
            ['Asevanā', 'not associating'],
            ['ca', 'and'],
            ['bālānaṃ,', 'with fools'],
            ['paṇḍitānañca', 'and with the wise'],
            ['sevanā;', 'associating'],
          ],
          [
            ['Pūjā', 'honoring'],
            ['ca', 'and'],
            ['pūjaneyyānaṃ,', 'those worthy of honor'],
            ['etaṃ', 'this is'],
            ['maṅgalamuttamaṃ.', 'the highest blessing'],
          ],
        ],
        translation:
          'Not to associate with fools, to associate with the wise, and to honor those worthy of honor — this is the highest blessing.',
      },
      {
        lines: [
          [
            ['Patirūpadesavāso', 'living in a suitable place'],
            ['ca,', 'and'],
            ['pubbe', 'in the past'],
            ['ca', 'and'],
            ['katapuññatā;', 'having made merit'],
          ],
          [
            ['Attasammāpaṇidhi', 'right direction of oneself'],
            ['ca,', 'and'],
            ['etaṃ', 'this is'],
            ['maṅgalamuttamaṃ.', 'the highest blessing'],
          ],
        ],
        translation:
          'Living in a suitable place, merit made in the past, and setting oneself in the right direction — this is the highest blessing.',
      },
      {
        lines: [
          [
            ['Bāhusaccañca', 'and great learning'],
            ['sippañca,', 'and craft'],
            ['vinayo', 'discipline'],
            ['ca', 'and'],
            ['susikkhito;', 'well-trained'],
          ],
          [
            ['Subhāsitā', 'well-spoken'],
            ['ca', 'and'],
            ['yā', 'whatever'],
            ['vācā,', 'speech'],
            ['etaṃ', 'this is'],
            ['maṅgalamuttamaṃ.', 'the highest blessing'],
          ],
        ],
        translation:
          'Great learning and skill in a craft, discipline well trained, and whatever speech is well spoken — this is the highest blessing.',
      },
      {
        lines: [
          [
            ['Mātāpitu', 'of mother and father'],
            ['upaṭṭhānaṃ,', 'the support'],
            ['puttadārassa', 'of wife and children'],
            ['saṅgaho;', 'the care'],
          ],
          [
            ['Anākulā', 'untangled'],
            ['ca', 'and'],
            ['kammantā,', 'works'],
            ['etaṃ', 'this is'],
            ['maṅgalamuttamaṃ.', 'the highest blessing'],
          ],
        ],
        translation:
          'Support for mother and father, care of wife and children, and occupations free of conflict — this is the highest blessing.',
      },
      {
        lines: [
          [
            ['Dānañca', 'and giving'],
            ['dhammacariyā', 'living by the Dhamma'],
            ['ca,', 'and'],
            ['ñātakānañca', 'and of relatives'],
            ['saṅgaho;', 'the care'],
          ],
          [
            ['Anavajjāni', 'blameless'],
            ['kammāni,', 'deeds'],
            ['etaṃ', 'this is'],
            ['maṅgalamuttamaṃ.', 'the highest blessing'],
          ],
        ],
        translation:
          'Giving, living by the Dhamma, care of relatives, and blameless deeds — this is the highest blessing.',
      },
      {
        lines: [
          [
            ['Āratī', 'shrinking away'],
            ['viratī', 'abstaining'],
            ['pāpā,', 'from evil'],
            ['majjapānā', 'from strong drink'],
            ['ca', 'and'],
            ['saṃyamo;', 'restraint'],
          ],
          [
            ['Appamādo', 'diligence'],
            ['ca', 'and'],
            ['dhammesu,', 'in things of the Dhamma'],
            ['etaṃ', 'this is'],
            ['maṅgalamuttamaṃ.', 'the highest blessing'],
          ],
        ],
        translation:
          'Turning away and abstaining from evil, restraint from intoxicants, and diligence in things of the Dhamma — this is the highest blessing.',
      },
      {
        lines: [
          [
            ['Gāravo', 'respect'],
            ['ca', 'and'],
            ['nivāto', 'humility'],
            ['ca,', 'and'],
            ['santuṭṭhi', 'contentment'],
            ['ca', 'and'],
            ['kataññutā;', 'gratitude'],
          ],
          [
            ['Kālena', 'at the right time'],
            ['dhammassavanaṃ,', 'hearing the Dhamma'],
            ['etaṃ', 'this is'],
            ['maṅgalamuttamaṃ.', 'the highest blessing'],
          ],
        ],
        translation:
          'Respect, humility, contentment, gratitude, and hearing the Dhamma at the right time — this is the highest blessing.',
      },
      {
        lines: [
          [
            ['Khantī', 'patience'],
            ['ca', 'and'],
            ['sovacassatā,', 'being easy to admonish'],
            ['samaṇānañca', 'and of renunciants'],
            ['dassanaṃ;', 'the sight'],
          ],
          [
            ['Kālena', 'at the right time'],
            ['dhammasākacchā,', 'discussion of the Dhamma'],
            ['etaṃ', 'this is'],
            ['maṅgalamuttamaṃ.', 'the highest blessing'],
          ],
        ],
        translation:
          'Patience, being easy to correct, the sight of renunciants, and timely discussion of the Dhamma — this is the highest blessing.',
      },
      {
        lines: [
          [
            ['Tapo', 'austerity'],
            ['ca', 'and'],
            ['brahmacariyañca,', 'and the holy life'],
            ['ariyasaccāna', 'of the noble truths'],
            ['dassanaṃ;', 'the seeing'],
          ],
          [
            ['Nibbānasacchikiriyā', 'realization of nibbāna'],
            ['ca,', 'and'],
            ['etaṃ', 'this is'],
            ['maṅgalamuttamaṃ.', 'the highest blessing'],
          ],
        ],
        translation:
          'Austerity, the holy life, seeing the noble truths, and the realization of nibbāna — this is the highest blessing.',
      },
      {
        lines: [
          [
            ['Phuṭṭhassa', 'of one touched'],
            ['lokadhammehi,', 'by worldly conditions'],
            ['cittaṃ', 'the mind'],
            ['yassa', 'whose'],
            ['na', 'not'],
            ['kampati;', 'trembles'],
          ],
          [
            ['Asokaṃ', 'sorrowless'],
            ['virajaṃ', 'stainless'],
            ['khemaṃ,', 'secure'],
            ['etaṃ', 'this is'],
            ['maṅgalamuttamaṃ.', 'the highest blessing'],
          ],
        ],
        translation:
          'A mind that does not tremble when touched by worldly conditions — sorrowless, stainless, secure — this is the highest blessing.',
      },
      {
        lines: [
          [
            ['Etādisāni', 'such things'],
            ['katvāna,', 'having done'],
            ['sabbatthamaparājitā;', 'everywhere undefeated'],
          ],
          [
            ['Sabbattha', 'everywhere'],
            ['sotthiṃ', 'to safety'],
            ['gacchanti,', 'they go'],
            ['taṃ', 'that is'],
            ['tesaṃ', 'for them'],
            ['maṅgalamuttamaṃ.', 'the highest blessing'],
          ],
        ],
        translation:
          'Having done such things, undefeated everywhere, they go everywhere in safety — that is for them the highest blessing.',
      },
    ],
  },
  {
    slug: 'gahakaraka',
    title: 'The House-Builder',
    origTitle: 'Gahakāraka gāthā',
    source: 'Dhammapada 153–154',
    lang: 'Pali',
    kind: 'sutta',
    chunks: [
      {
        lines: [
          [
            ['Anekajātisaṃsāraṃ,', 'through the round of many births'],
            ['sandhāvissaṃ', 'I have wandered'],
            ['anibbisaṃ;', 'finding nothing'],
          ],
          [
            ['Gahakāraṃ', 'the house-builder'],
            ['gavesanto,', 'seeking'],
            ['dukkhā', 'painful'],
            ['jāti', 'is birth'],
            ['punappunaṃ.', 'again and again'],
          ],
        ],
        translation:
          'Through the round of many births I have wandered without finding, seeking the builder of this house: painful is birth again and again.',
      },
      {
        lines: [
          [
            ['Gahakāraka', 'O house-builder'],
            ['diṭṭhosi,', 'you are seen'],
            ['puna', 'again'],
            ['gehaṃ', 'a house'],
            ['na', 'not'],
            ['kāhasi;', 'you will build'],
          ],
          [
            ['Sabbā', 'all'],
            ['te', 'your'],
            ['phāsukā', 'rafters'],
            ['bhaggā,', 'are broken'],
            ['gahakūṭaṃ', 'the ridgepole'],
            ['visaṅkhataṃ;', 'is shattered'],
          ],
          [
            ['Visaṅkhāragataṃ', 'gone to the unconditioned'],
            ['cittaṃ,', 'the mind'],
            ['taṇhānaṃ', 'of cravings'],
            ['khayamajjhagā.', 'has reached the destruction'],
          ],
        ],
        translation:
          'House-builder, you are seen! You will not build a house again. All your rafters are broken, the ridgepole is shattered; the mind, gone to the unconditioned, has reached the end of craving.',
      },
    ],
  },
  {
    slug: 'three-marks',
    title: 'The Three Marks',
    origTitle: 'Maggavagga',
    source: 'Dhammapada 277–279',
    lang: 'Pali',
    kind: 'sutta',
    chunks: [
      {
        lines: [
          [
            ['Sabbe', 'all'],
            ['saṅkhārā', 'conditioned things'],
            ['aniccāti,', 'are impermanent, thus'],
            ['yadā', 'when'],
            ['paññāya', 'with wisdom'],
            ['passati;', 'one sees'],
          ],
          [
            ['Atha', 'then'],
            ['nibbindati', 'one turns away'],
            ['dukkhe,', 'from suffering'],
            ['esa', 'this is'],
            ['maggo', 'the path'],
            ['visuddhiyā.', 'of purification'],
          ],
        ],
        translation:
          '"All conditioned things are impermanent" — when one sees this with wisdom, one turns away from suffering: this is the path of purification.',
      },
      {
        lines: [
          [
            ['Sabbe', 'all'],
            ['saṅkhārā', 'conditioned things'],
            ['dukkhāti,', 'are suffering, thus'],
            ['yadā', 'when'],
            ['paññāya', 'with wisdom'],
            ['passati;', 'one sees'],
          ],
          [
            ['Atha', 'then'],
            ['nibbindati', 'one turns away'],
            ['dukkhe,', 'from suffering'],
            ['esa', 'this is'],
            ['maggo', 'the path'],
            ['visuddhiyā.', 'of purification'],
          ],
        ],
        translation:
          '"All conditioned things are suffering" — when one sees this with wisdom, one turns away from suffering: this is the path of purification.',
      },
      {
        lines: [
          [
            ['Sabbe', 'all'],
            ['dhammā', 'things'],
            ['anattāti,', 'are not-self, thus'],
            ['yadā', 'when'],
            ['paññāya', 'with wisdom'],
            ['passati;', 'one sees'],
          ],
          [
            ['Atha', 'then'],
            ['nibbindati', 'one turns away'],
            ['dukkhe,', 'from suffering'],
            ['esa', 'this is'],
            ['maggo', 'the path'],
            ['visuddhiyā.', 'of purification'],
          ],
        ],
        translation:
          '"All things are not-self" — when one sees this with wisdom, one turns away from suffering: this is the path of purification.',
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
