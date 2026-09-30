// node scripts/compare-sources.mjs [isbn …] — asks the book sources for the books BookKit's users are likely to
// add, and prints what came back as the Markdown tables of docs/search-sources.md. Run by hand; not part of the app.
// GOOGLE_BOOKS_KEY=… asks Google Books through its API (GOOGLE_BOOKS_PARAMS adds to its query, e.g. langRestrict=tr);
// without a key the API refuses, and its old keyless feed is asked instead, which shows what the catalogue holds
// but not how the API would rank it.
import { parseIsbn } from '../src/books/isbn.ts'
import { matchKey } from '../src/books/match.ts'
import { readAnswer, searchAddress } from '../src/search/openLibrary.ts'
import { cleanResults } from '../src/search/results.ts'

const AGENT = 'BookKit-compare/1.0 (https://kitshelf.app)'
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// What a reader would type, the titles a right answer may carry in the catalogue (a translation is often filed
// under its original title), what its author's name has to contain once folded by matchKey, and the ISBN of the
// edition kitapyurdu.com listed first for it on 30 September 2026.
const BOOKS = [
  { q: 'Kürk Mantolu Madonna', author: 'sabahattin ali', isbn: '9786257751520' },
  { q: 'Kuyucaklı Yusuf', author: 'sabahattin ali', isbn: '9786257751537' },
  { q: 'Saatleri Ayarlama Enstitüsü', author: 'tanpinar', isbn: '9786258437249' },
  { q: 'Tutunamayanlar', author: 'atay', isbn: '9789754700114' },
  { q: 'Tehlikeli Oyunlar', author: 'atay', isbn: '9789754702095' },
  { q: 'İnce Memed', author: 'kemal', isbn: '9789750807145' },
  { q: 'Çalıkuşu', author: 'guntekin', isbn: '9789751047236' },
  { q: 'Aşk-ı Memnu', author: 'usakligil', isbn: '9789752207691' },
  { q: 'Yaban', author: 'karaosmanoglu', isbn: '9789754700060' },
  { q: 'Benim Adım Kırmızı', author: 'pamuk', isbn: '9789750825927' },
  { q: 'Masumiyet Müzesi', author: 'pamuk', isbn: '9789750826146' },
  { q: 'Serenad', author: 'livaneli', isbn: '9789751042668' },
  { q: 'Suç ve Ceza', also: ['Crime and Punishment', 'Преступление и наказание'], author: /dosto[iy]?evsk|достоевск/, isbn: '9789754589023' },
  { q: 'Simyacı', also: ['O Alquimista', 'The Alchemist'], author: 'coelho', isbn: '9789750726439' },
  { q: 'Sapiens', also: ['Sapiens: A Brief History of Humankind', 'Hayvanlardan Tanrilara - Sapiens Insan Turunun Kisa Bir Tarihi', 'Hayvanlardan Tanrılara', 'קיצור תולדות האנושות'], author: 'harari', isbn: '9786055029357' },
  { q: 'Beyaz Diş', also: ['White Fang'], author: 'london', isbn: '9786257784627' },
]
const AUTHORS = [
  { q: 'sabahattin ali', author: 'sabahattin ali' },
  { q: 'orhan pamuk', author: 'pamuk' },
]

// What people in Turkey were buying on 30 September 2026, as kitapyurdu.com listed it, each with the ISBN of the
// edition on sale: the literature shelf's best sellers of the last 365 days, and that week's best sellers overall.
const LITERATURE = [
  { q: 'Bekle Beni', author: 'livaneli', isbn: '9789750766091' },
  { q: 'Bahçıvan ve Ölüm', author: 'gospodinov', isbn: '9786053164258' },
  { q: 'Altı Harfli Bir Tatlı', author: 'yasar', isbn: '9786255683342' },
  { q: 'Algernon’a Çiçekler', author: 'keyes', isbn: '9786054629862' },
  { q: 'Annemin Uyurgezer Geceleri', author: 'tunc', isbn: '9789750766329' },
  { q: 'Yaşamak', author: 'hua', isbn: '9786056587887' },
  { q: 'Taş Kağıt Makas', author: 'feeney', isbn: '9786258387711' },
  { q: 'Gece Yarısı Kütüphanesi', author: 'haig', isbn: '9786051981833' },
  { q: 'Hamnet', author: 'farrell', isbn: '9786051982304' },
  { q: 'Söyleme Bilmesinler', author: 'yasar', isbn: '9786256570597' },
  { q: 'Soygun', author: 'pala', isbn: '9786258521245' },
  { q: 'Saç Örgüsü', author: 'colombani', isbn: '9786058276666' },
  { q: 'Saatleri Ayarlama Enstitüsü', author: 'tanpinar', isbn: '9786258437249' },
  { q: 'Aylardan Kasım Günlerden Perşembe', author: 'kulin', isbn: '9786253695033' },
  { q: 'Sarı Yüz', author: 'kuang', isbn: '9786052655634' },
  { q: 'El Kızı', author: 'kemal', isbn: '9789752894662' },
  { q: 'İnsanlığımı Yitirirken', author: 'dazai', isbn: '9786256475892' },
  { q: 'Kocamın Karısı', author: 'feeney', isbn: '9786256826830' },
  { q: 'Sırların Sırrı', author: 'brown', isbn: '9789752130678' },
  { q: 'Gece Yarısı Treni', author: 'haig', isbn: '9786051984445' },
]
const THIS_WEEK = [
  { q: 'Vatanın Kalbi', author: 'ozdamarlar', isbn: '9786259029290' },
  { q: 'Benim İçin Bir Yıldız Sakla', author: 'tastekin', isbn: '9786259029283' },
  { q: 'Robonlar Bir Kaçış Operasyonu', author: 'arik', isbn: '9786259791128' },
  { q: 'Cumhuriyet’in İlk Sabahı', author: 'ortayli', isbn: '9786256989498' },
  { q: 'Müdürün Uçan Peruğu', author: 'sarioglu', isbn: '9786258618136' },
  { q: 'Roma’nın Beş Günü', author: 'umit', isbn: '9789750868702' },
  { q: 'Gizli Dedektifler Okulu', author: 'hayta', isbn: '9786259029221' },
  { q: 'Sözcüklerin Kamera Arkası', author: 'tastekin', isbn: '9786259834665' },
  { q: 'Kınalı Serçe', author: 'ortayli', isbn: '9786259506586' },
  { q: 'Telefon Melefon Yok', author: 'yasar', isbn: '9786259621012' },
  { q: 'Muhabbet', author: 'evans', isbn: '9786256756205' },
  { q: 'Çıkmaz Sokağın Ressamı', author: 'bayraktar', isbn: '9786259791135' },
  { q: 'İyilik Timi', author: 'ozdamarlar', isbn: '9786259834658' },
  { q: 'Büyüdüm Ben!', author: 'yasar', isbn: '9786259316550' },
  { q: 'Tutumlu Kedi Frida’nın Maceraları', author: 'cicek', isbn: '9789751050625' },
]

const byAuthor = (names, wanted) => (names ?? []).some((name) => (wanted instanceof RegExp ? wanted.test(name.toLowerCase()) || wanted.test(matchKey(name)) : matchKey(name).includes(wanted)))
const sameTitle = (title, book) => [book.q, ...(book.also ?? [])].some((wanted) => matchKey(title ?? '') === matchKey(wanted))
// An ISBN can lead to another book's record, or to the right one under a name its reader would not know.
const rightBook = (record, book) => byAuthor(record.authors, book.author) && [book.q, ...(book.also ?? [])].some((wanted) => matchKey(record.title) === matchKey(wanted) || matchKey(record.title).startsWith(`${matchKey(wanted)} `))
const isbnCell = (record, book) => (!record ? 'yok' : `${rightBook(record, book) ? '' : byAuthor(record.authors, book.author) ? 'adı farklı: ' : 'başka kitap: '}${record.title} — ${record.authors.join(', ') || 'yazar yok'}`)
const yes = (value) => (value ? 'evet' : 'hayır')
const place = (at) => (at < 0 ? 'yok' : `${at + 1}.`)

// The app's own request; `typed` is what the reader wrote.
async function openLibrary(typed) {
  const started = Date.now()
  const response = await fetch(searchAddress(typed), { headers: { 'User-Agent': AGENT }, signal: AbortSignal.timeout(20_000) })
  if (!response.ok) return { status: response.status, docs: [], shown: [], ms: Date.now() - started }
  const body = await response.json()
  return { status: 200, found: body.numFound, ms: Date.now() - started, docs: body.docs, shown: cleanResults(readAnswer(body, typed), typed) }
}

// A record as it comes, before the app tidies it: the edition's name where there is one, every author and other name.
const rawAt = (docs, book) =>
  docs.findIndex((doc) => (sameTitle(doc.editions?.docs?.[0]?.title, book) || sameTitle(doc.title, book)) && (byAuthor(doc.author_name, book.author) || byAuthor(doc.author_alternative_name, book.author)))
const rawTitle = (doc) => doc?.editions?.docs?.[0]?.title ?? doc?.title
const shownAt = (shown, book) => shown.findIndex((found) => sameTitle(found.title, book))
// For a book that is not a classic the title alone is not enough: another book may carry the same name.
const shownByAuthorAt = (shown, book) => shown.findIndex((found) => sameTitle(found.title, book) && byAuthor(found.authors, book.author))

async function coverSize(url) {
  if (!url) return 'yok'
  const response = await fetch(url, { headers: { 'User-Agent': AGENT }, signal: AbortSignal.timeout(20_000) }).catch(() => undefined)
  if (!response?.ok) return `HTTP ${response?.status ?? 'hata'}`
  return `${Math.round((await response.arrayBuffer()).byteLength / 1024)} KB`
}

// The feed escapes twice, and sometimes wrongly ("O&amp;039;Farrell").
const unescape = (text) => text.replaceAll('&amp;', '&').replace(/&#?0?39;/g, "'").replaceAll('&quot;', '"').replaceAll('&lt;', '<').replaceAll('&gt;', '>')

// Google Books as a list of { title, authors, language, cover }: the v1 API with a key, the old Atom feed without.
async function googleBooks(query, key) {
  if (key) {
    const extra = process.env.GOOGLE_BOOKS_PARAMS ? `&${process.env.GOOGLE_BOOKS_PARAMS}` : ''
    // The key only answers requests that come from the app's own addresses, which a script has to name itself.
    const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=20&printType=books${extra}&key=${key}`, { headers: { Referer: 'http://localhost:5175/' }, signal: AbortSignal.timeout(20_000) })
    if (!response.ok) return { status: response.status, reason: (await response.json().catch(() => ({}))).error?.message?.replaceAll(key, '<key>'), docs: [] }
    const items = (await response.json()).items ?? []
    return { status: 200, docs: items.map(({ volumeInfo: info = {} }) => ({ title: info.title ?? '', authors: info.authors ?? [], language: info.language, cover: Boolean(info.imageLinks?.thumbnail) })) }
  }
  const response = await fetch(`https://www.google.com/books/feeds/volumes?q=${encodeURIComponent(query)}&max-results=20`, { signal: AbortSignal.timeout(20_000) })
  if (!response.ok) return { status: response.status, docs: [] }
  const entries = [...(await response.text()).matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, entry]) => ({
    title: unescape(entry.match(/<dc:title>([^<]*)/)?.[1] ?? ''),
    authors: [...entry.matchAll(/<dc:creator>([^<]*)/g)].map((match) => unescape(match[1])),
    language: entry.match(/<dc:language>([^<]*)/)?.[1],
    cover: /rel='http:\/\/schemas\.google\.com\/books\/2008\/thumbnail'/.test(entry),
  }))
  return { status: 200, docs: entries }
}

// ONLY=google skips Open Library, e.g. to try Google's parameters without asking Open Library again.
if (process.env.ONLY !== 'google') await openLibraryTables()

async function openLibraryTables() {
  console.error('Open Library…')
  const rows = []
  const plainRows = []
  let inFive = 0
  let exact = 0
  let covered = 0
  for (const book of BOOKS) {
    const result = await openLibrary(book.q)
    const raw = rawAt(result.docs, book)
    const at = shownAt(result.shown, book)
    const hit = result.shown[at]
    if (at >= 0 && at < 5) inFive += 1
    if (hit?.title === book.q) exact += 1
    if (hit?.coverUrl) covered += 1
    rows.push(
      `| ${book.q} | ${place(raw)} | ${place(at)} | ${rawTitle(result.docs[raw]) ?? '—'} | ${hit?.title ?? '—'} | ${hit?.authors.join(', ') || '—'} | ${hit ? yes(hit.turkish) : '—'} | ${hit ? await coverSize(hit.coverUrl) : '—'} | ${hit ? (hit.isbn ?? 'yok') : '—'} | ${result.docs.length} → ${result.shown.length} | ${result.ms} ms |`,
    )
    await sleep(1100)
    // The same words without the Turkish letters, as typed on a keyboard that lacks them.
    const plain = matchKey(book.q)
    if (plain !== book.q.toLocaleLowerCase('tr')) {
      const plainResult = await openLibrary(plain)
      const plainHit = plainResult.shown[shownAt(plainResult.shown, book)]
      plainRows.push(`| ${plain} | ${place(shownAt(plainResult.shown, book))} | ${plainHit?.title ?? '—'} | ${plainHit?.authors.join(', ') || '—'} |`)
      await sleep(1100)
    }
  }
  console.log('### Open Library: kitap adıyla\n')
  console.log('| Yazılan | Ham sırası | Uygulamadaki sırası | Kayıttaki ad | Uygulamada görünen ad | Görünen yazar | Türkçe baskı | Kapak (M) | ISBN | Kayıt → satır | Süre |')
  console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
  console.log(rows.join('\n'))
  console.log(`\nDoğru kitap ilk 5’te: ${inFive} / ${BOOKS.length} (%${Math.round((inFive / BOOKS.length) * 100)}). Adı harfi harfine doğru görünen: ${exact} / ${BOOKS.length}. Kapağı olan: ${covered} / ${BOOKS.length}.\n`)

  console.log('### Open Library: aynı kitaplar, Türkçe harfler olmadan yazılınca\n')
  console.log('| Yazılan | Uygulamadaki sırası | Uygulamada görünen ad | Görünen yazar |')
  console.log('| --- | --- | --- | --- |')
  console.log(plainRows.join('\n'))

  console.log('\n### Open Library: yalnızca yazar adıyla\n')
  console.log('| Yazılan | İlk 5’in kaçı o yazarın | İlk 5 satır | Kapaklı | Türkçe |')
  console.log('| --- | --- | --- | --- | --- |')
  for (const author of AUTHORS) {
    const shown = (await openLibrary(author.q)).shown.slice(0, 5)
    console.log(`| ${author.q} | ${shown.filter((found) => byAuthor(found.authors, author.author)).length} / ${shown.length} | ${shown.map((found) => found.title).join('; ')} | ${shown.filter((found) => found.coverUrl).length} | ${shown.filter((found) => found.turkish).length} |`)
    await sleep(1100)
  }

  for (const [heading, books] of [
    ['Open Library: son bir yılın çok satan edebiyat kitapları', LITERATURE],
    ['Open Library: bu haftanın çok satanları', THIS_WEEK],
  ]) {
    console.log(`\n### ${heading}\n`)
    console.log('| Kitap | Adıyla arayınca | Uygulamada görünen | Kapak | Satıştaki baskının ISBN’i | ISBN ile arayınca |')
    console.log('| --- | --- | --- | --- | --- | --- |')
    let byName = 0
    let byIsbn = 0
    for (const book of books) {
      const named = (await openLibrary(book.q)).shown
      const at = shownByAuthorAt(named, book)
      const hit = named[at]
      await sleep(1100)
      const numbered = (await openLibrary(book.isbn)).shown[0]
      await sleep(1100)
      if (at >= 0 && at < 5) byName += 1
      if (numbered && rightBook(numbered, book)) byIsbn += 1
      console.log(`| ${book.q} | ${place(at)} | ${hit ? `${hit.title} — ${hit.authors.join(', ')}` : '—'} | ${hit ? yes(hit.coverUrl) : '—'} | ${book.isbn} | ${isbnCell(numbered, book)} |`)
    }
    console.log(`\nAdıyla ilk 5’te: ${byName} / ${books.length}. ISBN ile doğru adla bulunan: ${byIsbn} / ${books.length}.`)
  }

  console.log('\n### Open Library: planın 16 kitabı, satıştaki baskının ISBN’i ile\n')
  await isbnTable(BOOKS.map((book) => book.isbn), BOOKS.map((book) => book.q))
  const isbns = process.argv.slice(2)
  console.log('\n### Open Library: verilen ISBN’ler\n')
  if (isbns.length === 0) console.log('ISBN verilmedi: `node scripts/compare-sources.mjs 9789750800023 …`')
  else await isbnTable(isbns)

  async function isbnTable(isbns, names = []) {
    console.log('| Kitap | ISBN | Geçerli mi | Bulundu mu | Uygulamada görünen ad | Görünen yazar | Kapak (M) |')
    console.log('| --- | --- | --- | --- | --- | --- | --- |')
    let known = 0
    for (const [index, typed] of isbns.entries()) {
      const found = parseIsbn(typed) ? (await openLibrary(typed)).shown[0] : undefined
      if (found) known += 1
      console.log(`| ${names[index] ?? '?'} | ${typed} | ${yes(parseIsbn(typed))} | ${yes(found)} | ${found?.title ?? '—'} | ${found?.authors.join(', ') || '—'} | ${found ? await coverSize(found.coverUrl) : '—'} |`)
      await sleep(1100)
    }
    console.log(`\nBulunan: ${known} / ${isbns.length}`)
  }

}

const key = process.env.GOOGLE_BOOKS_KEY
console.log('\n### Google Books\n')
const keyless = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(BOOKS[0].q)}&maxResults=1`, { signal: AbortSignal.timeout(20_000) })
console.log(`API’ye anahtarsız istek: HTTP ${keyless.status}${keyless.ok ? '' : ` — ${(await keyless.json().catch(() => ({}))).error?.message ?? ''}`}`)
console.log(key ? '\nAşağıdaki tablolar API’den, anahtarla.' : '\nAşağıdaki tablolar anahtar istemeyen eski beslemeden (`google.com/books/feeds/volumes`): kataloğunda ne olduğunu gösterir, API’nin sıralamasını değil.')
for (const [heading, books] of [
  ['Google Books: planın 16 kitabı', BOOKS],
  ['Google Books: son bir yılın çok satan edebiyat kitapları', LITERATURE],
  ['Google Books: bu haftanın çok satanları', THIS_WEEK],
]) {
  console.log(`\n### ${heading}\n`)
  console.log('| Kitap | Adıyla arayınca | Kayıttaki ad ve yazar | Kapak | ISBN ile arayınca |')
  console.log('| --- | --- | --- | --- | --- |')
  let byName = 0
  let byIsbn = 0
  let covers = 0
  for (const book of books) {
    const named = (await googleBooks(book.q, key)).docs
    const at = named.findIndex((doc) => (sameTitle(doc.title, book) || matchKey(doc.title).startsWith(`${matchKey(book.q)} `)) && byAuthor(doc.authors, book.author))
    await sleep(700)
    const numbered = (await googleBooks(`isbn:${book.isbn}`, key)).docs[0]
    await sleep(700)
    const right = numbered && rightBook(numbered, book)
    if (at >= 0 && at < 5) byName += 1
    if (right) byIsbn += 1
    if (named[at]?.cover || (right && numbered.cover)) covers += 1
    const hit = named[at]
    console.log(`| ${book.q} | ${place(at)} | ${hit ? `${hit.title} — ${hit.authors.join(', ')}` : '—'} | ${hit ? yes(hit.cover) : '—'} | ${isbnCell(numbered, book)} |`)
  }
  console.log(`\nAdıyla ilk 5’te: ${byName} / ${books.length}. ISBN ile doğru adla bulunan: ${byIsbn} / ${books.length}. Kapağı olan: ${covers} / ${books.length}.`)
}
