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

const state = { seed: 2027, fixtures: [], results: null, selected: null, view: {} };

function buildView(fixtures) {
  const v = Object.fromEntries(ORDER.map(id => [id, []]));
  for (const f of fixtures) {
    v[f.home].push({ opp: f.away, venue: 'H', pot: f.awayPot, md: f.md, f });
    v[f.away].push({ opp: f.home, venue: 'A', pot: f.homePot, md: f.md, f });
  }
  for (const id in v) v[id].sort((a, b) => a.md - b.md);
  return v;
}

function newDraw(seed) {
  const btn = $('#redraw');
  btn.disabled = true; btn.textContent = 'Çekiliyor…';
  setTimeout(() => {
    const f = runDraw(TEAMS, seed);
    btn.disabled = false; btn.textContent = 'Yeni kura';
    if (!f) { $('#status').textContent = 'Kura çıkmadı, başka bir tohum dene.'; return; }
    state.seed = seed; state.fixtures = f; state.results = null;
    state.view = buildView(f);
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

/** Tek takimin sezonluk fikstur paneli; skor sutunu ancak sezon oynandiysa cikar. */
function teamFocus(t) {
  const rows = state.view[t.id];
  const byFixture = new Map();
  if (state.results) state.results.forEach(r => byFixture.set(r.f, r));

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
  if (state.results) {
    let w = 0, d = 0, l = 0, gf = 0, ga = 0;
    rows.forEach(r => {
      const res = byFixture.get(r.f);
      if (!res) return;
      const f = r.venue === 'H' ? res.hg : res.ag;
      const a = r.venue === 'H' ? res.ag : res.hg;
      gf += f; ga += a;
      if (f > a) w++; else if (f === a) d++; else l++;
    });
    bits.push(`${w}G ${d}B ${l}M · ${gf}-${ga} · ${w * 3 + d} puan`);
  }
  box.appendChild(el('div', 'meta', bits.join(' · ')));

  const scroll = el('div', 'fixscroll');
  const table = el('table', 'fixtab');
  const hr = el('tr');
  const cols = ['Hafta', 'Tarih', 'Saha', 'Rakip', 'Ülke', 'Torba'];
  if (state.results) cols.push('Skor');
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

    if (state.results) {
      const res = byFixture.get(r.f);
      if (!res) { tr.appendChild(el('td', 'sc', '–')); }
      else {
        const f = r.venue === 'H' ? res.hg : res.ag;
        const a = r.venue === 'H' ? res.ag : res.hg;
        tr.appendChild(el('td', 'sc ' + (f > a ? 'w' : f === a ? 'd' : 'l'), f + '-' + a));
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

function renderMatchdays() {
  const host = $('#matchdays'); host.innerHTML = '';
  const score = new Map();
  if (state.results) state.results.forEach(r => score.set(r.f, r.hg + '-' + r.ag));
  const grid = el('div', 'mdgrid');
  for (let md = 1; md <= 8; md++) {
    const b = el('div', 'mdblock');
    b.appendChild(el('h4', null, 'Hafta ' + md));
    b.appendChild(el('div', 'hint', MD_DATES[md - 1]));
    state.fixtures.filter(f => f.md === md).forEach(f => {
      const m = el('div', 'm');
      m.appendChild(el('div', 'a', byId[f.home].name));
      m.appendChild(el('div', 's', score.get(f) || '–'));
      m.appendChild(el('div', null, byId[f.away].name));
      b.appendChild(m);
    });
    grid.appendChild(b);
  }
  host.appendChild(grid);
}

// ---------------------------------------------------------------------------
// 4. Puan tablosu
// ---------------------------------------------------------------------------
function playSeason() {
  const rng = makeRng((Math.random() * 1e9) | 0);
  state.results = simulateSeason(state.fixtures, TEAMS, rng);
  renderTable(); renderMatchdays(); renderTeams();
}

function renderTable() {
  const host = $('#table'); host.innerHTML = '';
  if (!state.results) {
    host.appendChild(el('p', 'hint', 'Sezonu oyna: 144 maç Poisson modeliyle üretilir, '
      + 'tablo UEFA sıralama kriterlerine göre dizilir.'));
    return;
  }
  const rows = buildTable(state.results, TEAMS);
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
// sekmeler + baslangic
// ---------------------------------------------------------------------------
function renderAll() {
  renderMatrix(); renderDetail(); renderTeams(); renderMatchdays(); renderTable();
  $('#probs').innerHTML = '';
  $('#probs').appendChild(el('p', 'hint', 'Hesapla butonuna bas.'));
}

document.querySelectorAll('nav.tabs button').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('nav.tabs button').forEach(x =>
      x.setAttribute('aria-selected', String(x === b)));
    document.querySelectorAll('main section').forEach(s =>
      (s.hidden = s.id !== 'view-' + b.dataset.view));
  });
});
$('#redraw').addEventListener('click', redrawFromInput);
$('#random').addEventListener('click', () => {
  const s = (Math.random() * 99999) | 0;
  $('#seed').value = s; newDraw(s);
});
$('#play').addEventListener('click', playSeason);
$('#mcrun').addEventListener('click', runMonteCarlo);
$('#teampick').addEventListener('change', e => selectTeam(e.target.value || null));
$('#teamall').addEventListener('click', () => selectTeam(null));

$('#seed').value = state.seed;
fillTeamPicker();
newDraw(state.seed);
