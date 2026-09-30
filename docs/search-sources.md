# Kitap arama kaynakları

30 Eylül 2026'da ölçüldü. Tablolar `node scripts/compare-sources.mjs` çıktısıdır. Betik uygulamanın kendi isteğini ve
temizleme kodunu (`src/search/`) kullanır; "uygulamada görünen" sütunları kullanıcının göreceği şeydir.

## Özet

| Liste | Open Library: adıyla ilk 5’te | Open Library: ISBN ile | Google Books: adıyla ilk 5’te | Google Books: ISBN ile | Google Books: kapağı olan | İkisi birlikte: adıyla ilk 5’te |
| --- | --- | --- | --- | --- | --- | --- |
| Planın 16 kitabı (klasikler) | 16 / 16 | 10 / 16 | 12 / 16 | 11 / 16 | 13 / 16 | 16 / 16 |
| Son bir yılın çok satan 20 edebiyat kitabı | 10 / 20 | 8 / 20 | 11 / 20 | 14 / 20 | 5 / 20 | 15 / 20 |
| Bu haftanın 15 çok satanı | 0 / 15 | 0 / 15 | 2 / 15 | 1 / 15 | 0 / 15 | 2 / 15 |

- **Open Library klasiklerde iyi, yeni kitaplarda zayıf.** Planın 16 kitabının hepsi ilk satırda ve adı harfi harfine
  doğru geliyor. Son bir-iki yılda çıkan kitapların çoğu ise katalogda yok: Zülfü Livaneli'nin "Bekle Beni"si,
  Ahmet Ümit'in "Roma’nın Beş Günü", Dan Brown'ın "Sırların Sırrı" ne adıyla ne ISBN'iyle bulunuyor.
- **ISBN ile arama, satıştaki baskıyı çoğu zaman bulmuyor.** Klasiklerin bile yeni baskıları eksik (Kapra'nın "Kürk
  Mantolu Madonna"sı, Dergâh'ın yeni "Saatleri Ayarlama Enstitüsü" ISBN'i).
- **Google Books yeni edebiyat kitaplarında Open Library'yi tamamlıyor:** ikisi birlikte 20 kitabın 15'ini buluyor
  (Open Library tek başına 10). Bu haftanın çok satanlarında o da zayıf. Üç kısıtı var: anahtarsız çalışmıyor;
  kapakları indirilip saklanamıyor; kullanım koşulları sonuçların sırasını ve içeriğini değiştirmeyi yasaklıyor
  (aşağıda).
- **Bulunamayan kitap elle eklenir.** "Elle ekle" formu aramaya yazılan metinle (ISBN yazıldıysa ISBN'le) dolu açılır;
  kapak yerine uygulamanın çizdiği kapak görünür.

ISBN sütunları kitabı doğru adla bulanları sayar. Google Books sütunları API'den, anahtarla ölçüldü
(`ONLY=google GOOGLE_BOOKS_KEY=… node scripts/compare-sources.mjs`). Google aynı soruya farklı zamanlarda farklı sıra
verebiliyor; sayılar bir-iki kitap oynayabilir.

## Karar

Planın kuralı: Open Library sorguların en az %80'inde doğru kitabı ilk 5'te buluyorsa tek kaynak o olur. Planın
listesinde oran %100, yani **kural Open Library'yi tek kaynak yapıyor.**

Kuralın görmediği: planın listesi klasiklerden oluşuyor. Yeni kitap okuyan biri için arama yarı yarıya boş döner
(20'de 10), o haftanın çok satanlarını arayan için hiç sonuç vermez (15'te 0). Bu kitaplar elle eklenir.

**Tolga'nın kararı (30 Eylül 2026):** Google Books da eklenecek. Türkçe baskılar herkeste öne alınacak, cihaz diline
bakılmayacak (uygulama yalnızca Türkçe).

Google, kullanım koşullarının izin verdiği biçimde kullanılır:

- Arama kutusu Open Library'ye sorar. Google'a yalnızca kullanıcı sonuçların altındaki "Google Books'ta ara"
  düğmesine basınca sorulur. Planın otomatik koşulu (Open Library 5'ten az sonuç verince) Open Library'de olmayan
  15 kitabın 4'ünde hiç çalışmazdı: "Bekle Beni", "Taş Kağıt Makas", "Soygun" ve "Muhabbet" aramaları 5 ve daha çok
  alakasız satır döndürüyor. Düğme ortak günlük kotayı da korur.
- Google sonuçları ayrı bir bölümdür: Google'ın sırası ve yazımıyla, "powered by Google" logosuyla, her satırda
  Google Books sayfasına bağlantıyla. Open Library sonuçlarıyla birleştirilmez.
- Google'dan eklenen kitabın kapağı saklanamaz; internet varken gösterilir, yokken uygulamanın çizdiği kapak kalır.
- Anahtar `VITE_GOOGLE_BOOKS_KEY` ile verilir: yerelde git'e girmeyen `.env.local`, yayında GitHub Actions gizli değeri
  (secret; depo herkese açık olduğu için derleme kayıtlarında maskelensin diye). Depoya yazılmaz. Anahtar yoksa düğme
  hiç görünmez.

## Open Library

### İstek

```
https://openlibrary.org/search.json?q=<metin>&fields=key,title,author_name,author_key,author_alternative_name,
cover_i,language,editions,editions.key,editions.title,editions.language,editions.cover_i,editions.isbn&limit=40&lang=tr
```

ISBN yazılınca `q=isbn:<13 hane>`. Kapak: `https://covers.openlibrary.org/b/id/<cover_i>-M.jpg?default=false`.

### Ölçülen davranış

| Ne | Sonuç |
| --- | --- |
| Tarayıcıdan arama (uygulamanın adresinden, Chrome) | Okunuyor; `access-control-allow-origin: *` |
| Tarayıcıdan kapak `fetch` | Okunuyor; `covers.openlibrary.org` isteği `archive.org`'a yönlendiriyor, o da izin veriyor |
| Olmayan kapak | `default=false` ile 404; onsuz 43 baytlık boş bir GIF (HTTP 200) |
| Kapak boyutları | S 37×58 px (2 KB), M 180 px genişlik (7–26 KB), L yaklaşık 320×500 px (30–53 KB) |
| Yanıtın boyutu (40 satır, sıkıştırılmış) | 4 KB ("orhan pamuk"); yazarın çok sayıda başka adı kayıtlıysa 20 KB ("suç ve ceza") |
| Süre | Çoğu 400–1200 ms; en kısası 360 ms, en uzunu 3,6 sn |
| `editions` alanları | Çalışıyor. Her eser için sorguyla en iyi eşleşen **tek** baskı geliyor; daha fazlası istenemiyor |
| `lang=tr` | O baskıyı Türkçe yapıyor. "1984": `lang=tr` ile "1984" (Can Yayınları, 2019), onsuz "Nineteen eighty-four" (Clarendon Press, 1984) |
| ISBN | `isbn:` sorgusu 10 ve 13 haneli yazımı da buluyor, o ISBN'i taşıyan baskıyı döndürüyor. Bilinmeyen ISBN: HTTP 200, 0 sonuç |
| İstek sınırı (belgesi) | Kimliğini bildirmeyen istemci için saniyede 1 istek. Tarayıcı `User-Agent` ile kimlik bildiremez; uygulama iki aramanın arasına en az 1 saniye koyar |
| Kapak sınırı (belgesi) | Kapak kimliğiyle (cover id) sınırsız; ISBN ile IP başına 5 dakikada 100. Uygulama kapak kimliğini kullanır |

### Kayıtların hâli

Katalog gönüllülerin ve toplu aktarımların işi; aynı kitap birçok kez ve farklı yazımlarla duruyor:

- **Tekrar.** "Suç ve Ceza" aramasının ilk 10 satırının 9'u aynı kitap. "Beyaz Diş" için gelen kayıtların 13'ü tek
  satıra iniyor.
- **Türkçe harfleri düşmüş adlar.** "Kuyucakli yusuf", "Benim Adim Kirmizi", "Masumiyet Muzesi", "Beyaz Dis",
  "Ask-i Memnu".
- **Katalog yazımı.** Sonda nokta ve cümle düzeni: "Saatleri ayarlama enstitüsü.", "Tehlikeli oyunlar.", "Yaban."
- **Tamamı büyük harf.** "SAATLERİ AYARLAMA ENSTITUSU", yazarı "AHMET HAMDI TANPINAR".
- **Bozuk kodlama.** "Saatleri Ayarlama Enstitï¿½sï¿½" (30 aramada 1 kayıt).
- **Dil etiketi güvenilmez.** Türkçe baskıların çoğunda `language` boş ("Serenad", "Suç ve Ceza", "Beyaz Diş").
  ISBN'in ülke grubu (978-605, 978-625, 978-975, 978-9944) daha güvenilir.
- **Yazar.** Başka alfabede ("Фёдор Михайлович Достоевский", "Лев Толстой", "村上春樹"); çevirmen yazar diye girilmiş
  ("Orhan Pamuk, Amankeldī Qūrmet", "Orhan Pamuk, Rafael Carpintero;"); yayınevi yazar diye girilmiş ("Olimpos
  Yayınları"); yazarı hiç olmayan kayıtlar.
- **Eserin kapağı başka baskının olabiliyor.** "İnce Memed" eserinin kapağı, İngilizce çevirisinin ("They Burn the
  Thistles") iç kapak sayfasının taraması.

### Uygulamanın temizleme kuralları

Planın 6.3 bölümündeki dört kural ve bu ölçümün gerektirdiği ekler (`src/search/`, testleri kaydedilmiş gerçek
yanıtlarla):

1. Bozuk kodlamalı kayıt atılır.
2. Ad, eşleşen baskının adıdır. Yazılan metin tam olarak eserin adıysa eserin adı gösterilir ("sapiens" → "Sapiens";
   baskının adı "Hayvanlardan Tanrilara - Sapiens Insan Turunun Kisa Bir Tarihi"). Aynı adın birden çok yazımı varsa
   Türkçe harflerini en çok korumuş olan alınır.
3. Sondaki nokta ve katalog işaretleri silinir. Tamamı büyük harfli ad ve yazar düzeltilir.
4. Bir kayıt, `tur` etiketi ya da Türkiye ISBN'i ya da adında ğ, ş, ı, İ varsa Türkçedir. Türkçe adlarda her kelime
   büyük harfle başlar; ve, ile, ya, veya, yahut, ki, da, de, mı/mi/mu/mü küçük kalır (TDK'nin başlık kuralı).
5. Aynı ad ve aynı ilk yazar tek satırdır (Open Library'nin yazar kimliğiyle ya da adıyla). Yazarı olmayan kayıt aynı
   adlı ilk satıra katılır. Kapak ve ISBN, kendi kapağı olan ilk Türkçe kayıttan alınır; bütün ISBN'ler "Kitaplığında
   var" denetimi için tutulur.
6. Yazılan metindeki Türkçe harfler, kayıtta eksik olan kelimeyi tamamlar ("Dönüsüm" + "dönüşüm" → "Dönüşüm").
7. Yazar başka alfabedeyse Open Library'nin o yazar için tuttuğu öteki adlardan Latin harfli olanı alınır; çoğunun
   ortak kelimelerinden oluşan ad seçilir. Yayınevi ve "Kolektif" yazar sayılmaz. Tekrarlanan yazar bir kez yazılır.
8. Kapak baskının kendi kapağıdır. Baskının kapağı yoksa ve eser tek dildeyse eserin kapağı alınır; eser birkaç
   dildeyse kapak alınmaz, uygulamanın çizdiği kapak görünür.
9. Türkçe baskılar öne alınır, gerisi Open Library'nin sırasıyla kalır; en fazla 20 satır gösterilir.

Etkisi, planın 16 kitabında: adı harfi harfine doğru olan kayıt 7 / 16 iken uygulamada 16 / 16 (Türkçe harfsiz
yazınca da 10 / 10). Yazar 13 / 16 kitapta plandaki yazımla aynı.

### Bilinen sınırlar

- Yeni kitaplar katalogda yok (aşağıdaki iki tablo).
- ISBN ile aramada tek kayıt geldiği için yazım düzelmiyor: "Ask-i Memnu", "Ince Memed I", "Oguz Atay",
  "Yakup Kadri Karaosmanoglu". Kitap eklendikten sonra Düzenle'den düzeltilir.
- Yazar diye girilmiş çevirmen ayırt edilemiyor: "Benim Adım Kırmızı" için "Orhan Pamuk, Amankeldī Qūrmet" geliyor.
- Başka alfabedeki yazarın Türkçedeki yazımı gelmiyor: "Fedor Dostoievski", "Lev Tolstoi".
- Yalnızca yabancı yazar adıyla arama Türkçe baskı getirmiyor: "dostoyevski" aramasının ilk satırları "Double",
  "Der Idyot", "the idiot". Kitabın Türkçe adıyla arayınca Türkçe baskı geliyor.
- Planın 16 kitabından ikisi kapaksız: "Tehlikeli Oyunlar", "İnce Memed".
- M boyutu 180 px genişliğinde. Kitap sayfasındaki 120 px'lik kapak, 3× ekranda 360 px ister; kapak biraz yumuşak
  görünür. L boyutu bunu çözer ama kitap başına 30–53 KB tutar.

### Planın 16 kitabı, adıyla

| Yazılan | Ham sırası | Uygulamadaki sırası | Kayıttaki ad | Uygulamada görünen ad | Görünen yazar | Türkçe baskı | Kapak (M) | ISBN | Kayıt → satır | Süre |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Kürk Mantolu Madonna | 1. | 1. | Kürk Mantolu Madonna | Kürk Mantolu Madonna | Sabahattin Ali | evet | 13 KB | 9789753638029 | 23 → 8 | 2602 ms |
| Kuyucaklı Yusuf | 1. | 1. | Kuyucakli yusuf | Kuyucaklı Yusuf | Sabahattin Ali | evet | 22 KB | 9786055034887 | 23 → 6 | 564 ms |
| Saatleri Ayarlama Enstitüsü | 1. | 1. | Saatleri ayarlama enstitüsü. | Saatleri Ayarlama Enstitüsü | Ahmet Hamdi Tanpınar | evet | 21 KB | 9789759955762 | 10 → 7 | 850 ms |
| Tutunamayanlar | 1. | 1. | Tutunamayanlar | Tutunamayanlar | Oğuz Atay | evet | 12 KB | 9789754700114 | 12 → 7 | 475 ms |
| Tehlikeli Oyunlar | 1. | 1. | Tehlikeli oyunlar. | Tehlikeli Oyunlar | Oğuz Atay | evet | yok | 9789754702095 | 6 → 2 | 355 ms |
| İnce Memed | 1. | 1. | İnce Memed | İnce Memed | Yaşar Kemal | evet | yok | yok | 40 → 20 | 738 ms |
| Çalıkuşu | 1. | 1. | Çalıkuşu | Çalıkuşu | Reşat Nuri Güntekin | evet | 9 KB | 9789751000125 | 23 → 16 | 456 ms |
| Aşk-ı Memnu | 1. | 1. | Ask-i Memnu | Aşk-ı Memnu | Halit Ziya Uşaklıgil | evet | 17 KB | 9786058451728 | 20 → 8 | 740 ms |
| Yaban | 1. | 1. | Yaban. | Yaban | Yakup Kadri Karaosmanoğlu | evet | 16 KB | 9789754700060 | 40 → 20 | 883 ms |
| Benim Adım Kırmızı | 1. | 1. | Benim Adim Kirmizi | Benim Adım Kırmızı | Orhan Pamuk, Amankeldī Qūrmet | evet | 20 KB | 9789754707113 | 7 → 7 | 639 ms |
| Masumiyet Müzesi | 1. | 1. | Masumiyet Muzesi | Masumiyet Müzesi | Orhan Pamuk, Rafael Carpintero | evet | 16 KB | 9789750506093 | 11 → 9 | 503 ms |
| Serenad | 5. | 1. | Serenad | Serenad | Zülfü Livaneli | evet | 24 KB | 9786050900286 | 40 → 20 | 726 ms |
| Suç ve Ceza | 1. | 1. | Suç ve Ceza | Suç ve Ceza | Fedor Dostoievski | evet | 21 KB | 9786257907637 | 40 → 20 | 1191 ms |
| Simyacı | 1. | 1. | Simyacı | Simyacı | Paulo Coelho | evet | 7 KB | 9789750726439 | 35 → 20 | 593 ms |
| Sapiens | 1. | 1. | Hayvanlardan Tanrilara - Sapiens Insan Turunun Kisa Bir Tarihi | Sapiens | Yuval Noah Harari | evet | 20 KB | 9786055029357 | 40 → 20 | 711 ms |
| Beyaz Diş | 1. | 1. | Beyaz Dis | Beyaz Diş | Jack London | evet | 15 KB | 9789756841181 | 32 → 20 | 924 ms |

Doğru kitap ilk 5’te: 16 / 16 (%100). Adı harfi harfine doğru görünen: 16 / 16. Kapağı olan: 14 / 16.

"Ham sırası" Open Library'nin kendi sırası, "uygulamadaki sırası" tekrarlar birleştirilip Türkçe baskılar öne
alındıktan sonraki sıradır. "Kayıt → satır" gelen kayıt sayısı ve gösterilen satır sayısıdır.

### Aynı kitaplar, Türkçe harfler olmadan yazılınca

| Yazılan | Uygulamadaki sırası | Uygulamada görünen ad | Görünen yazar |
| --- | --- | --- | --- |
| kurk mantolu madonna | 1. | Kürk Mantolu Madonna | Sabahattin Ali |
| kuyucakli yusuf | 1. | Kuyucaklı Yusuf | Sabahattin Ali |
| saatleri ayarlama enstitusu | 1. | Saatleri Ayarlama Enstitüsü | Ahmet Hamdi Tanpınar |
| calikusu | 1. | Çalıkuşu | Reşat Nuri Güntekin |
| ask i memnu | 1. | Aşk-ı Memnu | Halit Ziya Uşaklıgil |
| benim adim kirmizi | 1. | Benim Adım Kırmızı | Orhan Pamuk, Amankeldī Qūrmet |
| masumiyet muzesi | 1. | Masumiyet Müzesi | Orhan Pamuk, Rafael Carpintero |
| suc ve ceza | 1. | Suç ve Ceza | Fedor Dostoievski |
| simyaci | 1. | Simyacı | Paulo Coelho |
| beyaz dis | 1. | Beyaz Diş | Jack London |

### Yalnızca yazar adıyla

| Yazılan | İlk 5’in kaçı o yazarın | İlk 5 satır | Kapaklı | Türkçe |
| --- | --- | --- | --- | --- |
| sabahattin ali | 4 / 5 | Kürk Mantolu Madonna; İçimizdeki Şeytan; Sabahattin Ali Tüm Eserleri; Kuyucaklı Yusuf; Sabahattin Âli Dosyasi | 4 | 5 |
| orhan pamuk | 5 / 5 | Benim Adım Kırmızı; Kar; Kara Kitap; İstanbul; Beyaz Kale | 4 | 5 |

### Planın 16 kitabı, satıştaki baskının ISBN'i ile

ISBN'ler kitapyurdu.com'un her kitap için ilk listelediği baskıdan alındı.

| Kitap | ISBN | Geçerli mi | Bulundu mu | Uygulamada görünen ad | Görünen yazar | Kapak (M) |
| --- | --- | --- | --- | --- | --- | --- |
| Kürk Mantolu Madonna | 9786257751520 | evet | hayır | — | — | — |
| Kuyucaklı Yusuf | 9786257751537 | evet | hayır | — | — | — |
| Saatleri Ayarlama Enstitüsü | 9786258437249 | evet | hayır | — | — | — |
| Tutunamayanlar | 9789754700114 | evet | evet | Tutunamayanlar | Oguz Atay | 12 KB |
| Tehlikeli Oyunlar | 9789754702095 | evet | evet | Tehlikeli Oyunlar | Oğuz Atay | yok |
| İnce Memed | 9789750807145 | evet | evet | Ince Memed I | Yaşar Kemal | 14 KB |
| Çalıkuşu | 9789751047236 | evet | hayır | — | — | — |
| Aşk-ı Memnu | 9789752207691 | evet | evet | Ask-i Memnu | Halit Ziya Uşaklıgil | 22 KB |
| Yaban | 9789754700060 | evet | evet | Yaban | Yakup Kadri Karaosmanoglu | 16 KB |
| Benim Adım Kırmızı | 9789750825927 | evet | evet | Benim Adım Kırmızı | Orhan Pamuk, Amankeldī Qūrmet | 26 KB |
| Masumiyet Müzesi | 9789750826146 | evet | evet | Masumiyet Müzesi | Orhan Pamuk | 19 KB |
| Serenad | 9789751042668 | evet | hayır | — | — | — |
| Suç ve Ceza | 9789754589023 | evet | evet | Suç ve Ceza | Fedor Dostoievski | 12 KB |
| Simyacı | 9789750726439 | evet | evet | Simyacı | Paulo Coelho | 7 KB |
| Sapiens | 9786055029357 | evet | evet | Hayvanlardan Tanrilara - Sapiens Insan Turunun Kisa Bir Tarihi | Yuval Noah Harari | 20 KB |
| Beyaz Diş | 9786257784627 | evet | hayır | — | — | — |

Bulunan: 10 / 16

### Son bir yılın çok satan edebiyat kitapları

kitapyurdu.com, Edebiyat, son 365 günün çok satanları, ilk 20.

| Kitap | Adıyla arayınca | Uygulamada görünen | Kapak | Satıştaki baskının ISBN’i | ISBN ile arayınca |
| --- | --- | --- | --- | --- | --- |
| Bekle Beni | yok | — | — | 9789750766091 | yok |
| Bahçıvan ve Ölüm | yok | — | — | 9786053164258 | yok |
| Altı Harfli Bir Tatlı | yok | — | — | 9786255683342 | yok |
| Algernon’a Çiçekler | 1. | Algernon'a Çiçekler — Daniel Keyes | evet | 9786054629862 | Algernon'a Cicekler — Daniel Keyes |
| Annemin Uyurgezer Geceleri | 1. | Annemin Uyurgezer Geceleri — Ayfer Tunç | evet | 9789750766329 | Annemin Uyurgezer Geceleri — Ayfer Tunç |
| Yaşamak | 1. | Yaşamak — Hua Yu | evet | 9786056587887 | Yaşamak — Hua Yu |
| Taş Kağıt Makas | yok | — | — | 9786258387711 | yok |
| Gece Yarısı Kütüphanesi | 1. | Gece Yarısı Kütüphanesi — Matt Haig | evet | 9786051981833 | Gece Yarısı Kütüphanesi — Matt Haig |
| Hamnet | 1. | Hamnet — Maggie O'Farrell | evet | 9786051982304 | yok |
| Söyleme Bilmesinler | yok | — | — | 9786256570597 | yok |
| Soygun | yok | — | — | 9786258521245 | yok |
| Saç Örgüsü | 1. | Saç Örgüsü — Laetitia Colombani | evet | 9786058276666 | Saç Örgüsü — Laetitia Colombani |
| Saatleri Ayarlama Enstitüsü | 1. | Saatleri Ayarlama Enstitüsü — Ahmet Hamdi Tanpınar | evet | 9786258437249 | yok |
| Aylardan Kasım Günlerden Perşembe | yok | — | — | 9786253695033 | yok |
| Sarı Yüz | 1. | Sarı Yüz — R. F. Kuang | evet | 9786052655634 | Sarı Yüz — R. F. Kuang |
| El Kızı | 1. | El Kızı — Orhan Kemal | evet | 9789752894662 | El Kızı — Orhan Kemal |
| İnsanlığımı Yitirirken | 1. | İnsanlığımı Yitirirken — Dazai Osamu | evet | 9786256475892 | İnsanlığımı Yitirirken — Dazai Osamu |
| Kocamın Karısı | yok | — | — | 9786256826830 | yok |
| Sırların Sırrı | yok | — | — | 9789752130678 | yok |
| Gece Yarısı Treni | yok | — | — | 9786051984445 | yok |

Adıyla ilk 5’te: 10 / 20. ISBN ile doğru adla bulunan: 8 / 20.

### Bu haftanın çok satanları

kitapyurdu.com, haftalık çok satanlar, ilk 15. Okulların açıldığı hafta olduğu için çoğu çocuk ve ilk gençlik kitabı.

| Kitap | Adıyla arayınca | Uygulamada görünen | Kapak | Satıştaki baskının ISBN’i | ISBN ile arayınca |
| --- | --- | --- | --- | --- | --- |
| Vatanın Kalbi | yok | — | — | 9786259029290 | yok |
| Benim İçin Bir Yıldız Sakla | yok | — | — | 9786259029283 | yok |
| Robonlar Bir Kaçış Operasyonu | yok | — | — | 9786259791128 | yok |
| Cumhuriyet’in İlk Sabahı | yok | — | — | 9786256989498 | yok |
| Müdürün Uçan Peruğu | yok | — | — | 9786258618136 | yok |
| Roma’nın Beş Günü | yok | — | — | 9789750868702 | yok |
| Gizli Dedektifler Okulu | yok | — | — | 9786259029221 | yok |
| Sözcüklerin Kamera Arkası | yok | — | — | 9786259834665 | yok |
| Kınalı Serçe | yok | — | — | 9786259506586 | yok |
| Telefon Melefon Yok | yok | — | — | 9786259621012 | yok |
| Muhabbet | yok | — | — | 9786256756205 | yok |
| Çıkmaz Sokağın Ressamı | yok | — | — | 9786259791135 | yok |
| İyilik Timi | yok | — | — | 9786259834658 | yok |
| Büyüdüm Ben! | yok | — | — | 9786259316550 | yok |
| Tutumlu Kedi Frida’nın Maceraları | yok | — | — | 9789751050625 | yok |

Adıyla ilk 5’te: 0 / 15. ISBN ile doğru adla bulunan: 0 / 15.

## Google Books

### İstek

```
https://www.googleapis.com/books/v1/volumes?q=<metin>&maxResults=20&printType=books
&fields=items(id,volumeInfo(title,authors,industryIdentifiers,imageLinks/thumbnail,language))&key=<anahtar>
```

ISBN yazılınca `q=isbn:<13 hane>`. Kitabın Google Books sayfası: `https://books.google.com/books?id=<id>`.

### Ölçülen davranış

| Ne | Sonuç |
| --- | --- |
| API'ye anahtarsız istek | HTTP 429, "Quota exceeded … Queries per day": anahtarsız istekler ortak bir kotadan düşüyor ve o kota dolu. Anahtar şart |
| Adres kısıtlı anahtar | İzinli adresten (`http://localhost:5175/`, `https://book.kitshelf.app/`) 200; adressiz ya da başka siteden 403 "Requests from referer … are blocked". Node betiği de `Referer` başlığını gönderince çalışıyor, ayrı bir anahtar gerekmiyor |
| API yanıtı tarayıcıdan | Okunuyor (CORS açık); 0,5–1,6 sn |
| Sonuç yokken | `{}` (içinde `items` yok) |
| Aynı soruya sıra | Değişebiliyor: "bekle beni" için ilk üç satır aynı kaldı, sonrakiler iki istek arasında değişti |
| `langRestrict=tr` | Fark yaratmıyor (adıyla ilk 5'te 13 / 16, 11 / 20, 2 / 15); kullanılmıyor, böylece başka dildeki kitap da bulunabiliyor |
| Kapak `fetch` (`books.google.com/books/content?…`) | **Başarısız**: CORS başlığı yok. `no-cors` ile gelen yanıtın içeriği okunamıyor |
| Kapak `<img>` olarak | Yükleniyor, 128×198 px |
| Kitabın bağlantıları | API'nin verdiği `infoLink`, satışta olan kitaplarda Play Store'a gidiyor; uygulama Google Books sayfasını kitabın kimliğinden kuruyor |
| Kayıtların hâli | Open Library'ye benziyor: tamamı büyük harf ("BEKLE BENİ — CEM ALCAN"), cümle düzeni ("Bekle beni"), Türkçe harfleri düşmüş adlar ("Gece Yarisi Kütüphanesi", "Sermin Yasar"), bozuk kaçış ("Maggie O&039;Farrell"), başka kitabın adını taşıyan kayıt ("Taş Kağıt Makas"ın ISBN'i "Nasıl Flört Edilmez" diye çıkıyor). Yazarın Türkçe yazımı burada var: "Fyodor Dostoyevski" |

Sonuç: Google kapağı indirilip `covers` deposuna yazılamaz (plan 6.4 onlar için uygulanamaz); yalnızca internet
varken gösterilir.

### Kullanım koşulları

[developers.google.com/books/branding](https://developers.google.com/books/branding) şunları istiyor:

- "The 'powered by Google' graphic must always be displayed alongside any search modules or results."
- "You must maintain prominent links to Google Books pages and features."
- "You may not reorder or otherwise alter the results returned by the Google Books API Family."
- Örnek uygulama için: "Google Search Results are not intermixed with third-party results."

Planın 6.2 bölümündeki yol (iki kaynağı birleştir, tekilleştir, kapaklı sonucu öne al) bunlara uymuyor. Uygulama bu
yüzden Google'ın sonuçlarını ayrı bir bölümde, Google'ın sırası ve yazımıyla, logosuyla ve her satırda Google Books
bağlantısıyla gösteriyor. Google'dan eklenen kitabın sayfasında da "Google Books’ta gör" bağlantısı var.

[developers.google.com/books/terms](https://developers.google.com/books/terms): "You may not charge users any fee for
the use of your application" (BookKit ücretsiz).

[developers.google.com/terms](https://developers.google.com/terms), 5.e: API'den gelen içerik için "create permanent
copies of such content" ve "modify" yasak, "unless expressly permitted by the content owner or by applicable law".
Uygulamanın yaptığı: kullanıcı bir Google sonucunu kitaplığına eklerse kitabın adını, yazarını, ISBN'ini ve Google
kimliğini cihazda saklar ve adın yazımını kitaplığın öteki kitapları gibi düzeltir ("BEKLE BENİ" → "Bekle Beni").
Bunlar kitabın künye bilgisi; kapak resmi saklanmaz. Koşulların bu maddesinin bir okurun kendi kitap kaydını kapsayıp
kapsamadığı bir hukuk sorusu; burada yalnızca not ediliyor.

Ayrıca: sonuçlar isteği yapanın IP adresine (ülkesine) göre kısıtlanıyor; günlük kota bir proje için ortak, yani bütün
kullanıcılar aynı kotadan yer. Kota dolunca API 429 döner, ücret çıkmaz; projeye fatura hesabı bağlı değil.

### Planın 16 kitabı

| Kitap | Adıyla arayınca | Kayıttaki ad ve yazar | Kapak | ISBN ile arayınca |
| --- | --- | --- | --- | --- |
| Kürk Mantolu Madonna | 1. | Kürk Mantolu Madonna — Sabahattin Ali | evet | yok |
| Kuyucaklı Yusuf | 1. | Kuyucaklı Yusuf — Sabahattin Ali | evet | Kuyucakli Yusuf — Sabahattin Ali |
| Saatleri Ayarlama Enstitüsü | 1. | Saatleri Ayarlama Enstitüsü — Ahmet Hamdi Tanpınar | evet | yok |
| Tutunamayanlar | 1. | Tutunamayanlar — Oğuz Atay | evet | Tutunamayanlar — Oğuz Atay |
| Tehlikeli Oyunlar | 1. | Tehlikeli oyunlar — Oğuz Atay | evet | Tehlikeli oyunlar — Oğuz Atay |
| İnce Memed | 18. | İnce Memed — Yaşar Kemal | hayır | yok |
| Çalıkuşu | 1. | Çalıkuşu — Reşat Nuri Güntekin, Necati Cumalı | evet | Calikusu — Resat Nuri Güntekin |
| Aşk-ı Memnu | 1. | Aşk-ı memnu — Halit Ziya Uşaklıgil | evet | Ask-i Memnu — Halit Ziya Uşaklıgil |
| Yaban | 1. | Yaban — Yakup Kadri Karaosmanoğlu | evet | yok |
| Benim Adım Kırmızı | 1. | Benim adım kırmızı — Orhan Pamuk | evet | Benim Adim Kirmizi — Orhan Pamuk |
| Masumiyet Müzesi | 1. | Masumiyet müzesi — Orhan Pamuk | hayır | Masumiyet müzesi — Orhan Pamuk |
| Serenad | yok | — | — | Serenad — Zülfü Livaneli |
| Suç ve Ceza | 1. | Suç ve Ceza — Fyodor Dostoyevski  | evet | Suç ve ceza — Fyodor Mihaylovic Dostoyevski, Fyodor Dostoyevsky |
| Simyacı | yok | — | — | Simyaci — Paulo Coelho |
| Sapiens | 2. | Hayvanlardan Tanrılara — Yuval N. Harari | evet | Hayvanlardan Tanrılara — Yuval N. Harari |
| Beyaz Diş | 7. | Beyaz Diş — Jack London | hayır | yok |

Adıyla ilk 5’te: 12 / 16. ISBN ile doğru adla bulunan: 11 / 16. Kapağı olan: 13 / 16.

### Son bir yılın çok satan edebiyat kitapları

| Kitap | Adıyla arayınca | Kayıttaki ad ve yazar | Kapak | ISBN ile arayınca |
| --- | --- | --- | --- | --- |
| Bekle Beni | 3. | Bekle beni — Zülfü Livaneli | hayır | Bekle beni — Zülfü Livaneli |
| Bahçıvan ve Ölüm | 4. | Bahçıvan ve ölüm — Georgi Gospodinov | hayır | Bahçıvan ve ölüm — Georgi Gospodinov |
| Altı Harfli Bir Tatlı | 4. | Altı harfli bir tatlı — Şermin Yaşar | hayır | Altı harfli bir tatlı — Şermin Yaşar |
| Algernon’a Çiçekler | 1. | Algernon'a çiçekler — Daniel Keyes, N. Ekrem Düzen | hayır | Algernona Cicekler — Daniel Keyes |
| Annemin Uyurgezer Geceleri | 4. | Annemin uyurgezer geceleri — Ayfer Tunç | hayır | Annemin uyurgezer geceleri — Ayfer Tunç |
| Yaşamak | 20. | Yasamak — Yu Hua | hayır | Yasamak — Yu Hua |
| Taş Kağıt Makas | yok | — | — | adı farklı: Nasıl Flört Edilmez — Alice Feeney, Denise Williams |
| Gece Yarısı Kütüphanesi | 5. | Gece Yarisi Kütüphanesi — Matt Haig | hayır | yok |
| Hamnet | 2. | Hamnet — Maggie O'Farrell | evet | Hamnet — Maggie O&039;Farrell |
| Söyleme Bilmesinler | 13. | Söyleme Bilmesinler — Sermin Yasar | hayır | Söyleme Bilmesinler — Sermin Yasar |
| Soygun | yok | — | — | Soygun — İskender Pala |
| Saç Örgüsü | yok | — | — | Sac Örgüsü — Laetitia Colombani |
| Saatleri Ayarlama Enstitüsü | 1. | Saatleri Ayarlama Enstitüsü — Ahmet Hamdi Tanpınar | evet | yok |
| Aylardan Kasım Günlerden Perşembe | 1. | Aylardan kasım günlerden Perşembe — Ayşe Kulin | hayır | Aylardan kasım günlerden Perşembe — Ayşe Kulin |
| Sarı Yüz | yok | — | — | Sarı yüz — Rebecca F. Kuang |
| El Kızı | yok | — | — | El Kizi — Orhan Kemal |
| İnsanlığımı Yitirirken | 1. | Insanligimi Yitirirken — Osamu Dazai | hayır | yok |
| Kocamın Karısı | yok | — | — | yok |
| Sırların Sırrı | 3. | Sırların Sırrı — Dan Brown | evet | Sırların Sırrı — Dan Brown |
| Gece Yarısı Treni | yok | — | — | yok |

Adıyla ilk 5’te: 11 / 20. ISBN ile doğru adla bulunan: 14 / 20. Kapağı olan: 5 / 20.

"Taş Kağıt Makas"ın ISBN'i başka bir kitabın adıyla çıkıyor; sayılmadı.

### Bu haftanın çok satanları

| Kitap | Adıyla arayınca | Kayıttaki ad ve yazar | Kapak | ISBN ile arayınca |
| --- | --- | --- | --- | --- |
| Vatanın Kalbi | yok | — | — | yok |
| Benim İçin Bir Yıldız Sakla | yok | — | — | yok |
| Robonlar Bir Kaçış Operasyonu | yok | — | — | yok |
| Cumhuriyet’in İlk Sabahı | 1. | Cumhuriyetin Ilk Sabahi — Ilber Ortayli, Sermin Yasar | hayır | yok |
| Müdürün Uçan Peruğu | yok | — | — | yok |
| Roma’nın Beş Günü | yok | — | — | yok |
| Gizli Dedektifler Okulu | yok | — | — | yok |
| Sözcüklerin Kamera Arkası | yok | — | — | yok |
| Kınalı Serçe | yok | — | — | adı farklı: Red Sparrow (Turkiska) — Şermin Yaşar, İlber Ortaylı |
| Telefon Melefon Yok | yok | — | — | yok |
| Muhabbet | yok | — | — | yok |
| Çıkmaz Sokağın Ressamı | yok | — | — | yok |
| İyilik Timi | 1. | Iyilik Timi — Metin Özdamarlar | hayır | Iyilik Timi — Metin Özdamarlar |
| Büyüdüm Ben! | yok | — | — | yok |
| Tutumlu Kedi Frida’nın Maceraları | yok | — | — | yok |

Adıyla ilk 5’te: 2 / 15. ISBN ile doğru adla bulunan: 1 / 15. Kapağı olan: 0 / 15.

## Ölçülmeyenler

- Telefonlarda davranış (iPhone Safari, Android Chrome): arama ve kapak indirme yalnızca masaüstü Chrome'da denendi.
- Tolga'nın kendi kitaplarından 4 ISBN: `node scripts/compare-sources.mjs <isbn> …` ile eklenir.
- Google'ın günlük kotasının sayısı: konsolda (Books API › Quotas) görülür; ölçüm günü yaklaşık 250 istek sorunsuz geçti.
