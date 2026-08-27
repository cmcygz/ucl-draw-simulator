# DrawLab

**Canlı: https://drawer.win/**

Avrupa kupalarının 36 takımlı lig aşamasını kuradan puan tablosuna kadar üreten
simülatör. Şampiyonlar Ligi, Avrupa Ligi ve Konferans Ligi.

| Turnuva | Torba | Maç | Ev/Dep | Hafta |
|---|---|---|---|---|
| Şampiyonlar Ligi | 4 x 9 | 8 | 4/4 | 8 |
| Avrupa Ligi | 4 x 9 | 8 | 4/4 | 8 |
| Konferans Ligi | 6 x 6 | 6 | 3/3 | 6 |

## Barındırma

Cloudflare Worker hem siteyi hem API'yi sunuyor, yani her şey tek origin'de.
Alan adı `drawer.win`, Worker'a custom domain olarak bağlı; `www.drawer.win` de
aynı içeriği veriyor.

Cloudflare Pages denendi ve elendi: `*.pages.dev` Türkiye'de ISS seviyesinde
engelli, DNS Cloudflare yerine bir Türk Telekom IP'sine (213.14.227.50)
yönlendiriyor ve bağlantı kurulmuyor. `workers.dev` ve custom domain engelli değil.

Şampiyonlar Ligi'nin yeni 36 takımlı lig aşamasını kuradan puan tablosuna kadar üreten
bağımsız Python projesi. Harici bağımlılık yok, sadece standart kütüphane.

## Dosyalar

| Dosya | İçerik |
|---|---|
| `teams_2026_27.json` | 36 takım, ülke, torba, rating. UEFA'nın 26.08.2026 resmi torba listesi |
| `draw.py` | Kura motoru: rakip ataması, ic saha/deplasman, hafta ataması, doğrulama |
| `simulate.py` | Maç sonucu üretimi, puan tablosu, Monte Carlo |


## Web arayüzü

`index.html` tek dosya, sunucu gerekmiyor. Çift tıkla açılır. Kura motoru JS'e
port edildi, tarayıcıda çalışıyor (bir kura ~150 ms).

| Dosya | İçerik |
|---|---|
| `index.html` | Derlenmiş tek dosya site (dağıtılacak olan bu) |
| `engine.js` | Kura + simülasyon motoru, JS portu |
| `ui.part.html` | Stiller |
| `i18n.part.js` | İngilizce/Türkçe sözlük ve çeviri yardımcıları |
| `app.part.js` | Görünümler ve etkileşim |
| `build.py` | Dördünü birleştirip `index.html` üretir |

```bash
python3 build.py      # parçaları değiştirdikten sonra
```

Sekmeler: **Matris** (36x36 fikstür ızgarası, dolu kare iç saha, çerçeveli kare
deplasman, renk rakibin torbası), **Çekiliş**, **Takımlar** (listeden ya da karta
tıklayarak tek takımın fikstürü), **Haftalar**, **Puan tablosu**, **Olasılıklar**
(Monte Carlo), **Kayıtlar**.

### Çekiliş töreni

**Çekiliş yapılmadan fikstür görünmez.** Temiz bir ziyarette site Çekiliş
sekmesiyle açılır; Matris, Takımlar, Haftalar ve Puan tablosu "kura henüz
çekilmedi" der. Her top çekildiğinde o takımın sekiz eşleşmesi açılır ve diğer
sekmelerde belirir, yani kura ilerledikçe fikstür parça parça ortaya çıkar.

**Yeni kura** Çekiliş sekmesini açar ve topları kapatır. **Rastgele** eşleşmeleri
anında hazırlar, Çekiliş sekmesi sonucu gösterir ama tıklanamaz. Kura bir kez
tamamlandıktan sonra sekme sonucu göstermeye devam eder, tekrar çekilemez.
Adreste tohum olan bir link (paylaşılmış kura) doğrudan açık gelir.

Dört torba, torba başına 9 **kapalı** top. Topların üzerinde takım yazmaz; hangi
takımı çektiğin ancak top açılınca belli olur.

**Varsayılan mod elle seçim:** bir torbadaki herhangi bir topa tıklarsın, o
torbada kalanlar arasından **rastgele** bir takım çıkar (`Math.random`), top
üzerinde takımın kodu belirir, takım sahneye gelir ve sekiz rakibi tek tek
açılır. Bitince sıradaki topu seçersin. Çekiliş sürerken diğer toplar kilitlenir.
Bir torbadan çekilen top her zaman o torbanın takımıdır.

**Hepsini otomatik çek** kalan takımları çeker: torba 1'den başlar, her torbanın
içinde rastgele ilerler. Bu modda duraklat ve sonuca atla vardır. Elle başlayıp
otomatiğe devam etmek mümkündür, otomatik kaldığı yerden sürer. Sonuca atlandığında
kalan bütün toplar açılır ve torbalarda kimin nerede olduğu görünür.

Hız 1x/2x/4x. 1x'te tek takım yaklaşık 4.7 saniye sürer (top 0.9 sn çalkalanır,
takım 0.7 sn sahnede bekler, her rakip 0.42 sn arayla açılır). **Baştan al**
torbaları sıfırlar.

Bu bir **canlandırma**: kura zaten hesaplanmıştır, tören onu tekrar oynatır.
Kısıt çözücü canlı çalışmaz, dolayısıyla gerçek çekilişteki gibi bir fizibilite
kontrolü ya da tıkanma ihtimali yoktur. Yeni kura çekilince tören sıfırlanır.
`prefers-reduced-motion` açıksa animasyonlar kapanır.

### Turnuva teması

Her turnuvanın kendi vurgu rengi var: Şampiyonlar Ligi `#1B4FB0`, Avrupa Ligi
`#A84A00`, Konferans Ligi `#0B6136`. Vurgu yalnızca kromda kullanılıyor — aktif
turnuva segmenti, sekme altı çizgisi, başlık kuralı, puan tablosundaki ilk-8
bandı ve olasılık çubuğu.

**Torba renkleri turnuvadan turnuvaya değişmiyor**, çünkü onlar süs değil veri:
matriste, kartlarda, odak tablosunda ve çekiliş toplarında rakibin hangi
torbadan olduğunu taşıyorlar. Turnuva başına değiştirmek hem kodlamayı bozar
(UEL turuncusu torba 3 amber'ıyla karışır) hem de kullanıcıyı her geçişte
yeniden öğrenmeye zorlar.

Renkler beyaz yazıyla kontrast ölçülerek seçildi: sırasıyla 7.52, 5.76 ve 7.56,
üçü de WCAG AA eşiğinin (4.5) üzerinde. Avrupa Ligi için parlak turuncu yerine
koyu turuncu alındı; parlak olan 3.37'de kalıyordu.

Zemin de turnuvaya göre ton değiştiriyor: Şampiyonlar Ligi soğuk gri-mavi
(`#E4EAEE`), Avrupa Ligi sıcak krem (`#EEE9E4`), Konferans Ligi nane (`#E4EEE7`).
Yalnızca ton kaydırıldı, açıklık ve doygunluk sabit tutuldu; bu yüzden metin
kontrastı üç temada da 14.5 civarında ve en zayıf torba rengi 3.0 eşiğinin
üstünde kalıyor. Metin renkleri bilerek kaydırılmadı — onları da döndürmek ipucu
yazılarının kontrastını 2.63'ten 2.38'e düşürüyordu.

### Dil

Arayüz İngilizce ve Türkçe. **Varsayılan İngilizce**; başlıktaki seçiciden
değiştirilir ve tercih `localStorage`'da (`ucl:lang`) saklanır. Dil değişimi
kurayı, tahminleri ve skorları korur, yalnızca metinleri yeniden çizer.

Sözlük `i18n.part.js` içinde tek bir nesnede duruyor. Statik metinler HTML'de
`data-i18n` / `data-i18n-ph` / `data-i18n-aria` imleriyle, dinamik metinler
`tx('anahtar', { degisken })` çağrısıyla çevriliyor. Çeviri fonksiyonu `t` değil
`tx`, çünkü kodda `t` zaten takım nesnesi için kullanılıyor.

### Tohum adreste

Adresin sonundaki `#2027` o anki tohumu taşır. Link paylaşıldığında karşı taraf
aynı fikstürü görür; kura her yeni çekilişte adres de güncellenir.

```
https://drawer.win/#ucl-2027
```

### Kendi tahminin

Haftalar sekmesindeki skor kutularına elle skor yazılabilir. Kural: **kullanıcı
tahmini simülasyonu ezer.** Puan tablosu ve takım fikstür paneli, tahmin girilmiş
maçlarda tahmini, kalanlarda (sezon oynandıysa) simülasyon skorunu kullanır.
Yalnızca tahmin girilmişse tablo sadece o maçlar üzerinden hesaplanır.

**Skorları doldur** butonu boş kutuları modelin ürettiği skorlarla doldurur:
rating farkı ve iç saha avantajı Poisson gol beklentisine çevrilir, skor oradan
çekilir. Elle girilmiş skorlara dokunmaz. 200 çalıştırmanın ortalamasında en güçlü
9 takım 16.3, en zayıf 9 takım 6.4 puan topluyor; iç sahada maç başına 1.96,
deplasmanda 1.27 gol atılıyor.

Deterministik alternatifler denendi ve elendi: beklenen golün tabanı maçların
%53'ünü berabere yapıyor, yuvarlanmışı %4'ünü; ikisi de 144 maça yalnızca 7 farklı
skor dağıtıyor. Örnekleme 30+ farklı skor üretiyor ve maç başına gol sayısı
gerçeğe daha yakın. Bilinen sapma: bağımsız Poisson beraberliği az üretiyor
(%15, gerçekte ~%25).

### Kura değişince her şey sıfırlanır

Yeni kura başka bir fikstür demektir, dolayısıyla tahminler ve simülasyon skorları
o anda silinir. Tahminler tarayıcıda saklanmaz; kalıcı olmasını istiyorsan
**Fikstürü kaydet** demen gerekir, tek kalıcı depo odur.

Ekranda kaydedilmemiş skor varken kurayı değiştirecek her işlem (Yeni kura,
Rastgele, adres çubuğundan tohum değiştirme, listeden başka bir kaydı açma) önce
uyarır ve kaç maçın silineceğini söyler. İptal edilirse mevcut fikstür ve skorlar
olduğu gibi kalır. Kaydettikten sonra uyarı çıkmaz.

### Kayıtlar

Kayıtlar sekmesi bir kurayı adlandırıp saklar: turnuva + tohum + o an ekranda geçerli olan
tüm maç skorları + hangilerinin kullanıcı tahmini olduğu. Kayıt açıldığında kura
tohumdan yeniden üretilir, skorlar üstüne yerleştirilir, tahmin işaretleri korunur.

Liste herkese açıktır: kaydı olan herkes listeyi görür ve açar. Silme yetkisi
kaydı oluşturan tarayıcıya aittir — kayıt anında dönen token `localStorage`'da
`ucl:tokens` altında tutulur. Hesap ve giriş yok.

Kaydeden iki yol var: Haftalar sekmesindeki **Fikstürü kaydet** (ad sorar, kaydeder,
paylaşım linkini hemen gösterir) ve Kayıtlar sekmesindeki form. İkisi de kayıttan
sonra linki üretir; listedeki her satırın **Link** butonu da aynı adresi kopyalar.

```
https://drawer.win/#k=ysjgzzsv
```

Bu adres açıldığında kayıt sunucudan çekilir, kura tohumdan yeniden üretilir,
skorlar yerleştirilir ve puan tablosu sekmesi açılır.

## Kayıt sunucusu (`api/`)

Cloudflare Worker + D1 (serverless SQLite). Site GitHub Pages'te kalır, sadece
API ayrı origin'dedir ve CORS ile açılır.

| Uç | İş |
|---|---|
| `GET /api/saves` | Son 60 kayıt (payload'sız özet) |
| `GET /api/saves/:id` | Tek kaydın tamamı |
| `POST /api/saves` | Yeni kayıt (`comp` alanı turnuvayı taşır), `{id, token}` döner |
| `DELETE /api/saves/:id` | `X-Save-Token` başlığı doğruysa siler |

Sunucu tarafı sınırlar: gövde 64 KB, ad 60 karakter, en fazla 200 maç, gol 0-99,
tohum 1-999999, IP özeti başına saatte 30 kayıt. `token` hiçbir listeleme veya
detay yanıtında dönmez. CORS yalnızca `ALLOWED_ORIGINS` içindeki kaynaklara açıktır.

IP'ler ham saklanmaz; hız sınırı için `IP_SALT` secret'ıyla tuzlanmış SHA-256
özetinin ilk 8 baytı tutulur.

```bash
cd api
npx wrangler@3 d1 create ucl-draw-saves          # database_id'yi wrangler.toml'a yaz
npx wrangler@3 d1 execute ucl-draw-saves --remote --file=schema.sql
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))" \
  | npx wrangler@3 secret put IP_SALT
npx wrangler@3 deploy
```

Worker adresi `app.part.js` içindeki `API` sabitine yazılır. Sabit boş bırakılırsa
Kayıtlar sekmesi "yapılandırılmadı" der, sitenin geri kalanı çalışmaya devam eder.

`wrangler@3` kullanılıyor çünkü 4.x Node 22+ istiyor.

## Kullanım (Python)

```bash
python3 draw.py --seed 42                      # tüm takımların fikstürü
python3 draw.py --seed 42 --team fenerbahce    # tek takım
python3 draw.py --seed 42 --json out.json      # dışa aktar
python3 simulate.py --seed 3                   # tek sezon + puan tablosu
python3 simulate.py --mc 500                   # 500 sezon olasılık dağılımı
```

## Modellenen kurallar

1. 36 takım, 4 torba x 9
2. Her takım her torbadan 2 rakip: 1 iç saha + 1 deplasman (8 maç, 4H/4A)
3. Aynı ülkeden takımlar eşleşemez (`allow_same_country` ile kapatılabilir)
4. Bir takım aynı ülkeden en fazla 2 rakiple eşleşir
5. Aynı fikstür aynı ev sahibiyle üst üste 3 sezon tekrarlanamaz
   (`banned_home_fixtures` listesine `["liverpool","real"]` gibi ekle)
6. Politik/coğrafi yasaklar (`forbidden_pairs`)
7. 8 hafta, her takım haftada 1 maç
8. 3 hafta üst üste aynı sahada oynamama (mümkün olmazsa otomatik gevşetilir)

## Algoritma

**Rakip ataması.** Kısıt tatmin problemi. MRV heuristiği (en az seçeneği kalan
takım-torba slotu önce çözülür) + ileri bakış budaması + backtracking + rastgele
yeniden başlatma. Ortalama 60 ms.

**İç saha/deplasman.** Her (torbaA, torbaB) bloğu 2-regular bir graftır, yani ayrık
döngülere ayrılır. Bir döngüyü tek yönde dolaşmak her takıma tam 1 iç saha + 1
deplasman verir. Her döngünün 2 yönü vardır; yasaklı fikstürü bozan yön çevrilir.

**Hafta ataması.** Fikstür grafı 8-regular. Her hafta = bu grafın bir mükemmel
eşleşmesi (18 maç, her takım tam 1 kez). Haftalar sırayla kurulur ve her hafta
3-üst-üste kuralını bozacak maçlar aday listesinden elenir.

Denenip elenen yaklaşımlar:
- Maç maç backtracking ile 8 renkli kenar boyama: 40-200 saniye, kullanılamaz
- Swap tabanlı yerel arama (min-conflicts): yerel minimumda takılıyor
- Önce 8 eşleşmeye ayır, sonra haftaları sırala: 36 takım için **hiçbir**
  permütasyon 3-üst-üste kuralını sağlamıyor (200 denemede 0 başarı). Bu yüzden
  kısıt eşleşme aşamasına gömülü.

## Gol modeli

`simulate.py` içindeki Poisson modeli **kalibre edilmemiş**. Rating farkını log-gol
oranına çeviriyor, iç saha avantajı sabit. Ciddi tahmin istiyorsan gerçek xG veya
Dixon-Coles ile değiştir; `expected_goals()` tek fonksiyon, kolay değişir.

## Eksikler

- Disiplin puanı sıralama kriteri simüle edilmiyor
- UEFA'nın TV/güvenlik kaynaklı hafta kısıtları yok (aynı şehirdeki iki kulübün
  aynı gün iç saha oynamaması, salı/çarşamba dağılımı, saat dilimi kuralları)
- Gerçek kura bir yazılım tarafından sırayla ve fizibilite kontrollü yapılır;
  buradaki dağılım gerçek kuranınkiyle birebir aynı değildir
