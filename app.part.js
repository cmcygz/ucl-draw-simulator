// ---------------------------------------------------------------------------
// Arayuz
// ---------------------------------------------------------------------------
const byId = Object.fromEntries(TEAMS.map(t => [t.id, t]));
const ORDER = TEAMS.map(t => t.id);           // torbaya gore siralanmis
const $ = s => document.querySelector(s);
const el = (tag, cls, txt) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (txt !== undefined) n.textContent = txt;
  return n;
};

const state = {
  seed: 2027, fixtures: [], results: null, simIndex: null,
  selected: null, view: {}, picks: {}
};

const fxKey = f => f.home + '>' + f.away;

/**
 * Adres parçasını çözer: `#2027` tohum, `#k=ysjgzzsv` kayıt linki.
 * Tanınmayan biçimde boş nesne döner.
 */
function parseHash() {
  const raw = location.hash.replace(/^#/, '').trim();
  const saved = raw.match(/^k=([A-Za-z0-9]{4,32})$/);
  if (saved) return { saveId: saved[1] };
  const n = Number(raw);
  if (raw !== '' && Number.isInteger(n) && n >= 1 && n <= 999999) return { seed: n };
  return {};
}

function writeHash(fragment) {
  try { history.replaceState(null, '', '#' + fragment); } catch (e) { /* file:// kısıtı */ }
}

function showTab(view) {
  const btn = document.querySelector('nav.tabs button[data-view="' + view + '"]');
  if (btn) btn.click();
}

const picksKey = seed => 'ucl:picks:' + seed;

function loadPicks(seed) {
  try { return JSON.parse(localStorage.getItem(picksKey(seed))) || {}; }
  catch (e) { return {}; }
}

function savePicks() {
  try {
    if (Object.keys(state.picks).length) {
      localStorage.setItem(picksKey(state.seed), JSON.stringify(state.picks));
    } else {
      localStorage.removeItem(picksKey(state.seed));
    }
  } catch (e) { /* depolama kapalı olabilir */ }
}

/** Bir maçın gösterilecek skoru: kullanıcı tahmini simülasyonu ezer. */
function scoreFor(f) {
  const p = state.picks[fxKey(f)];
  if (p) return { hg: p.hg, ag: p.ag, pick: true };
  const r = state.simIndex && state.simIndex.get(f);
  return r ? { hg: r.hg, ag: r.ag, pick: false } : null;
}

function mergedResults() {
  const out = [];
  for (const f of state.fixtures) {
    const s = scoreFor(f);
    if (s) out.push({ f, hg: s.hg, ag: s.ag });
  }
  return out;
}

function pickCount() {
  const live = new Set(state.fixtures.map(fxKey));
  return Object.keys(state.picks).filter(k => live.has(k)).length;
}

function buildView(fixtures) {
  const v = Object.fromEntries(ORDER.map(id => [id, []]));
  for (const f of fixtures) {
    v[f.home].push({ opp: f.away, venue: 'H', pot: f.awayPot, md: f.md, f });
    v[f.away].push({ opp: f.home, venue: 'A', pot: f.homePot, md: f.md, f });
  }
  for (const id in v) v[id].sort((a, b) => a.md - b.md);
  return v;
}

/**
 * Tohumla kurayi ceker. `apply` verilirse fikstur hazir olduktan sonra, ekranlar
 * cizilmeden once calisir; kayitli skorlari yerlestirmek icin kullanilir.
 */
function newDraw(seed, apply) {
  const btn = $('#redraw');
  btn.disabled = true; btn.textContent = 'Çekiliyor…';
  setTimeout(() => {
    const f = runDraw(TEAMS, seed);
    btn.disabled = false; btn.textContent = 'Yeni kura';
    if (!f) { $('#status').textContent = 'Kura çıkmadı, başka bir tohum dene.'; return; }
    state.seed = seed; state.fixtures = f; state.results = null; state.simIndex = null;
    state.view = buildView(f);
    state.picks = loadPicks(seed);
    writeHash(seed);
    if (apply) apply();
    const problems = verify(f, TEAMS);
    $('#status').textContent = problems.length
      ? 'Kural ihlali: ' + problems[0]
      : '144 maç · tüm kurallar sağlandı';
    renderAll();
  }, 10);
}

/**
 * Kutudaki tohumla yeniden kura çeker. Tohum değişmemişse bir artırır, çünkü
 * aynı tohum aynı kurayı üretir ve buton etkisiz görünür.
 */
function redrawFromInput() {
  const typed = Number($('#seed').value) || 1;
  const seed = typed === state.seed ? (typed % 999999) + 1 : typed;
  $('#seed').value = seed;
  newDraw(seed);
}

// ---------------------------------------------------------------------------
// 1. Matris
// ---------------------------------------------------------------------------
function renderMatrix() {
  const host = $('#matrix'); host.innerHTML = '';
  const map = new Map();
  for (const f of state.fixtures) {
    map.set(f.home + '>' + f.away, { venue: 'H', f });
    map.set(f.away + '>' + f.home, { venue: 'A', f });
  }

  const table = el('table', 'matrix');
  const thead = el('thead'); const hr = el('tr');
  hr.appendChild(el('th', 'corner'));
  hr.appendChild(el('th', 'potrail'));
  ORDER.forEach(id => {
    const th = el('th', 'col p' + byId[id].pot);
    th.appendChild(el('div', null, byId[id].code));
    hr.appendChild(th);
  });
  thead.appendChild(hr); table.appendChild(thead);

  const tbody = el('tbody');
  ORDER.forEach(rowId => {
    const tr = el('tr');
    tr.dataset.team = rowId;
    const th = el('th', 'row');
    th.append(byId[rowId].name);
    const em = el('em', null, byId[rowId].country); th.appendChild(em);
    th.title = byId[rowId].name + ' fikstürünü göster';
    tr.appendChild(th);
    tr.appendChild(el('td', 'potrail p' + byId[rowId].pot));

    ORDER.forEach(colId => {
      const td = el('td', 'c');
      if (rowId === colId) { td.classList.add('self'); tr.appendChild(td); return; }
      const hit = map.get(rowId + '>' + colId);
      if (hit) {
        td.classList.add(hit.venue === 'H' ? 'home' : 'away', 'p' + byId[colId].pot);
        td.appendChild(el('i'));
        td.title = hit.venue === 'H'
          ? `MD${hit.f.md} · ${byId[rowId].name} - ${byId[colId].name} (ev sahibi)`
          : `MD${hit.f.md} · ${byId[colId].name} - ${byId[rowId].name} (deplasman)`;
      }
      td.dataset.row = rowId; td.dataset.col = colId;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  host.appendChild(table);

  table.addEventListener('click', e => {
    const tr = e.target.closest('tr[data-team]');
    if (!tr) return;
    selectTeam(tr.dataset.team);
  });
  paintSelection();
}

function paintSelection() {
  document.querySelectorAll('table.matrix tr').forEach(tr => {
    tr.classList.toggle('sel', tr.dataset.team === state.selected);
  });
  document.querySelectorAll('td.c.lit').forEach(td => td.classList.remove('lit'));
  if (!state.selected) return;
  document.querySelectorAll(`td.c[data-col="${state.selected}"]`)
    .forEach(td => td.classList.add('lit'));
  document.querySelectorAll(`td.c[data-row="${state.selected}"]`)
    .forEach(td => td.classList.add('lit'));
}

function selectTeam(id) {
  state.selected = id;
  paintSelection();
  renderDetail();
  renderTeams();
  $('#teampick').value = id || '';
}

function renderDetail() {
  const host = $('#detail'); host.innerHTML = '';
  if (!state.selected) {
    host.appendChild(el('p', 'hint', 'Bir takım seç: satırdaki her dolu kare bir maç. '
      + 'Dolu kare iç saha, çerçeveli kare deplasman. Renk rakibin torbası.'));
    return;
  }
  const t = byId[state.selected];
  host.appendChild(el('h3', null, t.name));
  const counts = {};
  state.view[t.id].forEach(r => (counts[byId[r.opp].country] = (counts[byId[r.opp].country] || 0) + 1));
  const doubled = Object.entries(counts).filter(([, n]) => n > 1).map(([c]) => c);
  host.appendChild(el('div', 'meta',
    `${t.country} · Torba ${t.pot} · 4 iç saha / 4 deplasman`
    + (doubled.length ? ` · aynı ülkeden çift rakip: ${doubled.join(', ')}` : '')));

  const ol = el('ol', 'fix');
  state.view[t.id].forEach(r => {
    const li = el('li');
    li.appendChild(el('span', 'md', 'MD' + r.md));
    li.appendChild(el('span', 'vs ' + (r.venue === 'H' ? 'h' : 'a'), r.venue === 'H' ? 'vs' : '@'));
    li.appendChild(el('span', 'nm', byId[r.opp].name));
    li.appendChild(el('span', 'pt', 'T' + r.pot));
    ol.appendChild(li);
  });
  host.appendChild(ol);
}

// ---------------------------------------------------------------------------
// 2. Takim kartlari
// ---------------------------------------------------------------------------
function fillTeamPicker() {
  const pick = $('#teampick');
  const all = el('option', null, 'Tüm takımlar');
  all.value = '';
  pick.appendChild(all);
  [1, 2, 3, 4].forEach(pot => {
    const group = document.createElement('optgroup');
    group.label = 'Torba ' + pot;
    ORDER.filter(id => byId[id].pot === pot)
      .sort((a, b) => byId[a].name.localeCompare(byId[b].name, 'tr'))
      .forEach(id => {
        const o = el('option', null, byId[id].name);
        o.value = id;
        group.appendChild(o);
      });
    pick.appendChild(group);
  });
}

function renderTeams() {
  const host = $('#teams'); host.innerHTML = '';
  $('#teamall').hidden = !state.selected;
  $('#teamhint').textContent = state.selected
    ? 'matris sekmesinde de bu takım seçili'
    : 'listeden seç ya da bir karta tıkla';

  if (state.selected) { host.appendChild(teamFocus(byId[state.selected])); return; }

  [1, 2, 3, 4].forEach(pot => {
    const head = el('div', 'pothead');
    head.appendChild(el('h2', null, 'Torba ' + pot));
    head.appendChild(el('div', 'line'));
    host.appendChild(head);
    const grid = el('div', 'cards');
    ORDER.filter(id => byId[id].pot === pot).forEach(id => {
      const t = byId[id];
      const card = el('button', 'card p' + pot);
      card.type = 'button';
      card.dataset.team = id;
      card.title = t.name + ' fikstürünü aç';
      const h = el('h4', null, t.name);
      card.appendChild(h);
      card.appendChild(el('div', 'sub', t.country));
      const ul = el('ul');
      state.view[id].forEach(r => {
        const li = el('li');
        li.appendChild(el('span', 'md', 'MD' + r.md));
        li.appendChild(el('span', 'vs', r.venue === 'H' ? 'vs' : '@'));
        li.appendChild(el('span', 'nm', byId[r.opp].name));
        ul.appendChild(li);
      });
      card.appendChild(ul);
      grid.appendChild(card);
    });
    grid.addEventListener('click', e => {
      const card = e.target.closest('[data-team]');
      if (card) selectTeam(card.dataset.team);
    });
    host.appendChild(grid);
  });
}

/** Tek takimin sezonluk fikstur paneli; skor sutunu ancak skor varsa cikar. */
function teamFocus(t) {
  const rows = state.view[t.id];
  const scores = new Map(rows.map(r => [r, scoreFor(r.f)]));
  const hasScores = rows.some(r => scores.get(r));

  const box = el('div', 'focus p' + t.pot);
  const head = el('div', 'focushead');
  head.appendChild(el('h2', null, t.name));
  head.appendChild(el('div', 'line'));
  box.appendChild(head);

  const counts = {};
  rows.forEach(r => (counts[byId[r.opp].country] = (counts[byId[r.opp].country] || 0) + 1));
  const doubled = Object.entries(counts).filter(([, n]) => n > 1).map(([c]) => c);
  const bits = [t.country, 'Torba ' + t.pot, '4 iç saha / 4 deplasman'];
  if (doubled.length) bits.push('aynı ülkeden çift rakip: ' + doubled.join(', '));
  if (hasScores) {
    let w = 0, d = 0, l = 0, gf = 0, ga = 0, n = 0;
    rows.forEach(r => {
      const res = scores.get(r);
      if (!res) return;
      const f = r.venue === 'H' ? res.hg : res.ag;
      const a = r.venue === 'H' ? res.ag : res.hg;
      gf += f; ga += a; n++;
      if (f > a) w++; else if (f === a) d++; else l++;
    });
    bits.push(`${n} maç · ${w}G ${d}B ${l}M · ${gf}-${ga} · ${w * 3 + d} puan`);
  }
  box.appendChild(el('div', 'meta', bits.join(' · ')));

  const scroll = el('div', 'fixscroll');
  const table = el('table', 'fixtab');
  const hr = el('tr');
  const cols = ['Hafta', 'Tarih', 'Saha', 'Rakip', 'Ülke', 'Torba'];
  if (hasScores) cols.push('Skor');
  cols.forEach(c => hr.appendChild(el('th', null, c)));
  table.appendChild(el('thead')).appendChild(hr);

  const tb = el('tbody');
  rows.forEach(r => {
    const opp = byId[r.opp];
    const tr = el('tr');
    tr.appendChild(el('td', 'md', 'MD' + r.md));
    tr.appendChild(el('td', 'dt', MD_DATES[r.md - 1]));

    const vn = el('td', 'vn p' + opp.pot);
    vn.appendChild(el('i', 'key ' + (r.venue === 'H' ? 'home' : 'away')));
    vn.appendChild(el('span', 'vt', r.venue === 'H' ? 'iç saha' : 'deplasman'));
    tr.appendChild(vn);

    tr.appendChild(el('td', 'nm', opp.name));
    tr.appendChild(el('td', 'cn', opp.country));
    tr.appendChild(el('td', 'pt', 'T' + opp.pot));

    if (hasScores) {
      const res = scores.get(r);
      if (!res) { tr.appendChild(el('td', 'sc', '–')); }
      else {
        const f = r.venue === 'H' ? res.hg : res.ag;
        const a = r.venue === 'H' ? res.ag : res.hg;
        const cls = 'sc ' + (f > a ? 'w' : f === a ? 'd' : 'l') + (res.pick ? ' pick' : '');
        const td = el('td', cls, f + '-' + a);
        td.title = res.pick ? 'senin tahminin' : 'simülasyon';
        tr.appendChild(td);
      }
    }
    tb.appendChild(tr);
  });
  table.appendChild(tb);
  scroll.appendChild(table);
  box.appendChild(scroll);
  return box;
}

// ---------------------------------------------------------------------------
// 3. Haftalar
// ---------------------------------------------------------------------------
const MD_DATES = ['8-10 Eyl 2026', '13/14 Eki 2026', '20/21 Eki 2026', '3/4 Kas 2026',
                  '24/25 Kas 2026', '8/9 Ara 2026', '19/20 Oca 2027', '27 Oca 2027'];

function goalInput(key, side, value, placeholder) {
  const i = document.createElement('input');
  i.type = 'text';
  i.inputMode = 'numeric';
  i.maxLength = 2;
  i.dataset.fx = key;
  i.dataset.side = side;
  i.value = value === null ? '' : String(value);
  i.placeholder = placeholder === null ? '·' : String(placeholder);
  i.setAttribute('aria-label', side === 'h' ? 'ev sahibi gol tahmini' : 'deplasman gol tahmini');
  return i;
}

function renderMatchdays() {
  const host = $('#matchdays'); host.innerHTML = '';
  const grid = el('div', 'mdgrid');
  for (let md = 1; md <= 8; md++) {
    const b = el('div', 'mdblock');
    b.appendChild(el('h4', null, 'Hafta ' + md));
    b.appendChild(el('div', 'hint', MD_DATES[md - 1]));
    state.fixtures.filter(f => f.md === md).forEach(f => {
      const key = fxKey(f);
      const pick = state.picks[key] || null;
      const sim = (state.simIndex && state.simIndex.get(f)) || null;
      const m = el('div', 'm' + (pick ? ' picked' : ''));
      m.appendChild(el('div', 'a', byId[f.home].name));
      const s = el('div', 's');
      s.appendChild(goalInput(key, 'h', pick ? pick.hg : null, sim ? sim.hg : null));
      s.append('–');
      s.appendChild(goalInput(key, 'a', pick ? pick.ag : null, sim ? sim.ag : null));
      m.appendChild(s);
      m.appendChild(el('div', null, byId[f.away].name));
      b.appendChild(m);
    });
    grid.appendChild(b);
  }
  host.appendChild(grid);
  updatePickCount();
}

function updatePickCount() {
  const n = pickCount();
  $('#pickclear').hidden = n === 0;
  $('#pickcount').textContent = n
    ? `144 maçın ${n} tanesini sen doldurdun · puan tablosu bunları kullanıyor`
    : 'skor kutularına kendi tahminini yaz, puan tablosu ona göre hesaplansın';
}

/** Bir skor kutusu degistiginde state'i tazeler; haftalar ekrani yeniden cizilmez. */
function onPickInput(inp) {
  const clean = inp.value.replace(/[^0-9]/g, '').slice(0, 2);
  if (clean !== inp.value) inp.value = clean;
  const row = inp.closest('.m');
  const key = inp.dataset.fx;
  const h = row.querySelector('input[data-side="h"]').value;
  const a = row.querySelector('input[data-side="a"]').value;
  if (h !== '' && a !== '') state.picks[key] = { hg: Number(h), ag: Number(a) };
  else delete state.picks[key];
  row.classList.toggle('picked', key in state.picks);
  savePicks();
  updatePickCount();
  renderTable();
  renderTeams();
}

function mdStatus(msg, bad) {
  const p = $('#mdstatus');
  p.textContent = msg;
  p.classList.toggle('bad', !!bad);
}

/**
 * Bos skor kutularini modelin urettigi skorlarla doldurur: rating farki ve
 * ic saha avantaji Poisson gol beklentisine cevrilir, skor oradan cekilir.
 * Elle girilmis skorlara dokunmaz.
 */
function autofillPicks() {
  const before = pickCount();
  const rng = makeRng((Math.random() * 1e9) | 0);
  const sim = simulateSeason(state.fixtures, TEAMS, rng);
  for (const r of sim) {
    const k = fxKey(r.f);
    if (state.picks[k]) continue;
    state.picks[k] = { hg: r.hg, ag: r.ag };
  }
  savePicks();
  renderMatchdays(); renderTable(); renderTeams();
  const added = pickCount() - before;
  mdStatus(added
    ? `${added} maç modele göre dolduruldu` + (before ? `, senin girdiğin ${before} maça dokunulmadı.` : '.')
    : 'Boş kutu kalmamış, hepsi zaten doluydu.');
}

function clearPicks() {
  if (!pickCount()) return;
  if (!confirm('Bu kuradaki tüm tahminlerin silinecek. Devam edilsin mi?')) return;
  state.picks = {};
  savePicks();
  renderMatchdays(); renderTable(); renderTeams();
}

// ---------------------------------------------------------------------------
// 4. Puan tablosu
// ---------------------------------------------------------------------------
function playSeason() {
  const rng = makeRng((Math.random() * 1e9) | 0);
  state.results = simulateSeason(state.fixtures, TEAMS, rng);
  state.simIndex = new Map(state.results.map(r => [r.f, r]));
  renderTable(); renderMatchdays(); renderTeams();
}

function sourceNote(played, picked) {
  const p = el('p', 'src');
  const total = state.fixtures.length;
  if (picked && played > picked) {
    p.append(String(picked) + ' maç ');
    p.appendChild(el('b', null, 'senin tahminin'));
    p.append(` · ${played - picked} maç simülasyon`);
  } else if (picked && played === total) {
    p.append('Tablo tamamen ');
    p.appendChild(el('b', null, `senin ${picked} tahminin`));
    p.append('den hesaplandı.');
  } else if (picked) {
    p.append('Tablo yalnızca ');
    p.appendChild(el('b', null, `senin ${picked} tahminin`));
    p.append(' üzerinden hesaplandı, kalan maçlar oynanmadı.');
  } else {
    p.append(`${played} maç simülasyon · skor kutularına tahmin yazarsan tablo onu kullanır`);
  }
  return p;
}

function renderTable() {
  const host = $('#table'); host.innerHTML = '';
  const results = mergedResults();
  if (!results.length) {
    host.appendChild(el('p', 'hint', 'Sezonu oyna: 144 maç Poisson modeliyle üretilir, '
      + 'tablo UEFA sıralama kriterlerine göre dizilir. Haftalar sekmesinden kendi '
      + 'tahminlerini de yazabilirsin.'));
    return;
  }
  host.appendChild(sourceNote(results.length, pickCount()));
  const rows = buildTable(results, TEAMS);
  const table = el('table', 'std');
  const head = el('tr');
  ['#', 'Takım', 'O', 'G', 'B', 'M', 'A', 'Y', 'AV', 'P'].forEach((h, i) => {
    const th = el('th', i === 1 ? 'l' : '', h); head.appendChild(th);
  });
  table.appendChild(el('thead')).appendChild(head);
  const tb = el('tbody');
  rows.forEach((r, i) => {
    const tr = el('tr', i < 8 ? 'q' : i < 24 ? 'po' : '');
    tr.appendChild(el('td', 'pos', String(i + 1)));
    tr.appendChild(el('td', 'nm', byId[r.id].name));
    [r.p, r.w, r.d, r.l, r.gf, r.ga].forEach(v => tr.appendChild(el('td', '', String(v))));
    tr.appendChild(el('td', '', (r.gd > 0 ? '+' : '') + r.gd));
    tr.appendChild(el('td', 'pts', String(r.pts)));
    tb.appendChild(tr);
  });
  table.appendChild(tb);
  host.appendChild(table);
  const bands = el('div', 'bands');
  bands.innerHTML = '<span><i class="swatch" style="background:rgba(35,37,110,.35)"></i>1-8 son 16\'ya doğrudan</span>'
    + '<span><i class="swatch" style="background:rgba(178,106,0,.35)"></i>9-24 play-off</span>'
    + '<span><i class="swatch" style="background:var(--paper-3)"></i>25-36 elendi</span>';
  host.appendChild(bands);
}

// ---------------------------------------------------------------------------
// 5. Olasiliklar
// ---------------------------------------------------------------------------
function runMonteCarlo() {
  const mode = $('#mcmode').value;
  const total = mode === 'fixed' ? 3000 : 120;
  const btn = $('#mcrun'); btn.disabled = true;
  const out = $('#probs'); out.innerHTML = '';
  const prog = el('div', 'progress', 'Hesaplanıyor…'); out.appendChild(prog);

  const acc = Object.fromEntries(ORDER.map(id => [id, { q: 0, p: 0, pts: 0, pos: 0 }]));
  const rng = makeRng((Math.random() * 1e9) | 0);
  let done = 0, fixtures = state.fixtures;

  const chunk = () => {
    const t0 = performance.now();
    while (done < total && performance.now() - t0 < 60) {
      if (mode !== 'fixed') {
        const f = runDraw(TEAMS, (rng() * 1e9) | 0);
        if (f) fixtures = f;
      }
      const rows = buildTable(simulateSeason(fixtures, TEAMS, rng), TEAMS);
      rows.forEach((r, i) => {
        const a = acc[r.id];
        a.pts += r.pts; a.pos += i + 1;
        if (i < 8) a.q++; else if (i < 24) a.p++;
      });
      done++;
    }
    prog.textContent = `Hesaplanıyor… ${done}/${total} sezon`;
    if (done < total) return requestAnimationFrame(chunk);
    btn.disabled = false;
    renderProbs(acc, total, mode);
  };
  requestAnimationFrame(chunk);
}

function renderProbs(acc, total, mode) {
  const out = $('#probs'); out.innerHTML = '';
  out.appendChild(el('p', 'hint', mode === 'fixed'
    ? `${total} sezon, bu kura sabit tutularak. Fikstür şansı hesaba katılmıyor.`
    : `${total} sezon, her sezon kura da yeniden çekilerek. Örneklem küçük, ±%4 oynar.`));
  const list = ORDER.slice().sort((a, b) => acc[b].q - acc[a].q || acc[b].p - acc[a].p);
  const head = el('div', 'prob');
  head.appendChild(el('div', 'nm', ''));
  head.appendChild(el('div', 'hint', 'ilk 8  ·  play-off  ·  elendi'));
  head.appendChild(el('div', 'hint', 'ort. P'));
  out.appendChild(head);
  list.forEach(id => {
    const a = acc[id];
    const row = el('div', 'prob');
    row.appendChild(el('div', 'nm', byId[id].name));
    const bar = el('div', 'pbar');
    const q = el('i', 'q'); q.style.width = (100 * a.q / total) + '%';
    const p = el('i', 'p'); p.style.width = (100 * a.p / total) + '%';
    bar.append(q, p);
    bar.title = `ilk 8: %${(100 * a.q / total).toFixed(1)} · play-off: %${(100 * a.p / total).toFixed(1)}`;
    row.appendChild(bar);
    row.appendChild(el('div', '', (a.pts / total).toFixed(1)));
    out.appendChild(row);
  });
}

// ---------------------------------------------------------------------------
// 6. Cekilis toreni
// ---------------------------------------------------------------------------
const ceremony = { gen: 0, busy: false, auto: false, paused: false, skip: false, speed: 1, pot: 0, drawn: 0 };
const CTIME = { spin: 900, reveal: 700, opponent: 420, rest: 600 };

function drawStatus(msg) { $('#drawstatus').textContent = msg; }

/** Duraklatma ve hiza saygi duyan bekleme; kura degisirse false doner. */
function cwait(ms, gen) {
  return new Promise(resolve => {
    let left = ms / (ceremony.speed || 1);
    const step = () => {
      if (ceremony.gen !== gen) return resolve(false);
      if (ceremony.paused) return setTimeout(step, 80);
      if (left <= 0) return resolve(true);
      const slice = Math.min(50, left);
      left -= slice;
      setTimeout(step, slice);
    };
    step();
  });
}

function ballEl(t, opts) {
  const o = opts || {};
  const b = el(o.interactive ? 'button' : 'div', 'ball p' + t.pot + (o.big ? ' big' : ''));
  if (o.interactive) {
    b.type = 'button';
    b.setAttribute('aria-label', t.name + ' topunu çek');
  }
  b.dataset.team = t.id;
  b.title = o.interactive ? t.name + ' · topu çekmek için tıkla' : t.name;
  b.textContent = t.code;
  return b;
}

function renderBowls() {
  const host = $('#drawbowls');
  host.innerHTML = '';
  [1, 2, 3, 4].forEach(pot => {
    const bowl = el('div', 'bowl p' + pot);
    bowl.dataset.pot = String(pot);
    bowl.appendChild(el('h4', null, 'Torba ' + pot));
    const balls = el('div', 'balls');
    ORDER.filter(id => byId[id].pot === pot)
      .forEach(id => balls.appendChild(ballEl(byId[id], { interactive: true })));
    bowl.appendChild(balls);
    host.appendChild(bowl);
  });
}

function isPicked(id) {
  const b = document.querySelector('#drawbowls .ball[data-team="' + id + '"]');
  return !!b && b.classList.contains('picked');
}

function setDrawUI() {
  const busy = ceremony.busy;
  const left = 36 - ceremony.drawn;
  $('#drawstart').disabled = busy || left === 0;
  $('#drawstart').textContent = busy && ceremony.auto
    ? 'Çekiliyor…'
    : (ceremony.drawn ? `Kalan ${left} takımı otomatik çek` : 'Hepsini otomatik çek');
  $('#drawpause').hidden = !(busy && ceremony.auto);
  $('#drawskip').hidden = !busy;
  $('#drawskip').textContent = ceremony.auto ? 'Sonuca atla' : 'Bu takımı hızlandır';
  $('#drawreset').hidden = ceremony.drawn === 0 || busy;
  $('#drawbowls').classList.toggle('locked', busy);
}

function activateBowl(pot) {
  document.querySelectorAll('#drawbowls .bowl').forEach(b =>
    b.classList.toggle('active', b.dataset.pot === String(pot)));
}

function stageTeam(t) {
  const stage = $('#drawstage');
  stage.innerHTML = '';
  const card = el('div', 'drawcard');
  card.appendChild(ballEl(t, { big: true }));
  const info = el('div', 'info');
  info.appendChild(el('h3', null, t.name));
  info.appendChild(el('div', 'meta', t.country + ' · Torba ' + t.pot + ' · 8 rakip çekiliyor'));
  card.appendChild(info);
  stage.appendChild(card);
  const opps = el('div', 'opps');
  opps.id = 'drawopps';
  stage.appendChild(opps);
}

function revealOpponent(r) {
  const opp = byId[r.opp];
  const row = el('div', 'opp p' + opp.pot);
  row.appendChild(el('i', 'key ' + (r.venue === 'H' ? 'home' : 'away')));
  row.appendChild(el('span', 'nm', opp.name));
  row.appendChild(el('span', 'vn', r.venue === 'H' ? 'iç saha' : 'deplasman'));
  $('#drawopps').appendChild(row);
  requestAnimationFrame(() => row.classList.add('in'));
}

function resetCeremony() {
  ceremony.gen++;
  ceremony.busy = false;
  ceremony.auto = false;
  ceremony.paused = false;
  ceremony.skip = false;
  ceremony.drawn = 0;
  ceremony.pot = 0;
  $('#drawpause').textContent = 'Duraklat';
  renderBowls();
  $('#drawstage').innerHTML = '';
  setDrawUI();
  drawStatus('Bir topa tıkla: o takım sahneye çıkar, sekiz rakibi tek tek açılır. '
    + 'Dilersen hepsini otomatik de çektirebilirsin.');
}

function finishCeremony() {
  document.querySelectorAll('#drawbowls .ball').forEach(b => b.classList.add('picked'));
  activateBowl(0);
  ceremony.drawn = 36;
  ceremony.busy = false;
  ceremony.auto = false;
  ceremony.paused = false;
  ceremony.skip = false;
  $('#drawpause').textContent = 'Duraklat';
  setDrawUI();
  drawStatus('36 top çekildi · 144 maç hazır. Matris ve Haftalar sekmelerinde tamamı var.');
}

/** Tek takimin cekilisi: top calkalanir, takim sahneye cikar, rakipler tek tek acilir. */
async function revealTeam(t, gen) {
  ceremony.pot = t.pot;
  activateBowl(t.pot);
  drawStatus(`Torba ${t.pot} · top çalkalanıyor…`);
  if (!await cwait(CTIME.spin, gen)) return false;

  const ball = document.querySelector('#drawbowls .ball[data-team="' + t.id + '"]');
  if (ball) ball.classList.add('picked');
  activateBowl(0);
  ceremony.drawn++;
  stageTeam(t);
  drawStatus(`${ceremony.drawn}/36 · ${t.name} çekildi, rakipleri açılıyor…`);
  if (!await cwait(CTIME.reveal, gen)) return false;

  const rows = state.view[t.id];
  for (let i = 0; i < rows.length; i++) {
    revealOpponent(rows[i]);
    if (ceremony.skip) continue;
    if (!await cwait(CTIME.opponent, gen)) return false;
  }
  drawStatus(`${ceremony.drawn}/36 · ${t.name} tamamlandı · 4 iç saha, 4 deplasman`);
  return true;
}

async function pickBall(id) {
  if (ceremony.busy || !state.fixtures.length) return;
  const t = byId[id];
  if (!t || isPicked(id)) return;

  const gen = ceremony.gen;
  ceremony.busy = true;
  ceremony.auto = false;
  ceremony.skip = false;
  setDrawUI();

  const ok = await revealTeam(t, gen);
  if (ceremony.gen !== gen) return;

  ceremony.busy = false;
  ceremony.skip = false;
  if (ok && ceremony.drawn >= 36) { finishCeremony(); return; }
  setDrawUI();
  if (ok) drawStatus(`${ceremony.drawn}/36 çekildi · sıradaki topu seç ya da otomatik devam et`);
}

async function runCeremony() {
  if (ceremony.busy || !state.fixtures.length) return;
  const gen = ceremony.gen;
  ceremony.busy = true;
  ceremony.auto = true;
  ceremony.paused = false;
  ceremony.skip = false;
  $('#drawpause').textContent = 'Duraklat';
  setDrawUI();

  for (const id of ceremonyOrder()) {
    if (ceremony.skip) break;
    if (isPicked(id)) continue;
    if (!await revealTeam(byId[id], gen)) return;
    if (!await cwait(CTIME.rest, gen)) return;
  }
  if (ceremony.gen !== gen) return;
  finishCeremony();
}

/** Torbalara gore sirali, torba icinde tohuma bagli karisik cekilis sirasi. */
function ceremonyOrder() {
  const rng = makeRng((state.seed * 7919 + 13) >>> 0);
  const out = [];
  [1, 2, 3, 4].forEach(pot => {
    const ids = ORDER.filter(id => byId[id].pot === pot);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = ids[i]; ids[i] = ids[j]; ids[j] = tmp;
    }
    out.push.apply(out, ids);
  });
  return out;
}

// ---------------------------------------------------------------------------
// 7. Kayitlar
// ---------------------------------------------------------------------------
const API = 'https://ucl-draw-saves.cmcygz.workers.dev';
const TOKENS_KEY = 'ucl:tokens';
let savesLoaded = false;

function loadTokens() {
  try { return JSON.parse(localStorage.getItem(TOKENS_KEY)) || {}; }
  catch (e) { return {}; }
}

function storeTokens(t) {
  try { localStorage.setItem(TOKENS_KEY, JSON.stringify(t)); } catch (e) { /* depolama kapali */ }
}

function saveStatus(msg, bad) {
  const p = $('#savestatus');
  p.textContent = msg;
  p.classList.toggle('bad', !!bad);
}

/** O anda ekranda gecerli olan tum skorlar: tahminler ve simulasyon birlikte. */
function currentScores() {
  const scores = {}, picks = [];
  for (const f of state.fixtures) {
    const s = scoreFor(f);
    if (!s) continue;
    const k = fxKey(f);
    scores[k] = [s.hg, s.ag];
    if (s.pick) picks.push(k);
  }
  return { scores, picks };
}

function applySave(payload) {
  const byKey = new Map(state.fixtures.map(f => [fxKey(f), f]));
  const pickSet = new Set(payload.picks || []);
  const picks = {}, sim = new Map();
  for (const k of Object.keys(payload.scores || {})) {
    const f = byKey.get(k);
    if (!f) continue;
    const [hg, ag] = payload.scores[k];
    if (pickSet.has(k)) picks[k] = { hg, ag };
    else sim.set(f, { f, hg, ag });
  }
  state.picks = picks;
  state.simIndex = sim;
  state.results = Array.from(sim.values());
}

async function apiCall(path, options) {
  const res = await fetch(API + path, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
  return data;
}

const shareUrl = id => location.origin + location.pathname + '#k=' + id;

async function copyText(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    const old = btn.textContent;
    btn.textContent = 'Kopyalandı';
    setTimeout(() => { btn.textContent = old; }, 1500);
  } catch (e) {
    prompt('Linki kopyala:', text);
  }
}

function renderShare(host, id) {
  host.innerHTML = '';
  const box = el('div', 'sharebox');
  box.appendChild(el('div', 'lbl', 'Paylaşım linki · açan kişi bu kurayı ve skorları görür'));
  const row = el('div', 'row');
  const input = document.createElement('input');
  input.type = 'text';
  input.readOnly = true;
  input.value = shareUrl(id);
  input.addEventListener('focus', () => input.select());
  row.appendChild(input);
  const btn = el('button', null, 'Kopyala');
  btn.addEventListener('click', () => copyText(input.value, btn));
  row.appendChild(btn);
  box.appendChild(row);
  host.appendChild(box);
}

/** Ekrandaki skorlari sunucuya yazar; id ve sayilari dondurur. */
async function submitSave(name) {
  if (!API) throw new Error('kayıt sunucusu yapılandırılmadı');
  if (!name) throw new Error('kayda bir ad gerekli');
  const { scores, picks } = currentScores();
  const total = Object.keys(scores).length;
  if (!total) throw new Error('kaydedecek skor yok, önce skorları doldur');

  const data = await apiCall('/api/saves', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, seed: state.seed, scores, picks })
  });
  const tokens = loadTokens();
  tokens[data.id] = data.token;
  storeTokens(tokens);
  savesLoaded = false;
  return { id: data.id, total, picks: picks.length };
}

async function createSave() {
  const btn = $('#savebtn');
  btn.disabled = true;
  saveStatus('Kaydediliyor…');
  try {
    const r = await submitSave($('#savename').value.trim());
    $('#savename').value = '';
    saveStatus(`Kaydedildi · ${r.total} maç, ${r.picks} tanesi senin tahminin.`);
    renderShare($('#saveshare'), r.id);
    listSaves();
  } catch (e) {
    saveStatus('Kaydedilemedi: ' + e.message, true);
  } finally {
    btn.disabled = false;
  }
}

async function saveFixture() {
  const name = prompt('Kayda bir ad ver:', 'Kura ' + state.seed);
  if (name === null) return;
  const btn = $('#savefixture');
  btn.disabled = true;
  mdStatus('Kaydediliyor…');
  try {
    const r = await submitSave(name.trim());
    mdStatus(`Kaydedildi · ${r.total} maç, ${r.picks} tanesi senin tahminin.`);
    renderShare($('#mdshare'), r.id);
  } catch (e) {
    mdStatus('Kaydedilemedi: ' + e.message, true);
  } finally {
    btn.disabled = false;
  }
}

async function listSaves() {
  const host = $('#saves');
  host.innerHTML = '';
  if (!API) {
    host.appendChild(el('p', 'hint', 'Kayıt sunucusu henüz yapılandırılmadı.'));
    return;
  }
  host.appendChild(el('p', 'hint', 'Kayıtlar yükleniyor…'));
  try {
    const data = await apiCall('/api/saves');
    savesLoaded = true;
    renderSaves(data.saves || []);
  } catch (e) {
    host.innerHTML = '';
    host.appendChild(el('p', 'hint bad', 'Liste alınamadı: ' + e.message));
  }
}

function renderSaves(rows) {
  const host = $('#saves');
  host.innerHTML = '';
  if (!rows.length) {
    host.appendChild(el('p', 'hint', 'Henüz kayıt yok. Bir kura çek, sezonu oyna, sonra kaydet.'));
    return;
  }
  const tokens = loadTokens();
  const list = el('div', 'savelist');
  rows.forEach(r => {
    const mine = !!tokens[r.id];
    const row = el('div', 'saverow' + (mine ? ' mine' : ''));
    const left = el('div');
    left.appendChild(el('h4', null, r.name));
    const when = new Date(r.created_at).toLocaleDateString('tr-TR');
    left.appendChild(el('div', 'meta',
      `tohum ${r.seed} · ${r.matches} maç · ${r.picks} tahmin · ${when}`));
    row.appendChild(left);

    const acts = el('div', 'acts');
    const open = el('button', null, 'Aç');
    open.dataset.open = r.id;
    acts.appendChild(open);
    const link = el('button', 'ghost', 'Link');
    link.dataset.link = r.id;
    acts.appendChild(link);
    if (mine) {
      const del = el('button', 'ghost', 'Sil');
      del.dataset.del = r.id;
      acts.appendChild(del);
    }
    row.appendChild(acts);
    list.appendChild(row);
  });
  host.appendChild(list);
}

async function openSave(id, fromLink) {
  saveStatus('Kayıt açılıyor…');
  if (fromLink) mdStatus('Paylaşılan kayıt açılıyor…');
  try {
    const data = await apiCall('/api/saves/' + encodeURIComponent(id));
    const payload = data.payload || {};
    $('#seed').value = payload.seed;
    newDraw(payload.seed, () => {
      applySave(payload);
      writeHash('k=' + id);
    });
    const note = `Açıldı: ${data.name} · tohum ${payload.seed} · ${data.matches} maç`;
    saveStatus(note);
    if (fromLink) { mdStatus(note); showTab('table'); }
  } catch (e) {
    saveStatus('Açılamadı: ' + e.message, true);
    if (fromLink) mdStatus('Paylaşılan kayıt açılamadı: ' + e.message, true);
  }
}

async function removeSave(id) {
  const tokens = loadTokens();
  if (!tokens[id]) return saveStatus('Bu kayıt sana ait değil.', true);
  if (!confirm('Bu kayıt kalıcı olarak silinecek. Devam edilsin mi?')) return;
  try {
    await apiCall('/api/saves/' + encodeURIComponent(id), {
      method: 'DELETE',
      headers: { 'X-Save-Token': tokens[id] }
    });
    delete tokens[id];
    storeTokens(tokens);
    saveStatus('Kayıt silindi.');
    listSaves();
  } catch (e) {
    saveStatus('Silinemedi: ' + e.message, true);
  }
}

// ---------------------------------------------------------------------------
// sekmeler + baslangic
// ---------------------------------------------------------------------------
function renderAll() {
  renderMatrix(); renderDetail(); renderTeams(); renderMatchdays(); renderTable();
  resetCeremony();
  $('#probs').innerHTML = '';
  $('#probs').appendChild(el('p', 'hint', 'Hesapla butonuna bas.'));
}

document.querySelectorAll('nav.tabs button').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('nav.tabs button').forEach(x =>
      x.setAttribute('aria-selected', String(x === b)));
    document.querySelectorAll('main section').forEach(s =>
      (s.hidden = s.id !== 'view-' + b.dataset.view));
    if (b.dataset.view === 'saves' && !savesLoaded) listSaves();
  });
});
$('#redraw').addEventListener('click', redrawFromInput);
$('#random').addEventListener('click', () => {
  const s = 1 + ((Math.random() * 999999) | 0);
  $('#seed').value = s; newDraw(s);
});
$('#play').addEventListener('click', playSeason);
$('#mcrun').addEventListener('click', runMonteCarlo);
$('#teampick').addEventListener('change', e => selectTeam(e.target.value || null));
$('#teamall').addEventListener('click', () => selectTeam(null));
$('#pickclear').addEventListener('click', clearPicks);
$('#autofill').addEventListener('click', autofillPicks);
$('#drawstart').addEventListener('click', runCeremony);
$('#drawreset').addEventListener('click', resetCeremony);
$('#drawskip').addEventListener('click', () => { ceremony.skip = true; });
$('#drawbowls').addEventListener('click', e => {
  const ball = e.target.closest('button.ball');
  if (ball) pickBall(ball.dataset.team);
});
$('#drawpause').addEventListener('click', () => {
  ceremony.paused = !ceremony.paused;
  $('#drawpause').textContent = ceremony.paused ? 'Devam et' : 'Duraklat';
  activateBowl(ceremony.paused ? 0 : ceremony.pot);
});
$('#drawspeed').addEventListener('change', e => {
  ceremony.speed = Number(e.target.value) || 1;
});
$('#savefixture').addEventListener('click', saveFixture);
$('#matchdays').addEventListener('input', e => {
  const inp = e.target.closest('input[data-fx]');
  if (inp) onPickInput(inp);
});
$('#savebtn').addEventListener('click', createSave);
$('#savereload').addEventListener('click', listSaves);
$('#saves').addEventListener('click', e => {
  const open = e.target.closest('[data-open]');
  if (open) return openSave(open.dataset.open);
  const link = e.target.closest('[data-link]');
  if (link) return copyText(shareUrl(link.dataset.link), link);
  const del = e.target.closest('[data-del]');
  if (del) removeSave(del.dataset.del);
});
window.addEventListener('hashchange', () => {
  const h = parseHash();
  if (h.saveId) return openSave(h.saveId, true);
  if (h.seed && h.seed !== state.seed) { $('#seed').value = h.seed; newDraw(h.seed); }
});

const initialHash = parseHash();
state.seed = initialHash.seed || state.seed;
$('#seed').value = state.seed;
fillTeamPicker();
newDraw(state.seed);
if (initialHash.saveId) openSave(initialHash.saveId, true);
