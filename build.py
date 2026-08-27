#!/usr/bin/env python3
"""engine.js + ui.part.html + app.part.js -> tek dosya index.html"""
import pathlib

here = pathlib.Path(__file__).parent
engine = (here / "engine.js").read_text(encoding="utf-8").split("if (typeof module")[0].rstrip()
ui = (here / "ui.part.html").read_text(encoding="utf-8")
app = (here / "app.part.js").read_text(encoding="utf-8")

HTML = """<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>UCL Lig Aşaması Kura Simülatörü 2026/27</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;800&family=IBM+Plex+Mono:wght@400;500;600&family=Inter+Tight:wght@400;500;600&display=swap" rel="stylesheet">
__UI__
</head>
<body>
<div class="wrap">

<header>
  <div class="eyebrow">
    <b>2026/27</b><span>Şampiyonlar Ligi</span><span>lig aşaması</span>
    <span id="status">kura hazırlanıyor</span>
  </div>
  <h1>36 takım<span>144 maç</span><span>8 hafta</span></h1>
  <p class="lede">
    Yeni lig aşamasında grup yok. Her takım dört torbanın her birinden iki rakip
    çekiyor, birini evinde birini deplasmanda oynuyor. Bu sayfa o kurayı kurallara
    uyarak yeniden üretiyor, sonra sezonu simüle ediyor.
  </p>
  <div class="bar">
    <label class="seedbox">tohum <input id="seed" type="number" min="1" max="999999"></label>
    <button id="redraw">Yeni kura</button>
    <button id="random" class="ghost">Rastgele</button>
    <button id="play" class="ghost">Sezonu oyna</button>
  </div>
  <div class="rule"></div>
</header>

<nav class="tabs" role="tablist">
  <button data-view="matrix" aria-selected="true">Matris</button>
  <button data-view="teams" aria-selected="false">Takımlar</button>
  <button data-view="matchdays" aria-selected="false">Haftalar</button>
  <button data-view="table" aria-selected="false">Puan tablosu</button>
  <button data-view="probs" aria-selected="false">Olasılıklar</button>
</nav>

<main>
  <section id="view-matrix">
    <div class="matrixScroll"><div id="matrix"></div></div>
    <div class="legend">
      <span><i class="key home"></i> iç saha</span>
      <span><i class="key away"></i> deplasman</span>
      <span><i class="key" style="background:var(--p1)"></i> Torba 1</span>
      <span><i class="key" style="background:var(--p2)"></i> Torba 2</span>
      <span><i class="key" style="background:var(--p3)"></i> Torba 3</span>
      <span><i class="key" style="background:var(--p4)"></i> Torba 4</span>
    </div>
    <div class="detail" id="detail"></div>
  </section>

  <section id="view-teams" hidden>
    <div class="bar">
      <select id="teampick" aria-label="Takım seç"></select>
      <button id="teamall" class="ghost" hidden>Tüm takımlar</button>
      <span class="hint" id="teamhint">listeden seç ya da bir karta tıkla</span>
    </div>
    <div id="teams"></div>
  </section>
  <section id="view-matchdays" hidden><div id="matchdays"></div></section>
  <section id="view-table" hidden><div id="table"></div></section>

  <section id="view-probs" hidden>
    <div class="bar">
      <select id="mcmode">
        <option value="fixed">Bu kura sabit &middot; 3000 sezon</option>
        <option value="redraw">Her sezon yeni kura &middot; 120 sezon</option>
      </select>
      <button id="mcrun">Hesapla</button>
    </div>
    <div id="probs" style="margin-top:18px"></div>
  </section>
</main>

<footer>
  Torbalar UEFA'nın 26.08.2026 resmi listesi. Rating değerleri ve Poisson gol modeli
  kalibre edilmemiş tahmindir; olasılıklar gerçek tahmin olarak kullanılmamalı.<br>
  Uygulanan kurallar: aynı ülke eşleşemez, aynı ülkeden en fazla 2 rakip, her torbadan
  1 iç saha + 1 deplasman, haftada 1 maç, 3 hafta üst üste aynı saha yok.<br>
  Modellenmeyen: disiplin puanı sıralaması, TV ve güvenlik kaynaklı hafta kısıtları,
  UEFA'nın gerçek kura yazılımının dağılımı.
</footer>

</div>
<script>
__ENGINE__

__APP__
</script>
</body>
</html>
"""

out = HTML.replace("__UI__", ui).replace("__ENGINE__", engine).replace("__APP__", app)
(here / "index.html").write_text(out, encoding="utf-8")
print(f"index.html yazildi: {len(out)} bayt")
