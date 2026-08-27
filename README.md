# UCL Lig Aşaması Simülatörü

**Canlı: https://cmcygz.github.io/ucl-draw-simulator/**

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
| `app.part.js` | Görünümler ve etkileşim |
| `build.py` | Üçünü birleştirip `index.html` üretir |

```bash
python3 build.py      # parçaları değiştirdikten sonra
```

Sekmeler: **Matris** (36x36 fikstür ızgarası, dolu kare iç saha, çerçeveli kare
deplasman, renk rakibin torbası), **Takımlar** (listeden ya da karta tıklayarak
tek takımın fikstürü), **Haftalar**, **Puan tablosu**, **Olasılıklar** (Monte Carlo).

### Tohum adreste

Adresin sonundaki `#2027` o anki tohumu taşır. Link paylaşıldığında karşı taraf
aynı fikstürü görür; kura her yeni çekilişte adres de güncellenir.

```
https://cmcygz.github.io/ucl-draw-simulator/#2027
```

### Kendi tahminin

Haftalar sekmesindeki skor kutularına elle skor yazılabilir. Kural: **kullanıcı
tahmini simülasyonu ezer.** Puan tablosu ve takım fikstür paneli, tahmin girilmiş
maçlarda tahmini, kalanlarda (sezon oynandıysa) simülasyon skorunu kullanır.
Yalnızca tahmin girilmişse tablo sadece o maçlar üzerinden hesaplanır.

Tahminler tarayıcının `localStorage`'ında **tohum başına** saklanır
(`ucl:picks:<tohum>`), yani başka bir kuraya geçip geri dönünce yerinde durur.
Sunucuya gitmez, cihaz ve tarayıcı dışına çıkmaz.

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
