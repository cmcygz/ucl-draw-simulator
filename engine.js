// ---------------------------------------------------------------------------
// UCL lig asamasi kura motoru (JS portu)
// ---------------------------------------------------------------------------

const TEAMS = [
  { id:'psg',        name:'Paris',        code:'PAR', country:'FRA', pot:1, rating:1950 },
  { id:'bayern',     name:'Bayern',       code:'BAY', country:'GER', pot:1, rating:1930 },
  { id:'real',       name:'Real Madrid',  code:'RMA', country:'ESP', pot:1, rating:1910 },
  { id:'arsenal',    name:'Arsenal',      code:'ARS', country:'ENG', pot:1, rating:1905 },
  { id:'liverpool',  name:'Liverpool',    code:'LIV', country:'ENG', pot:1, rating:1900 },
  { id:'mancity',    name:'Man City',     code:'MCI', country:'ENG', pot:1, rating:1890 },
  { id:'barcelona',  name:'Barcelona',    code:'BAR', country:'ESP', pot:1, rating:1885 },
  { id:'inter',      name:'Inter',        code:'INT', country:'ITA', pot:1, rating:1880 },
  { id:'atleti',     name:'Atlético',     code:'ATM', country:'ESP', pot:1, rating:1850 },

  { id:'dortmund',   name:'Dortmund',     code:'DOR', country:'GER', pot:2, rating:1790 },
  { id:'villa',      name:'Aston Villa',  code:'AVL', country:'ENG', pot:2, rating:1780 },
  { id:'manutd',     name:'Man Utd',      code:'MUN', country:'ENG', pot:2, rating:1775 },
  { id:'roma',       name:'Roma',         code:'ROM', country:'ITA', pot:2, rating:1770 },
  { id:'sporting',   name:'Sporting CP',  code:'SPO', country:'POR', pot:2, rating:1760 },
  { id:'porto',      name:'Porto',        code:'POR', country:'POR', pot:2, rating:1740 },
  { id:'betis',      name:'Real Betis',   code:'BET', country:'ESP', pot:2, rating:1730 },
  { id:'psv',        name:'PSV',          code:'PSV', country:'NED', pot:2, rating:1720 },
  { id:'brugge',     name:'Club Brugge',  code:'BRU', country:'BEL', pot:2, rating:1700 },

  { id:'napoli',     name:'Napoli',       code:'NAP', country:'ITA', pot:3, rating:1710 },
  { id:'leipzig',    name:'Leipzig',      code:'RBL', country:'GER', pot:3, rating:1690 },
  { id:'villarreal', name:'Villarreal',   code:'VIL', country:'ESP', pot:3, rating:1680 },
  { id:'feyenoord',  name:'Feyenoord',    code:'FEY', country:'NED', pot:3, rating:1660 },
  { id:'galatasaray',name:'Galatasaray',  code:'GAL', country:'TUR', pot:3, rating:1655 },
  { id:'lille',      name:'Lille',        code:'LIL', country:'FRA', pot:3, rating:1650 },
  { id:'fenerbahce', name:'Fenerbahçe',   code:'FEN', country:'TUR', pot:3, rating:1640 },
  { id:'bodo',       name:'Bodø/Glimt',   code:'BOD', country:'NOR', pot:3, rating:1600 },
  { id:'shakhtar',   name:'Shakhtar',     code:'SHA', country:'UKR', pot:3, rating:1590 },

  { id:'stuttgart',  name:'Stuttgart',    code:'VFB', country:'GER', pot:4, rating:1580 },
  { id:'como',       name:'Como',         code:'COM', country:'ITA', pot:4, rating:1550 },
  { id:'lens',       name:'Lens',         code:'LEN', country:'FRA', pot:4, rating:1545 },
  { id:'slavia',     name:'Slavia Praha', code:'SLA', country:'CZE', pot:4, rating:1540 },
  { id:'aek',        name:'AEK Athens',   code:'AEK', country:'GRE', pot:4, rating:1520 },
  { id:'lask',       name:'LASK',         code:'LSK', country:'AUT', pot:4, rating:1490 },
  { id:'viking',     name:'Viking',       code:'VIK', country:'NOR', pot:4, rating:1470 },
  { id:'slovan',     name:'S. Bratislava',code:'SLO', country:'SVK', pot:4, rating:1460 },
  { id:'sabah',      name:'Sabah',        code:'SAB', country:'AZE', pot:4, rating:1420 },
];

// deterministik RNG (mulberry32)
function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const shuffle = (arr, rng) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const DEFAULTS = {
  maxSameCountry: 2,
  allowSameCountry: false,
  bannedHome: [],      // ['liverpool>real', ...]  ev sahibi > deplasman
  nodeBudget: 60000,
};

// --- 1. rakip atamasi -------------------------------------------------------
function drawOpponents(teams, opt, rng) {
  const byId = Object.fromEntries(teams.map(t => [t.id, t]));
  const ids = teams.map(t => t.id);
  const potMembers = { 1: [], 2: [], 3: [], 4: [] };
  teams.forEach(t => potMembers[t.pot].push(t.id));

  const need = {};
  ids.forEach(i => [1, 2, 3, 4].forEach(p => (need[i + '|' + p] = 2)));
  const opp = Object.fromEntries(ids.map(i => [i, new Set()]));
  const cc = Object.fromEntries(ids.map(i => [i, {}]));
  const edges = [];
  let budget = opt.nodeBudget;

  const compatible = (a, b) => {
    if (a === b || opp[a].has(b)) return false;
    const ta = byId[a], tb = byId[b];
    if (!opt.allowSameCountry && ta.country === tb.country) return false;
    if (need[b + '|' + ta.pot] <= 0) return false;
    if ((cc[a][tb.country] || 0) >= opt.maxSameCountry) return false;
    if ((cc[b][ta.country] || 0) >= opt.maxSameCountry) return false;
    return true;
  };

  const solve = () => {
    if (--budget <= 0) throw new Error('budget');
    let best = null, bestCands = null;
    for (const id of ids) {
      for (const p of [1, 2, 3, 4]) {
        const k = id + '|' + p;
        if (need[k] <= 0) continue;
        const cands = potMembers[p].filter(o => compatible(id, o));
        if (cands.length < need[k]) return false;          // ileri bakis budamasi
        if (!bestCands || cands.length < bestCands.length) {
          best = [id, p]; bestCands = cands;
        }
      }
    }
    if (!best) return true;

    const [team, pot] = best;
    const ta = byId[team];
    for (const other of shuffle(bestCands.slice(), rng)) {
      const tb = byId[other];
      need[team + '|' + pot]--; need[other + '|' + ta.pot]--;
      opp[team].add(other); opp[other].add(team);
      cc[team][tb.country] = (cc[team][tb.country] || 0) + 1;
      cc[other][ta.country] = (cc[other][ta.country] || 0) + 1;
      edges.push([team, other]);

      if (solve()) return true;

      edges.pop();
      cc[team][tb.country]--; cc[other][ta.country]--;
      opp[team].delete(other); opp[other].delete(team);
      need[team + '|' + pot]++; need[other + '|' + ta.pot]++;
    }
    return false;
  };

  try { return solve() ? edges : null; }
  catch (e) { return null; }
}

// --- 2. ic saha / deplasman -------------------------------------------------
// Her (potA,potB) blogu 2-regular graf -> dongulere ayrilir. Donguyu tek yonde
// dolasmak her takima tam 1 ic saha + 1 deplasman verir.
function orient(edges, teams, opt, rng) {
  const byId = Object.fromEntries(teams.map(t => [t.id, t]));
  const banned = new Set(opt.bannedHome);
  const blocks = new Map();
  for (const [a, b] of edges) {
    const key = [byId[a].pot, byId[b].pot].sort().join('-');
    if (!blocks.has(key)) blocks.set(key, []);
    blocks.get(key).push([a, b]);
  }

  const fixtures = [];
  for (const blockEdges of blocks.values()) {
    const adj = {};
    const unused = new Set();
    for (const [a, b] of blockEdges) {
      (adj[a] = adj[a] || []).push(b);
      (adj[b] = adj[b] || []).push(a);
      unused.add(a < b ? a + '|' + b : b + '|' + a);
    }
    const key = (x, y) => (x < y ? x + '|' + y : y + '|' + x);

    while (unused.size) {
      const start = unused.values().next().value.split('|')[0];
      const cycle = [];
      let cur = start, prev = null;
      for (;;) {
        const next = adj[cur].find(n => n !== prev && unused.has(key(cur, n)));
        if (next === undefined) break;
        unused.delete(key(cur, next));
        cycle.push([cur, next]);
        prev = cur; cur = next;
        if (cur === start) break;
      }
      const fwdBad = cycle.some(([h, a]) => banned.has(h + '>' + a));
      const revBad = cycle.some(([h, a]) => banned.has(a + '>' + h));
      if (fwdBad && revBad) return null;
      const flip = fwdBad || (!revBad && rng() < 0.5);
      for (const [h, a] of cycle) {
        const [home, away] = flip ? [a, h] : [h, a];
        fixtures.push({ home, away, homePot: byId[home].pot, awayPot: byId[away].pot, md: null });
      }
    }
  }
  return fixtures;
}

// --- 3. hafta atamasi -------------------------------------------------------
// Fikstur grafi 8-regular; her hafta = bir mukemmel eslesme (18 mac).
function perfectMatching(adj, ids, rng, budgetRef) {
  const matched = new Set();
  const out = [];
  const rec = () => {
    if (--budgetRef.v <= 0) return false;
    let v = null, cands = null;
    for (const id of ids) {
      if (matched.has(id)) continue;
      const c = adj[id].filter(u => !matched.has(u));
      if (!cands || c.length < cands.length) { v = id; cands = c; }
      if (cands.length === 0) break;
    }
    if (!v) return true;
    if (!cands.length) return false;
    for (const u of shuffle(cands.slice(), rng)) {
      matched.add(v); matched.add(u); out.push([v, u]);
      if (rec()) return true;
      out.pop(); matched.delete(v); matched.delete(u);
    }
    return false;
  };
  return rec() ? out : null;
}

function assignMatchdays(fixtures, ids, rng, { avoidThreeInARow = true, tries = 60, altPerRound = 5, budget = 600 } = {}) {
  const key = (x, y) => (x < y ? x + '|' + y : y + '|' + x);
  const pool = new Map(fixtures.map(f => [key(f.home, f.away), f]));

  const buildRound = (left, hist) => {
    const adj = Object.fromEntries(ids.map(i => [i, []]));
    for (const a of ids) {
      for (const b of left.get(a)) {
        if (a >= b) continue;
        const f = pool.get(key(a, b));
        if (avoidThreeInARow) {
          const hh = hist[f.home], aa = hist[f.away];
          if (hh.length >= 2 && hh[hh.length - 1] === 'H' && hh[hh.length - 2] === 'H') continue;
          if (aa.length >= 2 && aa[aa.length - 1] === 'A' && aa[aa.length - 2] === 'A') continue;
        }
        adj[a].push(b); adj[b].push(a);
      }
    }
    return perfectMatching(adj, ids, rng, { v: 200000 });
  };

  for (let attempt = 0; attempt < tries; attempt++) {
    const left = new Map(ids.map(i => [i, new Set()]));
    for (const f of fixtures) { left.get(f.home).add(f.away); left.get(f.away).add(f.home); }
    const hist = Object.fromEntries(ids.map(i => [i, []]));
    const rounds = [];
    let calls = budget;

    // haftalari sirayla kur; bir hafta cikmazsa o haftayi birkac kez farkli
    // eslesmeyle dene, olmazsa bir onceki haftaya geri don (backtracking)
    const rec = (md) => {
      if (md === 8) return true;
      for (let k = 0; k < altPerRound; k++) {
        if (--calls <= 0) return false;
        const m = buildRound(left, hist);
        if (!m || m.length !== ids.length / 2) return false;
        for (const [a, b] of m) {
          left.get(a).delete(b); left.get(b).delete(a);
          const f = pool.get(key(a, b));
          hist[f.home].push('H'); hist[f.away].push('A');
        }
        rounds.push(m);
        if (rec(md + 1)) return true;
        rounds.pop();
        for (const [a, b] of m) {
          left.get(a).add(b); left.get(b).add(a);
          const f = pool.get(key(a, b));
          hist[f.home].pop(); hist[f.away].pop();
        }
      }
      return false;
    };

    if (!rec(0)) continue;
    rounds.forEach((m, i) => m.forEach(p => (pool.get(key(p[0], p[1])).md = i + 1)));
    fixtures.sort((x, y) => x.md - y.md || (x.home < y.home ? -1 : 1));
    return true;
  }
  return false;
}

// --- ust seviye -------------------------------------------------------------
function runDraw(teams, seed, options = {}) {
  const opt = { ...DEFAULTS, ...options };
  const rng = makeRng(seed);
  const ids = teams.map(t => t.id);
  for (let restart = 0; restart < 400; restart++) {
    const edges = drawOpponents(teams, opt, rng);
    if (!edges) continue;
    const fixtures = orient(edges, teams, opt, rng);
    if (!fixtures) continue;
    if (!assignMatchdays(fixtures, ids, rng) &&
        !assignMatchdays(fixtures, ids, rng, { avoidThreeInARow: false })) continue;
    return fixtures;
  }
  return null;
}

function verify(fixtures, teams, opt = DEFAULTS) {
  const byId = Object.fromEntries(teams.map(t => [t.id, t]));
  const problems = [];
  if (fixtures.length !== teams.length * 4) problems.push('mac sayisi yanlis');
  const seen = new Set(), hp = {}, ap = {}, oc = {}, mds = {};
  for (const t of teams) { hp[t.id] = {}; ap[t.id] = {}; oc[t.id] = {}; mds[t.id] = new Set(); }
  for (const f of fixtures) {
    const k = [f.home, f.away].sort().join('|');
    if (seen.has(k)) problems.push('tekrar eden eslesme ' + k);
    seen.add(k);
    const h = byId[f.home], a = byId[f.away];
    if (!opt.allowSameCountry && h.country === a.country) problems.push('ayni ulke ' + k);
    hp[h.id][a.pot] = (hp[h.id][a.pot] || 0) + 1;
    ap[a.id][h.pot] = (ap[a.id][h.pot] || 0) + 1;
    oc[h.id][a.country] = (oc[h.id][a.country] || 0) + 1;
    oc[a.id][h.country] = (oc[a.id][h.country] || 0) + 1;
    for (const id of [f.home, f.away]) {
      if (mds[id].has(f.md)) problems.push(id + ' MD' + f.md + ' cift mac');
      mds[id].add(f.md);
    }
  }
  for (const t of teams) {
    for (const p of [1, 2, 3, 4]) {
      if (hp[t.id][p] !== 1) problems.push(t.id + ' pot' + p + ' ic saha != 1');
      if (ap[t.id][p] !== 1) problems.push(t.id + ' pot' + p + ' deplasman != 1');
    }
    for (const [c, n] of Object.entries(oc[t.id]))
      if (n > opt.maxSameCountry) problems.push(t.id + ' ' + c + ' rakip sayisi ' + n);
    if (mds[t.id].size !== 8) problems.push(t.id + ' 8 hafta degil');
  }
  return problems;
}

// --- sonuc simulasyonu ------------------------------------------------------
const BASE_GOALS = 1.45, RATING_SCALE = 0.20, HOME_ADV = 0.22;

function expectedGoals(h, a) {
  const d = (h.rating - a.rating) / 100;
  const clamp = x => Math.min(Math.max(x, 0.15), 6);
  return [clamp(BASE_GOALS * Math.exp(RATING_SCALE * d + HOME_ADV)),
          clamp(BASE_GOALS * Math.exp(-RATING_SCALE * d - HOME_ADV))];
}
function poisson(lam, rng) {
  const L = Math.exp(-lam); let k = 0, p = 1;
  do { k++; p *= rng(); } while (p > L);
  return k - 1;
}
function simulateSeason(fixtures, teams, rng) {
  const byId = Object.fromEntries(teams.map(t => [t.id, t]));
  return fixtures.map(f => {
    const [lh, la] = expectedGoals(byId[f.home], byId[f.away]);
    return { f, hg: poisson(lh, rng), ag: poisson(la, rng) };
  });
}
function buildTable(results, teams) {
  const rows = Object.fromEntries(teams.map(t => [t.id, {
    id: t.id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, agf: 0, aw: 0, rating: t.rating
  }]));
  for (const r of results) {
    const h = rows[r.f.home], a = rows[r.f.away];
    h.p++; a.p++; h.gf += r.hg; h.ga += r.ag; a.gf += r.ag; a.ga += r.hg; a.agf += r.ag;
    if (r.hg > r.ag) { h.w++; a.l++; }
    else if (r.hg < r.ag) { a.w++; a.aw++; h.l++; }
    else { h.d++; a.d++; }
  }
  const list = Object.values(rows).map(r => ({ ...r, pts: r.w * 3 + r.d, gd: r.gf - r.ga }));
  list.sort((x, y) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf ||
                      y.agf - x.agf || y.w - x.w || y.aw - x.aw || y.rating - x.rating);
  return list;
}

if (typeof module !== 'undefined') {
  module.exports = { TEAMS, makeRng, runDraw, verify, simulateSeason, buildTable, DEFAULTS };
}
