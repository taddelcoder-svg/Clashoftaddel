'use strict';
/* Clash of Taddel – Server für Render: liefert das Spiel aus und rechnet Online-Duelle.
   Der Server ist die Wahrheit: Er führt die Simulation (public/logik.js) und schickt beiden Spielern Schnappschüsse. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const COT = require('./public/logik.js');

const PORT = process.env.PORT || 10000;
const OEFFENTLICH = path.join(__dirname, 'public');
const DREI = require.resolve('three').replace(/three\.cjs$/, 'three.module.min.js');
const TYPEN = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json; charset=utf-8', '.woff2': 'font/woff2' };

const server = http.createServer((req, res) => {
  let pfad;
  try { pfad = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
  if (pfad === '/healthz') { res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end('ok'); }
  if (pfad === '/api/status') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ online: wss.clients.size, kaempfe: kaempfe.size, wartend: warteschlange.length })); }
  if (pfad.endsWith('/')) pfad += 'index.html';
  // Three.js kommt aus node_modules (wird von Render per npm install geholt)
  const datei = pfad === '/vendor/three.module.min.js' ? DREI : path.join(OEFFENTLICH, path.normalize(pfad));
  if (datei !== DREI && !datei.startsWith(OEFFENTLICH)) { res.writeHead(403); return res.end(); }
  fs.readFile(datei, (fehler, inhalt) => {
    if (fehler) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Nicht gefunden'); }
    res.writeHead(200, { 'Content-Type': TYPEN[path.extname(datei)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(inhalt);
  });
});

const wss = new WebSocketServer({ server, maxPayload: 4096 });
const warteschlange = [];          // Spieler, die ein zufälliges Duell suchen
const raeume = new Map();          // Code -> wartender Spieler (Freundes-Duell)
const kaempfe = new Set();

const sende = (ws, obj) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj)); };
const sauber = t => String(t || '').replace(/[\u0000-\u001f<>&"]/g, '').trim().slice(0, 16) || 'Unbekannt';
const raumCode = () => { let c; do c = String(Math.floor(1000 + Math.random() * 9000)); while (raeume.has(c)); return c; };

function austragen(ws) {
  const i = warteschlange.indexOf(ws); if (i >= 0) warteschlange.splice(i, 1);
  for (const [c, w] of raeume) if (w === ws) raeume.delete(c);
}

function kampfStarten(a, b) {
  austragen(a); austragen(b);
  const sim = new COT.Sim([a.info.deck, b.info.deck]);
  const k = { sim, spieler: [a, b], takt: 0, fertig: false };
  a.kampf = k; a.team = 0; b.kampf = k; b.team = 1;
  kaempfe.add(k);
  for (const ws of k.spieler) sende(ws, { t: 'start', team: ws.team, gegner: k.spieler[1 - ws.team].info, ich: ws.info });
  k.uhr = setInterval(() => kampfTakt(k), 1000 / 30);
}

function kampfTakt(k) {
  const s = k.sim;
  s.step(1 / 30);
  if (++k.takt % 2 && !s.vorbei) return;
  const snap = s.schnappschuss(), fx = s.fx.splice(0);
  for (const ws of k.spieler) sende(ws, { t: 's', s: snap, el: Math.round(s.elixier[ws.team] * 100) / 100, h: s.hand(ws.team), n: s.naechste(ws.team), fx });
  if (s.vorbei) kampfEnde(k, s.sieger, false);
}

function kampfEnde(k, sieger, aufgabe) {
  if (k.fertig) return;
  k.fertig = true; clearInterval(k.uhr); kaempfe.delete(k);
  for (const ws of k.spieler) { sende(ws, { t: 'ende', sieger, kronen: k.sim.kronen, aufgabe }); ws.kampf = null; }
}

wss.on('connection', ws => {
  ws.lebt = true;
  ws.on('pong', () => { ws.lebt = true; });
  ws.on('message', roh => {
    let m; try { m = JSON.parse(roh); } catch (e) { return; }
    if (!m || typeof m !== 'object') return;
    if (m.t === 'hallo') {
      ws.info = { name: sauber(m.name), troph: Math.max(0, Math.min(99999, Math.floor(+m.troph || 0))), deck: COT.deckPruefen(m.deck) };
      return;
    }
    if (!ws.info) return;
    if (m.t === 'suche' && !ws.kampf) {
      austragen(ws);
      const gegner = warteschlange.find(w => w !== ws && w.readyState === 1);
      if (gegner) kampfStarten(gegner, ws); else { warteschlange.push(ws); sende(ws, { t: 'warte' }); }
    } else if (m.t === 'raum' && !ws.kampf) {
      austragen(ws);
      const c = raumCode(); raeume.set(c, ws); sende(ws, { t: 'code', code: c });
    } else if (m.t === 'beitreten' && !ws.kampf) {
      const c = String(m.code || '').trim(), host = raeume.get(c);
      if (!host || host === ws || host.readyState !== 1) return sende(ws, { t: 'fehler', text: 'Diesen Raum gibt es nicht (mehr).' });
      kampfStarten(host, ws);
    } else if (m.t === 'abbrechen') {
      austragen(ws);
    } else if (m.t === 'spiel' && ws.kampf) {
      ws.kampf.sim.spielen(ws.team, String(m.key), +m.x, +m.y);
    } else if (m.t === 'emote' && ws.kampf) {
      const i = Math.floor(+m.i); if (i >= 0 && i < 8) for (const w of ws.kampf.spieler) sende(w, { t: 'emote', team: ws.team, i });
    } else if (m.t === 'aufgeben' && ws.kampf) {
      kampfEnde(ws.kampf, 1 - ws.team, true);
    }
  });
  ws.on('close', () => {
    austragen(ws);
    if (ws.kampf) kampfEnde(ws.kampf, 1 - ws.team, true);
  });
});

// Tote Verbindungen aufräumen
setInterval(() => { for (const ws of wss.clients) { if (!ws.lebt) { ws.terminate(); continue; } ws.lebt = false; ws.ping(); } }, 25000).unref();

server.listen(PORT, () => console.log(`Clash of Taddel läuft auf Port ${PORT}`));
