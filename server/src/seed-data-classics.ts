/**
 * Built-in classical texts (Koine Greek, Latin, Old English), pre-glossed
 * like the suttas in seed-data.ts so no gloss API is needed. The originals
 * are public-domain critical texts: the Greek follows the standard critical
 * New Testament, the Latin follows the received text of Caesar, and the
 * Old English follows the normalized (macron-marked) text of Beowulf.
 */

import type { SeedText } from './seed-data.js'

export const CLASSIC_SEED_TEXTS: SeedText[] = [
  {
    slug: 'john-prologue',
    title: 'The Prologue of John',
    origTitle: 'Κατὰ Ἰωάννην',
    source: 'John 1:1–5, Greek New Testament',
    lang: 'Koine Greek',
    kind: 'scripture',
    chunks: [
      {
        lines: [
          [
            ['Ἐν', 'in'],
            ['ἀρχῇ', 'the beginning'],
            ['ἦν', 'was'],
            ['ὁ', 'the'],
            ['λόγος,', 'word'],
          ],
          [
            ['καὶ', 'and'],
            ['ὁ', 'the'],
            ['λόγος', 'word'],
            ['ἦν', 'was'],
            ['πρὸς', 'with'],
            ['τὸν', 'the'],
            ['θεόν,', 'God'],
          ],
          [
            ['καὶ', 'and'],
            ['θεὸς', 'God'],
            ['ἦν', 'was'],
            ['ὁ', 'the'],
            ['λόγος.', 'word'],
          ],
          [
            ['οὗτος', 'this one'],
            ['ἦν', 'was'],
            ['ἐν', 'in'],
            ['ἀρχῇ', 'the beginning'],
            ['πρὸς', 'with'],
            ['τὸν', 'the'],
            ['θεόν.', 'God'],
          ],
        ],
        translation:
          'In the beginning was the Word, and the Word was with God, and the Word was God. He was in the beginning with God.',
      },
      {
        lines: [
          [
            ['πάντα', 'all things'],
            ['δι’', 'through'],
            ['αὐτοῦ', 'him'],
            ['ἐγένετο,', 'came into being'],
          ],
          [
            ['καὶ', 'and'],
            ['χωρὶς', 'without'],
            ['αὐτοῦ', 'him'],
            ['ἐγένετο', 'came into being'],
            ['οὐδὲ', 'not even'],
            ['ἕν', 'one thing'],
            ['ὃ', 'which'],
            ['γέγονεν.', 'has come into being'],
          ],
        ],
        translation:
          'All things came into being through him, and without him not one thing came into being that has come into being.',
      },
      {
        lines: [
          [
            ['ἐν', 'in'],
            ['αὐτῷ', 'him'],
            ['ζωὴ', 'life'],
            ['ἦν,', 'was'],
          ],
          [
            ['καὶ', 'and'],
            ['ἡ', 'the'],
            ['ζωὴ', 'life'],
            ['ἦν', 'was'],
            ['τὸ', 'the'],
            ['φῶς', 'light'],
            ['τῶν', 'of the'],
            ['ἀνθρώπων·', 'men'],
          ],
          [
            ['καὶ', 'and'],
            ['τὸ', 'the'],
            ['φῶς', 'light'],
            ['ἐν', 'in'],
            ['τῇ', 'the'],
            ['σκοτίᾳ', 'darkness'],
            ['φαίνει,', 'shines'],
          ],
          [
            ['καὶ', 'and'],
            ['ἡ', 'the'],
            ['σκοτία', 'darkness'],
            ['αὐτὸ', 'it'],
            ['οὐ', 'not'],
            ['κατέλαβεν.', 'overcame'],
          ],
        ],
        translation:
          'In him was life, and the life was the light of men. And the light shines in the darkness, and the darkness has not overcome it.',
      },
    ],
  },
  {
    slug: 'lords-prayer',
    title: 'The Lord’s Prayer',
    origTitle: 'Πάτερ ἡμῶν',
    source: 'Matthew 6:9–13, Greek New Testament',
    lang: 'Koine Greek',
    kind: 'scripture',
    chunks: [
      {
        lines: [
          [
            ['Πάτερ', 'Father'],
            ['ἡμῶν', 'our'],
            ['ὁ', 'who is'],
            ['ἐν', 'in'],
            ['τοῖς', 'the'],
            ['οὐρανοῖς·', 'heavens'],
          ],
          [
            ['ἁγιασθήτω', 'let it be hallowed'],
            ['τὸ', 'the'],
            ['ὄνομά', 'name'],
            ['σου·', 'your'],
          ],
          [
            ['ἐλθέτω', 'let it come'],
            ['ἡ', 'the'],
            ['βασιλεία', 'kingdom'],
            ['σου·', 'your'],
          ],
          [
            ['γενηθήτω', 'let it be done'],
            ['τὸ', 'the'],
            ['θέλημά', 'will'],
            ['σου,', 'your'],
            ['ὡς', 'as'],
            ['ἐν', 'in'],
            ['οὐρανῷ', 'heaven'],
            ['καὶ', 'so also'],
            ['ἐπὶ', 'on'],
            ['γῆς·', 'earth'],
          ],
        ],
        translation:
          'Our Father in the heavens, hallowed be your name; your kingdom come; your will be done, as in heaven, so also on earth.',
      },
      {
        lines: [
          [
            ['τὸν', 'the'],
            ['ἄρτον', 'bread'],
            ['ἡμῶν', 'our'],
            ['τὸν', 'the'],
            ['ἐπιούσιον', 'daily'],
            ['δὸς', 'give'],
            ['ἡμῖν', 'to us'],
            ['σήμερον·', 'today'],
          ],
          [
            ['καὶ', 'and'],
            ['ἄφες', 'forgive'],
            ['ἡμῖν', 'us'],
            ['τὰ', 'the'],
            ['ὀφειλήματα', 'debts'],
            ['ἡμῶν,', 'our'],
            ['ὡς', 'as'],
            ['καὶ', 'also'],
            ['ἡμεῖς', 'we'],
            ['ἀφήκαμεν', 'have forgiven'],
            ['τοῖς', 'the'],
            ['ὀφειλέταις', 'debtors'],
            ['ἡμῶν·', 'our'],
          ],
          [
            ['καὶ', 'and'],
            ['μὴ', 'not'],
            ['εἰσενέγκῃς', 'lead'],
            ['ἡμᾶς', 'us'],
            ['εἰς', 'into'],
            ['πειρασμόν,', 'temptation'],
            ['ἀλλὰ', 'but'],
            ['ῥῦσαι', 'deliver'],
            ['ἡμᾶς', 'us'],
            ['ἀπὸ', 'from'],
            ['τοῦ', 'the'],
            ['πονηροῦ.', 'evil one'],
          ],
        ],
        translation:
          'Give us today our daily bread; and forgive us our debts, as we also have forgiven our debtors; and lead us not into temptation, but deliver us from the evil one.',
      },
    ],
  },
  {
    slug: 'de-bello-gallico',
    title: 'The Gallic War (opening)',
    origTitle: 'Commentarii de Bello Gallico',
    source: 'Julius Caesar — De Bello Gallico 1.1',
    lang: 'Latin',
    kind: 'prose',
    chunks: [
      {
        lines: [
          [
            ['Gallia', 'Gaul'],
            ['est', 'is'],
            ['omnis', 'as a whole'],
            ['divisa', 'divided'],
            ['in', 'into'],
            ['partes', 'parts'],
            ['tres,', 'three'],
          ],
          [
            ['quarum', 'of which'],
            ['unam', 'one'],
            ['incolunt', 'inhabit'],
            ['Belgae,', 'the Belgae'],
            ['aliam', 'another'],
            ['Aquitani,', 'the Aquitani'],
            ['tertiam', 'the third'],
            ['qui', 'those who'],
            ['ipsorum', 'in their own'],
            ['lingua', 'language'],
            ['Celtae,', 'Celts'],
            ['nostra', 'in ours'],
            ['Galli', 'Gauls'],
            ['appellantur.', 'are called'],
          ],
          [
            ['Hi', 'these'],
            ['omnes', 'all'],
            ['lingua,', 'in language'],
            ['institutis,', 'in customs'],
            ['legibus', 'in laws'],
            ['inter', 'among'],
            ['se', 'themselves'],
            ['differunt.', 'differ'],
          ],
        ],
        translation:
          'Gaul as a whole is divided into three parts, one of which the Belgae inhabit, another the Aquitani, the third those who in their own language are called Celts, in ours Gauls. All these differ from one another in language, customs, and laws.',
      },
      {
        lines: [
          [
            ['Gallos', 'the Gauls'],
            ['ab', 'from'],
            ['Aquitanis', 'the Aquitani'],
            ['Garumna', 'the Garonne'],
            ['flumen,', 'river'],
            ['a', 'from'],
            ['Belgis', 'the Belgae'],
            ['Matrona', 'the Marne'],
            ['et', 'and'],
            ['Sequana', 'the Seine'],
            ['dividit.', 'divides'],
          ],
          [
            ['Horum', 'of these'],
            ['omnium', 'all'],
            ['fortissimi', 'the bravest'],
            ['sunt', 'are'],
            ['Belgae,', 'the Belgae'],
            ['propterea', 'for this reason'],
            ['quod', 'because'],
            ['a', 'from'],
            ['cultu', 'the refinement'],
            ['atque', 'and'],
            ['humanitate', 'civilization'],
            ['provinciae', 'of the Province'],
            ['longissime', 'farthest'],
            ['absunt,', 'they are distant'],
          ],
        ],
        translation:
          'The river Garonne separates the Gauls from the Aquitani; the Marne and the Seine separate them from the Belgae. Of all these the bravest are the Belgae, because they are farthest from the refinement and civilization of the Province.',
      },
      {
        lines: [
          [
            ['minimeque', 'and least of all'],
            ['ad', 'to'],
            ['eos', 'them'],
            ['mercatores', 'merchants'],
            ['saepe', 'often'],
            ['commeant', 'travel'],
            ['atque', 'and'],
            ['ea', 'those things'],
            ['quae', 'which'],
            ['ad', 'toward'],
            ['effeminandos', 'softening'],
            ['animos', 'minds'],
            ['pertinent', 'tend'],
            ['important,', 'bring in'],
          ],
          [
            ['proximique', 'and nearest'],
            ['sunt', 'they are'],
            ['Germanis,', 'to the Germans'],
            ['qui', 'who'],
            ['trans', 'across'],
            ['Rhenum', 'the Rhine'],
            ['incolunt,', 'dwell'],
            ['quibuscum', 'with whom'],
            ['continenter', 'continually'],
            ['bellum', 'war'],
            ['gerunt.', 'they wage'],
          ],
        ],
        translation:
          'Merchants least often travel to them and bring in the things that tend to soften the mind; and they are nearest to the Germans, who dwell across the Rhine, with whom they continually wage war.',
      },
    ],
  },
  {
    slug: 'beowulf-opening',
    title: 'Beowulf (opening)',
    origTitle: 'Bēowulf',
    source: 'Beowulf, lines 1–11',
    lang: 'Old English',
    kind: 'poetry',
    chunks: [
      {
        lines: [
          [
            ['Hwæt!', 'Lo!'],
            ['Wē', 'we'],
            ['Gār-Dena', 'of the Spear-Danes'],
            ['in', 'in'],
            ['geārdagum,', 'days of yore'],
          ],
          [
            ['þēodcyninga', 'of the people-kings'],
            ['þrym', 'the glory'],
            ['gefrūnon,', 'have heard'],
          ],
          [
            ['hū', 'how'],
            ['ðā', 'those'],
            ['æþelingas', 'princes'],
            ['ellen', 'deeds of courage'],
            ['fremedon.', 'performed'],
          ],
        ],
        translation:
          'Lo! We have heard of the glory of the Spear-Danes’ people-kings in days of yore — how those princes performed deeds of courage.',
      },
      {
        lines: [
          [
            ['Oft', 'often'],
            ['Scyld', 'Scyld'],
            ['Scēfing', 'son of Scef'],
            ['sceaþena', 'of enemies'],
            ['þrēatum,', 'from the bands'],
          ],
          [
            ['monegum', 'from many'],
            ['mǣgþum', 'tribes'],
            ['meodosetla', 'mead-benches'],
            ['oftēah,', 'seized'],
          ],
          [
            ['egsode', 'terrified'],
            ['eorlas,', 'warriors'],
            ['syððan', 'since'],
            ['ǣrest', 'first'],
            ['wearð', 'he was'],
          ],
          [
            ['fēasceaft', 'destitute'],
            ['funden;', 'found'],
            ['hē', 'he'],
            ['þæs', 'for that'],
            ['frōfre', 'consolation'],
            ['gebād,', 'lived to see'],
          ],
        ],
        translation:
          'Often Scyld Scefing seized the mead-benches from bands of enemies, from many tribes, and terrified their warriors — since he was first found destitute. He lived to see consolation for that.',
      },
      {
        lines: [
          [
            ['wēox', 'he grew'],
            ['under', 'under'],
            ['wolcnum,', 'the skies'],
            ['weorðmyndum', 'in honors'],
            ['þāh,', 'throve'],
          ],
          [
            ['oðþæt', 'until'],
            ['him', 'him'],
            ['ǣghwylc', 'each'],
            ['þāra', 'of the'],
            ['ymbsittendra', 'neighboring peoples'],
          ],
          [
            ['ofer', 'over'],
            ['hronrāde', 'the whale-road'],
            ['hȳran', 'obey'],
            ['scolde,', 'had to'],
          ],
          [
            ['gomban', 'tribute'],
            ['gyldan.', 'pay'],
            ['Þæt', 'that'],
            ['wæs', 'was'],
            ['gōd', 'a good'],
            ['cyning!', 'king'],
          ],
        ],
        translation:
          'He grew under the skies and throve in honors, until each of the neighboring peoples over the whale-road had to obey him and pay tribute. That was a good king!',
      },
    ],
  },
]
