/* Clash of Taddel – Oberfläche, Steuerung, Computer-Kampf und Online-Duell. Die 3D-Grafik steckt in grafik.js. */
import * as G from './grafik.js';

const { W, H, KARTEN, ARENEN, STARTDECK, SPIELBAR, Sim, KI, arenaVon, deckPruefen, SPIELZEIT, VERLAENGERUNG, MODI, MAX_KOENIG } = window.COT;
const EMOTES = ['👍', '😂', '😡', '😭', '🤯', '👑'];
const RARITAET = ['Gewöhnlich', 'Selten', 'Episch', 'Legendär'];
const $ = id => document.getElementById(id);

/* ---------- Spielstand ---------- */
const SPEICHER = 'cot_spielstand';
const stand = { troph: 0, best: 0, siege: 0, nieder: 0, deck: STARTDECK.slice(), name: '', gold: 150, karten: {}, truhen: [{ art: 'gold', start: 1, dauer: 0 }, null, null, null], zyklus: 0,
  gems: 100, xp: 0, koenig: 1, decks: null, deckNr: 0, gratis: { n: 1, ab: Date.now() }, kronenTag: { datum: '', n: 0, geholt: false },
  aufgaben: { datum: '', liste: [] }, pfad: [], protokoll: [], stats: { dreiKronen: 0, gespielt: {}, karten: 0, online: 0 }, shop: { datum: '', gekauft: [] }, ton: true };
try { Object.assign(stand, JSON.parse(localStorage.getItem(SPEICHER) || '{}')); } catch (e) {}
try { if (!stand.name) stand.name = localStorage.getItem('sl_name') || ''; } catch (e) {}
const freigeschaltet = k => KARTEN[k].a <= arenaVon(stand.best);
function deckSaeubern(d) {
  d = deckPruefen(d).filter(freigeschaltet);
  for (const k of STARTDECK) if (d.length < 8 && !d.includes(k)) d.push(k);
  return d;
}
// Drei Deck-Plätze; stand.deck zeigt immer auf das aktive Deck
if (!Array.isArray(stand.decks) || stand.decks.length !== 3) stand.decks = [stand.deck, STARTDECK.slice(), STARTDECK.slice()];
stand.decks = stand.decks.map(deckSaeubern);
stand.deckNr = Math.max(0, Math.min(2, stand.deckNr | 0));
stand.deck = stand.decks[stand.deckNr];
const heute = () => new Date().toDateString();
// Karten-Level: Kopien und Gold zum Verbessern
const { MAX_STUFE } = window.COT;
const KOPIEN = [2, 4, 10, 20, 50, 100, 200, 400], GOLD = [5, 20, 50, 150, 400, 1000, 2000, 4000];
const RAR_TEILER = [1, 2, 5, 10], RAR_GOLD = [1, 1.5, 2.5, 4];
for (const k of SPIELBAR) if (KARTEN[k].a <= arenaVon(stand.best) && !stand.karten[k]) stand.karten[k] = { lvl: 1, n: 0 };
const stufe = k => (stand.karten[k] && stand.karten[k].lvl) || 1;
const brauchtKopien = k => stufe(k) >= MAX_STUFE ? Infinity : Math.ceil(KOPIEN[stufe(k) - 1] / RAR_TEILER[KARTEN[k].rar || 0]);
const brauchtGold = k => Math.round(GOLD[stufe(k) - 1] * RAR_GOLD[KARTEN[k].rar || 0]);
const verbesserbar = k => stand.karten[k] && stand.karten[k].n >= brauchtKopien(k) && stand.gold >= brauchtGold(k);
const meineStufen = () => Object.fromEntries(stand.deck.map(k => [k, stufe(k)]));

// Königslevel: Erfahrung aus Verbesserungen und Aufgaben, stärkt die eigenen Türme um 7 % pro Level
const XP_BIS = [20, 50, 100, 200, 400, 800, 1500, 2500, 4000, 6000, 9000, 13000];
const XP_UPGRADE = [4, 5, 6, 10, 25, 50, 100, 200];
function xpDazu(n) {
  stand.xp += n;
  while (stand.koenig < MAX_KOENIG && stand.xp >= XP_BIS[stand.koenig - 1]) {
    stand.xp -= XP_BIS[stand.koenig - 1]; stand.koenig++; stand.gems += 10;
    setTimeout(() => banner2(`👑 Königslevel ${stand.koenig}! Türme stärker · +10 💎`), 600);
  }
}

// Gratis-Truhe alle 4 Stunden (höchstens 2 auf Vorrat) und Kronentruhe (10 Kronen pro Tag)
const GRATIS_MS = 4 * 3600e3;
function gratisStand() {
  const g = stand.gratis;
  while (g.n < 2 && Date.now() >= g.ab + GRATIS_MS) { g.n++; g.ab += GRATIS_MS; }
  if (g.n >= 2) g.ab = Date.now();
  return g;
}
function kronenTag() { if (stand.kronenTag.datum !== heute()) stand.kronenTag = { datum: heute(), n: 0, geholt: false }; return stand.kronenTag; }

// Tägliche Aufgaben
const AUFGABEN = {
  siege: { n: 'Gewinne 3 Kämpfe', ziel: 3, gold: 150, gems: 5 },
  kronen: { n: 'Hole 8 Kronen', ziel: 8, gold: 120, xp: 10 },
  karten: { n: 'Spiele 40 Karten aus', ziel: 40, gold: 100, xp: 5 },
  kaempfe: { n: 'Bestreite 4 Kämpfe', ziel: 4, gold: 80, gems: 3 },
  truhen: { n: 'Öffne 2 Truhen', ziel: 2, gold: 100, xp: 10 },
  verbessern: { n: 'Verbessere eine Karte', ziel: 1, gold: 150, gems: 5 },
  online: { n: 'Spiele ein Online-Duell', ziel: 1, gems: 10 },
  dreikronen: { n: 'Gewinne mit 3 Kronen', ziel: 1, gold: 200, gems: 5 },
  ereignis: { n: 'Spiele 2 Ereignis-Kämpfe', ziel: 2, gold: 120, xp: 5 }
};
function zufallTag(salz) { let h = 2166136261; for (const ch of heute() + salz) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; }; }
function aufgabenHeute() {
  if (stand.aufgaben.datum !== heute()) {
    const r = zufallTag('aufgaben'), ids = Object.keys(AUFGABEN).sort(() => r() - 0.5).slice(0, 3);
    stand.aufgaben = { datum: heute(), liste: ids.map(id => ({ id, f: 0, geholt: false })) };
  }
  return stand.aufgaben.liste;
}
function aufgabe(id, n) { for (const a of aufgabenHeute()) if (a.id === id && !a.geholt) a.f = Math.min(AUFGABEN[id].ziel, a.f + (n || 1)); }

// Trophäenpfad
const PFAD = [[50, { gold: 100 }], [100, { truhe: 'silber' }], [150, { gems: 20 }], [200, { gold: 200 }], [250, { truhe: 'gold' }], [300, { gems: 30 }],
  [400, { gold: 300 }], [500, { truhe: 'magisch' }], [600, { gems: 40 }], [700, { gold: 500 }], [800, { truhe: 'gold' }], [900, { gems: 50 }],
  [1000, { truhe: 'legendaer' }], [1200, { gold: 800 }], [1400, { truhe: 'magisch' }], [1600, { gems: 80 }], [1800, { gold: 1200 }],
  [2000, { truhe: 'legendaer' }], [2300, { gems: 100 }], [2600, { truhe: 'magisch' }], [3000, { gold: 2500 }], [3500, { truhe: 'legendaer' }]];

// Truhen
const TRUHEN = {
  holz: { n: 'Holztruhe', zeit: 5, karten: 4, gold: [10, 25], farbe: '#a1887f' },
  silber: { n: 'Silbertruhe', zeit: 30, karten: 8, gold: [25, 50], farbe: '#cfd8dc' },
  gold: { n: 'Goldtruhe', zeit: 120, karten: 22, gold: [90, 160], farbe: '#ffca28' },
  magisch: { n: 'Magische Truhe', zeit: 300, karten: 45, gold: [250, 400], farbe: '#e040fb', episch: 1 },
  legendaer: { n: 'Legendäre Truhe', zeit: 480, karten: 1, gold: [100, 200], farbe: '#5ff0ff', legendaer: 1 },
  gratis: { n: 'Gratis-Truhe', zeit: 0, karten: 6, gold: [20, 45], gems: [0, 4], farbe: '#8bc34a' },
  kronen: { n: 'Kronentruhe', zeit: 0, karten: 28, gold: [120, 220], gems: [3, 10], farbe: '#ffca28' }
};
const ZYKLUS = ['silber', 'silber', 'gold', 'silber', 'holz', 'silber', 'gold', 'magisch', 'silber', 'silber', 'gold', 'silber', 'silber', 'gold', 'legendaer', 'silber', 'magisch', 'gold'];
function speichern() { try { localStorage.setItem(SPEICHER, JSON.stringify(stand)); } catch (e) {} }
window.SLRangAdapter = () => ({ punkte: stand.best, progress: Math.min(100, Math.round(stand.best / ARENEN[ARENEN.length - 1].ab * 100)) });

/* ---------- 3D-Welt ---------- */
G.init($('welt'));
const BILDER = G.kartenBilder(SPIELBAR.concat(Object.keys(TRUHEN).map(t => 'truhe_' + t)));
function bereichMessen() {
  const kampf = $('kampf').classList.contains('an');
  const hand = $('handBereich').getBoundingClientRect(), seitlich = kampf && getComputedStyle($('handBereich')).position === 'absolute';
  const oben = kampf ? $('hud').getBoundingClientRect().bottom : 0;
  const unten = kampf && !seitlich ? innerHeight - hand.top : 0;
  const rechts = seitlich ? innerWidth - hand.left : 0;
  G.groesse(oben, unten, rechts);
}
addEventListener('resize', bereichMessen);
if (window.ResizeObserver) new ResizeObserver(bereichMessen).observe($('handBereich'));

/* ---------- Bildschirme ---------- */
const TABS = ['shop', 'deck', 'menu', 'events', 'profil'];
function zeige(id) {
  document.querySelectorAll('.bildschirm').forEach(b => b.classList.toggle('an', b.id === id));
  $('tabs').hidden = !TABS.includes(id);
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('an', b.dataset.tab === id));
  if (id === 'menu') menuAktualisieren();
  if (id === 'deck') deckZeichnen();
  if (id === 'shop') shopZeichnen();
  if (id === 'events') eventsZeichnen();
  if (id === 'profil') profilZeichnen();
  if (id !== 'kampf') { G.modus('menu', 0, arenaVon(stand.troph)); }
  bereichMessen();
}
document.querySelectorAll('[data-zu]').forEach(b => b.addEventListener('click', () => zeige(b.dataset.zu)));
document.querySelectorAll('#tabs button').forEach(b => b.addEventListener('click', () => { ton(500, .04, 'triangle', .03); if (b.dataset.tab === 'deck') { infoKarte = null; tauschModus = false; } zeige(b.dataset.tab); }));
function kopfleiste() {
  const aufgabeBereit = aufgabenHeute().some(a => !a.geholt && a.f >= AUFGABEN[a.id].ziel);
  const pfadBereit = PFAD.some(([t], i) => stand.best >= t && !stand.pfad.includes(i));
  $('tabs').querySelector('[data-tab="events"]').classList.toggle('punkt', aufgabeBereit);
  $('tabs').querySelector('[data-tab="menu"]').classList.toggle('punkt', pfadBereit);
  $('pfadPunkt').hidden = !pfadBereit;
  const xp = stand.koenig >= MAX_KOENIG ? '100%' : Math.min(100, stand.xp / XP_BIS[stand.koenig - 1] * 100) + '%';
  document.querySelectorAll('.koenigwert').forEach(e => (e.textContent = stand.koenig));
  document.querySelectorAll('.xpwert').forEach(e => (e.style.width = xp));
  document.querySelectorAll('.namewert').forEach(e => (e.textContent = stand.name || 'Spieler'));
  document.querySelectorAll('.goldwert').forEach(e => (e.textContent = stand.gold));
  document.querySelectorAll('.gemwert').forEach(e => (e.textContent = stand.gems));
}

function menuAktualisieren() {
  const a = arenaVon(stand.troph), ar = ARENEN[a], nx = ARENEN[a + 1];
  $('arenaEmoji').textContent = ar.e; $('arenaName').textContent = 'Arena ' + (a + 1) + ': ' + ar.n;
  $('trophAnzeige').textContent = stand.troph;
  $('arenaBalken').style.width = nx ? Math.round((stand.troph - ar.ab) / (nx.ab - ar.ab) * 100) + '%' : '100%';
  const neu = nx ? SPIELBAR.filter(k => KARTEN[k].a === a + 1).map(k => KARTEN[k].n).join(', ') : '';
  $('arenaNaechste').textContent = nx ? `Nächste Arena ab ${nx.ab} 🏆: ${nx.n} – mit ${neu}` : 'Höchste Arena erreicht!';
  truhenZeichnen();
  G.modus('menu', 0, a);
}

/* ---------- Karten-Elemente ---------- */
function karteEl(k, extra) {
  const c = KARTEN[k], b = document.createElement('button');
  b.className = 'karte r' + (c.rar || 0); b.type = 'button';
  b.innerHTML = `<span class="bild" style="background-image:url(${BILDER[k]})"></span><span class="kosten">${c.c}</span><span class="nm">${c.n}</span>${freigeschaltet(k) ? `<span class="stufe">Lv.${stufe(k)}</span>` : ''}`;
  b.setAttribute('aria-label', `${c.n}, ${c.c} Elixier`);
  b.dataset.key = k;
  if (extra) extra(b, c);
  return b;
}

/* ---------- Deck-Bau ---------- */
let infoKarte = null, tauschModus = false;
function deckZeichnen() {
  kopfleiste();
  document.querySelectorAll('#deckPlaetze button').forEach((b, i) => { b.classList.toggle('an', i === stand.deckNr); b.onclick = () => { stand.deckNr = i; stand.deck = stand.decks[i]; speichern(); tauschModus = false; deckZeichnen(); }; });
  const dg = $('deckGitter'); dg.innerHTML = '';
  stand.deck.forEach((k, i) => dg.appendChild(karteEl(k, b => { fortschrittAnhaengen(b, k); b.addEventListener('click', () => {
    if (tauschModus && infoKarte) {
      const alt = stand.deck.indexOf(infoKarte);
      if (alt >= 0) [stand.deck[alt], stand.deck[i]] = [stand.deck[i], stand.deck[alt]]; else stand.deck[i] = infoKarte;
      tauschModus = false; speichern(); deckZeichnen(); ton(660, .08);
    } else { infoKarte = k; deckZeichnen(); }
  }); })));
  $('deckBox').classList.toggle('tausch', tauschModus);
  const schnitt = stand.deck.reduce((s, k) => s + KARTEN[k].c, 0) / 8;
  $('deckSchnitt').textContent = 'Ø ' + schnitt.toFixed(1) + ' Elixier';
  const sg = $('sammlGitter'); sg.innerHTML = '';
  SPIELBAR.slice().sort((a, b) => KARTEN[a].a - KARTEN[b].a || KARTEN[a].c - KARTEN[b].c).forEach(k => {
    const frei = freigeschaltet(k);
    sg.appendChild(karteEl(k, (b, c) => {
      if (!frei) { b.classList.add('gesperrt'); b.insertAdjacentHTML('beforeend', `<span class="schloss">🔒<br>Arena ${c.a + 1}</span>`); }
      if (stand.deck.includes(k)) b.classList.add('imdeck');
      if (frei) fortschrittAnhaengen(b, k);
      if (k === infoKarte) b.classList.add('gewaehlt');
      b.addEventListener('click', () => { infoKarte = k; tauschModus = false; deckZeichnen(); });
    }));
  });
  infoZeichnen();
}
function fortschrittAnhaengen(b, k) {
  const n = stand.karten[k] ? stand.karten[k].n : 0, br = brauchtKopien(k);
  const voll = br === Infinity;
  b.insertAdjacentHTML('beforeend', `<span class="kopien${!voll && n >= br ? ' bereit' : ''}"><i style="width:${voll ? 100 : Math.min(100, n / br * 100)}%"></i><b>${voll ? 'MAX' : n + '/' + br}</b></span>`);
  if (verbesserbar(k)) b.insertAdjacentHTML('beforeend', '<span class="pfeil">⬆</span>');
}
function infoZeichnen() {
  const box = $('kartenInfo'), k = infoKarte;
  if (!k) { box.innerHTML = '<p class="klein-hinweis" style="flex:1">Tippe auf eine Karte, um sie anzusehen und ins Deck zu nehmen.</p>'; return; }
  const c = KARTEN[k], frei = freigeschaltet(k), imDeck = stand.deck.includes(k);
  const w = [];
  w.push(`<b>${RARITAET[c.rar || 0]}</b>`);
  const f = Math.pow(1.1, stufe(k) - 1);
  w.push(`Level ${stufe(k)}`);
  if (c.hp) w.push(`❤️ ${Math.round(c.hp * f)}${c.cnt ? ' ×' + c.cnt : ''}`);
  if (c.dmg) w.push(`💥 ${Math.round(c.dmg * f)}`);
  if (c.heal) w.push(`💚 ${Math.round(c.heal * f)}`);
  if (c.rng) w.push(`🎯 ${c.rng > 1 ? c.rng : 'Nahkampf'}`);
  if (c.t === 'troop') w.push(c.tg === 'buildings' ? '🏰 nur Gebäude' : c.tg === 'ground' ? '⬇️ nur Boden' : '⬆️ Boden & Luft');
  if (c.fly) w.push('🪽 fliegt');
  if (c.t === 'building') w.push(`⏳ ${c.life} s`);
  if (c.t === 'spell') w.push(`✨ Zauber · Radius ${c.rad}`);
  box.innerHTML = `<div class="portrait r${c.rar || 0}" style="background-image:url(${BILDER[k]})"><span class="kosten">${c.c}</span></div>
    <div style="flex:1;min-width:0"><h3>${c.n}</h3><div class="quelle">aus: ${c.q}</div><p>${c.d}</p><div class="werte">${w.map(x => `<span>${x}</span>`).join('')}</div>
    <div style="margin-top:10px">${!frei ? `<span class="klein-hinweis">🔒 Wird in Arena ${c.a + 1} (${ARENEN[c.a].n}, ab ${ARENEN[c.a].ab} 🏆) freigeschaltet.</span>`
      : tauschModus ? '<span class="klein-hinweis">Tippe oben auf die Karte, die ersetzt werden soll.</span>'
      : `<div class="reihe"><button class="knopf klein" id="einsetzen">${imDeck ? 'Tauschen' : 'Ins Deck'}</button>${stufe(k) < MAX_STUFE ? `<button class="knopf klein ${verbesserbar(k) ? 'gruen' : 'grau'}" id="verbessern" ${verbesserbar(k) ? '' : 'disabled'}>⬆ ${brauchtGold(k)} 🪙</button>` : ''}</div>
        ${stufe(k) < MAX_STUFE && !verbesserbar(k) ? `<p class="klein-hinweis" style="margin-top:6px">${stand.karten[k].n < brauchtKopien(k) ? `Noch ${brauchtKopien(k) - stand.karten[k].n} Kopien aus Truhen` : `Noch ${brauchtGold(k) - stand.gold} Gold`}</p>` : ''}`}</div></div>`;
  const b = $('einsetzen'); if (b) b.addEventListener('click', () => { tauschModus = true; deckZeichnen(); });
  const v = $('verbessern'); if (v) v.addEventListener('click', () => {
    if (!verbesserbar(k)) return;
    stand.gold -= brauchtGold(k); stand.karten[k].n -= brauchtKopien(k); xpDazu(XP_UPGRADE[stufe(k) - 1]); stand.karten[k].lvl++; aufgabe('verbessern');
    speichern(); ton(523, .1, 'triangle', .06); setTimeout(() => ton(784, .2, 'triangle', .06), 100);
    deckZeichnen(); banner2(`${c.n} ist jetzt Level ${stufe(k)}!`);
  });
}
$('eventsKnopf').addEventListener('click', () => zeige('events'));

/* ---------- Ton ---------- */
let audio = null;
function ton(f, dauer, typ, laut) {
  if (!stand.ton) return;
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
    gegnerName: 'Computer', doppeltGemeldet: false, ereignis: 'normal'
  }, opts || {});
  const lv = t => t.replace(/^Lv\.(\d+) /, '<small class="lv">$1</small>');
  $('nameGegner').innerHTML = lv(K.gegnerName.replace(/[<>&]/g, '')); $('nameIch').innerHTML = lv(`Lv.${stand.koenig} ${(stand.name || 'Du').replace(/[<>&]/g, '')}`);
  emoteLeiste();
  zeige('kampf');
  G.modus('kampf', K.team, arenaVon(stand.troph));
  handZeichnen(true);
  bereichMessen(); requestAnimationFrame(bereichMessen);
}

function kampfGegenKI(modus) {
  modus = modus || 'normal';
  const arena = arenaVon(stand.troph), training = modus === 'training';
  const pool = SPIELBAR.filter(k => KARTEN[k].a <= arena);
  const schnitt = Math.max(1, Math.round(stand.deck.reduce((a, k) => a + stufe(k), 0) / 8 - (arena === 0 ? 1 : 0) - (training ? 2 : 0)));
  let meinDeck = stand.deck, meineSt = meineStufen();
  let kiDeck = pool.slice().sort(() => Math.random() - .5).slice(0, 8), kiSt = Object.fromEntries(kiDeck.map(k => [k, schnitt]));
  if (modus === 'spiegel') { kiDeck = stand.deck.slice(); kiSt = meineSt; }
  if (modus === 'zufall') {
    const alle = SPIELBAR.slice();
    meinDeck = alle.sort(() => Math.random() - .5).slice(0, 8); kiDeck = alle.slice().sort(() => Math.random() - .5).slice(0, 8);
    meineSt = Object.fromEntries(meinDeck.map(k => [k, schnitt])); kiSt = Object.fromEntries(kiDeck.map(k => [k, schnitt]));
  }
  const kiKoenig = Math.max(1, stand.koenig - (training ? 2 : 0));
  const sim = new Sim([meinDeck, kiDeck], [meineSt, kiSt], { modus: training ? 'normal' : modus, koenig: [stand.koenig, kiKoenig] });
  const namen = ['Bowser', 'Dr. Doofenschmirtz', 'Plankton', 'Team Rocket', 'Dr. Eggman', 'Ganondorf', 'Lord Voldemort', 'Der Imperator', 'Loki', 'Skeletor'];
  kampfAnlegen('ki', { sim, ki: new KI(sim, 1, training ? 0 : arena), ereignis: modus, gegnerName: `Lv.${kiKoenig} ` + (training ? 'Trainer' : namen[Math.floor(Math.random() * namen.length)]) });
  if (training) sim.elixier[1] = 2;
  banner(MODI[modus].e + ' ' + (modus === 'normal' ? 'Kampf!' : MODI[modus].n));
}
$('kiKnopf').addEventListener('click', () => { ton(520, .1); kampfGegenKI('normal'); });

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
  const doppelt = K.zeit >= SPIELZEIT - 60 || K.ereignis === 'dreifach';
  $('uhrZeit').textContent = `${Math.floor(rest / 60)}:${String(rest % 60).padStart(2, '0')}`;
  $('uhrText').textContent = K.ereignis === 'tod' ? 'Plötzl. Tod' : K.verl ? 'Verlängerung' : K.ereignis === 'dreifach' ? '3× Elixier' : doppelt ? '2× Elixier' : 'Restzeit';
  $('uhr').classList.toggle('knapp', rest <= 10);
  $('uhr').classList.toggle('doppelt', doppelt);
  if (doppelt && !K.doppeltGemeldet && K.ereignis !== 'dreifach') { K.doppeltGemeldet = true; banner('💧 2× Elixier!'); }
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
  stand.stats.karten++; stand.stats.gespielt[key] = (stand.stats.gespielt[key] || 0) + 1; aufgabe('karten');
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
      K.elixier = Math.min(10, K.elixier + dt / 2.8 * (K.ereignis === 'dreifach' ? 3 : K.zeit >= SPIELZEIT - 60 ? 2 : 1));
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
  const vorherArena = arenaVon(stand.best), ladder = K.ereignis === 'normal', training = K.ereignis === 'training';
  const meine = kronen[K.team];
  let delta = 0;
  let neueTruhe = null, goldPlus = 0;
  if (!training) {
    aufgabe('kaempfe'); aufgabe('kronen', meine);
    if (!ladder) aufgabe('ereignis');
    if (K.modus === 'online') { aufgabe('online'); stand.stats.online++; }
    const kt = kronenTag(); if (!kt.geholt) kt.n = Math.min(10, kt.n + meine);
  }
  if (gewonnen) {
    stand.siege++; aufgabe('siege');
    if (meine === 3) { stand.stats.dreiKronen++; aufgabe('dreikronen'); }
    if (ladder) {
      delta = 30; goldPlus = 10 + meine * 5;
      const frei = stand.truhen.findIndex(t => !t);
      if (frei >= 0) { neueTruhe = ZYKLUS[stand.zyklus++ % ZYKLUS.length]; stand.truhen[frei] = { art: neueTruhe, start: 0, dauer: TRUHEN[neueTruhe].zeit }; }
    } else if (!training) goldPlus = 25;
    stand.gold += goldPlus;
  } else if (!unentschieden) { stand.nieder++; if (ladder) delta = -Math.min(20, stand.troph); }
  stand.troph += delta; stand.best = Math.max(stand.best, stand.troph);
  stand.protokoll.unshift({ zeit: Date.now(), erg: gewonnen ? 1 : unentschieden ? 0 : -1, kronen: [meine, kronen[1 - K.team]], gegner: K.gegnerName, modus: K.ereignis, online: K.modus === 'online', delta, deck: stand.deck.slice() });
  stand.protokoll = stand.protokoll.slice(0, 15);
  speichern();
  if (window.SLRang) window.SLRang.melde(window.SLRangAdapter());
  const nachherArena = arenaVon(stand.best);
  setTimeout(() => {
    $('ergTitel').textContent = unentschieden ? 'Unentschieden' : gewonnen ? 'Sieg!' : 'Niederlage';
    $('ergebnisOverlay').dataset.art = unentschieden ? 'remis' : gewonnen ? 'sieg' : 'nieder';
    $('ergKronenIch').innerHTML = [0, 1, 2].map(i => `<i class="${i < kronen[K.team] ? 'an' : ''}"></i>`).join('');
    $('ergKronenGegner').innerHTML = [0, 1, 2].map(i => `<i class="${i < kronen[1 - K.team] ? 'an rot' : ''}"></i>`).join('');
    $('ergTroph').textContent = (delta >= 0 ? '+' : '') + delta; $('ergTroph').hidden = !ladder;
    const neu = $('ergNeu'), teile = [];
    if (nachherArena > vorherArena) {
      for (const k of SPIELBAR) if (KARTEN[k].a <= nachherArena && !stand.karten[k]) stand.karten[k] = { lvl: 1, n: 0 };
      speichern();
      teile.push(`Neue Arena: ${ARENEN[nachherArena].n}! Neue Karten: ` + SPIELBAR.filter(k => KARTEN[k].a > vorherArena && KARTEN[k].a <= nachherArena).map(k => KARTEN[k].n).join(', '));
    }
    if (neueTruhe) teile.push(`<img src="${BILDER['truhe_' + neueTruhe]}" alt="" class="mini-truhe"> ${TRUHEN[neueTruhe].n} erhalten!`);
    else if (gewonnen) teile.push('Alle Truhenplätze sind voll – öffne zuerst eine Truhe.');
    if (goldPlus) teile.push(`+${goldPlus} 🪙 Gold`);
    if (!ladder) teile.push(`${MODI[K.ereignis].e} ${MODI[K.ereignis].n}${training ? ' – nur Übung' : ' – keine Trophäen'}`);
    const kt = kronenTag(); if (!training && !kt.geholt) teile.push(`👑 Kronentruhe: ${kt.n}/10`);
    neu.hidden = !teile.length; neu.innerHTML = teile.join('<br>');
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
      const md = MODI[m.modus] ? m.modus : 'normal';
      kampfAnlegen('online', { team: m.team, ereignis: md, gegnerName: `Lv.${m.gegner.koenig || 1} ${m.gegner.name} · ${m.gegner.troph} 🏆`, ziel: null, vorher: null, mix: 1 });
      banner(MODI[md].e + ' ' + (md === 'normal' ? 'Kampf!' : MODI[md].n)); ton(660, .2, 'triangle', .06);
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
  netz.senden({ t: 'hallo', name, troph: stand.troph, deck: stand.deck, stufen: meineStufen(), koenig: stand.koenig });
  netz.senden(aktion);
  $('abbrechenKnopf').hidden = false;
}
let lobbyModus = 'normal';
function lobbyOeffnen(modus) {
  lobbyModus = modus || 'normal';
  $('lobbyTitel').textContent = lobbyModus === 'normal' ? 'Online-Duell' : MODI[lobbyModus].e + ' ' + MODI[lobbyModus].n;
  $('nameFeld').value = stand.name || ''; lobbyStatus(''); $('codeAnzeige').hidden = true; $('abbrechenKnopf').hidden = true; zeige('lobby');
}
$('onlineKnopf').addEventListener('click', () => lobbyOeffnen('normal'));
$('sucheKnopf').addEventListener('click', () => { $('codeAnzeige').hidden = true; online({ t: 'suche', modus: lobbyModus }); });
$('raumKnopf').addEventListener('click', () => online({ t: 'raum', modus: lobbyModus }));
$('beitretenKnopf').addEventListener('click', () => {
  const c = $('codeFeld').value.trim();
  if (!/^\d{4}$/.test(c)) { lobbyStatus('Der Code hat 4 Ziffern.'); return; }
  $('codeAnzeige').hidden = true; online({ t: 'beitreten', code: c });
});
function lobbyVerlassen() { netz.senden({ t: 'abbrechen' }); $('abbrechenKnopf').hidden = true; $('codeAnzeige').hidden = true; lobbyStatus(''); }
$('abbrechenKnopf').addEventListener('click', lobbyVerlassen);
$('lobbyZurueck').addEventListener('click', () => { lobbyVerlassen(); zeige('menu'); });

/* ---------- Truhen ---------- */
const zeitText = ms => { const s = Math.max(0, Math.ceil(ms / 1000)), m = Math.floor(s / 60), h = Math.floor(m / 60); return h ? `${h}h ${String(m % 60).padStart(2, '0')}m` : m ? `${m}m ${String(s % 60).padStart(2, '0')}s` : `${s}s`; };
function truhenZeichnen() {
  const box = $('truhen'); box.innerHTML = '';
  const jetzt = Date.now(), laeuft = stand.truhen.some(t => t && t.start && jetzt < t.start + t.dauer * 1000);
  stand.truhen.forEach((t, i) => {
    const b = document.createElement('button'); b.className = 'truhe-slot'; b.type = 'button';
    if (!t) { b.classList.add('leer'); b.innerHTML = '<span class="tname">Truhenplatz</span><span class="tzeit">Gewinne Kämpfe!</span>'; b.disabled = true; box.appendChild(b); return; }
    const T = TRUHEN[t.art], ende = t.start + t.dauer * 1000, fertig = t.start && jetzt >= ende, offen = t.start && !fertig;
    b.innerHTML = `<img src="${BILDER['truhe_' + t.art]}" alt=""><span class="tname">${T.n}</span><span class="tzeit">${fertig ? 'Öffnen!' : offen ? '⏳ ' + zeitText(ende - jetzt) : laeuft ? zeitText(t.dauer * 1000) : '🔓 ' + zeitText(t.dauer * 1000)}</span>`;
    b.style.setProperty('--tf', T.farbe);
    b.classList.toggle('fertig', !!fertig); b.classList.toggle('laeuft', !!offen);
    b.setAttribute('aria-label', T.n + (fertig ? ', bereit zum Öffnen' : ''));
    b.addEventListener('click', () => {
      if (fertig) truheOeffnen(i);
      else if (offen || laeuft) {
        const kosten = Math.max(1, Math.ceil((offen ? ende - jetzt : t.dauer * 1000) / 30000));
        if (stand.gems < kosten) { banner2(`Zu wenig Edelsteine (${kosten} 💎 nötig)`); return; }
        if (!confirm(`${T.n} jetzt für ${kosten} 💎 öffnen?`)) return;
        stand.gems -= kosten; truheOeffnen(i);
      }
      else { t.start = Date.now(); speichern(); truhenZeichnen(); ton(660, .1, 'triangle', .05); }
    });
    box.appendChild(b);
  });
  // Gratis- und Kronentruhe
  const g = gratisStand(), kt = kronenTag();
  $('gratisKnopf').innerHTML = `<img src="${BILDER.truhe_gratis}" alt=""><span><b>Gratis-Truhe</b><small>${g.n ? g.n + '× bereit!' : 'in ' + zeitText(g.ab + GRATIS_MS - Date.now())}</small></span>`;
  $('gratisKnopf').classList.toggle('bereit', g.n > 0);
  $('kronenKnopf').innerHTML = `<img src="${BILDER.truhe_kronen}" alt=""><span><b>Kronentruhe</b><small>${kt.geholt ? 'Morgen wieder' : kt.n >= 10 ? 'Bereit!' : kt.n + '/10 👑'}</small></span><i style="width:${kt.n * 10}%"></i>`;
  $('kronenKnopf').classList.toggle('bereit', kt.n >= 10 && !kt.geholt);
  kopfleiste();
}
$('gratisKnopf').addEventListener('click', () => {
  const g = gratisStand(); if (!g.n) { banner2('Die nächste Gratis-Truhe kommt bald.'); return; }
  if (g.n >= 2) g.ab = Date.now();
  g.n--; truheZeigen('gratis');
});
$('kronenKnopf').addEventListener('click', () => {
  const kt = kronenTag(); if (kt.geholt) { banner2('Morgen gibt es eine neue Kronentruhe.'); return; }
  if (kt.n < 10) { banner2(`Hole noch ${10 - kt.n} Kronen in Kämpfen.`); return; }
  kt.geholt = true; truheZeigen('kronen');
});
setInterval(() => { if ($('menu').classList.contains('an')) truhenZeichnen(); }, 1000);

function belohnung(art) {
  const T = TRUHEN[art], arena = arenaVon(stand.best), mult = 1 + arena * 0.25;
  const gems = T.gems ? Math.round(T.gems[0] + Math.random() * (T.gems[1] - T.gems[0])) : 0;
  const pool = SPIELBAR.filter(freigeschaltet), gew = [1, 0.45, 0.14, 0.035];
  const ziehen = filt => {
    const p = pool.filter(filt || (() => true)); if (!p.length) return null;
    let r = Math.random() * p.reduce((a, k) => a + gew[KARTEN[k].rar || 0], 0);
    for (const k of p) { r -= gew[KARTEN[k].rar || 0]; if (r <= 0) return k; }
    return p[p.length - 1];
  };
  const gold = Math.round((T.gold[0] + Math.random() * (T.gold[1] - T.gold[0])) * mult), z = {};
  if (T.legendaer) { const k = ziehen(k => KARTEN[k].rar === 3) || ziehen(k => KARTEN[k].rar === 2); z[k] = 1; }
  else {
    const n = Math.round(T.karten * mult), sorten = Math.min(pool.length, 2 + Math.floor(n / 8));
    let rest = n;
    for (let i = 0; i < sorten && rest > 0; i++) {
      const k = ziehen(), anz = i === sorten - 1 ? rest : Math.max(1, Math.round(rest / (sorten - i) * (0.6 + Math.random() * 0.8)));
      z[k] = (z[k] || 0) + Math.max(1, Math.round(anz / RAR_TEILER[KARTEN[k].rar || 0])); rest -= anz;
    }
    if (T.episch) { const k = ziehen(k => KARTEN[k].rar === 2); if (k) z[k] = (z[k] || 0) + Math.max(1, Math.round(n / 20)); }
  }
  return { gold, gems, karten: Object.entries(z).sort((a, b) => (KARTEN[a[0]].rar || 0) - (KARTEN[b[0]].rar || 0)) };
}

function truheOeffnen(i) {
  const t = stand.truhen[i]; if (!t) return;
  stand.truhen[i] = null;
  truheZeigen(t.art);
}
function truheZeigen(art, fertigDanach) {
  const t = { art }, T = TRUHEN[art], b = belohnung(art);
  stand.gold += b.gold; stand.gems += b.gems; aufgabe('truhen');
  for (const [k, n] of b.karten) { stand.karten[k] = stand.karten[k] || { lvl: 1, n: 0 }; stand.karten[k].n += n; }
  speichern();
  const o = $('truhenOverlay'), buehne = $('truhenBuehne');
  const schritte = [
    () => { buehne.innerHTML = `<img class="gross-truhe wackeln" src="${BILDER['truhe_' + t.art]}" alt=""><div class="truhen-titel titelschrift">${T.n}</div><div class="tipp">Tippen zum Öffnen</div>`; },
    () => { ton(330, .15, 'square', .06); setTimeout(() => ton(660, .25, 'triangle', .07), 120);
      buehne.innerHTML = `<img class="gross-truhe auf" src="${BILDER['truhe_' + t.art]}" alt=""><div class="belohnung titelschrift"><span style="font-family:var(--emoji)">🪙</span> +${b.gold}${b.gems ? ` <span style="font-family:var(--emoji)">💎</span> +${b.gems}` : ''}</div><div class="tipp">${b.karten.length} Kartensorten warten</div>`; },
    ...b.karten.map(([k, n]) => () => {
      const c = KARTEN[k], br = brauchtKopien(k), hat = stand.karten[k].n;
      ton(440 + (c.rar || 0) * 160, .2, 'triangle', .07);
      buehne.innerHTML = `<div class="karte-gross r${c.rar || 0}"></div><div class="belohnung titelschrift">×${n}</div><div class="kartenname titelschrift">${c.n}</div>
        <div class="rar r${c.rar || 0}">${RARITAET[c.rar || 0]} · Level ${stufe(k)}</div>
        <div class="kopien gross${hat >= br ? ' bereit' : ''}"><i style="width:${br === Infinity ? 100 : Math.min(100, hat / br * 100)}%"></i><b>${br === Infinity ? 'MAX' : hat + '/' + br}</b></div>${hat >= br && br !== Infinity ? '<div class="tipp">⬆ Kann verbessert werden!</div>' : ''}`;
      buehne.querySelector('.karte-gross').appendChild(karteEl(k));
    }),
    () => { buehne.innerHTML = `<div class="truhen-titel titelschrift">Inhalt</div><div class="zusammen">${b.karten.map(([k, n]) => `<div><img src="${BILDER[k]}" alt=""><b>×${n}</b><span>${KARTEN[k].n}</span></div>`).join('')}</div><div class="belohnung klein titelschrift">+${b.gold} 🪙</div><div class="tipp">Tippen zum Schließen</div>`; },
    () => { o.classList.remove('an'); if ($('menu').classList.contains('an')) truhenZeichnen(); kopfleiste(); if (fertigDanach) fertigDanach(); return true; }
  ];
  let nr = 0;
  schritte[nr++]();
  o.classList.add('an');
  o.onclick = () => { if (nr < schritte.length) schritte[nr++](); };
}
function banner2(text) {
  const b = document.createElement('div'); b.className = 'toast'; b.textContent = text; document.body.appendChild(b); setTimeout(() => b.remove(), 2200);
}
/* ---------- Shop ---------- */
const PREIS_KOPIE = [10, 60, 400, 4000], ANZAHL_ANGEBOT = [10, 4, 1, 1];
function tagesAngebote() {
  if (stand.shop.datum !== heute()) stand.shop = { datum: heute(), gekauft: [] };
  const r = zufallTag('shop'), pool = SPIELBAR.filter(freigeschaltet).sort(() => r() - 0.5);
  const gratis = pool.find(k => (KARTEN[k].rar || 0) <= 1) || pool[0];
  const rest = pool.filter(k => k !== gratis).slice(0, 5);
  return [gratis, ...rest].map((k, i) => { const rar = KARTEN[k].rar || 0, n = i === 0 ? Math.max(1, Math.round(ANZAHL_ANGEBOT[rar] / 2)) : ANZAHL_ANGEBOT[rar]; return { k, n, preis: i === 0 ? 0 : n * PREIS_KOPIE[rar] }; });
}
const SHOP_TRUHEN = [['gold', 80], ['magisch', 220], ['legendaer', 500]];
const SHOP_GOLD = [[50, 400], [150, 1400], [400, 4000]];
function shopZeichnen() {
  kopfleiste();
  const box = $('shopAngebote'); box.innerHTML = '';
  tagesAngebote().forEach((a, i) => {
    const gekauft = stand.shop.gekauft.includes(i);
    const w = document.createElement('div'); w.className = 'angebot' + (gekauft ? ' weg' : '');
    w.appendChild(karteEl(a.k)); w.insertAdjacentHTML('beforeend', `<b class="anzahl">×${a.n}</b>`);
    const b = document.createElement('button'); b.className = 'knopf klein ' + (a.preis ? 'gruen' : '');
    b.innerHTML = gekauft ? 'Gekauft' : a.preis ? `${a.preis} 🪙` : 'Gratis!'; b.disabled = gekauft;
    b.addEventListener('click', () => {
      if (stand.gold < a.preis) { banner2('Zu wenig Gold'); return; }
      stand.gold -= a.preis; stand.shop.gekauft.push(i);
      stand.karten[a.k] = stand.karten[a.k] || { lvl: 1, n: 0 }; stand.karten[a.k].n += a.n;
      speichern(); ton(784, .15, 'triangle', .06); banner2(`+${a.n} ${KARTEN[a.k].n}`); shopZeichnen();
    });
    w.appendChild(b); box.appendChild(w);
  });
  const nacht = new Date(); nacht.setHours(24, 0, 0, 0);
  $('shopNeu').textContent = 'Neue Angebote in ' + zeitText(nacht - Date.now());
  const tb = $('shopTruhen'); tb.innerHTML = '';
  for (const [art, preis] of SHOP_TRUHEN) {
    const b = document.createElement('button'); b.className = 'shop-truhe';
    b.innerHTML = `<img src="${BILDER['truhe_' + art]}" alt=""><span>${TRUHEN[art].n}</span><b>${preis} 💎</b>`;
    b.addEventListener('click', () => {
      if (stand.gems < preis) { banner2('Zu wenig Edelsteine – hol sie dir über Aufgaben, Gratis-Truhen und den Trophäenpfad.'); return; }
      if (!confirm(`${TRUHEN[art].n} für ${preis} 💎 kaufen?`)) return;
      stand.gems -= preis; speichern(); truheZeigen(art, shopZeichnen);
    });
    tb.appendChild(b);
  }
  const gb = $('shopGold'); gb.innerHTML = '';
  for (const [gems, gold] of SHOP_GOLD) {
    const b = document.createElement('button'); b.className = 'shop-truhe';
    b.innerHTML = `<span class="gross-em">🪙</span><span>${gold} Gold</span><b>${gems} 💎</b>`;
    b.addEventListener('click', () => {
      if (stand.gems < gems) { banner2('Zu wenig Edelsteine'); return; }
      stand.gems -= gems; stand.gold += gold; speichern(); ton(880, .15, 'triangle', .06); banner2(`+${gold} Gold`); shopZeichnen();
    });
    gb.appendChild(b);
  }
}

/* ---------- Ereignisse & Aufgaben ---------- */
function belohnungText(a) { return [a.gold && `${a.gold} 🪙`, a.gems && `${a.gems} 💎`, a.xp && `${a.xp} XP`].filter(Boolean).join(' · '); }
function eventsZeichnen() {
  kopfleiste();
  const al = $('aufgabenListe'); al.innerHTML = '';
  for (const a of aufgabenHeute()) {
    const d = AUFGABEN[a.id], fertig = a.f >= d.ziel;
    const z = document.createElement('div'); z.className = 'aufgabe' + (a.geholt ? ' geholt' : fertig ? ' fertig' : '');
    z.innerHTML = `<div style="flex:1;min-width:0"><b>${d.n}</b><div class="kopien"><i style="width:${a.f / d.ziel * 100}%"></i><b>${a.f}/${d.ziel}</b></div><small>${belohnungText(d)}</small></div>`;
    const b = document.createElement('button'); b.className = 'knopf klein ' + (fertig && !a.geholt ? 'gruen' : 'grau'); b.style.width = 'auto';
    b.textContent = a.geholt ? '✓' : fertig ? 'Abholen' : '…'; b.disabled = !fertig || a.geholt;
    b.addEventListener('click', () => {
      a.geholt = true; stand.gold += d.gold || 0; stand.gems += d.gems || 0; if (d.xp) xpDazu(d.xp);
      speichern(); ton(880, .2, 'triangle', .07); banner2('Belohnung: ' + belohnungText(d)); eventsZeichnen();
    });
    z.appendChild(b); al.appendChild(z);
  }
  const ml = $('modusListe'); ml.innerHTML = '';
  for (const [id, m] of Object.entries(MODI)) {
    if (id === 'normal') continue;
    const z = document.createElement('div'); z.className = 'modus';
    z.innerHTML = `<div class="modus-em">${m.e}</div><div style="flex:1;min-width:0"><b class="titelschrift">${m.n}</b><p>${m.d}</p><div class="reihe"></div></div>`;
    const r = z.querySelector('.reihe');
    const k1 = document.createElement('button'); k1.className = 'knopf klein'; k1.textContent = '🤖 Computer'; k1.addEventListener('click', () => kampfGegenKI(id)); r.appendChild(k1);
    if (id !== 'training') { const k2 = document.createElement('button'); k2.className = 'knopf klein blau'; k2.textContent = '🌐 Online'; k2.addEventListener('click', () => lobbyOeffnen(id)); r.appendChild(k2); }
    ml.appendChild(z);
  }
}

/* ---------- Profil ---------- */
function profilZeichnen() {
  kopfleiste();
  $('profilName').value = stand.name || '';
  const lieb = Object.entries(stand.stats.gespielt).sort((a, b) => b[1] - a[1])[0];
  const quote = stand.siege + stand.nieder ? Math.round(stand.siege / (stand.siege + stand.nieder) * 100) : 0;
  const werte = [['🏆', 'Trophäen', stand.troph], ['⭐', 'Rekord', stand.best], ['👑', 'Königslevel', stand.koenig], ['✅', 'Siege', stand.siege], ['❌', 'Niederlagen', stand.nieder],
    ['📈', 'Siegquote', quote + ' %'], ['👑👑👑', '3-Kronen-Siege', stand.stats.dreiKronen], ['🃏', 'Karten gespielt', stand.stats.karten], ['🌐', 'Online-Kämpfe', stand.stats.online],
    ['📚', 'Karten gefunden', Object.keys(stand.karten).length + '/' + SPIELBAR.length]];
  $('profilWerte').innerHTML = werte.map(([e, n, w]) => `<div><span class="em">${e}</span><b>${w}</b><small>${n}</small></div>`).join('')
    + (lieb ? `<div class="lieb"><img src="${BILDER[lieb[0]]}" alt=""><b>${KARTEN[lieb[0]].n}</b><small>Lieblingskarte · ${lieb[1]}×</small></div>` : '');
  $('protokoll').innerHTML = stand.protokoll.length ? stand.protokoll.map(p => `<div class="eintrag e${p.erg}">
      <div class="kopf"><b>${p.erg > 0 ? 'Sieg' : p.erg < 0 ? 'Niederlage' : 'Unentschieden'}</b><span>${p.kronen[0]} : ${p.kronen[1]}</span><span>${MODI[p.modus] ? MODI[p.modus].e : ''} ${p.online ? '🌐' : '🤖'}</span>${p.modus === 'normal' ? `<span>${p.delta >= 0 ? '+' : ''}${p.delta} 🏆</span>` : ''}</div>
      <div class="gegen">gegen ${p.gegner} · ${new Date(p.zeit).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
      <div class="mini-deck">${p.deck.map(k => BILDER[k] ? `<img src="${BILDER[k]}" alt="${KARTEN[k].n}">` : '').join('')}</div></div>`).join('') : '<p class="klein-hinweis">Noch keine Kämpfe.</p>';
  $('tonKnopf').textContent = stand.ton ? '🔊 Ton an' : '🔇 Ton aus';
}
$('profilName').addEventListener('change', () => { const n = $('profilName').value.trim().slice(0, 16); if (n.length >= 2) { stand.name = n; speichern(); kopfleiste(); banner2('Name gespeichert'); } });
$('tonKnopf').addEventListener('click', () => { stand.ton = !stand.ton; speichern(); profilZeichnen(); });

/* ---------- Trophäenpfad ---------- */
function pfadZeigen() {
  const o = $('pfadOverlay'), l = $('pfadListe'); l.innerHTML = '';
  const punkte = [...PFAD.map(([t, b], i) => ({ t, b, i })), ...ARENEN.map((a, i) => ({ t: a.ab, arena: i }))].sort((a, b) => b.t - a.t || (a.arena != null ? -1 : 1));
  for (const p of punkte) {
    const z = document.createElement('div');
    if (p.arena != null) { z.className = 'pfad-arena' + (stand.best >= p.t ? ' erreicht' : ''); z.innerHTML = `<span class="em">${ARENEN[p.arena].e}</span><b class="titelschrift">Arena ${p.arena + 1}: ${ARENEN[p.arena].n}</b><span>${p.t} 🏆</span>`; l.appendChild(z); continue; }
    const geholt = stand.pfad.includes(p.i), erreicht = stand.best >= p.t;
    z.className = 'pfad-stufe' + (geholt ? ' geholt' : erreicht ? ' bereit' : '');
    const b = p.b, bild = b.truhe ? `<img src="${BILDER['truhe_' + b.truhe]}" alt="">` : `<span class="em">${b.gold ? '🪙' : '💎'}</span>`;
    z.innerHTML = `<span class="pfad-t">${p.t} 🏆</span>${bild}<span style="flex:1">${b.truhe ? TRUHEN[b.truhe].n : b.gold ? b.gold + ' Gold' : b.gems + ' Edelsteine'}</span>`;
    const k = document.createElement('button'); k.className = 'knopf klein ' + (erreicht && !geholt ? 'gruen' : 'grau'); k.style.width = 'auto';
    k.textContent = geholt ? '✓' : erreicht ? 'Holen' : '🔒'; k.disabled = geholt || !erreicht;
    k.addEventListener('click', () => {
      stand.pfad.push(p.i);
      if (b.truhe) { speichern(); o.classList.remove('an'); truheZeigen(b.truhe, () => { menuAktualisieren(); }); return; }
      stand.gold += b.gold || 0; stand.gems += b.gems || 0; speichern(); ton(880, .2, 'triangle', .07); banner2('+' + (b.gold ? b.gold + ' Gold' : b.gems + ' 💎')); pfadZeigen(); menuAktualisieren();
    });
    z.appendChild(k); l.appendChild(z);
  }
  o.classList.add('an');
  const ziel = l.querySelector('.bereit') || [...l.querySelectorAll('.pfad-stufe:not(.geholt)')].pop();
  if (ziel) ziel.scrollIntoView({ block: 'center' });
}
$('arenaSchild').addEventListener('click', pfadZeigen);
$('pfadZu').addEventListener('click', () => $('pfadOverlay').classList.remove('an'));

zeige('menu');
$('lade').remove();
