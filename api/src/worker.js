import { SITE_HTML } from './site.js';

const MAX_NAME = 60;
const MAX_MATCHES = 200;
const MAX_BODY = 64 * 1024;
const LIST_LIMIT = 60;
const RATE_PER_HOUR = 30;
const ID_ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz';

function corsHeaders(request, env) {
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const origin = request.headers.get('Origin') || '';
  const headers = {
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,X-Save-Token',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
  if (origin && allowed.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
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

  const picks = body.picks;
  if (picks !== undefined) {
    if (!Array.isArray(picks) || picks.length > MAX_MATCHES) return 'tahmin listesi geçersiz';
    for (const key of picks) if (typeof key !== 'string') return 'tahmin anahtarı metin olmalı';
  }
  return null;
}

async function listSaves(env, cors) {
  const { results } = await env.DB
    .prepare('SELECT id, name, seed, matches, picks, created_at FROM saves ORDER BY created_at DESC LIMIT ?')
    .bind(LIST_LIMIT)
    .all();
  return json({ saves: results || [] }, 200, cors);
}

async function getSave(env, id, cors) {
  const row = await env.DB
    .prepare('SELECT id, name, seed, matches, picks, payload, created_at FROM saves WHERE id = ?')
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
  const payload = JSON.stringify({ v: 1, seed: body.seed, scores, picks });
  const id = randomId(8);
  const token = randomToken();

  await env.DB
    .prepare('INSERT INTO saves (id, name, seed, payload, matches, picks, token, ip_hash, created_at) VALUES (?,?,?,?,?,?,?,?,?)')
    .bind(id, body.name.trim(), body.seed, payload, Object.keys(scores).length, picks.length, token, ipHash, Date.now())
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
      if (url.pathname === '/robots.txt') {
        return new Response('User-agent: *\nDisallow: /\n', {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }
      return new Response(SITE_HTML, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache',
          'X-Robots-Tag': 'noindex, nofollow'
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
