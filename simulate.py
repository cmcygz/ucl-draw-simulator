"""
Lig asamasi sonuc simulasyonu + puan tablosu + Monte Carlo.

UEFA lig asamasi siralama kriterleri (sirasiyla):
  1 puan, 2 averaj, 3 atilan gol, 4 deplasmanda atilan gol,
  5 galibiyet, 6 deplasman galibiyeti, 7 disiplin puani, 8 kulup katsayisi
Burada 7. kriter simule edilmiyor; 8. kriter icin 'rating' alani vekil olarak
kullaniliyor.
"""

from __future__ import annotations

import math
import random
from collections import defaultdict
from dataclasses import dataclass, field

from draw import Fixture, Team, DrawConfig, run_draw, load_teams

# --- gol modeli (kalibre EDILMEMIS, yer tutucu) ------------------------------
BASE_GOALS = 1.45      # esit takimlar icin taraf basina beklenen gol
RATING_SCALE = 0.20    # 100 puanlik rating farkinin log-gol etkisi
HOME_ADV = 0.22        # log-gol cinsinden ic saha avantaji


def expected_goals(home: Team, away: Team) -> tuple[float, float]:
    d = (home.rating - away.rating) / 100.0
    lh = BASE_GOALS * math.exp(RATING_SCALE * d + HOME_ADV)
    la = BASE_GOALS * math.exp(-RATING_SCALE * d - HOME_ADV)
    return min(max(lh, 0.15), 6.0), min(max(la, 0.15), 6.0)


def _poisson(lam: float, rng: random.Random) -> int:
    # Knuth; lam kucuk oldugu icin yeterli
    l, k, p = math.exp(-lam), 0, 1.0
    while True:
        p *= rng.random()
        if p <= l:
            return k
        k += 1


@dataclass
class Row:
    team: str
    played: int = 0
    won: int = 0
    drawn: int = 0
    lost: int = 0
    gf: int = 0
    ga: int = 0
    away_gf: int = 0
    away_wins: int = 0
    rating: int = 0

    @property
    def points(self) -> int:
        return self.won * 3 + self.drawn

    @property
    def gd(self) -> int:
        return self.gf - self.ga


@dataclass
class Result:
    fixture: Fixture
    home_goals: int
    away_goals: int


def simulate_results(fixtures: list[Fixture], teams: list[Team],
                     rng: random.Random) -> list[Result]:
    by_id = {t.id: t for t in teams}
    out = []
    for f in fixtures:
        lh, la = expected_goals(by_id[f.home], by_id[f.away])
        out.append(Result(f, _poisson(lh, rng), _poisson(la, rng)))
    return out


def build_table(results: list[Result], teams: list[Team]) -> list[Row]:
    rows = {t.id: Row(team=t.id, rating=t.rating) for t in teams}
    for r in results:
        h, a = rows[r.fixture.home], rows[r.fixture.away]
        h.played += 1; a.played += 1
        h.gf += r.home_goals; h.ga += r.away_goals
        a.gf += r.away_goals; a.ga += r.home_goals
        a.away_gf += r.away_goals
        if r.home_goals > r.away_goals:
            h.won += 1; a.lost += 1
        elif r.home_goals < r.away_goals:
            a.won += 1; a.away_wins += 1; h.lost += 1
        else:
            h.drawn += 1; a.drawn += 1

    return sorted(rows.values(), key=lambda r: (
        -r.points, -r.gd, -r.gf, -r.away_gf, -r.won, -r.away_wins, -r.rating))


def print_table(table: list[Row], teams: list[Team]) -> None:
    names = {t.id: t.name for t in teams}
    print(f"{'#':>3}  {'Takim':<18} {'O':>2} {'G':>2} {'B':>2} {'M':>2} "
          f"{'A':>3} {'Y':>3} {'AV':>4} {'P':>3}")
    for i, r in enumerate(table, 1):
        mark = "*" if i <= 8 else ("+" if i <= 24 else " ")
        print(f"{i:>3}{mark} {names[r.team]:<18} {r.played:>2} {r.won:>2} "
              f"{r.drawn:>2} {r.lost:>2} {r.gf:>3} {r.ga:>3} {r.gd:>+4} {r.points:>3}")
    print("\n*  ilk 8: dogrudan son 16    +  9-24: play-off    (bos) 25-36: elendi")


def monte_carlo(teams: list[Team], cfg: DrawConfig, n_seasons: int = 200,
                redraw_every_season: bool = True, seed: int = 0) -> dict[str, dict]:
    rng = random.Random(seed)
    stats = {t.id: defaultdict(float) for t in teams}
    fixtures = None
    for s in range(n_seasons):
        if fixtures is None or redraw_every_season:
            fixtures = run_draw(teams, cfg, seed=rng.randrange(1 << 30))
        table = build_table(simulate_results(fixtures, teams, rng), teams)
        for pos, row in enumerate(table, 1):
            st = stats[row.team]
            st["avg_pos"] += pos
            st["avg_pts"] += row.points
            if pos <= 8:
                st["top8"] += 1
            elif pos <= 24:
                st["playoff"] += 1
            else:
                st["out"] += 1
    for t in teams:
        st = stats[t.id]
        st["avg_pos"] /= n_seasons
        st["avg_pts"] /= n_seasons
        for k in ("top8", "playoff", "out"):
            st[k] = 100.0 * st[k] / n_seasons
    return stats


if __name__ == "__main__":
    import argparse, os

    ap = argparse.ArgumentParser()
    ap.add_argument("--teams", default=os.path.join(os.path.dirname(__file__), "teams_2026_27.json"))
    ap.add_argument("--seed", type=int, default=0)
    ap.add_argument("--mc", type=int, default=0, help="Monte Carlo sezon sayisi")
    args = ap.parse_args()

    teams, cfg = load_teams(args.teams)

    if args.mc:
        stats = monte_carlo(teams, cfg, n_seasons=args.mc, seed=args.seed)
        names = {t.id: t.name for t in teams}
        order = sorted(teams, key=lambda t: -stats[t.id]["top8"])
        print(f"{'Takim':<18} {'Ilk8%':>6} {'PO%':>6} {'Elendi%':>8} {'OrtP':>6} {'OrtSira':>8}")
        for t in order:
            s = stats[t.id]
            print(f"{names[t.id]:<18} {s['top8']:>6.1f} {s['playoff']:>6.1f} "
                  f"{s['out']:>8.1f} {s['avg_pts']:>6.2f} {s['avg_pos']:>8.2f}")
    else:
        rng = random.Random(args.seed)
        fixtures = run_draw(teams, cfg, seed=args.seed)
        results = simulate_results(fixtures, teams, rng)
        print_table(build_table(results, teams), teams)
