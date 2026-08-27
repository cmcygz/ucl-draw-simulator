// ---------------------------------------------------------------------------
// Lig asamasi kura motoru (JS portu) - turnuvadan bagimsiz
// ---------------------------------------------------------------------------


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
  pots: 4,             // torba sayisi   (UCL/UEL 4, UECL 6)
  oppPerPot: 2,        // torba basina rakip (UCL/UEL 2, UECL 1)
  matchdays: 8,        // hafta sayisi   (UCL/UEL 8, UECL 6)
  maxSameCountry: 2,
  allowSameCountry: false,
  bannedHome: [],      // ['liverpool>real', ...]  ev sahibi > deplasman
  nodeBudget: 60000,
};

/** UEFA'nin uc kulup turnuvasinin lig asamasi bicimleri. */
const FORMATS = {
  ucl:  { pots: 4, oppPerPot: 2, matchdays: 8 },
  uel:  { pots: 4, oppPerPot: 2, matchdays: 8 },
  uecl: { pots: 6, oppPerPot: 1, matchdays: 6 }
};

const potList = opt => Array.from({ length: opt.pots }, (_, i) => i + 1);
const matchesPerTeam = opt => opt.pots * opt.oppPerPot;

// --- 1. rakip atamasi -------------------------------------------------------
function drawOpponents(teams, opt, rng) {
  const byId = Object.fromEntries(teams.map(t => [t.id, t]));
  const ids = teams.map(t => t.id);
  const pots = potList(opt);
  const potMembers = Object.fromEntries(pots.map(p => [p, []]));
  teams.forEach(t => potMembers[t.pot].push(t.id));

  const need = {};
  ids.forEach(i => pots.forEach(p => (need[i + '|' + p] = opt.oppPerPot)));
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
      for (const p of pots) {
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
/**
 * Yonlendirmeyi bicime gore secer. Torba basina 2 rakip varsa her (potA,potB)
 * blogu ayri dengelenir. 1 rakip varsa (UECL) komsu torbalar eslestirilir ve
 * denge cift basina kurulur.
 */
function orient(edges, teams, opt, rng) {
  return opt.oppPerPot === 1
    ? orientPaired(edges, teams, opt, rng)
    : orientBlocks(edges, teams, opt, rng);
}

/** Cift dereceli grafi ayrik dongulere ayirir; her adim ozgun kenari da tasir. */
function cycleDecompose(edges, nodes) {
  const adj = new Map(nodes.map(n => [n, []]));
  edges.forEach(([a, b], e) => {
    adj.get(a).push({ to: b, e });
    adj.get(b).push({ to: a, e });
  });
  const used = new Array(edges.length).fill(false);
  const free = node => adj.get(node).find(x => !used[x.e]);
  const cycles = [];

  for (const start of nodes) {
    for (;;) {
      if (!free(start)) break;
      const cycle = [];
      let cur = start;
      do {
        const step = free(cur);
        if (!step) break;
        used[step.e] = true;
        cycle.push({ from: cur, to: step.to, e: step.e });
        cur = step.to;
      } while (cur !== start);
      if (cycle.length) cycles.push(cycle);
    }
  }
  return cycles;
}

/**
 * UECL yonlendirmesi. Kural: komsu torbalar eslestirilir (1-2, 3-4, 5-6) ve her
 * takim her ciftten birini evinde birini deplasmanda oynar.
 *
 * Bunu saglamak icin yardimci bir graf kurulur: dugumler (takim, torba cifti)
 * ikilileri, kenarlar maclardir. Her takim her torbadan tam bir rakip cektigi
 * icin her dugumun derecesi tam ikidir, yani graf dongulere ayrilir. Bir donguyu
 * tek yonde dolasmak her dugume tam bir "ev" kazandirir; bu da her cift icin
 * bir ic saha bir deplasman demektir.
 */
function orientPaired(edges, teams, opt, rng) {
  const byId = Object.fromEntries(teams.map(t => [t.id, t]));
  const banned = new Set(opt.bannedHome);
  const pairOf = pot => Math.floor((pot - 1) / 2);
  const slot = (teamId, oppPot) => teamId + '#' + pairOf(oppPot);

  const nodes = [];
  const pairCount = Math.ceil(opt.pots / 2);
  teams.forEach(t => {
    for (let p = 0; p < pairCount; p++) nodes.push(t.id + '#' + p);
  });

  const slotEdges = edges.map(([a, b]) => [slot(a, byId[b].pot), slot(b, byId[a].pot)]);
  const fixtures = [];

  for (const cycle of cycleDecompose(slotEdges, nodes)) {
    // Donguyu ileri dolasirken kenarin "from" ucundaki takim ev sahibi olur.
    const homeOf = step => (slotEdges[step.e][0] === step.from
      ? edges[step.e][0] : edges[step.e][1]);
    const awayOf = step => (homeOf(step) === edges[step.e][0]
      ? edges[step.e][1] : edges[step.e][0]);

    const fwdBad = cycle.some(st => banned.has(homeOf(st) + '>' + awayOf(st)));
    const revBad = cycle.some(st => banned.has(awayOf(st) + '>' + homeOf(st)));
    if (fwdBad && revBad) return null;
    const flip = fwdBad || (!revBad && rng() < 0.5);

    for (const st of cycle) {
      const h = homeOf(st), a = awayOf(st);
      const [home, away] = flip ? [a, h] : [h, a];
      fixtures.push({ home, away, homePot: byId[home].pot, awayPot: byId[away].pot, md: null });
    }
  }
  return fixtures;
}

// Her (potA,potB) blogu 2-regular graf -> dongulere ayrilir. Donguyu tek yonde
// dolasmak her takima tam 1 ic saha + 1 deplasman verir.
function orientBlocks(edges, teams, opt, rng) {
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

function assignMatchdays(fixtures, ids, rng, { matchdays = 8, avoidThreeInARow = true, tries = 60, altPerRound = 5, budget = 600 } = {}) {
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
      if (md === matchdays) return true;
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
    const md = { matchdays: opt.matchdays };
    if (!assignMatchdays(fixtures, ids, rng, md) &&
        !assignMatchdays(fixtures, ids, rng, { ...md, avoidThreeInARow: false })) continue;
    return fixtures;
  }
  return null;
}

function verify(fixtures, teams, opt = DEFAULTS) {
  const byId = Object.fromEntries(teams.map(t => [t.id, t]));
  const problems = [];
  if (fixtures.length !== teams.length * matchesPerTeam(opt) / 2) problems.push('mac sayisi yanlis');
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
  const perPotHome = opt.oppPerPot / 2;
  const pairHome = {}, pairAway = {};
  teams.forEach(t => { pairHome[t.id] = {}; pairAway[t.id] = {}; });
  if (opt.oppPerPot === 1) {
    for (const f of fixtures) {
      const hp = Math.floor((byId[f.away].pot - 1) / 2);
      const ap = Math.floor((byId[f.home].pot - 1) / 2);
      pairHome[f.home][hp] = (pairHome[f.home][hp] || 0) + 1;
      pairAway[f.away][ap] = (pairAway[f.away][ap] || 0) + 1;
    }
    const pairs = Math.ceil(opt.pots / 2);
    for (const t of teams) {
      for (let p = 0; p < pairs; p++) {
        if ((pairHome[t.id][p] || 0) !== 1) {
          problems.push(t.id + ' cift' + p + ' ic saha ' + (pairHome[t.id][p] || 0));
        }
        if ((pairAway[t.id][p] || 0) !== 1) {
          problems.push(t.id + ' cift' + p + ' deplasman ' + (pairAway[t.id][p] || 0));
        }
      }
    }
  }
  for (const t of teams) {
    let home = 0, away = 0;
    for (const p of potList(opt)) {
      const h = hp[t.id][p] || 0, a = ap[t.id][p] || 0;
      home += h; away += a;
      if (h + a !== opt.oppPerPot) problems.push(t.id + ' torba' + p + ' rakip sayisi ' + (h + a));
      if (Number.isInteger(perPotHome) && h !== perPotHome) {
        problems.push(t.id + ' torba' + p + ' ic saha ' + h);
      }
    }
    const half = matchesPerTeam(opt) / 2;
    if (home !== half) problems.push(t.id + ' ic saha ' + home + ' != ' + half);
    if (away !== half) problems.push(t.id + ' deplasman ' + away + ' != ' + half);
    for (const [c, n] of Object.entries(oc[t.id]))
      if (n > opt.maxSameCountry) problems.push(t.id + ' ' + c + ' rakip sayisi ' + n);
    if (mds[t.id].size !== opt.matchdays) problems.push(t.id + ' ' + opt.matchdays + ' hafta degil');
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
  module.exports = { makeRng, runDraw, verify, simulateSeason, buildTable, DEFAULTS, FORMATS };
}
