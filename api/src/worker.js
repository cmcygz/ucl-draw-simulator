import { SITE_HTML, OG_PNG_B64 } from './site.js';

const MAX_NAME = 60;
const MAX_MATCHES = 200;
const MAX_BODY = 64 * 1024;
const LIST_LIMIT = 60;
const RATE_PER_HOUR = 30;
const ID_ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz';
const COMPS = ['ucl', 'uel', 'uecl'];

// Yalnizca bu yollar sayfayi dondurur. Digerleri 404, aksi halde her
// uydurma adres 200 doner ve arama motorlari sonsuz yinelenen sayfa gorur.
const PAGES = {
  '': { path: '/', title: 'DrawLab \u00b7 European league phase draw simulator' },
  ucl: { path: '/ucl', title: 'Champions League draw simulator \u00b7 DrawLab' },
  uel: { path: '/uel', title: 'Europa League draw simulator \u00b7 DrawLab' },
  uecl: { path: '/uecl', title: 'Conference League draw simulator \u00b7 DrawLab' }
};

/**
 * Ayni origin her zaman izinlidir: siteyi bu Worker sunuyor, dolayisiyla kendi
 * sayfasindan gelen istegi reddetmek anlamsiz ve alan adi degisince kayitlari
 * sessizce bozuyordu. ALLOWED_ORIGINS yalnizca dis kaynaklar icin.
 */
function corsHeaders(request, env) {
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const origin = request.headers.get('Origin') || '';
  const self = new URL(request.url).origin;
  const headers = {
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,X-Save-Token',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
  if (origin && (origin === self || allowed.includes(origin))) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

function json(data, status, cors) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors }
  });
}

function randomId(len) {
  const buf = new Uint8Array(len);
  crypto.getRandomValues(buf);
  let out = '';
  for (const b of buf) out += ID_ALPHABET[b % ID_ALPHABET.length];
  return out;
}

function randomToken() {
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  return Array.from(buf, b => b.toString(16).padStart(2, '0')).join('');
}

/** IP'yi ham saklamamak icin tuzlanmis SHA-256 ozeti; sadece hiz siniri icin kullanilir. */
async function hashIp(ip, salt) {
  const bytes = new TextEncoder().encode(salt + '|' + ip);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest).slice(0, 8), b => b.toString(16).padStart(2, '0')).join('');
}

function validate(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'gövde bir JSON nesnesi olmalı';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) return 'kayda bir ad ver';
  if (name.length > MAX_NAME) return 'ad en fazla ' + MAX_NAME + ' karakter olabilir';
  if (!Number.isInteger(body.seed) || body.seed < 1 || body.seed > 999999) return 'tohum 1-999999 aralığında olmalı';
  if (body.comp !== undefined && COMPS.indexOf(body.comp) === -1) return 'turnuva geçersiz';

  const scores = body.scores;
  if (!scores || typeof scores !== 'object' || Array.isArray(scores)) return 'skorlar bir nesne olmalı';
  const keys = Object.keys(scores);
  if (!keys.length) return 'en az bir maç skoru gerekli';
  if (keys.length > MAX_MATCHES) return 'en fazla ' + MAX_MATCHES + ' maç kaydedilebilir';
  for (const key of keys) {
    if (key.length > 60) return 'maç anahtarı çok uzun';
    const pair = scores[key];
    if (!Array.isArray(pair) || pair.length !== 2) return 'skor [ev, deplasman] biçiminde olmalı';
    for (const goals of pair) {
      if (!Number.isInteger(goals) || goals < 0 || goals > 99) return 'gol sayısı 0-99 aralığında olmalı';
    }
  }

  const fixture = body.fixture;
  if (fixture !== undefined) {
    if (!Array.isArray(fixture) || fixture.length > MAX_MATCHES) return 'fikstür listesi geçersiz';
    for (const row of fixture) {
      if (!Array.isArray(row) || row.length !== 3) return 'fikstür satırı [ev, deplasman, hafta] olmalı';
      if (typeof row[0] !== 'string' || typeof row[1] !== 'string') return 'takım kimliği metin olmalı';
      if (row[0].length > 40 || row[1].length > 40) return 'takım kimliği çok uzun';
      if (!Number.isInteger(row[2]) || row[2] < 1 || row[2] > 20) return 'hafta 1-20 aralığında olmalı';
    }
  }

  const picks = body.picks;
  if (picks !== undefined) {
    if (!Array.isArray(picks) || picks.length > MAX_MATCHES) return 'tahmin listesi geçersiz';
    for (const key of picks) if (typeof key !== 'string') return 'tahmin anahtarı metin olmalı';
  }
  return null;
}

async function listSaves(env, cors) {
  const { results } = await env.DB
    .prepare('SELECT id, name, comp, seed, matches, picks, created_at FROM saves ORDER BY created_at DESC LIMIT ?')
    .bind(LIST_LIMIT)
    .all();
  return json({ saves: results || [] }, 200, cors);
}

async function getSave(env, id, cors) {
  const row = await env.DB
    .prepare('SELECT id, name, comp, seed, matches, picks, payload, created_at FROM saves WHERE id = ?')
    .bind(id)
    .first();
  if (!row) return json({ error: 'kayıt bulunamadı' }, 404, cors);
  row.payload = JSON.parse(row.payload);
  return json(row, 200, cors);
}

async function createSave(request, env, cors) {
  const raw = await request.text();
  if (raw.length > MAX_BODY) return json({ error: 'kayıt çok büyük' }, 413, cors);

  let body;
  try { body = JSON.parse(raw); } catch (e) { return json({ error: 'geçersiz JSON' }, 400, cors); }

  const problem = validate(body);
  if (problem) return json({ error: problem }, 400, cors);

  const ipHash = await hashIp(request.headers.get('CF-Connecting-IP') || '0.0.0.0', env.IP_SALT || 'ucl');
  const recent = await env.DB
    .prepare('SELECT COUNT(*) AS n FROM saves WHERE ip_hash = ? AND created_at > ?')
    .bind(ipHash, Date.now() - 3600 * 1000)
    .first();
  if (recent && recent.n >= RATE_PER_HOUR) {
    return json({ error: 'saatlik kayıt sınırına ulaştın, biraz sonra dene' }, 429, cors);
  }

  const scores = body.scores;
  const picks = Array.from(new Set((body.picks || []).filter(k => Object.prototype.hasOwnProperty.call(scores, k))));
  const comp = COMPS.indexOf(body.comp) === -1 ? 'ucl' : body.comp;
  const payload = JSON.stringify({
    v: 2, comp, seed: body.seed, fixture: body.fixture || [], scores, picks
  });
  const id = randomId(8);
  const token = randomToken();

  await env.DB
    .prepare('INSERT INTO saves (id, name, comp, seed, payload, matches, picks, token, ip_hash, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .bind(id, body.name.trim(), comp, body.seed, payload, Object.keys(scores).length, picks.length, token, ipHash, Date.now())
    .run();

  return json({ id, token }, 201, cors);
}

async function deleteSave(request, env, id, cors) {
  const token = request.headers.get('X-Save-Token') || '';
  const row = await env.DB.prepare('SELECT token FROM saves WHERE id = ?').bind(id).first();
  if (!row) return json({ error: 'kayıt bulunamadı' }, 404, cors);
  if (!token || token !== row.token) return json({ error: 'bu kaydı silme yetkin yok' }, 403, cors);
  await env.DB.prepare('DELETE FROM saves WHERE id = ?').bind(id).run();
  return json({ ok: true }, 200, cors);
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const origin = request.headers.get('Origin');
    if (origin && !cors['Access-Control-Allow-Origin']) {
      return json({ error: 'bu origin izinli değil' }, 403, cors);
    }

    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);

    if (parts[0] !== 'api') {
      if (request.method !== 'GET') return json({ error: 'desteklenmeyen istek' }, 405, cors);
      if (url.pathname === '/og.png') {
        const raw = atob(OG_PNG_B64);
        const bytes = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
        return new Response(bytes, {
          headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=86400'
          }
        });
      }
      if (url.pathname === '/robots.txt') {
        return new Response(
          'User-agent: *\nAllow: /\nSitemap: https://drawer.win/sitemap.xml\n',
          { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
        );
      }
      if (url.pathname === '/sitemap.xml') {
        const pages = ['', 'ucl', 'uel', 'uecl']
          .map(p => '<url><loc>https://drawer.win/' + p + '</loc></url>').join('');
        return new Response(
          '<?xml version="1.0" encoding="UTF-8"?>'
          + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + pages + '</urlset>',
          { headers: { 'Content-Type': 'application/xml; charset=utf-8' } }
        );
      }

      const slug = url.pathname.replace(/^\/|\/$/g, '');
      const page = PAGES[slug];
      if (!page) {
        return new Response('Not found', {
          status: 404,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }
      // Tarayici 10 dakika onbellekte tutsun, sonrasinda bayat kopyayi
      // gosterip arkada tazelesin. Her yenilemenin Worker istegi harcamasi
      // ucretsiz plandaki gunluk 100 bin sinirini hizla tuketiyordu.
      // ETag denendi ve vazgecildi: Cloudflare yaniti akitirken dusuruyor.
      const body = SITE_HTML
        .replace('<link rel="canonical" href="https://drawer.win/">',
                 '<link rel="canonical" href="https://drawer.win' + page.path + '">')
        .replace('<meta property="og:url" content="https://drawer.win/">',
                 '<meta property="og:url" content="https://drawer.win' + page.path + '">');

      return new Response(body, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=600, stale-while-revalidate=86400'
        }
      });
    }
    if (parts[1] !== 'saves') return json({ error: 'bulunamadı' }, 404, cors);
    const id = parts[2];

    try {
      if (request.method === 'GET' && !id) return await listSaves(env, cors);
      if (request.method === 'GET' && id) return await getSave(env, id, cors);
      if (request.method === 'POST' && !id) return await createSave(request, env, cors);
      if (request.method === 'DELETE' && id) return await deleteSave(request, env, id, cors);
      return json({ error: 'desteklenmeyen istek' }, 405, cors);
    } catch (e) {
      return json({ error: 'sunucu hatası', detail: String((e && e.message) || e) }, 500, cors);
    }
  }
};
