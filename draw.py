"""
UEFA Champions League lig asamasi (league phase) kura motoru.

Kurallar (2026/27 duzenlemesi):
  - 36 takim, 4 torba x 9 takim
  - Her takim her torbadan 2 rakip: 1 ic saha + 1 deplasman  -> 8 mac, 4H/4A
  - Ayni ulkeden takimlar eslesemez
  - Bir takim ayni ulkeden en fazla 2 rakiple eslesebilir
  - Ayni fikstur (ayni ev sahibi ile) ust uste 3 sezon tekrarlanamaz  -> banned_home_fixtures
"""

from __future__ import annotations

import json
import random
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Iterable

POTS = (1, 2, 3, 4)


@dataclass(frozen=True)
class Team:
    id: str
    name: str
    country: str
    pot: int
    rating: int = 1500


@dataclass
class Fixture:
    home: str
    away: str
    home_pot: int
    away_pot: int
    matchday: int | None = None


@dataclass
class DrawConfig:
    max_same_country_opponents: int = 2
    allow_same_country: bool = False
    banned_home_fixtures: set[tuple[str, str]] = field(default_factory=set)  # (home, away)
    forbidden_pairs: set[frozenset[str]] = field(default_factory=set)        # politik/cografi yasaklar
    max_restarts: int = 500
    node_budget: int = 40_000


class DrawError(RuntimeError):
    pass


# --------------------------------------------------------------------------- #
# 1. Rakip atamasi (yonsuz graf)
# --------------------------------------------------------------------------- #

def _draw_opponents(teams: list[Team], cfg: DrawConfig, rng: random.Random) -> set[frozenset[str]]:
    by_id = {t.id: t for t in teams}
    ids = [t.id for t in teams]

    need: dict[tuple[str, int], int] = {(i, p): 2 for i in ids for p in POTS}
    opponents: dict[str, set[str]] = {i: set() for i in ids}
    ccount: dict[str, dict[str, int]] = {i: defaultdict(int) for i in ids}
    edges: set[frozenset[str]] = set()

    pot_members: dict[int, list[str]] = defaultdict(list)
    for t in teams:
        pot_members[t.pot].append(t.id)

    def compatible(a: str, b: str) -> bool:
        if a == b or b in opponents[a]:
            return False
        ta, tb = by_id[a], by_id[b]
        if not cfg.allow_same_country and ta.country == tb.country:
            return False
        if frozenset((a, b)) in cfg.forbidden_pairs:
            return False
        if need[(b, ta.pot)] <= 0:
            return False
        lim = cfg.max_same_country_opponents
        if ccount[a][tb.country] >= lim or ccount[b][ta.country] >= lim:
            return False
        return True

    def candidates(team: str, pot: int) -> list[str]:
        return [o for o in pot_members[pot] if compatible(team, o)]

    def open_slots() -> list[tuple[str, int]]:
        return [k for k, v in need.items() if v > 0]

    budget = [cfg.node_budget]

    def solve() -> bool:
        budget[0] -= 1
        if budget[0] <= 0:
            raise TimeoutError
        slots = open_slots()
        if not slots:
            return True

        # MRV: en az secenegi olan slotu once coz, ayni anda ileri bakis (forward check)
        best: tuple[str, int] | None = None
        best_cands: list[str] = []
        for slot in slots:
            cands = candidates(*slot)
            if len(cands) < need[slot]:
                return False  # bu dal olu
            if best is None or len(cands) < len(best_cands):
                best, best_cands = slot, cands
                if len(cands) == need[slot]:
                    break

        team, pot = best
        rng.shuffle(best_cands)
        for other in best_cands:
            ta, tb = by_id[team], by_id[other]
            need[(team, pot)] -= 1
            need[(other, ta.pot)] -= 1
            opponents[team].add(other)
            opponents[other].add(team)
            ccount[team][tb.country] += 1
            ccount[other][ta.country] += 1
            edges.add(frozenset((team, other)))

            if solve():
                return True

            edges.discard(frozenset((team, other)))
            ccount[team][tb.country] -= 1
            ccount[other][ta.country] -= 1
            opponents[team].discard(other)
            opponents[other].discard(team)
            need[(team, pot)] += 1
            need[(other, ta.pot)] += 1
        return False

    try:
        if solve():
            return edges
    except TimeoutError:
        pass
    raise DrawError("opponent assignment failed")


# --------------------------------------------------------------------------- #
# 2. Ic saha / deplasman yonlendirmesi
# --------------------------------------------------------------------------- #

def _orient(edges: set[frozenset[str]], teams: list[Team], cfg: DrawConfig,
            rng: random.Random) -> list[Fixture]:
    """
    Her (potA, potB) blogu 2-regular bir graftir -> ayrik dongulere ayrilir.
    Bir donguyu tek yonde dolasmak her dugume tam 1 ic saha + 1 deplasman verir.
    Her dongunun 2 olasi yonu vardir; yasakli fiksturu bozan yonu ceviririz.
    """
    by_id = {t.id: t for t in teams}
    blocks: dict[tuple[int, int], list[tuple[str, str]]] = defaultdict(list)
    for e in edges:
        a, b = sorted(e)
        key = tuple(sorted((by_id[a].pot, by_id[b].pot)))
        blocks[key].append((a, b))

    fixtures: list[Fixture] = []

    for _, block_edges in blocks.items():
        adj: dict[str, list[str]] = defaultdict(list)
        for a, b in block_edges:
            adj[a].append(b)
            adj[b].append(a)

        unused = {frozenset(e) for e in block_edges}
        while unused:
            start = next(iter(next(iter(unused))))
            cycle: list[tuple[str, str]] = []
            cur, prev = start, None
            while True:
                nxt = next((n for n in adj[cur]
                            if n != prev and frozenset((cur, n)) in unused), None)
                if nxt is None:
                    break
                unused.discard(frozenset((cur, nxt)))
                cycle.append((cur, nxt))
                prev, cur = cur, nxt
                if cur == start:
                    break

            forward_bad = sum(1 for h, a in cycle if (h, a) in cfg.banned_home_fixtures)
            reverse_bad = sum(1 for h, a in cycle if (a, h) in cfg.banned_home_fixtures)
            if forward_bad and reverse_bad:
                raise DrawError("banned fixture unavoidable in this cycle")
            if forward_bad or (not reverse_bad and rng.random() < 0.5):
                cycle = [(a, h) for h, a in cycle]

            for h, a in cycle:
                fixtures.append(Fixture(h, a, by_id[h].pot, by_id[a].pot))

    return fixtures


# --------------------------------------------------------------------------- #
# 3. Mac gunu (matchday) atamasi = 8-regular grafin 8-renkli kenar boyamasi
# --------------------------------------------------------------------------- #

def _perfect_matching(adj: dict[str, set[str]], rng: random.Random,
                      budget: list[int]) -> list[tuple[str, str]] | None:
    """Kalan graf uzerinde mukemmel eslesme (her takim tam 1 mac) ara."""
    matched: set[str] = set()
    result: list[tuple[str, str]] = []

    def rec() -> bool:
        budget[0] -= 1
        if budget[0] <= 0:
            return False
        unmatched = [v for v in adj if v not in matched]
        if not unmatched:
            return True
        # MRV: en az secenegi kalan takimi once bagla
        v = min(unmatched, key=lambda x: sum(1 for u in adj[x] if u not in matched))
        cands = [u for u in adj[v] if u not in matched]
        if not cands:
            return False
        rng.shuffle(cands)
        for u in cands:
            matched.add(v); matched.add(u)
            result.append((v, u))
            if rec():
                return True
            result.pop()
            matched.discard(v); matched.discard(u)
        return False

    return result if rec() else None


def assign_matchdays(fixtures: list[Fixture], rng: random.Random,
                     matchdays: int = 8, avoid_three_in_a_row: bool = True,
                     tries: int = 800) -> bool:
    """
    Fikstur grafi 8-regular. Her matchday = bu grafin bir mukemmel eslesmesi
    (18 mac, her takim tam 1 kez). Haftalari sirayla kuruyoruz ve her hafta
    "3 hafta ust uste ayni saha" kuralini ihlal edecek maclari eleyerek
    eslesme ariyoruz.

    Not: once 8 eslesmeye ayirip sonra haftalari sirala yaklasimi calismiyor;
    36 takim icin hicbir permutasyon 3-ust-uste kuralini saglamiyor (test edildi).
    Bu yuzden kisit eslesme asamasina gomulu.
    """
    teams = sorted({f.home for f in fixtures} | {f.away for f in fixtures})
    pool = {frozenset((f.home, f.away)): f for f in fixtures}

    for _ in range(tries):
        adj: dict[str, set[str]] = {t: set() for t in teams}
        for f in fixtures:
            adj[f.home].add(f.away)
            adj[f.away].add(f.home)
        hist: dict[str, list[str]] = {t: [] for t in teams}
        rounds: list[list[tuple[str, str]]] = []

        ok = True
        for _ in range(matchdays):
            allowed: dict[str, set[str]] = {t: set() for t in teams}
            for a, bs in adj.items():
                for b in bs:
                    if a >= b:
                        continue
                    f = pool[frozenset((a, b))]
                    if avoid_three_in_a_row:
                        hh, aa = hist[f.home], hist[f.away]
                        if len(hh) >= 2 and hh[-1] == "H" and hh[-2] == "H":
                            continue
                        if len(aa) >= 2 and aa[-1] == "A" and aa[-2] == "A":
                            continue
                    allowed[a].add(b)
                    allowed[b].add(a)

            m = _perfect_matching(allowed, rng, [300_000])
            if m is None or len(m) != len(teams) // 2:
                ok = False
                break
            rounds.append(m)
            for a, b in m:
                adj[a].discard(b)
                adj[b].discard(a)
                f = pool[frozenset((a, b))]
                hist[f.home].append("H")
                hist[f.away].append("A")
        if not ok:
            continue

        for md, m in enumerate(rounds, start=1):
            for pair in m:
                pool[frozenset(pair)].matchday = md
        fixtures.sort(key=lambda f: (f.matchday, f.home))
        return True
    return False


# --------------------------------------------------------------------------- #
# 4. Ust seviye API + dogrulama
# --------------------------------------------------------------------------- #

def run_draw(teams: list[Team], cfg: DrawConfig | None = None,
             seed: int | None = None, with_matchdays: bool = True) -> list[Fixture]:
    cfg = cfg or DrawConfig()
    rng = random.Random(seed)
    last: Exception | None = None
    for _ in range(cfg.max_restarts):
        try:
            edges = _draw_opponents(teams, cfg, rng)
            fixtures = _orient(edges, teams, cfg, rng)
        except DrawError as exc:
            last = exc
            continue
        if with_matchdays and not assign_matchdays(fixtures, rng):
            # 3-ust-uste kurali olmadan tekrar dene (UEFA'da da bu kural
            # "mumkun oldugunca" seklinde uygulanir, mutlak degil)
            if not assign_matchdays(fixtures, rng, avoid_three_in_a_row=False):
                last = DrawError("matchday scheduling failed")
                continue
        verify(fixtures, teams, cfg, check_matchdays=with_matchdays)
        return fixtures
    raise DrawError(f"draw failed after {cfg.max_restarts} restarts: {last}")


def verify(fixtures: list[Fixture], teams: list[Team], cfg: DrawConfig,
           check_matchdays: bool = True) -> None:
    by_id = {t.id: t for t in teams}
    assert len(fixtures) == len(teams) * 8 // 2, "wrong fixture count"

    home_pot = defaultdict(lambda: defaultdict(int))
    away_pot = defaultdict(lambda: defaultdict(int))
    opp_country = defaultdict(lambda: defaultdict(int))
    seen: set[frozenset[str]] = set()

    for f in fixtures:
        h, a = by_id[f.home], by_id[f.away]
        assert frozenset((f.home, f.away)) not in seen, f"duplicate pair {f.home}-{f.away}"
        seen.add(frozenset((f.home, f.away)))
        if not cfg.allow_same_country:
            assert h.country != a.country, f"same country: {f.home} vs {f.away}"
        assert (f.home, f.away) not in cfg.banned_home_fixtures, f"banned: {f.home} vs {f.away}"
        assert frozenset((f.home, f.away)) not in cfg.forbidden_pairs
        home_pot[h.id][a.pot] += 1
        away_pot[a.id][h.pot] += 1
        opp_country[h.id][a.country] += 1
        opp_country[a.id][h.country] += 1

    for t in teams:
        for p in POTS:
            assert home_pot[t.id][p] == 1, f"{t.id} home vs pot{p} = {home_pot[t.id][p]}"
            assert away_pot[t.id][p] == 1, f"{t.id} away vs pot{p} = {away_pot[t.id][p]}"
        for c, n in opp_country[t.id].items():
            assert n <= cfg.max_same_country_opponents, f"{t.id} has {n} opponents from {c}"

    if check_matchdays:
        seen_md = defaultdict(set)
        for f in fixtures:
            assert f.matchday is not None
            for tid in (f.home, f.away):
                assert f.matchday not in seen_md[tid], f"{tid} twice on MD{f.matchday}"
                seen_md[tid].add(f.matchday)
        for t in teams:
            assert len(seen_md[t.id]) == 8


# --------------------------------------------------------------------------- #
# 5. Veri yukleme + gorunumler
# --------------------------------------------------------------------------- #

def load_teams(path: str) -> tuple[list[Team], DrawConfig]:
    with open(path, encoding="utf-8") as fh:
        raw = json.load(fh)
    teams = [Team(**t) for t in raw["teams"]]
    cfg = DrawConfig(
        banned_home_fixtures={tuple(x) for x in raw.get("banned_home_fixtures", [])},
        forbidden_pairs={frozenset(x) for x in raw.get("forbidden_pairs", [])},
    )
    return teams, cfg


def team_view(fixtures: list[Fixture], teams: list[Team]) -> dict[str, list[dict]]:
    """Her takim icin 'kiminle, nerede, hangi hafta' listesi."""
    by_id = {t.id: t for t in teams}
    out: dict[str, list[dict]] = {t.id: [] for t in teams}
    for f in fixtures:
        out[f.home].append({"opponent": f.away, "opponent_name": by_id[f.away].name,
                            "venue": "H", "pot": f.away_pot, "matchday": f.matchday})
        out[f.away].append({"opponent": f.home, "opponent_name": by_id[f.home].name,
                            "venue": "A", "pot": f.home_pot, "matchday": f.matchday})
    for tid in out:
        out[tid].sort(key=lambda r: (r["matchday"] or 0, r["pot"]))
    return out


def print_team_view(fixtures: list[Fixture], teams: list[Team],
                    only: Iterable[str] | None = None) -> None:
    by_id = {t.id: t for t in teams}
    view = team_view(fixtures, teams)
    ids = list(only) if only else [t.id for t in sorted(teams, key=lambda t: (t.pot, t.name))]
    for tid in ids:
        t = by_id[tid]
        print(f"\n{t.name} ({t.country}, Pot {t.pot})")
        for r in view[tid]:
            md = f"MD{r['matchday']}" if r["matchday"] else "  -"
            side = "vs" if r["venue"] == "H" else "@ "
            print(f"  {md}  {side} {r['opponent_name']:<16} (Pot {r['pot']})")


def to_json(fixtures: list[Fixture], teams: list[Team]) -> str:
    return json.dumps({
        "fixtures": [f.__dict__ for f in fixtures],
        "by_team": team_view(fixtures, teams),
    }, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    import argparse, os, time

    ap = argparse.ArgumentParser()
    ap.add_argument("--teams", default=os.path.join(os.path.dirname(__file__), "teams_2026_27.json"))
    ap.add_argument("--seed", type=int, default=None)
    ap.add_argument("--no-matchdays", action="store_true")
    ap.add_argument("--json", metavar="OUT")
    ap.add_argument("--team", action="append", help="sadece bu takim(lar)i yazdir")
    args = ap.parse_args()

    teams, cfg = load_teams(args.teams)
    t0 = time.time()
    fixtures = run_draw(teams, cfg, seed=args.seed, with_matchdays=not args.no_matchdays)
    print(f"Kura tamam: {len(fixtures)} mac, {time.time() - t0:.2f}s (seed={args.seed})")
    print_team_view(fixtures, teams, only=args.team)
    if args.json:
        with open(args.json, "w", encoding="utf-8") as fh:
            fh.write(to_json(fixtures, teams))
        print(f"\nJSON yazildi: {args.json}")
