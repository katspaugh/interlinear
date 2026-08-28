/**
 * Built-in texts seeded WITHOUT glosses: they are inserted with status
 * 'glossing' and the background worker glosses them through the LLM on the
 * first boot that has a gloss API key (so they are skipped in dev without
 * one). Sources are public-domain Wikisource transcriptions.
 *
 * Formatting contract (same as the add-text form): blank lines separate
 * chunks (the gloss/translation unit); single newlines separate display
 * lines within a chunk. Japanese is pre-segmented with spaces (wakachigaki)
 * because tokenization is whitespace-based.
 */

export interface RawSeedText {
  slug: string
  title: string
  origTitle: string
  source: string
  lang: string
  kind: string
  text: string
}

export const RAW_SEED_TEXTS: RawSeedText[] = [
  {
    slug: 'der-suesse-brei',
    title: 'Sweet Porridge',
    origTitle: 'Der süße Brei',
    source: 'Brüder Grimm — KHM 103 (1857)',
    lang: 'German',
    kind: 'fiction',
    text: `Es war einmal ein armes frommes Mädchen, das lebte mit seiner Mutter allein, und sie hatten nichts mehr zu essen. Da gieng das Kind hinaus in den Wald, und begegnete ihm da eine alte Frau, die wußte seinen Jammer schon und schenkte ihm ein Töpfchen, zu dem sollt es sagen „Töpfchen, koche,“ so kochte es guten süßen Hirsenbrei, und wenn es sagte „Töpfchen, steh,“ so hörte es wieder auf zu kochen. Das Mädchen brachte den Topf seiner Mutter heim, und nun waren sie ihrer Armuth und ihres Hungers ledig und aßen süßen Brei so oft sie wollten.

Auf eine Zeit war das Mädchen ausgegangen, da sprach die Mutter „Töpfchen, koche,“ da kocht es, und sie ißt sich satt; nun will sie daß das Töpfchen wieder aufhören soll, aber sie weiß das Wort nicht. Also kocht es fort, und der Brei steigt über den Rand hinaus und kocht immer zu, die Küche und das ganze Haus voll, und das zweite Haus und dann die Straße, als wollts die ganze Welt satt machen, und ist die größte Noth, und kein Mensch weiß sich da zu helfen.

Endlich, wie nur noch ein einziges Haus übrig ist, da kommt das Kind heim, und spricht nur „Töpfchen, steh,“ da steht es und hört auf zu kochen; und wer wieder in die Stadt wollte, der mußte sich durchessen.`,
  },
  {
    slug: 'die-sterntaler',
    title: 'The Star Money',
    origTitle: 'Die Sternthaler',
    source: 'Brüder Grimm — KHM 153 (1857)',
    lang: 'German',
    kind: 'fiction',
    text: `Es war einmal ein kleines Mädchen, dem war Vater und Mutter gestorben, und es war so arm, daß es kein Kämmerchen mehr hatte darin zu wohnen und kein Bettchen mehr darin zu schlafen und endlich gar nichts mehr als die Kleider auf dem Leib und ein Stückchen Brot in der Hand, das ihm ein mitleidiges Herz geschenkt hatte. Es war aber gut und fromm. Und weil es so von aller Welt verlassen war, gieng es im Vertrauen auf den lieben Gott hinaus ins Feld.

Da begegnete ihm ein armer Mann, der sprach „ach, gib mir etwas zu essen, ich bin so hungerig.“ Es reichte ihm das ganze Stückchen Brot und sagte „Gott segne dirs“ und gieng weiter. Da kam ein Kind das jammerte und sprach „es friert mich so an meinem Kopfe, schenk mir etwas, womit ich ihn bedecken kann.“ Da that es seine Mütze ab und gab sie ihm. Und als es noch eine Weile gegangen war, kam wieder ein Kind und hatte kein Leibchen an und fror: da gab es ihm seins: und noch weiter, da bat eins um ein Röcklein, das gab es auch von sich hin.

Endlich gelangte es in einen Wald, und es war schon dunkel geworden, da kam noch eins und bat um ein Hemdlein, und das fromme Mädchen dachte „es ist dunkle Nacht, da sieht dich niemand du kannst wohl dein Hemd weg geben,“ und zog das Hemd ab und gab es auch noch hin. Und wie es so stand und gar nichts mehr hatte, fielen auf einmal die Sterne vom Himmel, und waren lauter harte blanke Thaler: und ob es gleich sein Hemdlein weg gegeben, so hatte es ein neues an und das war vom allerfeinsten Linnen. Da sammelte es sich die Thaler hinein und war reich für sein Lebtag.`,
  },
  {
    slug: 'kleine-fabel',
    title: 'A Little Fable',
    origTitle: 'Kleine Fabel',
    source: 'Franz Kafka (1920)',
    lang: 'German',
    kind: 'fiction',
    text: `„Ach“, sagte die Maus, „die Welt wird enger mit jedem Tag. Zuerst war sie so breit, daß ich Angst hatte, ich lief weiter und war glücklich, daß ich endlich rechts und links in der Ferne Mauern sah, aber diese langen Mauern eilen so schnell aufeinander zu, daß ich schon im letzten Zimmer bin, und dort im Winkel steht die Falle, in die ich laufe.“ – „Du mußt nur die Laufrichtung ändern“, sagte die Katze und fraß sie.`,
  },
  {
    slug: 'vor-dem-gesetz',
    title: 'Before the Law',
    origTitle: 'Vor dem Gesetz',
    source: 'Franz Kafka (1915)',
    lang: 'German',
    kind: 'fiction',
    text: `Vor dem Gesetz steht ein Türhüter. Zu diesem Türhüter kommt ein Mann vom Lande und bittet um Eintritt in das Gesetz. Aber der Türhüter sagt, daß er ihm jetzt den Eintritt nicht gewähren könne. Der Mann überlegt und fragt dann, ob er also später werde eintreten dürfen. „Es ist möglich,“ sagt der Türhüter, „jetzt aber nicht.“

Da das Tor zum Gesetz offen steht wie immer und der Türhüter beiseite tritt, bückt sich der Mann, um durch das Tor in das Innere zu sehen. Als der Türhüter das merkt, lacht er und sagt: „Wenn es dich so lockt, versuche es doch trotz meines Verbotes hineinzugehen. Merke aber: Ich bin mächtig. Und ich bin nur der unterste Türhüter. Von Saal zu Saal stehen aber Türhüter, einer mächtiger als der andere. Schon den Anblick des Dritten kann nicht einmal ich mehr ertragen.“

Solche Schwierigkeiten hat der Mann vom Lande nicht erwartet; das Gesetz soll doch jedem und immer zugänglich sein, denkt er, aber als er jetzt den Türhüter in seinem Pelzmantel genauer ansieht, seine große Spitznase, den langen, dünnen, schwarzen tartarischen Bart, entschließt er sich doch lieber zu warten, bis er die Erlaubnis zum Eintritt bekommt. Der Türhüter gibt ihm einen Schemel und läßt ihn seitwärts von der Tür sich niedersetzen. Dort sitzt er Tage und Jahre.

Er macht viele Versuche eingelassen zu werden und ermüdet den Türhüter durch seine Bitten. Der Türhüter stellt öfters kleine Verhöre mit ihm an, fragt ihn über seine Heimat aus und nach vielem andern, es sind aber teilnahmslose Fragen, wie sie große Herren stellen, und zum Schlusse sagt er ihm immer wieder, daß er ihn noch nicht einlassen könne. Der Mann, der sich für seine Reise mit vielem ausgerüstet hat, verwendet alles, und sei es noch so wertvoll, um den Türhüter zu bestechen. Dieser nimmt zwar alles an, aber sagt dabei: „Ich nehme es nur an, damit du nicht glaubst, etwas versäumt zu haben.“

Während der vielen Jahre beobachtet der Mann den Türhüter fast ununterbrochen. Er vergißt die andern Türhüter und dieser erste scheint ihm das einzige Hindernis für den Eintritt in das Gesetz. Er verflucht den unglücklichen Zufall, in den ersten Jahren rücksichtslos und laut, später als er alt wird, brummt er nur noch vor sich hin. Er wird kindisch und da er in dem jahrelangen Studium des Türhüters auch die Flöhe in seinem Pelzkragen erkannt hat, bittet er auch die Flöhe ihm zu helfen und den Türhüter umzustimmen. Schließlich wird sein Augenlicht schwach und er weiß nicht, ob es um ihn wirklich dunkler wird oder ob ihn nur seine Augen täuschen. Wohl aber erkennt er jetzt im Dunkel einen Glanz, der unverlöschlich aus der Türe des Gesetzes bricht.

Nun lebt er nicht mehr lange. Vor seinem Tode sammeln sich in seinem Kopfe alle Erfahrungen der ganzen Zeit zu einer Frage, die er bisher an den Türhüter noch nicht gestellt hat. Er winkt ihm zu, da er seinen erstarrenden Körper nicht mehr aufrichten kann. Der Türhüter muß sich tief zu ihm hinunterneigen, denn der Größenunterschied hat sich sehr zu ungunsten des Mannes verändert. „Was willst du denn jetzt noch wissen?“ fragt der Türhüter, „du bist unersättlich.“ „Alle streben doch nach dem Gesetz,“ sagt der Mann, „wieso kommt es, daß in den vielen Jahren niemand außer mir Einlaß verlangt hat?“ Der Türhüter erkennt, daß der Mann schon an seinem Ende ist und, um sein vergehendes Gehör noch zu erreichen, brüllt er ihn an: „Hier konnte niemand sonst Einlaß erhalten, denn dieser Eingang war nur für dich bestimmt. Ich gehe jetzt und schließe ihn.“`,
  },
  {
    slug: 'die-sorge-des-hausvaters',
    title: 'The Cares of a Family Man',
    origTitle: 'Die Sorge des Hausvaters',
    source: 'Franz Kafka (1919)',
    lang: 'German',
    kind: 'fiction',
    text: `Die einen sagen, das Wort Odradek stamme aus dem Slawischen und sie suchen auf Grund dessen die Bildung des Wortes nachzuweisen. Andere wieder meinen, es stamme aus dem Deutschen, vom Slawischen sei es nur beeinflußt. Die Unsicherheit beider Deutungen aber läßt wohl mit Recht darauf schließen, daß keine zutrifft, zumal man auch mit keiner von ihnen einen Sinn des Wortes finden kann.

Natürlich würde sich niemand mit solchen Studien beschäftigen, wenn es nicht wirklich ein Wesen gäbe, das Odradek heißt. Es sieht zunächst aus wie eine flache sternartige Zwirnspule, und tatsächlich scheint es auch mit Zwirn bezogen; allerdings dürften es nur abgerissene, alte aneinander geknotete, aber auch ineinander verfitzte Zwirnstücke von verschiedenster Art und Farbe sein. Es ist aber nicht nur eine Spule, sondern aus der Mitte des Sternes kommt ein kleines Querstäbchen hervor und an dieses Stäbchen fügt sich dann im rechten Winkel noch eines. Mit Hilfe dieses letzteren Stäbchens auf der einen Seite, und einer der Ausstrahlungen des Sternes auf der anderen Seite, kann das Ganze wie auf zwei Beinen aufrecht stehen.

Man wäre versucht zu glauben, dieses Gebilde hätte früher irgendeine zweckmäßige Form gehabt und jetzt sei es nur zerbrochen. Dies scheint aber nicht der Fall zu sein; wenigstens findet sich kein Anzeichen dafür; nirgends sind Ansätze oder Bruchstellen zu sehen, die auf etwas derartiges hinweisen würden; das Ganze erscheint zwar sinnlos, aber in seiner Art abgeschlossen. Näheres läßt sich übrigens nicht darüber sagen, da Odradek außerordentlich beweglich und nicht zu fangen ist.

Er hält sich abwechselnd auf dem Dachboden, im Treppenhaus, auf den Gängen, im Flur auf. Manchmal ist er monatelang nicht zu sehen; da ist er wohl in andere Häuser übersiedelt; doch kehrt er dann unweigerlich wieder in unser Haus zurück. Manchmal, wenn man aus der Tür tritt und er lehnt gerade unten am Treppengeländer, hat man Lust, ihn anzusprechen. Natürlich stellt man an ihn keine schwierigen Fragen, sondern behandelt ihn – schon seine Winzigkeit verführt dazu – wie ein Kind. „Wie heißt du denn?“ fragt man ihn. „Odradek“, sagt er. „Und wo wohnst du?“ „Unbestimmter Wohnsitz“, sagt er und lacht; es ist aber nur ein Lachen, wie man es ohne Lungen hervorbringen kann. Es klingt etwa so, wie das Rascheln in gefallenen Blättern. Damit ist die Unterhaltung meist zu Ende. Uebrigens sind selbst diese Antworten nicht immer zu erhalten; oft ist er lange stumm, wie das Holz, das er zu sein scheint.

Vergeblich frage ich mich, was mit ihm geschehen wird. Kann er denn sterben? Alles, was stirbt, hat vorher eine Art Ziel, eine Art Tätigkeit gehabt und daran hat es sich zerrieben; das trifft bei Odradek nicht zu. Sollte er also einstmals etwa noch vor den Füßen meiner Kinder und Kindeskinder mit nachschleifendem Zwirnsfaden die Treppe hinunterkollern? Er schadet ja offenbar niemandem; aber die Vorstellung, daß er mich auch noch überleben sollte, ist mir eine fast schmerzliche.`,
  },
  {
    slug: 'tolsty-i-tonky',
    title: 'Fat and Thin',
    origTitle: 'Толстый и тонкий',
    source: 'Антон Чехов (1883)',
    lang: 'Russian',
    kind: 'fiction',
    text: `На вокзале Николаевской железной дороги встретились два приятеля: один толстый, другой тонкий. Толстый только что пообедал на вокзале, и губы его, подёрнутые маслом, лоснились, как спелые вишни. Пахло от него хересом и флёр-д’оранжем. Тонкий же только что вышел из вагона и был навьючен чемоданами, узлами и картонками. Пахло от него ветчиной и кофейной гущей. Из-за его спины выглядывала худенькая женщина с длинным подбородком — его жена, и высокий гимназист с прищуренным глазом — его сын.

— Порфирий! — воскликнул толстый, увидев тонкого. — Ты ли это? Голубчик мой! Сколько зим, сколько лет!
— Батюшки! — изумился тонкий. — Миша! Друг детства! Откуда ты взялся?
Приятели троекратно облобызались и устремили друг на друга глаза, полные слёз. Оба были приятно ошеломлены.

— Милый мой! — начал тонкий после лобызания. — Вот не ожидал! Вот сюрприз! Ну, да погляди же на меня хорошенько! Такой же красавец, как и был! Такой же душонок и щёголь! Ах ты, господи! Ну, что же ты? Богат? Женат? Я уже женат, как видишь… Это вот моя жена, Луиза, урождённая Ванценбах… лютеранка… А это сын мой, Нафанаил, ученик III класса. Это, Нафаня, друг моего детства! В гимназии вместе учились!
Нафанаил немного подумал и снял шапку.

— В гимназии вместе учились! — продолжал тонкий. — Помнишь, как тебя дразнили? Тебя дразнили Геростратом за то, что ты казённую книжку папироской прожёг, а меня Эфиальтом за то, что я ябедничать любил. Хо-хо… Детьми были! Не бойся, Нафаня! Подойди к нему поближе… А это моя жена, урождённая Ванценбах… лютеранка.
Нафанаил немного подумал и спрятался за спину отца.

— Ну, как живёшь, друг? — спросил толстый, восторженно глядя на друга. — Служишь где? Дослужился?
— Служу, милый мой! Коллежским асессором уже второй год и Станислава имею. Жалованье плохое… ну, да бог с ним! Жена уроки музыки даёт, я портсигары приватно из дерева делаю. Отличные портсигары! По рублю за штуку продаю. Если кто берёт десять штук и более, тому, понимаешь, уступка. Пробавляемся кое-как. Служил, знаешь, в департаменте, а теперь сюда переведён столоначальником по тому же ведомству… Здесь буду служить. Ну, а ты как? Небось, уже статский? А?

— Нет, милый мой, поднимай повыше, — сказал толстый. — Я уже до тайного дослужился… Две звезды имею.
Тонкий вдруг побледнел, окаменел, но скоро лицо его искривилось во все стороны широчайшей улыбкой; казалось, что от лица и глаз его посыпались искры. Сам он съёжился, сгорбился, сузился… Его чемоданы, узлы и картонки съёжились, поморщились… Длинный подбородок жены стал ещё длиннее; Нафанаил вытянулся во фрунт и застегнул все пуговки своего мундира…

— Я, ваше превосходительство… Очень приятно-с! Друг, можно сказать, детства и вдруг вышли в такие вельможи-с! Хи-хи-с.
— Ну, полно! — поморщился толстый. — Для чего этот тон? Мы с тобой друзья детства — и к чему тут это чинопочитание!
— Помилуйте… Что вы-с… — захихикал тонкий, ещё более съёживаясь. — Милостивое внимание вашего превосходительства… вроде как бы живительной влаги… Это вот, ваше превосходительство, сын мой Нафанаил… жена Луиза, лютеранка, некоторым образом…

Толстый хотел было возразить что-то, но на лице у тонкого было написано столько благоговения, сладости и почтительной кислоты, что тайного советника стошнило. Он отвернулся от тонкого и подал ему на прощанье руку.
Тонкий пожал три пальца, поклонился всем туловищем и захихикал, как китаец: «хи-хи-хи». Жена улыбнулась. Нафанаил шаркнул ногой и уронил фуражку. Все трое были приятно ошеломлены.`,
  },
  {
    slug: 'smert-chinovnika',
    title: 'The Death of a Clerk',
    origTitle: 'Смерть чиновника',
    source: 'Антон Чехов (1883)',
    lang: 'Russian',
    kind: 'fiction',
    text: `В один прекрасный вечер не менее прекрасный экзекутор, Иван Дмитрич Червяков, сидел во втором ряду кресел и глядел в бинокль на «Корневильские колокола». Он глядел и чувствовал себя на верху блаженства. Но вдруг… В рассказах часто встречается это «но вдруг». Авторы правы: жизнь так полна внезапностей! Но вдруг лицо его поморщилось, глаза подкатились, дыхание остановилось… он отвел от глаз бинокль, нагнулся и…. апчхи!!! Чихнул, как видите. Чихать никому и нигде не возбраняется. Чихают и мужики, и полицеймейстеры, и иногда даже и тайные советники. Все чихают. Червяков нисколько не сконфузился, утерся платочком и, как вежливый человек, поглядел вокруг себя: не обеспокоил ли он кого-нибудь своим чиханьем? Но тут уж пришлось сконфузиться. Он увидел, что старичок, сидевший впереди него, в первом ряду кресел, старательно вытирал свою лысину и шею перчаткой и бормотал что-то. В старичке Червяков узнал статского генерала Бризжалова, служащего по ведомству путей сообщения.

«Я его обрызгал! — подумал Червяков. — Не мой начальник, чужой, но все-таки неловко. Извиниться надо».
Червяков кашлянул, подался туловищем вперед и зашептал генералу на ухо:
— Извините, ваше —ство, я вас обрызгал… я нечаянно…
— Ничего, ничего…
— Ради бога, извините. Я ведь… я не желал!
— Ах, сидите, пожалуйста! Дайте слушать!

Червяков сконфузился, глупо улыбнулся и начал глядеть на сцену. Глядел он, но уж блаженства больше не чувствовал. Его начало помучивать беспокойство.
В антракте он подошел к Бризжалову, походил возле него и, поборовши робость, пробормотал:
— Я вас обрызгал, ваше —ство… Простите… Я ведь… не то чтобы…
— Ах, полноте… Я уж забыл, а вы всё о том же! — сказал генерал и нетерпеливо шевельнул нижней губой.
«Забыл, а у самого ехидство в глазах, — подумал Червяков, подозрительно поглядывая на генерала. — И говорить не хочет. Надо бы ему объяснить, что я вовсе не желал… что это закон природы, а то подумает, что я плюнуть хотел. Теперь не подумает, так после подумает!..»

Придя домой, Червяков рассказал жене о своем невежестве. Жена, как показалось ему, слишком легкомысленно отнеслась к происшедшему; она только испугалась, а потом, когда узнала, что Бризжалов «чужой», успокоилась.
— А все-таки ты сходи, извинись, — сказала она. — Подумает, что ты себя в публике держать не умеешь!
— То-то вот и есть! Я извинялся, да он как-то странно… Ни одного слова путного не сказал. Да и некогда было разговаривать.

На другой день Червяков надел новый вицмундир, подстригся и пошел к Бризжалову объяснить… Войдя в приемную генерала, он увидел там много просителей, а между просителями и самого генерала, который уже начал прием прошений. Опросив несколько просителей, генерал поднял глаза и на Червякова.
— Вчера в «Аркадии», ежели припомните, ваше —ство, — начал докладывать экзекутор, — я чихнул-с и… нечаянно обрызгал… Изв…
— Какие пустяки… Бог знает что! Вам что угодно? — обратился генерал к следующему просителю.
«Говорить не хочет! — подумал Червяков, бледнея. — Сердится, значит… Нет, этого нельзя так оставить… Я ему объясню…»

Когда генерал кончил беседу с последним просителем и направился во внутренние апартаменты, Червяков шагнул за ним и забормотал:
— Ваше —ство! Ежели я осмеливаюсь беспокоить ваше —ство, то именно из чувства, могу сказать, раскаяния!.. Не нарочно, сами изволите знать-с!
Генерал состроил плаксивое лицо и махнул рукой.
— Да вы просто смеетесь, милостисдарь! — сказал он, скрываясь за дверью.
«Какие же тут насмешки? — подумал Червяков. — Вовсе тут нет никаких насмешек! Генерал, а не может понять! Когда так, не стану же я больше извиняться перед этим фанфароном! Чёрт с ним! Напишу ему письмо, а ходить не стану! Ей-богу, не стану!»

Так думал Червяков, идя домой. Письма генералу он не написал. Думал, думал, и никак не выдумал этого письма. Пришлось на другой день идти самому объяснять.
— Я вчера приходил беспокоить ваше —ство, — забормотал он, когда генерал поднял на него вопрошающие глаза, — не для того, чтобы смеяться, как вы изволили сказать. Я извинялся за то, что, чихая, брызнул-с…, а смеяться я и не думал. Смею ли я смеяться? Ежели мы будем смеяться, так никакого тогда, значит, и уважения к персонам… не будет…

— Пошел вон!! — гаркнул вдруг посиневший и затрясшийся генерал.
— Что-с? — спросил шёпотом Червяков, млея от ужаса.
— Пошел вон!! — повторил генерал, затопав ногами.
В животе у Червякова что-то оторвалось. Ничего не видя, ничего не слыша, он попятился к двери, вышел на улицу и поплелся… Придя машинально домой, не снимая вицмундира, он лег на диван и… помер.`,
  },
  {
    slug: 'kumo-no-ito',
    title: 'The Spider’s Thread',
    origTitle: '蜘蛛の糸',
    source: '芥川龍之介 (1918)',
    lang: 'Japanese',
    kind: 'fiction',
    // Pre-segmented with spaces (wakachigaki): tokenization is whitespace-
    // based, and Japanese is written without spaces. Segmentation is at
    // learner-friendly word level, particles separated.
    text: `ある 日 の 事 で ございます。 御釈迦様 は 極楽 の 蓮池 の ふち を、 独り で ぶらぶら 御歩き に なって いらっしゃいました。 池 の 中 に 咲いて いる 蓮 の 花 は、 みんな 玉 の よう に まっ白 で、 その まん中 に ある 金色 の 蕊 から は、 何とも 云えない 好い 匂 が、 絶間なく あたり へ 溢れて 居ります。 極楽 は 丁度 朝 な の で ございましょう。

やがて 御釈迦様 は その 池 の ふち に 御佇み に なって、 水 の 面 を 蔽って いる 蓮 の 葉 の 間 から、 ふと 下 の 容子 を 御覧 に なりました。 この 極楽 の 蓮池 の 下 は、 丁度 地獄 の 底 に 当って 居ります から、 水晶 の ような 水 を 透き徹して、 三途の河 や 針の山 の 景色 が、 丁度 覗き眼鏡 を 見る よう に、 はっきり と 見える の で ございます。

すると その 地獄 の 底 に、 犍陀多 と 云う 男 が 一人、 ほか の 罪人 と 一しょ に 蠢いて いる 姿 が、 御眼 に 止まりました。 この 犍陀多 と 云う 男 は、 人 を 殺したり 家 に 火 を つけたり、 いろいろ 悪事 を 働いた 大泥坊 で ございます が、 それでも たった 一つ、 善い 事 を 致した 覚え が ございます。 と 申します の は、 ある 時 この 男 が 深い 林 の 中 を 通ります と、 小さな 蜘蛛 が 一匹、 路ばた を 這って 行く の が 見えました。 そこで 犍陀多 は 早速 足 を 挙げて、 踏み殺そう と 致しました が、 「いや、 いや、 これ も 小さい ながら、 命 の ある もの に 違いない。 その 命 を 無暗に とる と 云う 事 は、 いくら 何でも 可哀そうだ。」 と、 こう 急に 思い返して、 とうとう その 蜘蛛 を 殺さず に 助けて やった から で ございます。

御釈迦様 は 地獄 の 容子 を 御覧 に なり ながら、 この 犍陀多 に は 蜘蛛 を 助けた 事 が ある の を 御思い出し に なりました。 そうして それだけ の 善い 事 を した 報 に は、 出来る なら、 この 男 を 地獄 から 救い出して やろう と 御考え に なりました。 幸い、 側 を 見ます と、 翡翠 の ような 色 を した 蓮 の 葉 の 上 に、 極楽 の 蜘蛛 が 一匹、 美しい 銀色 の 糸 を かけて 居ります。 御釈迦様 は その 蜘蛛の糸 を そっと 御手 に 御取り に なって、 玉 の ような 白蓮 の 間 から、 遥か 下 に ある 地獄 の 底 へ、 まっすぐ に それ を 御下し なさいました。

こちら は 地獄 の 底 の 血の池 で、 ほか の 罪人 と 一しょ に、 浮いたり 沈んだり して いた 犍陀多 で ございます。 何しろ どちら を 見て も、 まっ暗 で、 たまに その くら暗 から ぼんやり 浮き上って いる もの が ある と 思います と、 それ は 恐しい 針の山 の 針 が 光る の で ございます から、 その 心細さ と 云ったら ございません。 その 上 あたり は 墓 の 中 の よう に しん と 静まり返って、 たまに 聞える もの と 云って は、 ただ 罪人 が つく 微な 嘆息 ばかり で ございます。 これ は ここ へ 落ちて 来る ほど の 人間 は、 もう さまざまな 地獄 の 責苦 に 疲れはてて、 泣声 を 出す 力 さえ なくなって いる の で ございましょう。 ですから さすが 大泥坊 の 犍陀多 も、 やはり 血の池 の 血 に 咽び ながら、 まるで 死にかかった 蛙 の よう に、 ただ もがいて ばかり 居りました。

ところが ある 時 の 事 で ございます。 何気なく 犍陀多 が 頭 を 挙げて、 血の池 の 空 を 眺めます と、 その ひっそり と した 暗 の 中 を、 遠い 遠い 天上 から、 銀色 の 蜘蛛の糸 が、 まるで 人目 に かかる の を 恐れる よう に、 一すじ 細く 光り ながら、 するする と 自分 の 上 へ 垂れて 参る の で は ございません か。 犍陀多 は これ を 見る と、 思わず 手 を 拍って 喜びました。 この 糸 に 縋りついて、 どこまでも のぼって 行けば、 きっと 地獄 から ぬけ出せる のに 相違 ございません。 いや、 うまく 行く と、 極楽 へ はいる 事 さえ も 出来ましょう。 そうすれば、 もう 針の山 へ 追い上げられる 事 も なくなれば、 血の池 に 沈められる 事 も ある 筈 は ございません。

こう 思いました から 犍陀多 は、 早速 その 蜘蛛の糸 を 両手 で しっかり と つかみ ながら、 一生懸命に 上 へ 上 へ と たぐりのぼり 始めました。 元より 大泥坊 の 事 で ございます から、 こう 云う 事 に は 昔 から、 慣れ切って いる の で ございます。

しかし 地獄 と 極楽 と の 間 は、 何万里 と なく ございます から、 いくら 焦って 見た 所 で、 容易に 上 へ は 出られません。 やや しばらく のぼる 中 に、 とうとう 犍陀多 も くたびれて、 もう 一たぐり も 上 の 方 へ は のぼれなく なって しまいました。 そこで 仕方 が ございません から、 まず 一休み 休む つもり で、 糸 の 中途 に ぶら下り ながら、 遥かに 目 の 下 を 見下しました。

すると、 一生懸命に のぼった 甲斐 が あって、 さっき まで 自分 が いた 血の池 は、 今 で は もう 暗 の 底 に いつの間にか かくれて 居ります。 それから あの ぼんやり 光って いる 恐しい 針の山 も、 足 の 下 に なって しまいました。 この 分 で のぼって 行けば、 地獄 から ぬけ出す の も、 存外 わけ が ない かも 知れません。 犍陀多 は 両手 を 蜘蛛の糸 に からみ ながら、 ここ へ 来て から 何年 に も 出した 事 の ない 声 で、 「しめた。 しめた。」 と 笑いました。 ところが ふと 気 が つきます と、 蜘蛛の糸 の 下 の 方 に は、 数限も ない 罪人たち が、 自分 の のぼった 後 を つけて、 まるで 蟻 の 行列 の よう に、 やはり 上 へ 上 へ 一心に よじのぼって 来る で は ございません か。 犍陀多 は これ を 見る と、 驚いた の と 恐しい の と で、 しばらく は ただ、 莫迦 の よう に 大きな 口 を 開いた まま、 眼 ばかり 動かして 居りました。 自分 一人 で さえ 断れそうな、 この 細い 蜘蛛の糸 が、 どうして あれだけ の 人数 の 重み に 堪える 事 が 出来ましょう。 もし 万一 途中 で 断れた と 致しましたら、 折角 ここ へ まで のぼって 来た この 肝腎な 自分 まで も、 元 の 地獄 へ 逆落し に 落ちて しまわなければ なりません。 そんな 事 が あったら、 大変 で ございます。 が、 そう 云う 中 に も、 罪人たち は 何百 と なく 何千 と なく、 まっ暗な 血の池 の 底 から、 うようよ と 這い上って、 細く 光って いる 蜘蛛の糸 を、 一列 に なり ながら、 せっせと のぼって 参ります。 今の中に どうか しなければ、 糸 は まん中 から 二つ に 断れて、 落ちて しまう のに 違いありません。

そこで 犍陀多 は 大きな 声 を 出して、 「こら、 罪人ども。 この 蜘蛛の糸 は 己 の もの だ ぞ。 お前たち は 一体 誰 に 尋いて、 のぼって 来た。 下りろ。 下りろ。」 と 喚きました。

その 途端 で ございます。 今 まで 何とも なかった 蜘蛛の糸 が、 急に 犍陀多 の ぶら下って いる 所 から、 ぷつり と 音 を 立てて 断れました。 ですから 犍陀多 も たまりません。 あっ と 云う 間 も なく 風 を 切って、 独楽 の よう に くるくる まわり ながら、 見る見る 中 に 暗 の 底 へ、 まっさかさまに 落ちて しまいました。

後 に は ただ 極楽 の 蜘蛛の糸 が、 きらきら と 細く 光り ながら、 月 も 星 も ない 空 の 中途 に、 短く 垂れて いる ばかり で ございます。

御釈迦様 は 極楽 の 蓮池 の ふち に 立って、 この 一部始終 を じっと 見て いらっしゃいました が、 やがて 犍陀多 が 血の池 の 底 へ 石 の よう に 沈んで しまいます と、 悲しそうな 御顔 を なさり ながら、 また ぶらぶら 御歩き に なり 始めました。 自分 ばかり 地獄 から ぬけ出そう と する、 犍陀多 の 無慈悲な 心 が、 そうして その 心 相当な 罰 を うけて、 元 の 地獄 へ 落ちて しまった の が、 御釈迦様 の 御目 から 見る と、 浅間しく 思召された の で ございましょう。

しかし 極楽 の 蓮池 の 蓮 は、 少しも そんな 事 に は 頓着 致しません。 その 玉 の ような 白い 花 は、 御釈迦様 の 御足 の まわり に、 ゆらゆら 萼 を 動かして、 その まん中 に ある 金色 の 蕊 から は、 何とも 云えない 好い 匂 が、 絶間なく あたり へ 溢れて 居ります。 極楽 も もう 午 に 近く なった の で ございましょう。`,
  },
]
