/* Clash of Taddel – Oberfläche, Steuerung, Computer-Kampf und Online-Duell. Die 3D-Grafik steckt in grafik.js. */
import * as G from './grafik.js';

const { W, H, KARTEN, ARENEN, STARTDECK, SPIELBAR, Sim, KI, arenaVon, deckPruefen, SPIELZEIT, VERLAENGERUNG } = window.COT;
const EMOTES = ['👍', '😂', '😡', '😭', '🤯', '👑'];
const RARITAET = ['Gewöhnlich', 'Selten', 'Episch', 'Legendär'];
const $ = id => document.getElementById(id);

/* ---------- Spielstand ---------- */
const SPEICHER = 'cot_spielstand';
const stand = { troph: 0, best: 0, siege: 0, nieder: 0, deck: STARTDECK.slice(), name: '' };
try { Object.assign(stand, JSON.parse(localStorage.getItem(SPEICHER) || '{}')); } catch (e) {}
try { if (!stand.name) stand.name = localStorage.getItem('sl_name') || ''; } catch (e) {}
const freigeschaltet = k => KARTEN[k].a <= arenaVon(stand.best);
stand.deck = deckPruefen(stand.deck).filter(freigeschaltet);
for (const k of STARTDECK) if (stand.deck.length < 8 && !stand.deck.includes(k)) stand.deck.push(k);
function speichern() { try { localStorage.setItem(SPEICHER, JSON.stringify(stand)); } catch (e) {} }
window.SLRangAdapter = () => ({ punkte: stand.best, progress: Math.min(100, Math.round(stand.best / ARENEN[ARENEN.length - 1].ab * 100)) });

/* ---------- 3D-Welt ---------- */
G.init($('welt'));
const BILDER = G.kartenBilder(SPIELBAR);
function bereichMessen() {
  const kampf = $('kampf').classList.contains('an');
  const oben = kampf ? $('hud').getBoundingClientRect().bottom : 0;
  const unten = kampf ? innerHeight - $('handBereich').getBoundingClientRect().top : 0;
  G.groesse(oben, unten);
}
addEventListener('resize', bereichMessen);
if (window.ResizeObserver) new ResizeObserver(bereichMessen).observe($('handBereich'));

/* ---------- Bildschirme ---------- */
function zeige(id) {
  document.querySelectorAll('.bildschirm').forEach(b => b.classList.toggle('an', b.id === id));
  if (id === 'menu') menuAktualisieren();
  if (id === 'deck') deckZeichnen();
  if (id !== 'kampf') { G.modus('menu', 0, arenaVon(stand.troph)); }
  bereichMessen();
}
document.querySelectorAll('[data-zu]').forEach(b => b.addEventListener('click', () => zeige(b.dataset.zu)));

function menuAktualisieren() {
  const a = arenaVon(stand.troph), ar = ARENEN[a], nx = ARENEN[a + 1];
  $('arenaEmoji').textContent = ar.e; $('arenaName').textContent = 'Arena ' + (a + 1) + ': ' + ar.n;
  $('trophAnzeige').textContent = stand.troph;
  $('arenaBalken').style.width = nx ? Math.round((stand.troph - ar.ab) / (nx.ab - ar.ab) * 100) + '%' : '100%';
  const neu = nx ? SPIELBAR.filter(k => KARTEN[k].a === a + 1).map(k => KARTEN[k].n).join(', ') : '';
  $('arenaNaechste').textContent = nx ? `Nächste Arena ab ${nx.ab} 🏆: ${nx.n} – mit ${neu}` : 'Höchste Arena erreicht!';
  $('statSiege').textContent = stand.siege + ' Siege'; $('statNieder').textContent = stand.nieder + ' Niederlagen'; $('statBest').textContent = 'Rekord ' + stand.best + ' 🏆';
  G.modus('menu', 0, a);
}

/* ---------- Karten-Elemente ---------- */
function karteEl(k, extra) {
  const c = KARTEN[k], b = document.createElement('button');
  b.className = 'karte r' + (c.rar || 0); b.type = 'button';
  b.innerHTML = `<span class="bild" style="background-image:url(${BILDER[k]})"></span><span class="kosten">${c.c}</span><span class="nm">${c.n}</span>`;
  b.setAttribute('aria-label', `${c.n}, ${c.c} Elixier`);
  b.dataset.key = k;
  if (extra) extra(b, c);
  return b;
}

/* ---------- Deck-Bau ---------- */
let infoKarte = null, tauschModus = false;
function deckZeichnen() {
  const dg = $('deckGitter'); dg.innerHTML = '';
  stand.deck.forEach((k, i) => dg.appendChild(karteEl(k, b => b.addEventListener('click', () => {
    if (tauschModus && infoKarte) {
      const alt = stand.deck.indexOf(infoKarte);
      if (alt >= 0) [stand.deck[alt], stand.deck[i]] = [stand.deck[i], stand.deck[alt]]; else stand.deck[i] = infoKarte;
      tauschModus = false; speichern(); deckZeichnen(); ton(660, .08);
    } else { infoKarte = k; deckZeichnen(); }
  }))));
  $('deckBox').classList.toggle('tausch', tauschModus);
  const schnitt = stand.deck.reduce((s, k) => s + KARTEN[k].c, 0) / 8;
  $('deckSchnitt').textContent = 'Ø ' + schnitt.toFixed(1) + ' Elixier';
  const sg = $('sammlGitter'); sg.innerHTML = '';
  SPIELBAR.slice().sort((a, b) => KARTEN[a].a - KARTEN[b].a || KARTEN[a].c - KARTEN[b].c).forEach(k => {
    const frei = freigeschaltet(k);
    sg.appendChild(karteEl(k, (b, c) => {
      if (!frei) { b.classList.add('gesperrt'); b.insertAdjacentHTML('beforeend', `<span class="schloss">🔒<br>Arena ${c.a + 1}</span>`); }
      if (stand.deck.includes(k)) b.classList.add('imdeck');
      if (k === infoKarte) b.classList.add('gewaehlt');
      b.addEventListener('click', () => { infoKarte = k; tauschModus = false; deckZeichnen(); });
    }));
  });
  infoZeichnen();
}
function infoZeichnen() {
  const box = $('kartenInfo'), k = infoKarte;
  if (!k) { box.innerHTML = '<p class="klein-hinweis" style="flex:1">Tippe auf eine Karte, um sie anzusehen und ins Deck zu nehmen.</p>'; return; }
  const c = KARTEN[k], frei = freigeschaltet(k), imDeck = stand.deck.includes(k);
  const w = [];
  w.push(`<b>${RARITAET[c.rar || 0]}</b>`);
  if (c.hp) w.push(`❤️ ${c.hp}${c.cnt ? ' ×' + c.cnt : ''}`);
  if (c.dmg) w.push(`💥 ${c.dmg}`);
  if (c.rng) w.push(`🎯 ${c.rng > 1 ? c.rng : 'Nahkampf'}`);
  if (c.t === 'troop') w.push(c.tg === 'buildings' ? '🏰 nur Gebäude' : c.tg === 'ground' ? '⬇️ nur Boden' : '⬆️ Boden & Luft');
  if (c.fly) w.push('🪽 fliegt');
  if (c.t === 'building') w.push(`⏳ ${c.life} s`);
  if (c.t === 'spell') w.push(`✨ Zauber · Radius ${c.rad}`);
  box.innerHTML = `<div class="portrait r${c.rar || 0}" style="background-image:url(${BILDER[k]})"><span class="kosten">${c.c}</span></div>
    <div style="flex:1;min-width:0"><h3>${c.n}</h3><div class="quelle">aus: ${c.q}</div><p>${c.d}</p><div class="werte">${w.map(x => `<span>${x}</span>`).join('')}</div>
    <div style="margin-top:10px">${!frei ? `<span class="klein-hinweis">🔒 Wird in Arena ${c.a + 1} (${ARENEN[c.a].n}, ab ${ARENEN[c.a].ab} 🏆) freigeschaltet.</span>`
      : tauschModus ? '<span class="klein-hinweis">Tippe oben auf die Karte, die ersetzt werden soll.</span>'
      : `<button class="knopf klein" id="einsetzen">${imDeck ? 'Position tauschen' : 'Ins Deck nehmen'}</button>`}</div></div>`;
  const b = $('einsetzen'); if (b) b.addEventListener('click', () => { tauschModus = true; deckZeichnen(); });
}
$('deckKnopf').addEventListener('click', () => { infoKarte = null; tauschModus = false; zeige('deck'); });

/* ---------- Ton ---------- */
let audio = null;
function ton(f, dauer, typ, laut) {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime;
    o.type = typ || 'square'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(Math.max(40, f * .6), t + dauer);
    g.gain.setValueAtTime(laut || .05, t); g.gain.exponentialRampToValueAtTime(.0001, t + dauer);
    o.connect(g); g.connect(audio.destination); o.start(t); o.stop(t + dauer);
  } catch (e) {}
}

/* ---------- Kampf ---------- */
let K = null;
function kampfAnlegen(modus, opts) {
  K = Object.assign({
    modus, team: 0, ansicht: { ents: [], geschosse: [], zonen: [] }, elixier: 5, hand: [], naechste: null,
    zeit: 0, verl: false, kronen: [0, 0], gewaehlt: null, ziehen: false, zeiger: null, vorbei: false, laeuft: true,
    gegnerName: 'Computer', doppeltGemeldet: false
  }, opts || {});
  $('nameGegner').textContent = K.gegnerName; $('nameIch').textContent = stand.name || 'Du';
  emoteLeiste();
  zeige('kampf');
  G.modus('kampf', K.team, arenaVon(stand.troph));
  handZeichnen(true);
  bereichMessen(); requestAnimationFrame(bereichMessen);
}

function kampfGegenKI() {
  const arena = arenaVon(stand.troph);
  const pool = SPIELBAR.filter(k => KARTEN[k].a <= arena);
  const kiDeck = pool.slice().sort(() => Math.random() - .5).slice(0, 8);
  const sim = new Sim([stand.deck, kiDeck]);
  const namen = ['Bowser', 'Dr. Doofenschmirtz', 'Plankton', 'Team Rocket', 'Dr. Eggman', 'Ganondorf', 'Lord Voldemort', 'Der Imperator', 'Loki', 'Skeletor'];
  kampfAnlegen('ki', { sim, ki: new KI(sim, 1, arena), gegnerName: namen[Math.floor(Math.random() * namen.length)] });
  banner('⚔️ Kampf!');
}
$('kiKnopf').addEventListener('click', () => { ton(520, .1); kampfGegenKI(); });

function ansichtAusSim(sim) {
  return {
    ents: sim.ents.map(e => ({ id: e.id, key: e.key, team: e.team, x: e.x, y: e.y, hp: Math.max(0, e.hp), max: e.max, r: e.r, fly: e.fly,
      deploy: e.deploy > 0, stun: e.stun > 0, aktiv: !!e.aktiv, strahl: e.strahl > 0, rage: e.rage > 0, slow: e.slow > 0, angriff: e.angriff > 0,
      ziel: e.ziel && e.ziel.hp > 0 ? [e.ziel.x, e.ziel.y] : null, lade: KARTEN[e.key] && KARTEN[e.key].charge ? e.lade / e.hs : 0 })),
    geschosse: sim.geschosse.map(g => [g.x, g.y, g.col || '#fff']),
    zonen: sim.zonen.map(z => [z.x, z.y, z.rad, z.team])
  };
}
function ansichtAusSchnapp(s) {
  return {
    ents: s.e.map(a => ({ id: a[0], key: a[1], team: a[2], x: a[3], y: a[4], hp: a[5], max: a[6], r: a[7], fly: !!(a[8] & 1), deploy: !!(a[8] & 2),
      stun: !!(a[8] & 4), aktiv: !!(a[8] & 8), strahl: !!(a[8] & 16), rage: !!(a[8] & 32), slow: !!(a[8] & 64), angriff: !!(a[8] & 128), ziel: a[9] || null, lade: a[10] || 0 })),
    geschosse: s.g, zonen: s.zo
  };
}
function gueltig(key, x, y) {
  if (!K) return false;
  if (K.modus === 'ki') return K.sim.gueltig(K.team, key, x, y);
  const t = K.ansicht.ents.filter(e => e.key === 'princess');
  const fake = { prinzessinLebt: (team, links) => t.some(e => e.team === team && (e.x < 9) === links && e.hp > 0) };
  return Sim.prototype.gueltig.call(fake, K.team, key, x, y);
}

function fxVerarbeiten(liste) {
  G.effekte(liste, K.team);
  for (const f of liste) {
    if (f.a === 'spiel' && f.team !== K.team) ton(300, .08, 'triangle', .03);
    else if (f.a === 'zauber') ton(180, .3, 'sawtooth', .05);
    else if (f.a === 'strahl') ton(900, .25, 'sawtooth', .03);
    else if (f.a === 'tod' && f.kind === 'tower') { ton(90, .6, 'sawtooth', .09); banner(f.team === K.team ? 'Turm verloren!' : '👑 Krone!'); }
    else if (f.a === 'verl') banner('⏱️ Verlängerung!');
  }
}
function banner(text) {
  const b = document.createElement('div'); b.className = 'banner'; b.textContent = text;
  $('kampf').appendChild(b); setTimeout(() => b.remove(), 1900);
}

/* ---------- Hand & HUD ---------- */
let handSchluessel = '';
function handZeichnen(erzwingen) {
  const schl = K.hand.join() + '|' + K.naechste + '|' + K.gewaehlt;
  if (schl !== handSchluessel || erzwingen) {
    handSchluessel = schl;
    const h = $('hand'); h.innerHTML = '';
    const n = document.createElement('div'); n.className = 'naechste';
    n.innerHTML = '<span>Nächste</span>';
    if (K.naechste) { const nk = karteEl(K.naechste); nk.tabIndex = -1; nk.disabled = true; n.appendChild(nk); }
    h.appendChild(n);
    K.hand.forEach(key => {
      const b = karteEl(key, b => b.insertAdjacentHTML('beforeend', '<span class="lade"></span>'));
      b.classList.add('handkarte');
      if (key === K.gewaehlt) b.classList.add('gewaehlt');
      b.addEventListener('pointerdown', ev => {
        ev.preventDefault();
        if (K.vorbei) return;
        K.gewaehlt = K.gewaehlt === key && !K.ziehen ? null : key; K.ziehen = true; K.zeiger = null;
        handZeichnen(); ton(440, .05, 'triangle', .03);
      });
      b.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); K.gewaehlt = key; handZeichnen(); } });
      h.appendChild(b);
    });
  }
  const el = Math.min(10, K.elixier);
  $('elixierZahl').textContent = Math.floor(el);
  $('elixierBalken').style.width = el * 10 + '%';
  document.querySelectorAll('#hand > .karte').forEach(b => {
    const c = KARTEN[b.dataset.key], fehlt = Math.max(0, c.c - el);
    b.classList.toggle('zuteuer', fehlt > 0);
    const lade = b.querySelector('.lade'); if (lade) lade.style.height = (fehlt > 0 ? Math.min(100, fehlt / c.c * 100) : 0) + '%';
  });
}
function hudZeichnen() {
  const rest = Math.max(0, Math.ceil((K.verl ? SPIELZEIT + VERLAENGERUNG : SPIELZEIT) - K.zeit));
  const doppelt = K.zeit >= SPIELZEIT - 60;
  $('uhrZeit').textContent = `${Math.floor(rest / 60)}:${String(rest % 60).padStart(2, '0')}`;
  $('uhrText').textContent = K.verl ? 'Verlängerung' : doppelt ? '2× Elixier' : 'Restzeit';
  $('uhr').classList.toggle('knapp', rest <= 10);
  $('uhr').classList.toggle('doppelt', doppelt);
  if (doppelt && !K.doppeltGemeldet) { K.doppeltGemeldet = true; banner('💧 2× Elixier!'); }
  const kr = n => [0, 1, 2].map(i => `<i class="${i < n ? 'an' : ''}"></i>`).join('');
  $('kronenIch').innerHTML = kr(K.kronen[K.team]); $('kronenGegner').innerHTML = kr(K.kronen[1 - K.team]);
}

/* ---------- Eingabe ---------- */
const box = $('arenaBox');
function legen(p) {
  if (!K || K.vorbei || !K.gewaehlt || !p) return false;
  const key = K.gewaehlt, c = KARTEN[key];
  if (!gueltig(key, p.x, p.y)) { ton(140, .12, 'square', .04); return false; }
  if (K.elixier < c.c) { banner('Zu wenig Elixier'); ton(140, .12, 'square', .04); return false; }
  if (K.modus === 'ki') { if (!K.sim.spielen(K.team, key, p.x, p.y)) return false; }
  else { netz.senden({ t: 'spiel', key, x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100 }); K.elixier -= c.c; K.hand = K.hand.filter(k => k !== key); }
  ton(620, .09, 'triangle', .05);
  K.gewaehlt = null; K.zeiger = null;
  handZeichnen();
  return true;
}
const imFeld = ev => { const r = box.getBoundingClientRect(); return ev.clientY >= r.top && ev.clientY <= r.bottom; };
addEventListener('pointermove', ev => { if (K && K.gewaehlt) K.zeiger = imFeld(ev) ? G.arenaPunkt(ev.clientX, ev.clientY) : null; });
addEventListener('pointerup', ev => {
  if (!K || !K.ziehen) return;
  K.ziehen = false;
  if (K.gewaehlt && imFeld(ev)) legen(G.arenaPunkt(ev.clientX, ev.clientY));
});
box.addEventListener('pointerdown', ev => { if (K && K.gewaehlt) K.zeiger = G.arenaPunkt(ev.clientX, ev.clientY); });
box.addEventListener('click', ev => { if (K && K.gewaehlt && !K.ziehen && ev.target === box) legen(G.arenaPunkt(ev.clientX, ev.clientY)); });

function emoteLeiste() {
  const el = $('emotes'); el.innerHTML = ''; el.classList.remove('an');
  EMOTES.forEach((e, i) => {
    const b = document.createElement('button'); b.textContent = e; b.setAttribute('aria-label', 'Emote ' + e);
    b.addEventListener('click', () => {
      el.classList.remove('an');
      if (K.modus === 'online') netz.senden({ t: 'emote', i });
      else { emoteZeigen(K.team, i); if (Math.random() < .5) setTimeout(() => K && emoteZeigen(1, Math.floor(Math.random() * EMOTES.length)), 900); }
    });
    el.appendChild(b);
  });
}
function emoteZeigen(team, i) { G.emote(team, EMOTES[i]); ton(700, .06, 'sine', .04); }
$('emoteKnopf').addEventListener('click', () => $('emotes').classList.toggle('an'));
$('aufgebenKnopf').addEventListener('click', () => {
  if (!K || K.vorbei || !confirm('Wirklich aufgeben?')) return;
  if (K.modus === 'online') netz.senden({ t: 'aufgeben' }); else K.sim.ende(1 - K.team);
});

/* ---------- Spielschleife ---------- */
let letzte = performance.now(), rest = 0;
function schleife(jetzt) {
  requestAnimationFrame(schleife);
  const dt = Math.min(.1, (jetzt - letzte) / 1000); letzte = jetzt;
  if (K && K.laeuft) {
    if (K.modus === 'ki') {
      rest += dt;
      while (rest >= 1 / 30) { rest -= 1 / 30; if (!K.vorbei) { K.ki.step(1 / 30); K.sim.step(1 / 30); } }
      const s = K.sim;
      fxVerarbeiten(s.fx.splice(0));
      K.ansicht = ansichtAusSim(s); K.elixier = s.elixier[K.team]; K.hand = s.hand(K.team); K.naechste = s.naechste(K.team);
      K.zeit = s.zeit; K.verl = s.verl; K.kronen = s.kronen;
      if (s.vorbei && !K.vorbei) kampfVorbei(s.sieger, s.kronen);
    } else {
      K.elixier = Math.min(10, K.elixier + dt / 2.8 * (K.zeit >= SPIELZEIT - 60 ? 2 : 1));
      if (!K.vorbei) K.zeit += dt;
      if (K.ziel && K.vorher) {
        K.mix = Math.min(1, K.mix + dt / .066);
        const alt = new Map(K.vorher.ents.map(e => [e.id, e]));
        K.ansicht = { ents: K.ziel.ents.map(e => { const a = alt.get(e.id); return a ? Object.assign({}, e, { x: a.x + (e.x - a.x) * K.mix, y: a.y + (e.y - a.y) * K.mix }) : e; }), geschosse: K.ziel.geschosse, zonen: K.ziel.zonen };
      }
    }
    handZeichnen(); hudZeichnen();
    const z = K.gewaehlt && K.zeiger;
    G.vorschau(K.gewaehlt, z ? z.x : null, z ? z.y : null, z ? gueltig(K.gewaehlt, z.x, z.y) : false, gueltig);
  } else G.vorschau(null, null, null, false, () => true);
  G.bild(K && K.laeuft ? K.ansicht : null, dt, K ? K.team : 0);
}
requestAnimationFrame(schleife);

/* ---------- Ende ---------- */
function kampfVorbei(sieger, kronen) {
  if (!K || K.vorbei) return;
  K.vorbei = true; K.gewaehlt = null;
  const gewonnen = sieger === K.team, unentschieden = sieger === 2;
  const vorherArena = arenaVon(stand.best);
  let delta = 0;
  if (gewonnen) { delta = 30; stand.siege++; } else if (!unentschieden) { delta = -Math.min(20, stand.troph); stand.nieder++; }
  stand.troph += delta; stand.best = Math.max(stand.best, stand.troph); speichern();
  if (window.SLRang) window.SLRang.melde(window.SLRangAdapter());
  const nachherArena = arenaVon(stand.best);
  setTimeout(() => {
    $('ergTitel').textContent = unentschieden ? 'Unentschieden' : gewonnen ? 'Sieg!' : 'Niederlage';
    $('ergebnisOverlay').dataset.art = unentschieden ? 'remis' : gewonnen ? 'sieg' : 'nieder';
    $('ergKronenIch').innerHTML = [0, 1, 2].map(i => `<i class="${i < kronen[K.team] ? 'an' : ''}"></i>`).join('');
    $('ergKronenGegner').innerHTML = [0, 1, 2].map(i => `<i class="${i < kronen[1 - K.team] ? 'an rot' : ''}"></i>`).join('');
    $('ergTroph').textContent = (delta >= 0 ? '+' : '') + delta;
    const neu = $('ergNeu');
    if (nachherArena > vorherArena) {
      neu.hidden = false;
      neu.textContent = `Neue Arena: ${ARENEN[nachherArena].n}! Freigeschaltet: ` + SPIELBAR.filter(k => KARTEN[k].a > vorherArena && KARTEN[k].a <= nachherArena).map(k => KARTEN[k].n).join(', ');
    } else neu.hidden = true;
    $('ergebnisOverlay').classList.add('an');
    ton(gewonnen ? 880 : 220, .5, 'triangle', .07);
  }, 1500);
}
$('ergWeiter').addEventListener('click', () => {
  $('ergebnisOverlay').classList.remove('an');
  if (K) K.laeuft = false;
  K = null; zeige('menu');
});

/* ---------- Online ---------- */
const netz = {
  ws: null,
  senden(o) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(o)); },
  verbinden() {
    return new Promise((ok, nein) => {
      if (this.ws && this.ws.readyState === 1) return ok();
      if (!/^https?:$/.test(location.protocol)) return nein(new Error('Online-Duelle gehen nur über den Server.'));
      const ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host);
      this.ws = ws;
      const zeit = setTimeout(() => nein(new Error('Server antwortet nicht – er wacht vielleicht gerade auf. Gleich nochmal versuchen.')), 20000);
      ws.onopen = () => { clearTimeout(zeit); ok(); };
      ws.onerror = () => { clearTimeout(zeit); nein(new Error('Keine Verbindung zum Server.')); };
      ws.onclose = () => { if (this.ws === ws) this.ws = null; if (K && K.modus === 'online' && !K.vorbei) { banner('Verbindung verloren'); kampfVorbei(1 - K.team, K.kronen); } };
      ws.onmessage = ev => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; } this.nachricht(m); };
    });
  },
  nachricht(m) {
    if (m.t === 'warte') lobbyStatus('Suche Gegner', true);
    else if (m.t === 'code') { $('codeAnzeige').hidden = false; $('codeText').textContent = m.code; lobbyStatus('Warte auf deinen Freund', true); }
    else if (m.t === 'fehler') lobbyStatus(m.text);
    else if (m.t === 'start') {
      $('abbrechenKnopf').hidden = true; $('codeAnzeige').hidden = true; lobbyStatus('');
      kampfAnlegen('online', { team: m.team, gegnerName: m.gegner.name + ' · ' + m.gegner.troph + ' 🏆', ziel: null, vorher: null, mix: 1 });
      banner('⚔️ Kampf!'); ton(660, .2, 'triangle', .06);
    }
    else if (m.t === 's' && K && K.modus === 'online') {
      const a = ansichtAusSchnapp(m.s);
      K.vorher = K.ziel ? { ents: K.ansicht.ents } : a; K.ziel = a; K.mix = 0;
      if (!K.ansicht.ents.length) K.ansicht = a;
      K.elixier = m.el; K.hand = m.h; K.naechste = m.n; K.zeit = m.s.z; K.verl = !!m.s.v; K.kronen = m.s.k;
      if (K.gewaehlt && !K.hand.includes(K.gewaehlt)) K.gewaehlt = null;
      fxVerarbeiten(m.fx || []);
    }
    else if (m.t === 'emote' && K) emoteZeigen(m.team, m.i);
    else if (m.t === 'ende' && K && K.modus === 'online') {
      if (m.aufgabe && m.sieger === K.team) banner('Gegner hat aufgegeben');
      K.kronen = m.kronen; kampfVorbei(m.sieger, m.kronen);
    }
  }
};
function lobbyStatus(text, punkte) { const s = $('lobbyStatus'); s.textContent = text; s.classList.toggle('lade-punkte', !!punkte); }
function nameHolen() {
  const n = $('nameFeld').value.trim().slice(0, 16);
  if (n.length < 2) { lobbyStatus('Bitte gib einen Namen ein (mind. 2 Zeichen).'); $('nameFeld').focus(); return null; }
  stand.name = n; speichern(); return n;
}
async function online(aktion) {
  const name = nameHolen(); if (!name) return;
  lobbyStatus('Verbinde', true);
  try { await netz.verbinden(); } catch (e) { lobbyStatus(e.message); return; }
  netz.senden({ t: 'hallo', name, troph: stand.troph, deck: stand.deck });
  netz.senden(aktion);
  $('abbrechenKnopf').hidden = false;
}
$('onlineKnopf').addEventListener('click', () => { $('nameFeld').value = stand.name || ''; lobbyStatus(''); $('codeAnzeige').hidden = true; $('abbrechenKnopf').hidden = true; zeige('lobby'); });
$('sucheKnopf').addEventListener('click', () => { $('codeAnzeige').hidden = true; online({ t: 'suche' }); });
$('raumKnopf').addEventListener('click', () => online({ t: 'raum' }));
$('beitretenKnopf').addEventListener('click', () => {
  const c = $('codeFeld').value.trim();
  if (!/^\d{4}$/.test(c)) { lobbyStatus('Der Code hat 4 Ziffern.'); return; }
  $('codeAnzeige').hidden = true; online({ t: 'beitreten', code: c });
});
function lobbyVerlassen() { netz.senden({ t: 'abbrechen' }); $('abbrechenKnopf').hidden = true; $('codeAnzeige').hidden = true; lobbyStatus(''); }
$('abbrechenKnopf').addEventListener('click', lobbyVerlassen);
$('lobbyZurueck').addEventListener('click', () => { lobbyVerlassen(); zeige('menu'); });

// Startbild-Karten im Menü
$('menuKarten').innerHTML = '';
stand.deck.slice(0, 4).forEach(k => { const b = karteEl(k); b.tabIndex = -1; b.addEventListener('click', () => { infoKarte = k; zeige('deck'); }); $('menuKarten').appendChild(b); });
zeige('menu');
$('lade').remove();
