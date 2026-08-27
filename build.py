#!/usr/bin/env python3
"""engine.js + ui.part.html + app.part.js -> tek dosya index.html"""
import base64
import json
import pathlib

here = pathlib.Path(__file__).parent
engine = (here / "engine.js").read_text(encoding="utf-8").split("if (typeof module")[0].rstrip()
ui = (here / "ui.part.html").read_text(encoding="utf-8")
comps = (here / "competitions.part.js").read_text(encoding="utf-8").split("if (typeof module")[0].rstrip()
i18n = (here / "i18n.part.js").read_text(encoding="utf-8")
app = (here / "app.part.js").read_text(encoding="utf-8")

ROBOTS = "User-agent: *\nAllow: /\nSitemap: https://drawer.win/sitemap.xml\n"

HTML = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="Draw the UEFA league phase yourself, ball by ball, under the real constraints \u2014 then predict every score and see the standings. Champions League, Europa League and Conference League. Free, no account.">
<link rel="canonical" href="https://drawer.win/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="DrawLab">
<meta property="og:url" content="https://drawer.win/">
<meta property="og:title" content="DrawLab \u2014 European league phase draw simulator">
<meta property="og:description" content="Draw the balls yourself under the real UEFA rules, then play out all 144 matches and share the fixture.">
<meta property="og:image" content="https://drawer.win/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="DrawLab \u2014 European league phase draw simulator">
<meta name="twitter:description" content="Draw the balls yourself under the real UEFA rules, then play out all 144 matches and share the fixture.">
<meta name="twitter:image" content="https://drawer.win/og.png">
<title>DrawLab · European league phase draw simulator</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;800&family=IBM+Plex+Mono:wght@400;500;600&family=Inter+Tight:wght@400;500;600&display=swap" rel="stylesheet">
__UI__
</head>
<body>
<div class="wrap">

<header>
  <div class="eyebrow">
    <b data-i18n="brand">DrawLab</b><span data-i18n="head.phase">league phase</span><span id="season">2026/27</span>
    <span id="status">preparing the draw</span>
    <label class="langbox">
      <select id="lang" data-i18n-aria="bar.lang" aria-label="language">
        <option value="en">English</option>
        <option value="tr">T&uuml;rk&ccedil;e</option>
      </select>
    </label>
  </div>
  <nav class="compnav" id="compnav" data-i18n-aria="bar.comp" aria-label="competition"></nav>
  <h1><span id="h1clubs" class="lead">36 clubs</span><span id="h1matches">144 matches</span><span id="h1weeks">8 matchdays</span></h1>
  <p class="lede" data-i18n="head.lede">The new league phase has no groups. Every club draws two
    opponents from each of the four pots, playing one at home and one away. This page reproduces
    that draw under the real constraints, then simulates the season.</p>
  <div class="bar">
    <label class="seedbox"><span data-i18n="bar.seed">seed</span> <input id="seed" type="number" min="1" max="999999"></label>
    <button id="redraw" data-i18n="bar.redraw">New draw</button>
    <button id="random" class="ghost" data-i18n="bar.random">Random</button>
    <button id="play" class="ghost" data-i18n="bar.play">Play season</button>
  </div>
  <div class="rule"></div>
</header>

<nav class="tabs" role="tablist">
  <button data-view="matrix" aria-selected="true" data-i18n="tab.matrix">Matrix</button>
  <button data-view="draw" aria-selected="false" data-i18n="tab.draw">Draw</button>
  <button data-view="teams" aria-selected="false" data-i18n="tab.teams">Clubs</button>
  <button data-view="matchdays" aria-selected="false" data-i18n="tab.matchdays">Matchdays</button>
  <button data-view="table" aria-selected="false" data-i18n="tab.table">Standings</button>
  <button data-view="probs" aria-selected="false" data-i18n="tab.probs">Odds</button>
  <button data-view="saves" aria-selected="false" data-i18n="tab.saves">Saves</button>
</nav>

<main>
  <section id="view-matrix">
    <div class="matrixScroll"><div id="matrix"></div></div>
    <div class="legend" id="legend"></div>
    <div class="detail" id="detail"></div>
  </section>

  <section id="view-draw" hidden>
    <div class="bar">
      <button id="drawstart" data-i18n="draw.auto">Auto-draw everything</button>
      <button id="drawpause" class="ghost" hidden data-i18n="draw.pause">Pause</button>
      <button id="drawskip" class="ghost" hidden data-i18n="draw.skipTeam">Speed up this club</button>
      <label class="seedbox"><span data-i18n="draw.speed">speed</span>
        <select id="drawspeed">
          <option value="1" selected>1x</option>
          <option value="2">2x</option>
          <option value="4">4x</option>
        </select>
      </label>
    </div>
    <p class="hint" id="drawstatus"></p>
    <div id="drawstage" class="stage"></div>
    <div id="drawbowls" class="bowls"></div>
  </section>

  <section id="view-teams" hidden>
    <div class="bar">
      <select id="teampick" data-i18n-aria="teams.pickLabel" aria-label="Select a club"></select>
      <button id="teamall" class="ghost" hidden data-i18n="teams.all">All clubs</button>
      <span class="hint" id="teamhint">pick from the list or click a card</span>
    </div>
    <div id="teams"></div>
  </section>
  <section id="view-matchdays" hidden>
    <div class="bar">
      <button id="autofill" data-i18n="md.autofill">Fill in scores</button>
      <button id="savefixture" data-i18n="md.saveFixture">Save fixture</button>
      <button id="pickclear" class="ghost" hidden data-i18n="md.clear">Clear predictions</button>
    </div>
    <p class="hint" id="pickcount"></p>
    <p class="hint" id="mdstatus"></p>
    <div id="mdshare"></div>
    <div id="matchdays"></div>
  </section>
  <section id="view-table" hidden><div id="table"></div></section>

  <section id="view-probs" hidden>
    <div class="bar">
      <select id="mcmode">
        <option value="fixed" data-i18n="probs.modeFixed">This draw fixed &middot; 3000 seasons</option>
        <option value="redraw" data-i18n="probs.modeRedraw">New draw each season &middot; 120 seasons</option>
      </select>
      <button id="mcrun" data-i18n="probs.run">Calculate</button>
    </div>
    <div id="probs" style="margin-top:18px"></div>
  </section>

  <section id="view-saves" hidden>
    <div class="bar">
      <label class="namebox"><span data-i18n="saves.nameLabel">name</span>
        <input id="savename" type="text" maxlength="60" data-i18n-ph="saves.namePlaceholder" placeholder="e.g. Arsenal treble run">
      </label>
      <button id="savebtn" data-i18n="saves.saveBtn">Save this draw</button>
      <button id="savereload" class="ghost" data-i18n="saves.reload">Refresh list</button>
    </div>
    <p class="hint" id="savestatus"></p>
    <div id="saveshare"></div>
    <div id="saves"></div>
  </section>
</main>

<footer>
  <span data-i18n="footer.l1"></span><br>
  <span data-i18n="footer.l2"></span><br>
  <span data-i18n="footer.l3"></span>
</footer>

</div>
<script>
__ENGINE__

__COMPS__

__I18N__

__APP__
</script>
</body>
</html>
"""

out = (HTML.replace("__UI__", ui).replace("__ENGINE__", engine)
       .replace("__COMPS__", comps).replace("__I18N__", i18n).replace("__APP__", app))
(here / "index.html").write_text(out, encoding="utf-8")

dist = here / "dist"
dist.mkdir(exist_ok=True)
(dist / "index.html").write_text(out, encoding="utf-8")
(dist / "robots.txt").write_text(ROBOTS, encoding="utf-8")

site_js = (here / "api" / "src" / "site.js")
site_js.write_text(
    "// build.py tarafindan uretilir, elle duzenleme.\n"
    "export const SITE_HTML = " + json.dumps(out) + ";\n"
    "export const OG_PNG_B64 = " + json.dumps(
        base64.b64encode((here / "assets" / "og.png").read_bytes()).decode("ascii")) + ";\n",
    encoding="utf-8")
print(f"index.html ve dist/ yazildi: {len(out)} bayt")
