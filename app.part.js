// ---------------------------------------------------------------------------
// Arayuz
// ---------------------------------------------------------------------------
let COMP = COMPETITIONS.ucl;
let TEAMS = COMP.teams;
let FORMAT = FORMATS[COMP.format];
let byId = {};
let ORDER = [];                               // torbaya gore siralanmis

/** Aktif turnuvayi degistirir: takim listesi, bicim ve turetilmis indeksler. */
function useCompetition(id) {
  COMP = COMPETITIONS[id] || COMPETITIONS.ucl;
  TEAMS = COMP.teams;
  FORMAT = FORMATS[COMP.format];
  byId = Object.fromEntries(TEAMS.map(t => [t.id, t]));
  ORDER = TEAMS.map(t => t.id);
  document.body.dataset.comp = COMP.id;
}

const POTS = () => Array.from({ length: FORMAT.pots }, (_, i) => i + 1);
const drawOpt = () => ({ ...DEFAULTS, ...FORMAT });
const teamCount = () => TEAMS.length || COMP.teamCount || 36;
const matchCount = () => teamCount() * FORMAT.pots * FORMAT.oppPerPot / 2;
const perTeam = () => FORMAT.pots * FORMAT.oppPerPot;

/** Haftanin tarihi; ay adi aktif dilden gelir. */
function compDate(md) {
  const d = COMP.dates && COMP.dates[md - 1];
  if (!d) return '';
  return d.day + ' ' + txraw('months')[d.month - 1] + ' ' + d.year;
}
const $ = s => document.querySelector(s);
const el = (tag, cls, txt) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (txt !== undefined) n.textContent = txt;
  return n;
};

const state = {
  seed: 2027, fixtures: [], results: null, simIndex: null,
  selected: null, view: {}, picks: {}, dirty: false,
  drawn: new Set(), drawComplete: false,
  status: { key: 'status.preparing', vars: {} }
};

const fxKey = f => f.home + '>' + f.away;

/** Baslik satirindaki durumu yazar ve dil degisiminde tekrar cevrilebilsin diye saklar. */
function setStatus(key, vars) {
  state.status = { key: key, vars: vars || {} };
  $('#status').textContent = tx(key, state.status.vars);
}

/** Yoldaki /ucl gibi bir parca varsa turnuvayi oradan da okur. */
function compFromPath() {
  const slug = location.pathname.replace(/^\/|\/$/g, '').toLowerCase();
  return COMP_IDS.indexOf(slug) === -1 ? null : slug;
}

/**
 * Adres yalnizca kaydedilmis bir kurayi tasir (`#k=ysjgzzsv`). Tohumla paylasim
 * kaldirildi: tohum fiksturu uretiyor ama skorlari tasimiyordu ve ureteci
 * degistiren her guncelleme ayni tohumu farkli bir fikstüre baglardi.
 */
function parseHash() {
  const raw = location.hash.replace(/^#/, '').trim();
  const saved = raw.match(/^k=([A-Za-z0-9]{4,32})$/);
  if (saved) return { saveId: saved[1] };
  const fromPath = compFromPath();
  return fromPath ? { comp: fromPath } : {};
}

function writeHash(fragment) {
  try {
    history.replaceState(null, '', fragment ? '#' + fragment : location.pathname);
  } catch (e) { /* file:// kısıtı */ }
}

const randomSeed = () => 1 + ((Math.random() * 999999) | 0);

function showTab(view) {
  const btn = document.querySelector('nav.tabs button[data-view="' + view + '"]');
  if (btn) btn.click();
}

/**
 * Ekranda kaydedilmemis skor var mi? Kura degistirecek her islem once bunu sorar,
 * cunku yeni kura tum skorlari ve tahminleri siler.
 */
function confirmDiscard() {
  if (!state.dirty) return true;
  const n = mergedResults().length;
  return confirm(tx('discard.confirm', { n: n }));
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
  for (const f of visibleFixtures()) {
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
function newDraw(seed, apply, opts) {
  const o = opts || {};
  const btn = $('#redraw');
  btn.disabled = true; btn.textContent = tx('status.drawing');
  setTimeout(() => {
    const f = runDraw(TEAMS, seed, FORMAT);
    btn.disabled = false; btn.textContent = tx('bar.redraw');
    if (!f) { setStatus('status.failed'); return; }
    state.seed = seed; state.fixtures = f; state.results = null; state.simIndex = null;
    state.view = buildView(f);
    state.picks = {};
    state.dirty = false;
    state.drawn = new Set();
    state.drawComplete = !!o.revealed;
    writeHash('');
    if (apply) apply();
    const problems = verify(f, TEAMS, drawOpt());
    if (problems.length) setStatus('status.violation', { msg: problems[0] });
    else setStatus('status.ok', { matches: matchCount() });
    renderAll();
    persist();
  }, 10);
}

/** Yeni kura ceker ve cekilis ekranini acar; toplar kapali baslar. */
function startNewDraw() {
  if (!confirmDiscard()) return;
  newDraw(randomSeed(), null, { revealed: false });
  showTab('draw');
}

/** Torba renk anahtarlarini aktif bicime gore cizer. */
function renderLegend() {
  const host = $('#legend');
  host.innerHTML = '';
  const add = (mk, label) => {
    const span = el('span');
    span.appendChild(mk);
    span.append(' ' + label);
    host.appendChild(span);
  };
  add(el('i', 'key home'), tx('legend.home'));
  add(el('i', 'key away'), tx('legend.away'));
  POTS().forEach(pot => {
    const sw = el('i', 'key');
    sw.style.background = 'var(--p' + pot + ')';
    add(sw, tx('pot', { n: pot }));
  });
}

/** Baslik ve alt basliktaki sayilari aktif turnuvadan turetir. */
function renderHeader() {
  $('#season').textContent = COMP.season;
  $('#h1clubs').textContent = tx('head.clubs', { n: teamCount() });
  $('#h1matches').textContent = tx('head.matches', { n: matchCount() });
  $('#h1weeks').textContent = tx('head.weeks', { n: FORMAT.matchdays });
  $('.lede').textContent = tx(FORMAT.oppPerPot === 1 ? 'head.lede6' : 'head.lede');
}

/**
 * Turnuva secimi gercek baglantilardan olusur: hem oturum basina bir iki kez
 * kullanilan bir baglam secimi gibi durur, hem de arama motoru /ucl, /uel ve
 * /uecl sayfalarini buradan bulur. Tiklama JS ile yakalanip yerinde islenir.
 */
function renderCompNav() {
  const nav = $('#compnav');
  nav.innerHTML = '';
  COMP_IDS.forEach(id => {
    const link = el('a', null, tx('comp.' + id));
    link.href = '/' + id;
    link.dataset.comp = id;
    if (id === COMP.id) link.setAttribute('aria-current', 'page');
    if (!COMPETITIONS[id].available) link.appendChild(el('em', null, tx('comp.soon')));
    nav.appendChild(link);
  });
}

/** Kurasi henuz cekilmemis turnuva icin bilgi ekrani. */
function renderUnavailable() {
  renderHeader();
  renderLegend();
  const note = () => {
    const d = el('div', 'compnote');
    d.textContent = tx('comp.notDrawn', { comp: tx('comp.' + COMP.id), date: COMP.drawnOn });
    return d;
  };
  ['#matrix', '#teams', '#matchdays', '#table', '#probs', '#drawbowls'].forEach(sel => {
    const host = $(sel);
    host.innerHTML = '';
    host.appendChild(note());
  });
  $('#detail').innerHTML = '';
  $('#drawstage').innerHTML = '';
  setStatus('comp.awaiting');
}

function switchCompetition(id) {
  if (id === COMP.id) return;
  if (!confirmDiscard()) return;
  useCompetition(id);
  state.picks = {}; state.results = null; state.simIndex = null;
  state.selected = null; state.dirty = false;
  state.drawn = new Set(); state.drawComplete = false;
  savesLoaded = false;
  clearSession();
  renderCompNav();
  if (!COMP.available || !TEAMS.length) { renderUnavailable(); writeHash(COMP.id); return; }
  fillTeamPicker();
  newDraw(state.seed, null, { revealed: false });
  showTab('draw');
}

// Ic saha / deplasman ikonlari. Satir ici SVG cunku emoji her platformda
// farkli cizilir; SVG currentColor aldigi icin torba rengini de tasir.
const VENUE_SVG = {
  H: '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">'
     + '<path d="M8 1.4 15.2 8H13v6.6H9.4v-4.2H6.6v4.2H3V8H.8z" fill="currentColor"/></svg>',
  A: '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">'
     + '<path d="M15.3 7.3 10 7.9 6.9 14H5.4l1.7-5.9L3 8.6 1.7 10.5H.6l1-3.2-1-3.2h1.1L3 6l4.1.5L5.4 1h1.5L10 6.7z"'
     + ' fill="currentColor"/></svg>'
};

/** Saha ikonu; baslik olarak da metni tasir ki ikon tek basina kalmasin. */
function venueIcon(venue) {
  const wrap = el('span', 'vicon ' + (venue === 'H' ? 'home' : 'away'));
  wrap.innerHTML = VENUE_SVG[venue === 'H' ? 'H' : 'A'];
  wrap.title = tx(venue === 'H' ? 'venue.home' : 'venue.away');
  return wrap;
}

// --- cekilis gorunurlugu ------------------------------------------------
// Bir takim torbadan cikinca sekiz rakibi de aciklanmis olur, dolayisiyla
// iki taraftan biri cekilmisse mac gorunur hale gelir.
function fixtureRevealed(f) {
  return state.drawComplete || state.drawn.has(f.home) || state.drawn.has(f.away);
}

function visibleFixtures() {
  return state.drawComplete ? state.fixtures : state.fixtures.filter(fixtureRevealed);
}

function visibleRows(teamId) {
  const rows = state.view[teamId] || [];
  return state.drawComplete ? rows : rows.filter(r => fixtureRevealed(r.f));
}

function drawPending() {
  return !state.drawComplete && state.drawn.size === 0;
}

/** Cekilis beklerken diger sekmelerde gosterilen yonlendirme. */
function drawNotice() {
  const box = el('div', 'compnote');
  box.appendChild(el('div', null, tx(drawPending() ? 'draw.notYet' : 'draw.partial',
    { n: state.drawn.size, total: teamCount() })));
  const go = el('button', null, tx('draw.goToDraw'));
  go.style.marginTop = '14px';
  go.addEventListener('click', () => showTab('draw'));
  box.appendChild(go);
  return box;
}

let viewsStale = false;

function refreshViews() {
  viewsStale = false;
  renderMatrix(); renderDetail(); renderTeams(); renderMatchdays(); renderTable();
}

// --- oturum surekliligi ---------------------------------------------------
// Sayfa yenilenince kura ve skorlar kaybolmasin diye sekmeye yazilir.
// sessionStorage bilerek secildi: yenilemede kalir, sekme kapaninca gider,
// yani gunler sonra eski bir kurayi diriltmez ve paylasilabilir bir sey uretmez.
const SESSION_KEY = 'ucl:session';

function persist() {
  if (!state.fixtures.length) return;
  const sim = [];
  if (state.simIndex) {
    state.simIndex.forEach((r, f) => sim.push([fxKey(f), r.hg, r.ag]));
  }
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      v: 1,
      comp: COMP.id,
      fixture: state.fixtures.map(f => [f.home, f.away, f.md]),
      drawn: Array.from(state.drawn),
      drawComplete: state.drawComplete,
      picks: state.picks,
      sim: sim,
      dirty: state.dirty
    }));
  } catch (e) { /* depolama kapali olabilir */ }
}

function clearSession() {
  try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* yoksay */ }
}

function readSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data && data.v === 1 && Array.isArray(data.fixture) && data.fixture.length
      ? data : null;
  } catch (e) { return null; }
}

/** Yenileme sonrasi kurayi, cekilis ilerlemesini ve skorlari geri kurar. */
function restoreSession(data) {
  useCompetition(data.comp);
  renderCompNav();
  fillTeamPicker();

  state.fixtures = data.fixture.map(row => ({
    home: row[0], away: row[1],
    homePot: byId[row[0]] ? byId[row[0]].pot : 0,
    awayPot: byId[row[1]] ? byId[row[1]].pot : 0,
    md: row[2]
  })).filter(f => byId[f.home] && byId[f.away]);
  state.view = buildView(state.fixtures);
  state.drawn = new Set(data.drawn || []);
  state.drawComplete = !!data.drawComplete;
  state.picks = data.picks || {};
  state.dirty = !!data.dirty;

  const byKey = new Map(state.fixtures.map(f => [fxKey(f), f]));
  const sim = new Map();
  (data.sim || []).forEach(row => {
    const f = byKey.get(row[0]);
    if (f) sim.set(f, { f: f, hg: row[1], ag: row[2] });
  });
  state.simIndex = sim.size ? sim : null;
  state.results = sim.size ? Array.from(sim.values()) : null;

  setStatus('status.ok', { matches: matchCount() });
  renderAll();
  persist();
}

// ---------------------------------------------------------------------------
// 1. Matris
// ---------------------------------------------------------------------------
function renderMatrix() {
  const host = $('#matrix'); host.innerHTML = '';
  if (drawPending()) { host.appendChild(drawNotice()); return; }
  const map = new Map();
  for (const f of visibleFixtures()) {
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
    th.title = tx('matrix.rowTitle', { team: byId[rowId].name });
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
          ? tx('matrix.cellHome', { md: hit.f.md, home: byId[rowId].name, away: byId[colId].name })
          : tx('matrix.cellAway', { md: hit.f.md, home: byId[colId].name, away: byId[rowId].name });
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
    host.appendChild(el('p', 'hint', tx('detail.hint')));
    return;
  }
  const t = byId[state.selected];
  host.appendChild(el('h3', null, t.name));
  const counts = {};
  visibleRows(t.id).forEach(r => (counts[byId[r.opp].country] = (counts[byId[r.opp].country] || 0) + 1));
  const doubled = Object.entries(counts).filter(([, n]) => n > 1).map(([c]) => c);
  host.appendChild(el('div', 'meta',
    tx('detail.meta', { country: t.country, pot: t.pot, n: perTeam() / 2 })
    + (doubled.length ? ' · ' + tx('detail.doubled', { list: doubled.join(', ') }) : '')));

  const ol = el('ol', 'fix');
  visibleRows(t.id).forEach(r => {
    const li = el('li');
    li.appendChild(el('span', 'md', 'MD' + r.md));
    li.appendChild(venueIcon(r.venue));
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
  const current = pick.value;
  pick.innerHTML = '';
  const all = el('option', null, tx('teams.allOption'));
  all.value = '';
  pick.appendChild(all);
  POTS().forEach(pot => {
    const group = document.createElement('optgroup');
    group.label = tx('pot', { n: pot });
    ORDER.filter(id => byId[id].pot === pot)
      .sort((a, b) => byId[a].name.localeCompare(byId[b].name, 'tr'))
      .forEach(id => {
        const o = el('option', null, byId[id].name);
        o.value = id;
        group.appendChild(o);
      });
    pick.appendChild(group);
  });
  pick.value = current || '';
}

function renderTeams() {
  const host = $('#teams'); host.innerHTML = '';
  $('#teamall').hidden = !state.selected;
  $('#teamhint').textContent = state.selected
    ? tx('teams.hintSelected')
    : tx('teams.hint');

  if (drawPending()) { host.appendChild(drawNotice()); return; }
  if (state.selected) { host.appendChild(teamFocus(byId[state.selected])); return; }

  POTS().forEach(pot => {
    const head = el('div', 'pothead');
    head.appendChild(el('h2', null, tx('pot', { n: pot })));
    head.appendChild(el('div', 'line'));
    host.appendChild(head);
    const grid = el('div', 'cards');
    ORDER.filter(id => byId[id].pot === pot && visibleRows(id).length).forEach(id => {
      const t = byId[id];
      const card = el('button', 'card p' + pot);
      card.type = 'button';
      card.dataset.team = id;
      card.title = tx('teams.cardTitle', { team: t.name });
      const h = el('h4', null, t.name);
      card.appendChild(h);
      card.appendChild(el('div', 'sub', t.country));
      const ul = el('ul');
      visibleRows(id).forEach(r => {
        const li = el('li');
        li.appendChild(el('span', 'md', 'MD' + r.md));
        li.appendChild(venueIcon(r.venue));
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
  const rows = visibleRows(t.id);
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
  const bits = [t.country, tx('pot', { n: t.pot }), tx('focus.homeAway', { n: perTeam() / 2 })];
  if (doubled.length) bits.push(tx('detail.doubled', { list: doubled.join(', ') }));
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
    bits.push(tx('focus.record', { n: n, w: w, d: d, l: l, gf: gf, ga: ga, pts: w * 3 + d }));
  }
  box.appendChild(el('div', 'meta', bits.join(' · ')));

  const scroll = el('div', 'fixscroll');
  const table = el('table', 'fixtab');
  const hr = el('tr');
  const cols = ['focus.col.md', 'focus.col.date', 'focus.col.venue',
                'focus.col.opponent', 'focus.col.country', 'focus.col.pot'];
  if (hasScores) cols.push('focus.col.score');
  cols.forEach(c => hr.appendChild(el('th', null, tx(c))));
  table.appendChild(el('thead')).appendChild(hr);

  const tb = el('tbody');
  rows.forEach(r => {
    const opp = byId[r.opp];
    const tr = el('tr');
    tr.appendChild(el('td', 'md', 'MD' + r.md));
    tr.appendChild(el('td', 'dt', compDate(r.md)));

    const vn = el('td', 'vn p' + opp.pot);
    vn.appendChild(venueIcon(r.venue));
    vn.appendChild(el('span', 'vt', tx(r.venue === 'H' ? 'venue.home' : 'venue.away')));
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
        td.title = tx(res.pick ? 'tip.pick' : 'tip.sim');
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
function goalInput(key, side, value, placeholder) {
  const i = document.createElement('input');
  i.type = 'text';
  i.inputMode = 'numeric';
  i.maxLength = 2;
  i.dataset.fx = key;
  i.dataset.side = side;
  i.value = value === null ? '' : String(value);
  i.placeholder = placeholder === null ? '·' : String(placeholder);
  i.setAttribute('aria-label', tx(side === 'h' ? 'md.goalHome' : 'md.goalAway'));
  return i;
}

function renderMatchdays() {
  const host = $('#matchdays'); host.innerHTML = '';
  if (drawPending()) { host.appendChild(drawNotice()); updatePickCount(); return; }
  const grid = el('div', 'mdgrid');
  for (let md = 1; md <= FORMAT.matchdays; md++) {
    const b = el('div', 'mdblock');
    b.appendChild(el('h4', null, tx('md.week', { n: md })));
    b.appendChild(el('div', 'hint', compDate(md)));
    visibleFixtures().filter(f => f.md === md).forEach(f => {
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
    ? tx('md.countSome', { n: n, total: matchCount() })
    : tx('md.countNone');
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
  state.dirty = true;
  persist();
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
    if (state.picks[k] || !fixtureRevealed(r.f)) continue;
    state.picks[k] = { hg: r.hg, ag: r.ag };
  }
  state.dirty = true;
  persist();
  renderMatchdays(); renderTable(); renderTeams();
  const added = pickCount() - before;
  mdStatus(!added ? tx('md.allFull')
    : (before ? tx('md.filledKept', { n: added, kept: before }) : tx('md.filled', { n: added })));
}

function clearPicks() {
  if (!pickCount()) return;
  if (!confirm(tx('md.clearConfirm'))) return;
  state.picks = {};
  state.dirty = mergedResults().length > 0;
  persist();
  renderMatchdays(); renderTable(); renderTeams();
}

// ---------------------------------------------------------------------------
// 4. Puan tablosu
// ---------------------------------------------------------------------------
function playSeason() {
  const rng = makeRng((Math.random() * 1e9) | 0);
  state.results = simulateSeason(state.fixtures, TEAMS, rng);
  state.simIndex = new Map(state.results.map(r => [r.f, r]));
  state.dirty = true;
  persist();
  renderTable(); renderMatchdays(); renderTeams();
}

function sourceNote(played, picked) {
  const p = el('p', 'src');
  const total = state.fixtures.length;
  if (picked && played > picked) {
    p.textContent = tx('src.mixed', { picked: picked, sim: played - picked });
  } else if (picked && played === total) {
    p.textContent = tx('src.allPicks', { picked: picked });
  } else if (picked) {
    p.textContent = tx('src.picksOnly', { picked: picked });
  } else {
    p.textContent = tx('src.simOnly', { played: played });
  }
  return p;
}

function renderTable() {
  const host = $('#table'); host.innerHTML = '';
  if (drawPending()) { host.appendChild(drawNotice()); return; }
  const results = mergedResults();
  if (!results.length) {
    host.appendChild(el('p', 'hint', tx('table.hint')));
    return;
  }
  host.appendChild(sourceNote(results.length, pickCount()));
  const rows = buildTable(results, TEAMS);
  const table = el('table', 'std');
  const head = el('tr');
  ['table.col.pos', 'table.col.club', 'table.col.p', 'table.col.w', 'table.col.d',
   'table.col.l', 'table.col.gf', 'table.col.ga', 'table.col.gd', 'table.col.pts']
    .forEach((k, i) => head.appendChild(el('th', i === 1 ? 'l' : '', tx(k))));
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
  [['var(--accent)', 'bands.q'], ['rgba(178,106,0,.35)', 'bands.po'],
   ['var(--paper-3)', 'bands.out']].forEach(pair => {
    const span = el('span');
    const sw = el('i', 'swatch');
    sw.style.background = pair[0];
    span.appendChild(sw);
    span.append(tx(pair[1]));
    bands.appendChild(span);
  });
  host.appendChild(bands);
}

// ---------------------------------------------------------------------------
// 5. Olasiliklar
// ---------------------------------------------------------------------------
function runMonteCarlo() {
  if (!state.drawComplete) {
    const out = $('#probs'); out.innerHTML = '';
    out.appendChild(drawNotice());
    return;
  }
  const mode = $('#mcmode').value;
  const total = mode === 'fixed' ? 3000 : 120;
  const btn = $('#mcrun'); btn.disabled = true;
  const out = $('#probs'); out.innerHTML = '';
  const prog = el('div', 'progress', tx('probs.working', { done: 0, total: total })); out.appendChild(prog);

  const acc = Object.fromEntries(ORDER.map(id => [id, { q: 0, p: 0, pts: 0, pos: 0 }]));
  const rng = makeRng((Math.random() * 1e9) | 0);
  let done = 0, fixtures = state.fixtures;

  const chunk = () => {
    const t0 = performance.now();
    while (done < total && performance.now() - t0 < 60) {
      if (mode !== 'fixed') {
        const f = runDraw(TEAMS, (rng() * 1e9) | 0, FORMAT);
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
    prog.textContent = tx('probs.working', { done: done, total: total });
    if (done < total) return requestAnimationFrame(chunk);
    btn.disabled = false;
    renderProbs(acc, total, mode);
  };
  requestAnimationFrame(chunk);
}

function renderProbs(acc, total, mode) {
  const out = $('#probs'); out.innerHTML = '';
  out.appendChild(el('p', 'hint',
    tx(mode === 'fixed' ? 'probs.hintFixed' : 'probs.hintRedraw', { total: total })));
  const list = ORDER.slice().sort((a, b) => acc[b].q - acc[a].q || acc[b].p - acc[a].p);
  const head = el('div', 'prob');
  head.appendChild(el('div', 'nm', ''));
  head.appendChild(el('div', 'hint', tx('probs.legend')));
  head.appendChild(el('div', 'hint', tx('probs.avg')));
  out.appendChild(head);
  list.forEach(id => {
    const a = acc[id];
    const row = el('div', 'prob');
    row.appendChild(el('div', 'nm', byId[id].name));
    const bar = el('div', 'pbar');
    const q = el('i', 'q'); q.style.width = (100 * a.q / total) + '%';
    const p = el('i', 'p'); p.style.width = (100 * a.p / total) + '%';
    bar.append(q, p);
    bar.title = tx('probs.tooltip', { q: (100 * a.q / total).toFixed(1), p: (100 * a.p / total).toFixed(1) });
    row.appendChild(bar);
    row.appendChild(el('div', '', (a.pts / total).toFixed(1)));
    out.appendChild(row);
  });
}

// ---------------------------------------------------------------------------
// 6. Cekilis toreni
// ---------------------------------------------------------------------------
const ceremony = {
  gen: 0, busy: false, auto: false, paused: false, skip: false,
  speed: 1, pot: 0, drawn: 0, taken: new Set()
};
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

/** Sahnedeki acilmis top: takim kodunu tasir. */
function stageBall(t) {
  const b = el('div', 'ball big p' + t.pot);
  b.title = t.name;
  b.textContent = t.code;
  return b;
}

/** Torbadaki kapali top: hangi takim oldugu belli degildir. */
function closedBall(pot) {
  const b = el('button', 'ball p' + pot);
  b.type = 'button';
  b.dataset.pot = String(pot);
  b.title = tx('draw.ballTitle', { n: pot });
  b.setAttribute('aria-label', tx('draw.ballLabel', { n: pot }));
  return b;
}

function renderBowls() {
  const host = $('#drawbowls');
  host.innerHTML = '';
  POTS().forEach(pot => {
    const bowl = el('div', 'bowl p' + pot);
    bowl.dataset.pot = String(pot);
    bowl.appendChild(el('h4', null, tx('pot', { n: pot })));
    const balls = el('div', 'balls');
    ORDER.filter(id => byId[id].pot === pot).forEach(() => balls.appendChild(closedBall(pot)));
    bowl.appendChild(balls);
    host.appendChild(bowl);
  });
}

function remainingInPot(pot) {
  return ORDER.filter(id => byId[id].pot === pot && !ceremony.taken.has(id));
}

function freeBall(pot) {
  return document.querySelector('#drawbowls .bowl[data-pot="' + pot + '"] .ball:not(.picked)');
}

/** Kapali topu acar: takim kodunu yazar ve sonencesine soluklastirir. */
function openBall(ball, t) {
  if (!ball) return;
  ball.textContent = t.code;
  ball.title = t.name;
  ball.setAttribute('aria-label', tx('draw.ballDrawn', { team: t.name }));
  ball.classList.add('picked');
}

function setDrawUI() {
  const busy = ceremony.busy;
  const done = state.drawComplete;
  const left = teamCount() - ceremony.drawn;
  $('#drawstart').hidden = done;
  $('#drawstart').disabled = busy || left === 0;
  $('#drawstart').textContent = busy && ceremony.auto
    ? tx('draw.drawing')
    : (ceremony.drawn ? tx('draw.autoRemaining', { n: left }) : tx('draw.auto'));
  $('#drawpause').hidden = !(busy && ceremony.auto);
  $('#drawskip').hidden = !busy;
  $('#drawskip').textContent = tx(ceremony.auto ? 'draw.skipAll' : 'draw.skipTeam');
  $('#drawbowls').classList.toggle('locked', busy || done);
}

function activateBowl(pot) {
  document.querySelectorAll('#drawbowls .bowl').forEach(b =>
    b.classList.toggle('active', b.dataset.pot === String(pot)));
}

function stageTeam(t) {
  const stage = $('#drawstage');
  stage.innerHTML = '';
  const card = el('div', 'drawcard');
  card.appendChild(stageBall(t));
  const info = el('div', 'info');
  info.appendChild(el('h3', null, t.name));
  info.appendChild(el('div', 'meta', tx('draw.opponentsOf', { country: t.country, pot: t.pot, n: perTeam() })));
  card.appendChild(info);
  stage.appendChild(card);
  const opps = el('div', 'opps');
  opps.id = 'drawopps';
  stage.appendChild(opps);
}

function revealOpponent(r) {
  const opp = byId[r.opp];
  const row = el('div', 'opp p' + opp.pot);
  row.appendChild(venueIcon(r.venue));
  row.appendChild(el('span', 'nm', opp.name));
  row.appendChild(el('span', 'vn', tx(r.venue === 'H' ? 'venue.home' : 'venue.away')));
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
  ceremony.taken = new Set();
  $('#drawpause').textContent = tx('draw.pause');
  renderBowls();
  $('#drawstage').innerHTML = '';
  // Cekilmis takimlarin toplari acik gelir: sayfa yenilendiginde yarim kalan
  // cekilis kaldigi yerden devam edebilsin.
  const opened = state.drawComplete ? ORDER.slice() : Array.from(state.drawn);
  opened.forEach(id => {
    if (!byId[id]) return;
    ceremony.taken.add(id);
    openBall(freeBall(byId[id].pot), byId[id]);
  });
  ceremony.drawn = ceremony.taken.size;

  setDrawUI();
  if (state.drawComplete) {
    drawStatus(tx('draw.alreadyDone', { teams: teamCount(), matches: matchCount() }));
  } else if (ceremony.drawn) {
    drawStatus(tx('draw.next', { n: ceremony.drawn, total: teamCount() }));
  } else {
    drawStatus(tx('draw.intro'));
  }
}

function finishCeremony() {
  POTS().forEach(pot => {
    remainingInPot(pot).forEach(id => {
      ceremony.taken.add(id);
      openBall(freeBall(pot), byId[id]);
    });
  });
  activateBowl(0);
  ceremony.drawn = teamCount();
  state.drawComplete = true;
  ceremony.busy = false;
  ceremony.auto = false;
  ceremony.paused = false;
  ceremony.skip = false;
  $('#drawpause').textContent = 'Duraklat';
  setDrawUI();
  drawStatus(tx('draw.finished', { teams: teamCount(), matches: matchCount() }));
  refreshViews();
  persist();
}

/** Tek takimin cekilisi: top calkalanir, acilir, rakipler tek tek gelir. */
async function revealTeam(t, gen, ball) {
  ceremony.pot = t.pot;
  ceremony.taken.add(t.id);
  activateBowl(t.pot);
  drawStatus(tx('draw.spinning', { pot: t.pot }));
  if (!await cwait(CTIME.spin, gen)) return false;

  openBall(ball || freeBall(t.pot), t);
  activateBowl(0);
  state.drawn.add(t.id);
  viewsStale = true;
  persist();
  ceremony.drawn++;
  stageTeam(t);
  drawStatus(tx('draw.opening', { n: ceremony.drawn, total: teamCount(), team: t.name }));
  if (!await cwait(CTIME.reveal, gen)) return false;

  const rows = state.view[t.id];
  for (let i = 0; i < rows.length; i++) {
    revealOpponent(rows[i]);
    if (ceremony.skip) continue;
    if (!await cwait(CTIME.opponent, gen)) return false;
  }
  drawStatus(tx('draw.teamDone', { n: ceremony.drawn, total: teamCount(), team: t.name, h: perTeam() / 2 }));
  return true;
}

/** Tiklanan torbadan kalanlar arasindan rastgele bir takim ceker. */
async function pickBall(ball) {
  if (ceremony.busy || !state.fixtures.length) return;
  const pot = Number(ball.dataset.pot);
  const left = remainingInPot(pot);
  if (!left.length) return;

  const t = byId[left[Math.floor(Math.random() * left.length)]];
  const gen = ceremony.gen;
  ceremony.busy = true;
  ceremony.auto = false;
  ceremony.skip = false;
  setDrawUI();

  const ok = await revealTeam(t, gen, ball);
  if (ceremony.gen !== gen) return;

  ceremony.busy = false;
  ceremony.skip = false;
  if (ok && ceremony.drawn >= teamCount()) { finishCeremony(); return; }
  setDrawUI();
  if (ok) drawStatus(tx('draw.next', { n: ceremony.drawn, total: teamCount() }));
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

  for (let pot = 1; pot <= FORMAT.pots && !ceremony.skip; pot++) {
    let left = remainingInPot(pot);
    while (left.length && !ceremony.skip) {
      const t = byId[left[Math.floor(Math.random() * left.length)]];
      if (!await revealTeam(t, gen)) return;
      if (!await cwait(CTIME.rest, gen)) return;
      left = remainingInPot(pot);
    }
  }
  if (ceremony.gen !== gen) return;
  finishCeremony();
}


// ---------------------------------------------------------------------------
// 7. Kayitlar
// ---------------------------------------------------------------------------
// Sayfayi Worker sunuyor, dolayisiyla API ayni origin'de: bos dize gorece
// yol demek. Tek istisna github.io aynasi, oradan mutlak adrese gidilir.
const API = /(^|\.)github\.io$/.test(location.hostname) ? 'https://drawer.win' : '';
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

/** Kaydin fiksturu: [ev, deplasman, hafta]. Kayit boylece uretecten bagimsiz olur. */
function currentFixture() {
  return state.fixtures.map(f => [f.home, f.away, f.md]);
}

/**
 * Kaydedilmis fiksturu dogrudan kurar. Tohumdan yeniden uretmek yerine bunu
 * kullaniyoruz; kura algoritmasi degisse bile eski kayitlar bozulmaz.
 */
function loadSavedDraw(payload) {
  state.fixtures = (payload.fixture || []).map(row => ({
    home: row[0], away: row[1],
    homePot: byId[row[0]] ? byId[row[0]].pot : 0,
    awayPot: byId[row[1]] ? byId[row[1]].pot : 0,
    md: row[2]
  })).filter(f => byId[f.home] && byId[f.away]);
  state.seed = payload.seed || 0;
  state.view = buildView(state.fixtures);
  state.results = null; state.simIndex = null;
  state.picks = {}; state.dirty = false;
  state.drawn = new Set(); state.drawComplete = true;
  applySave(payload);
  setStatus('status.ok', { matches: matchCount() });
  renderAll();
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
  state.dirty = false;
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
    btn.textContent = tx('share.copied');
    setTimeout(() => { btn.textContent = old; }, 1500);
  } catch (e) {
    prompt(tx('share.fallback'), text);
  }
}

function renderShare(host, id) {
  host.innerHTML = '';
  const box = el('div', 'sharebox');
  box.appendChild(el('div', 'lbl', tx('share.label')));
  const row = el('div', 'row');
  const input = document.createElement('input');
  input.type = 'text';
  input.readOnly = true;
  input.value = shareUrl(id);
  input.addEventListener('focus', () => input.select());
  row.appendChild(input);
  const btn = el('button', null, tx('share.copy'));
  btn.addEventListener('click', () => copyText(input.value, btn));
  row.appendChild(btn);
  box.appendChild(row);
  host.appendChild(box);
}

/** Ekrandaki skorlari sunucuya yazar; id ve sayilari dondurur. */
async function submitSave(name) {
  if (!name) throw new Error(tx('saves.needName'));
  const { scores, picks } = currentScores();
  const total = Object.keys(scores).length;
  if (!total) throw new Error(tx('saves.needScores'));

  const data = await apiCall('/api/saves', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name, comp: COMP.id, seed: state.seed,
      fixture: currentFixture(), scores, picks
    })
  });
  const tokens = loadTokens();
  tokens[data.id] = data.token;
  storeTokens(tokens);
  savesLoaded = false;
  state.dirty = false;
  return { id: data.id, total, picks: picks.length };
}

async function createSave() {
  const btn = $('#savebtn');
  btn.disabled = true;
  saveStatus(tx('saves.saving'));
  try {
    const r = await submitSave($('#savename').value.trim());
    $('#savename').value = '';
    saveStatus(tx('saves.saved', { total: r.total, picks: r.picks }));
    renderShare($('#saveshare'), r.id);
    listSaves();
  } catch (e) {
    saveStatus(tx('saves.saveFailed', { msg: e.message }), true);
  } finally {
    btn.disabled = false;
  }
}

async function saveFixture() {
  const name = prompt(tx('md.savePrompt'), tx('md.saveDefault', { seed: state.seed }));
  if (name === null) return;
  const btn = $('#savefixture');
  btn.disabled = true;
  mdStatus(tx('saves.saving'));
  try {
    const r = await submitSave(name.trim());
    mdStatus(tx('saves.saved', { total: r.total, picks: r.picks }));
    renderShare($('#mdshare'), r.id);
  } catch (e) {
    mdStatus(tx('saves.saveFailed', { msg: e.message }), true);
  } finally {
    btn.disabled = false;
  }
}

async function listSaves() {
  const host = $('#saves');
  host.innerHTML = '';
  host.appendChild(el('p', 'hint', tx('saves.loading')));
  try {
    const data = await apiCall('/api/saves');
    savesLoaded = true;
    renderSaves(data.saves || []);
  } catch (e) {
    host.innerHTML = '';
    host.appendChild(el('p', 'hint bad', tx('saves.listFailed', { msg: e.message })));
  }
}

function renderSaves(rows) {
  const host = $('#saves');
  host.innerHTML = '';
  if (!rows.length) {
    host.appendChild(el('p', 'hint', tx('saves.empty')));
    return;
  }
  const tokens = loadTokens();
  const list = el('div', 'savelist');
  rows.forEach(r => {
    const mine = !!tokens[r.id];
    const row = el('div', 'saverow' + (mine ? ' mine' : ''));
    const left = el('div');
    left.appendChild(el('h4', null, r.name));
    const when = new Date(r.created_at).toLocaleDateString(tx('locale'));
    left.appendChild(el('div', 'meta',
      tx('saves.meta', { comp: tx('comp.' + (r.comp || 'ucl')), matches: r.matches, picks: r.picks, date: when })));
    row.appendChild(left);

    const acts = el('div', 'acts');
    const open = el('button', null, tx('saves.open'));
    open.dataset.open = r.id;
    acts.appendChild(open);
    const link = el('button', 'ghost', tx('saves.link'));
    link.dataset.link = r.id;
    acts.appendChild(link);
    if (mine) {
      const del = el('button', 'ghost', tx('saves.delete'));
      del.dataset.del = r.id;
      acts.appendChild(del);
    }
    row.appendChild(acts);
    list.appendChild(row);
  });
  host.appendChild(list);
}

async function openSave(id, fromLink) {
  if (!fromLink && !confirmDiscard()) return;
  saveStatus(tx('saves.opening'));
  if (fromLink) mdStatus(tx('saves.openingShared'));
  try {
    const data = await apiCall('/api/saves/' + encodeURIComponent(id));
    const payload = data.payload || {};
    const wanted = payload.comp || data.comp || 'ucl';
    if (wanted !== COMP.id) {
      useCompetition(wanted);
      renderCompNav();
      fillTeamPicker();
    }
    if (payload.fixture && payload.fixture.length) {
      loadSavedDraw(payload);
      writeHash('k=' + id);
    } else {
      // Fikstur alani eklenmeden once yazilmis kayitlar tohumdan uretilir.
      newDraw(payload.seed, () => {
        applySave(payload);
        writeHash('k=' + id);
      }, { revealed: true });
    }
    newDraw(payload.seed, () => {
      applySave(payload);
      writeHash('k=' + id);
    }, { revealed: true });
    const note = tx('saves.opened', { name: data.name, comp: tx('comp.' + wanted), matches: data.matches });
    saveStatus(note);
    if (fromLink) { mdStatus(note); showTab('table'); }
  } catch (e) {
    saveStatus(tx('saves.openFailed', { msg: e.message }), true);
    if (fromLink) mdStatus(tx('saves.openFailedShared', { msg: e.message }), true);
  }
}

async function removeSave(id) {
  const tokens = loadTokens();
  if (!tokens[id]) return saveStatus(tx('saves.notYours'), true);
  if (!confirm(tx('saves.deleteConfirm'))) return;
  try {
    await apiCall('/api/saves/' + encodeURIComponent(id), {
      method: 'DELETE',
      headers: { 'X-Save-Token': tokens[id] }
    });
    delete tokens[id];
    storeTokens(tokens);
    saveStatus(tx('saves.deleted'));
    listSaves();
  } catch (e) {
    saveStatus(tx('saves.deleteFailed', { msg: e.message }), true);
  }
}

// ---------------------------------------------------------------------------
// sekmeler + baslangic
// ---------------------------------------------------------------------------
function renderAll() {
  renderHeader(); renderLegend(); renderMatrix(); renderDetail(); renderTeams(); renderMatchdays(); renderTable();
  resetCeremony();
  $('#probs').innerHTML = '';
  $('#probs').appendChild(el('p', 'hint', tx('probs.press')));
}

document.querySelectorAll('nav.tabs button').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('nav.tabs button').forEach(x =>
      x.setAttribute('aria-selected', String(x === b)));
    document.querySelectorAll('main section').forEach(s =>
      (s.hidden = s.id !== 'view-' + b.dataset.view));
    if (viewsStale) refreshViews();
    if (b.dataset.view === 'saves' && !savesLoaded) listSaves();
  });
});
$('#redraw').addEventListener('click', startNewDraw);
$('#random').addEventListener('click', () => {
  if (!confirmDiscard()) return;
  newDraw(randomSeed(), null, { revealed: true });
});
$('#play').addEventListener('click', playSeason);
$('#mcrun').addEventListener('click', runMonteCarlo);
$('#teampick').addEventListener('change', e => selectTeam(e.target.value || null));
$('#teamall').addEventListener('click', () => selectTeam(null));
$('#pickclear').addEventListener('click', clearPicks);
$('#autofill').addEventListener('click', autofillPicks);
$('#drawstart').addEventListener('click', runCeremony);
$('#drawskip').addEventListener('click', () => { ceremony.skip = true; });
$('#drawbowls').addEventListener('click', e => {
  const ball = e.target.closest('button.ball');
  if (ball && !ball.classList.contains('picked')) pickBall(ball);
});
$('#drawpause').addEventListener('click', () => {
  ceremony.paused = !ceremony.paused;
  $('#drawpause').textContent = tx(ceremony.paused ? 'draw.resume' : 'draw.pause');
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
  if (h.saveId) openSave(h.saveId, true);
});

$('#lang').addEventListener('change', e => setLang(e.target.value));

/**
 * Dili degistirir ve ekrandaki her seyi yeniden cizer. Kura, tahminler ve skorlar
 * korunur; yalnizca metinler degisir.
 */
function setLang(lang) {
  LANG = I18N[lang] ? lang : 'en';
  try { localStorage.setItem(LANG_KEY, LANG); } catch (e) { /* depolama kapalı */ }
  $('#lang').value = LANG;
  applyStaticI18n();
  renderCompNav();
  renderHeader();
  renderLegend();
  setStatus(state.status.key, state.status.vars);
  if (!COMP.available || !TEAMS.length) { renderUnavailable(); return; }
  fillTeamPicker();
  renderMatrix(); renderDetail(); renderTeams(); renderMatchdays(); renderTable();
  relabelCeremony();
  mdStatus('');
  saveStatus('');
  $('#probs').innerHTML = '';
  $('#probs').appendChild(el('p', 'hint', tx('probs.press')));
  if (savesLoaded) listSaves();
}

/** Torba basliklarini yeniden yazar; devam eden cekilisi bozmaz. */
function relabelCeremony() {
  document.querySelectorAll('#drawbowls .bowl').forEach(bowl => {
    const h = bowl.querySelector('h4');
    if (h) h.textContent = tx('pot', { n: bowl.dataset.pot });
    bowl.querySelectorAll('.ball:not(.picked)').forEach(b => {
      b.title = tx('draw.ballTitle', { n: bowl.dataset.pot });
      b.setAttribute('aria-label', tx('draw.ballLabel', { n: bowl.dataset.pot }));
    });
  });
  setDrawUI();
  if (!ceremony.busy && ceremony.drawn === 0) drawStatus(tx('draw.intro'));
  else if (!ceremony.busy && ceremony.drawn >= teamCount()) drawStatus(tx('draw.finished', { teams: teamCount(), matches: matchCount() }));
}

$('#compnav').addEventListener('click', e => {
  const link = e.target.closest('a[data-comp]');
  if (!link) return;
  e.preventDefault();
  switchCompetition(link.dataset.comp);
});

LANG = detectLang();
$('#lang').value = LANG;
applyStaticI18n();

const initialHash = parseHash();
useCompetition(initialHash.comp || 'ucl');
renderCompNav();
state.seed = initialHash.seed || state.seed;
const saved = initialHash.saveId ? null : readSession();

if (initialHash.saveId) {
  openSave(initialHash.saveId, true);
} else if (saved && (!initialHash.comp || saved.comp === initialHash.comp)) {
  // Sayfa yenilenmis: kura, cekilis ilerlemesi ve skorlar geri gelir.
  restoreSession(saved);
  if (!saved.drawComplete) showTab('draw');
} else if (!COMP.available || !TEAMS.length) {
  renderUnavailable();
} else {
  clearSession();
  fillTeamPicker();
  newDraw(state.seed, null, { revealed: false });
  showTab('draw');
}
