// ---------------------------------------------------------------------------
// Diller
// ---------------------------------------------------------------------------
const I18N = {
  en: {
    'html.lang': 'en',
    'locale': 'en-GB',
    'doc.title': 'DrawLab · European league phase draw simulator',
    'brand': 'DrawLab',
    'bar.comp': 'competition',
    'comp.ucl': 'Champions League',
    'comp.uel': 'Europa League',
    'comp.uecl': 'Conference League',
    'comp.soon': 'not drawn yet',
    'comp.awaiting': 'waiting for the draw',
    'comp.notDrawn': 'The {comp} draw has not been held yet ({date}). '
      + 'Once UEFA publishes the pots the competition opens here.',
    'months': ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
               'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],

    'head.phase': 'league phase',
    'head.clubs': '{n} clubs',
    'head.matches': '{n} matches',
    'head.weeks': '{n} matchdays',
    'head.lede': 'The new league phase has no groups. Every club draws two opponents from '
      + 'each of the four pots, playing one at home and one away. This page reproduces that '
      + 'draw under the real constraints, then simulates the season.',

    'bar.lang': 'language',
    'bar.redraw': 'New draw',
    'bar.random': 'Random',
    'bar.play': 'Play season',

    'tab.matrix': 'Matrix',
    'tab.draw': 'Draw',
    'tab.teams': 'Clubs',
    'tab.matchdays': 'Matchdays',
    'tab.table': 'Standings',
    'tab.probs': 'Odds',
    'tab.saves': 'Saves',

    'legend.home': 'home',
    'legend.away': 'away',
    'legend.pot1': 'Pot 1',
    'legend.pot2': 'Pot 2',
    'legend.pot3': 'Pot 3',
    'legend.pot4': 'Pot 4',

    'status.preparing': 'preparing the draw',
    'status.drawing': 'Drawing…',
    'status.failed': 'No valid draw found, try another seed.',
    'status.violation': 'Rule violated: {msg}',
    'status.ok': '{matches} matches · all rules satisfied',

    'discard.confirm': 'This fixture has {n} unsaved match scores.\n\n'
      + 'A new draw wipes all of them. If you want to keep them, use "Save fixture" first.'
      + '\n\nContinue anyway?',

    'pot': 'Pot {n}',
    'venue.home': 'home',
    'venue.away': 'away',
    'tip.pick': 'your prediction',
    'tip.sim': 'simulation',

    'detail.hint': 'Pick a club: every filled square in its row is a match. '
      + 'Solid square means home, outlined means away. Colour shows the opponent\'s pot.',
    'detail.meta': '{country} · Pot {pot} · {n} home / {n} away',
    'detail.doubled': 'two opponents from {list}',
    'matrix.rowTitle': 'Show {team} fixtures',
    'matrix.cellHome': 'MD{md} · {home} - {away} (home)',
    'matrix.cellAway': 'MD{md} · {home} - {away} (away)',

    'teams.pickLabel': 'Select a club',
    'teams.all': 'All clubs',
    'teams.allOption': 'All clubs',
    'teams.hint': 'pick from the list or click a card',
    'teams.hintSelected': 'the same club is selected on the Matrix tab',
    'teams.cardTitle': 'Open {team} fixtures',
    'focus.homeAway': '{n} home / {n} away',
    'focus.record': '{n} matches · {w}W {d}D {l}L · {gf}-{ga} · {pts} pts',
    'focus.col.md': 'MD',
    'focus.col.date': 'Date',
    'focus.col.venue': 'Venue',
    'focus.col.opponent': 'Opponent',
    'focus.col.country': 'Country',
    'focus.col.pot': 'Pot',
    'focus.col.score': 'Score',

    'md.week': 'Matchday {n}',
    'md.autofill': 'Fill in scores',
    'md.saveFixture': 'Save fixture',
    'md.clear': 'Clear predictions',
    'md.goalHome': 'home goals prediction',
    'md.goalAway': 'away goals prediction',
    'md.countNone': 'type your own scores in the boxes and the standings will follow them',
    'md.countSome': 'you filled {n} of {total} matches · the standings use them',
    'md.filled': '{n} matches filled by the model.',
    'md.filledKept': '{n} matches filled by the model, your {kept} entries untouched.',
    'md.allFull': 'No empty boxes left, everything was already filled.',
    'md.clearConfirm': 'All your predictions for this draw will be deleted. Continue?',
    'md.savePrompt': 'Name this save:',
    'md.saveDefault': 'Draw {seed}',

    'table.hint': 'Play season: every match is generated with the Poisson model and the '
      + 'table is ordered by the UEFA criteria. You can also type your own predictions '
      + 'on the Matchdays tab.',
    'table.col.pos': '#',
    'table.col.club': 'Club',
    'table.col.p': 'P',
    'table.col.w': 'W',
    'table.col.d': 'D',
    'table.col.l': 'L',
    'table.col.gf': 'GF',
    'table.col.ga': 'GA',
    'table.col.gd': 'GD',
    'table.col.pts': 'Pts',
    'src.mixed': '{picked} matches your prediction · {sim} matches simulated',
    'src.allPicks': 'Table built entirely from your {picked} predictions.',
    'src.picksOnly': 'Table built from your {picked} predictions only, the rest were not played.',
    'src.simOnly': '{played} matches simulated · type predictions in the boxes and the table will use them',
    'bands.q': '1-8 straight to the last 16',
    'bands.po': '9-24 play-off',
    'bands.out': '25-36 eliminated',

    'probs.modeFixed': 'This draw fixed · 3000 seasons',
    'probs.modeRedraw': 'New draw each season · 120 seasons',
    'probs.run': 'Calculate',
    'probs.press': 'Press Calculate.',
    'probs.working': 'Calculating… {done}/{total} seasons',
    'probs.hintFixed': '{total} seasons with this draw held fixed. Fixture luck is not accounted for.',
    'probs.hintRedraw': '{total} seasons, redrawing the fixture every season. Small sample, swings by a few points.',
    'probs.legend': 'top 8  ·  play-off  ·  out',
    'probs.avg': 'avg pts',
    'probs.tooltip': 'top 8: {q}% · play-off: {p}%',

    'draw.auto': 'Auto-draw everything',
    'draw.autoRemaining': 'Auto-draw remaining {n}',
    'draw.drawing': 'Drawing…',
    'draw.pause': 'Pause',
    'draw.resume': 'Resume',
    'draw.skipTeam': 'Speed up this club',
    'draw.skipAll': 'Skip to the end',
    'draw.reset': 'Start over',
    'draw.speed': 'speed',
    'draw.notYet': 'The draw has not been made yet. Pull the balls from the pots and the '
      + 'fixtures will appear as each club comes out.',
    'draw.partial': '{n} of {total} clubs drawn so far. Keep going to reveal the rest.',
    'draw.goToDraw': 'Go to the draw',
    'draw.alreadyDone': 'Draw complete \u00b7 {teams} clubs, {matches} matches. '
      + 'Use "New draw" for a fresh one.',
    'draw.intro': 'The balls are closed. Draw one from a pot — you cannot tell which club it '
      + 'holds; a random one of the remaining clubs in that pot comes out and its eight '
      + 'opponents appear one by one.',
    'draw.ballLabel': 'Draw a ball from Pot {n}',
    'draw.ballTitle': 'Pot {n} · draw a ball',
    'draw.ballDrawn': '{team} drawn',
    'draw.spinning': 'Pot {pot} · shaking the ball…',
    'draw.opening': '{n}/{total} · {team} drawn, opponents coming up…',
    'draw.teamDone': '{n}/{total} · {team} complete · {h} home, {h} away',
    'draw.next': '{n}/{total} drawn · pick the next ball or let it run automatically',
    'draw.finished': 'All {teams} balls drawn · {matches} matches ready. The Matrix and Matchdays tabs have the details.',
    'draw.opponentsOf': '{country} · Pot {pot} · drawing {n} opponents',

    'saves.nameLabel': 'name',
    'saves.namePlaceholder': 'e.g. Arsenal treble run',
    'saves.saveBtn': 'Save this draw',
    'saves.reload': 'Refresh list',
    'saves.notConfigured': 'The save server is not configured.',
    'saves.needName': 'give the save a name',
    'saves.needScores': 'nothing to save, fill in the scores first',
    'saves.saving': 'Saving…',
    'saves.saved': 'Saved · {total} matches, {picks} of them your predictions.',
    'saves.saveFailed': 'Could not save: {msg}',
    'saves.loading': 'Loading saves…',
    'saves.listFailed': 'Could not load the list: {msg}',
    'saves.empty': 'No saves yet. Make a draw, play the season, then save it.',
    'saves.meta': '{comp} · {matches} matches · {picks} predictions · {date}',
    'saves.open': 'Open',
    'saves.link': 'Link',
    'saves.delete': 'Delete',
    'saves.opening': 'Opening the save…',
    'saves.openingShared': 'Opening the shared save…',
    'saves.opened': 'Opened: {name} · {comp} · {matches} matches',
    'saves.openFailed': 'Could not open: {msg}',
    'saves.openFailedShared': 'Could not open the shared save: {msg}',
    'saves.notYours': 'This save is not yours.',
    'saves.deleteConfirm': 'This save will be deleted permanently. Continue?',
    'saves.deleted': 'Save deleted.',
    'saves.deleteFailed': 'Could not delete: {msg}',
    'share.label': 'Share link · whoever opens it sees this draw and these scores',
    'share.copy': 'Copy',
    'share.copied': 'Copied',
    'share.fallback': 'Copy the link:',

    'footer.l1': 'Pots follow UEFA\'s official list of 26.08.2026. Ratings and the Poisson goal '
      + 'model are uncalibrated guesses; the odds should not be treated as real predictions.',
    'footer.l2': 'Rules applied: no same-country pairings, at most 2 opponents from one country, '
      + '1 home + 1 away from each pot, one match per matchday, no 3 consecutive matches at the same venue.',
    'footer.l3': 'Not modelled: disciplinary tiebreaker, TV and security matchday constraints, '
      + 'the distribution of UEFA\'s actual draw software.'
  },

  tr: {
    'html.lang': 'tr',
    'locale': 'tr-TR',
    'doc.title': 'DrawLab · Avrupa kupaları lig aşaması kura simülatörü',
    'brand': 'DrawLab',
    'bar.comp': 'turnuva',
    'comp.ucl': 'Şampiyonlar Ligi',
    'comp.uel': 'Avrupa Ligi',
    'comp.uecl': 'Konferans Ligi',
    'comp.soon': 'kura çekilmedi',
    'comp.awaiting': 'kura bekleniyor',
    'comp.notDrawn': '{comp} kurası henüz çekilmedi ({date}). '
      + 'UEFA torbaları yayımlayınca turnuva burada açılacak.',
    'months': ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
               'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'],

    'head.phase': 'lig aşaması',
    'head.clubs': '{n} takım',
    'head.matches': '{n} maç',
    'head.weeks': '{n} hafta',
    'head.lede': 'Yeni lig aşamasında grup yok. Her takım dört torbanın her birinden iki rakip '
      + 'çekiyor, birini evinde birini deplasmanda oynuyor. Bu sayfa o kurayı kurallara uyarak '
      + 'yeniden üretiyor, sonra sezonu simüle ediyor.',

    'bar.lang': 'dil',
    'bar.redraw': 'Yeni kura',
    'bar.random': 'Rastgele',
    'bar.play': 'Sezonu oyna',

    'tab.matrix': 'Matris',
    'tab.draw': 'Çekiliş',
    'tab.teams': 'Takımlar',
    'tab.matchdays': 'Haftalar',
    'tab.table': 'Puan tablosu',
    'tab.probs': 'Olasılıklar',
    'tab.saves': 'Kayıtlar',

    'legend.home': 'iç saha',
    'legend.away': 'deplasman',
    'legend.pot1': 'Torba 1',
    'legend.pot2': 'Torba 2',
    'legend.pot3': 'Torba 3',
    'legend.pot4': 'Torba 4',

    'status.preparing': 'kura hazırlanıyor',
    'status.drawing': 'Çekiliyor…',
    'status.failed': 'Kura çıkmadı, başka bir tohum dene.',
    'status.violation': 'Kural ihlali: {msg}',
    'status.ok': '{matches} maç · tüm kurallar sağlandı',

    'discard.confirm': 'Bu fikstürde kaydedilmemiş {n} maç skoru var.\n\n'
      + 'Yeni kura çekilirse hepsi silinir. Saklamak istiyorsan önce "Fikstürü kaydet" de.'
      + '\n\nYine de devam edilsin mi?',

    'pot': 'Torba {n}',
    'venue.home': 'iç saha',
    'venue.away': 'deplasman',
    'tip.pick': 'senin tahminin',
    'tip.sim': 'simülasyon',

    'detail.hint': 'Bir takım seç: satırdaki her dolu kare bir maç. '
      + 'Dolu kare iç saha, çerçeveli kare deplasman. Renk rakibin torbası.',
    'detail.meta': '{country} · Torba {pot} · {n} iç saha / {n} deplasman',
    'detail.doubled': 'aynı ülkeden çift rakip: {list}',
    'matrix.rowTitle': '{team} fikstürünü göster',
    'matrix.cellHome': 'MD{md} · {home} - {away} (ev sahibi)',
    'matrix.cellAway': 'MD{md} · {home} - {away} (deplasman)',

    'teams.pickLabel': 'Takım seç',
    'teams.all': 'Tüm takımlar',
    'teams.allOption': 'Tüm takımlar',
    'teams.hint': 'listeden seç ya da bir karta tıkla',
    'teams.hintSelected': 'matris sekmesinde de bu takım seçili',
    'teams.cardTitle': '{team} fikstürünü aç',
    'focus.homeAway': '{n} iç saha / {n} deplasman',
    'focus.record': '{n} maç · {w}G {d}B {l}M · {gf}-{ga} · {pts} puan',
    'focus.col.md': 'Hafta',
    'focus.col.date': 'Tarih',
    'focus.col.venue': 'Saha',
    'focus.col.opponent': 'Rakip',
    'focus.col.country': 'Ülke',
    'focus.col.pot': 'Torba',
    'focus.col.score': 'Skor',

    'md.week': 'Hafta {n}',
    'md.autofill': 'Skorları doldur',
    'md.saveFixture': 'Fikstürü kaydet',
    'md.clear': 'Tahminleri sil',
    'md.goalHome': 'ev sahibi gol tahmini',
    'md.goalAway': 'deplasman gol tahmini',
    'md.countNone': 'skor kutularına kendi tahminini yaz, puan tablosu ona göre hesaplansın',
    'md.countSome': '{total} maçın {n} tanesini sen doldurdun · puan tablosu bunları kullanıyor',
    'md.filled': '{n} maç modele göre dolduruldu.',
    'md.filledKept': '{n} maç modele göre dolduruldu, senin girdiğin {kept} maça dokunulmadı.',
    'md.allFull': 'Boş kutu kalmamış, hepsi zaten doluydu.',
    'md.clearConfirm': 'Bu kuradaki tüm tahminlerin silinecek. Devam edilsin mi?',
    'md.savePrompt': 'Kayda bir ad ver:',
    'md.saveDefault': 'Kura {seed}',

    'table.hint': 'Sezonu oyna: her maç Poisson modeliyle üretilir, tablo UEFA sıralama '
      + 'kriterlerine göre dizilir. Haftalar sekmesinden kendi tahminlerini de yazabilirsin.',
    'table.col.pos': '#',
    'table.col.club': 'Takım',
    'table.col.p': 'O',
    'table.col.w': 'G',
    'table.col.d': 'B',
    'table.col.l': 'M',
    'table.col.gf': 'A',
    'table.col.ga': 'Y',
    'table.col.gd': 'AV',
    'table.col.pts': 'P',
    'src.mixed': '{picked} maç senin tahminin · {sim} maç simülasyon',
    'src.allPicks': 'Tablo tamamen senin {picked} tahmininden hesaplandı.',
    'src.picksOnly': 'Tablo yalnızca senin {picked} tahminin üzerinden hesaplandı, kalan maçlar oynanmadı.',
    'src.simOnly': '{played} maç simülasyon · skor kutularına tahmin yazarsan tablo onu kullanır',
    'bands.q': '1-8 son 16\'ya doğrudan',
    'bands.po': '9-24 play-off',
    'bands.out': '25-36 elendi',

    'probs.modeFixed': 'Bu kura sabit · 3000 sezon',
    'probs.modeRedraw': 'Her sezon yeni kura · 120 sezon',
    'probs.run': 'Hesapla',
    'probs.press': 'Hesapla butonuna bas.',
    'probs.working': 'Hesaplanıyor… {done}/{total} sezon',
    'probs.hintFixed': '{total} sezon, bu kura sabit tutularak. Fikstür şansı hesaba katılmıyor.',
    'probs.hintRedraw': '{total} sezon, her sezon kura da yeniden çekilerek. Örneklem küçük, birkaç puan oynar.',
    'probs.legend': 'ilk 8  ·  play-off  ·  elendi',
    'probs.avg': 'ort. P',
    'probs.tooltip': 'ilk 8: %{q} · play-off: %{p}',

    'draw.auto': 'Hepsini otomatik çek',
    'draw.autoRemaining': 'Kalan {n} takımı otomatik çek',
    'draw.drawing': 'Çekiliyor…',
    'draw.pause': 'Duraklat',
    'draw.resume': 'Devam et',
    'draw.skipTeam': 'Bu takımı hızlandır',
    'draw.skipAll': 'Sonuca atla',
    'draw.reset': 'Baştan al',
    'draw.speed': 'hız',
    'draw.notYet': 'Kura henüz çekilmedi. Torbalardan topları çek, her takım çıktıkça '
      + 'eşleşmeleri burada belirsin.',
    'draw.partial': '{total} takımın {n} tanesi çekildi. Kalanı açmak için devam et.',
    'draw.goToDraw': 'Çekilişe git',
    'draw.alreadyDone': 'Kura tamamlandı · {teams} takım, {matches} maç. '
      + 'Yenisi için "Yeni kura" de.',
    'draw.intro': 'Toplar kapalı. Bir torbadan top çek — hangi takım çıkacağı belli değil, '
      + 'o torbada kalanlar arasından rastgele biri açılır ve sekiz rakibi tek tek gelir.',
    'draw.ballLabel': 'Torba {n} torbasından top çek',
    'draw.ballTitle': 'Torba {n} · top çek',
    'draw.ballDrawn': '{team} çekildi',
    'draw.spinning': 'Torba {pot} · top çalkalanıyor…',
    'draw.opening': '{n}/{total} · {team} çekildi, rakipleri açılıyor…',
    'draw.teamDone': '{n}/{total} · {team} tamamlandı · {h} iç saha, {h} deplasman',
    'draw.next': '{n}/{total} çekildi · sıradaki topu seç ya da otomatik devam et',
    'draw.finished': '{teams} top çekildi · {matches} maç hazır. Matris ve Haftalar sekmelerinde tamamı var.',
    'draw.opponentsOf': '{country} · Torba {pot} · {n} rakip çekiliyor',

    'saves.nameLabel': 'ad',
    'saves.namePlaceholder': 'örn. Fener yılın kurası',
    'saves.saveBtn': 'Bu kurayı kaydet',
    'saves.reload': 'Listeyi yenile',
    'saves.notConfigured': 'Kayıt sunucusu henüz yapılandırılmadı.',
    'saves.needName': 'kayda bir ad gerekli',
    'saves.needScores': 'kaydedecek skor yok, önce skorları doldur',
    'saves.saving': 'Kaydediliyor…',
    'saves.saved': 'Kaydedildi · {total} maç, {picks} tanesi senin tahminin.',
    'saves.saveFailed': 'Kaydedilemedi: {msg}',
    'saves.loading': 'Kayıtlar yükleniyor…',
    'saves.listFailed': 'Liste alınamadı: {msg}',
    'saves.empty': 'Henüz kayıt yok. Bir kura çek, sezonu oyna, sonra kaydet.',
    'saves.meta': '{comp} · {matches} maç · {picks} tahmin · {date}',
    'saves.open': 'Aç',
    'saves.link': 'Link',
    'saves.delete': 'Sil',
    'saves.opening': 'Kayıt açılıyor…',
    'saves.openingShared': 'Paylaşılan kayıt açılıyor…',
    'saves.opened': 'Açıldı: {name} · {comp} · {matches} maç',
    'saves.openFailed': 'Açılamadı: {msg}',
    'saves.openFailedShared': 'Paylaşılan kayıt açılamadı: {msg}',
    'saves.notYours': 'Bu kayıt sana ait değil.',
    'saves.deleteConfirm': 'Bu kayıt kalıcı olarak silinecek. Devam edilsin mi?',
    'saves.deleted': 'Kayıt silindi.',
    'saves.deleteFailed': 'Silinemedi: {msg}',
    'share.label': 'Paylaşım linki · açan kişi bu kurayı ve skorları görür',
    'share.copy': 'Kopyala',
    'share.copied': 'Kopyalandı',
    'share.fallback': 'Linki kopyala:',

    'footer.l1': 'Torbalar UEFA\'nın 26.08.2026 resmi listesi. Rating değerleri ve Poisson gol '
      + 'modeli kalibre edilmemiş tahmindir; olasılıklar gerçek tahmin olarak kullanılmamalı.',
    'footer.l2': 'Uygulanan kurallar: aynı ülke eşleşemez, aynı ülkeden en fazla 2 rakip, her '
      + 'torbadan 1 iç saha + 1 deplasman, haftada 1 maç, 3 hafta üst üste aynı saha yok.',
    'footer.l3': 'Modellenmeyen: disiplin puanı sıralaması, TV ve güvenlik kaynaklı hafta '
      + 'kısıtları, UEFA\'nın gerçek kura yazılımının dağılımı.'
  }
};

const LANG_KEY = 'ucl:lang';
let LANG = 'en';

/** Sozlukten ham degeri verir; dizi gibi metin olmayan girdiler icin. */
function txraw(key) {
  const dict = I18N[LANG] || I18N.en;
  return dict[key] !== undefined ? dict[key] : I18N.en[key];
}

/** Cevrilmis metin; {ad} yer tutucularini vars ile doldurur. */
function tx(key, vars) {
  let out = txraw(key);
  if (typeof out !== 'string') return key;
  if (vars) {
    Object.keys(vars).forEach(k => {
      out = out.split('{' + k + '}').join(String(vars[k]));
    });
  }
  return out;
}

function detectLang() {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved && I18N[saved]) return saved;
  } catch (e) { /* depolama kapalı */ }
  return 'en';
}

/** data-i18n imli tum statik dugumleri gecerli dile cevirir. */
function applyStaticI18n() {
  document.documentElement.lang = tx('html.lang');
  document.title = tx('doc.title');
  document.querySelectorAll('[data-i18n]').forEach(n => { n.textContent = tx(n.dataset.i18n); });
  document.querySelectorAll('[data-i18n-ph]').forEach(n => { n.placeholder = tx(n.dataset.i18nPh); });
  document.querySelectorAll('[data-i18n-aria]').forEach(n => {
    n.setAttribute('aria-label', tx(n.dataset.i18nAria));
  });
}
