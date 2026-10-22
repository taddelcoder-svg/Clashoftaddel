/* Clash of Taddel – Spiellogik. Läuft im Browser (gegen den Computer) und auf dem Server (Online-Duell).
   Koordinaten in Kacheln: Arena 18 breit, 32 hoch. Team 0 spielt unten, Team 1 oben. */
(function (root) {
  'use strict';
  const W = 18, H = 32, FLUSS_O = 15, FLUSS_U = 17, BRUECKEN = [3.5, 14.5];
  const MAX_STUFE = 9, SPIELZEIT = 180, VERLAENGERUNG = 60, ELIXIER_TAKT = 2.8;

  // rar: 0 gewöhnlich, 1 selten, 2 episch, 3 legendär · a: ab welcher Arena freigeschaltet
  const KARTEN = {
    mario:     { n: 'Mario', e: '👨‍🔧', q: 'Super Mario', c: 3, t: 'troop', rar: 0, a: 0, hp: 760, dmg: 120, hs: 1.1, spd: 1.05, rng: 0.6, tg: 'ground', r: 0.45, col: '#e53935', d: 'Robuster Nahkämpfer für fast jede Lage.' },
    minions:   { n: 'Minions', e: '🍌', q: 'Ich – Einfach unverbesserlich', c: 3, t: 'troop', rar: 0, a: 0, cnt: 3, fly: 1, hp: 200, dmg: 85, hs: 1.0, spd: 1.4, rng: 1.8, tg: 'all', r: 0.35, col: '#fdd835', proj: '#fff59d', d: 'Drei fliegende Bananen-Fans.' },
    zombies:   { n: 'Zombies', e: '🧟', q: 'Pflanzen gegen Zombies', c: 3, t: 'troop', rar: 2, a: 0, cnt: 10, hp: 90, dmg: 70, hs: 1.0, spd: 0.9, rng: 0.5, tg: 'ground', r: 0.3, col: '#7cb342', d: 'Eine ganze Horde – stark, aber anfällig für Flächenschaden.' },
    legolas:   { n: 'Legolas', e: '🏹', q: 'Der Herr der Ringe', c: 4, t: 'troop', rar: 1, a: 0, hp: 560, dmg: 165, hs: 1.0, spd: 1.0, rng: 6.5, tg: 'all', r: 0.4, col: '#8bc34a', proj: '#dcedc8', d: 'Elbischer Meisterschütze mit riesiger Reichweite.' },
    creeper:   { n: 'Creeper', e: '💥', q: 'Minecraft', c: 2, t: 'troop', rar: 1, a: 0, hp: 240, dmg: 340, hs: 0.5, spd: 1.6, rng: 0.3, tg: 'ground', r: 0.4, col: '#43a047', boom: 1.6, d: 'Rennt los und explodiert. Zisch …' },
    shrek:     { n: 'Shrek', e: '🧅', q: 'Shrek', c: 5, t: 'troop', rar: 1, a: 0, hp: 3300, dmg: 210, hs: 1.5, spd: 0.75, rng: 0.7, tg: 'buildings', r: 0.65, col: '#689f38', d: 'Oger haben Schichten. Er will nur Gebäude.' },
    peashooter:{ n: 'Erbsenkanone', e: '🌱', q: 'Pflanzen gegen Zombies', c: 3, t: 'building', rar: 0, a: 0, hp: 900, dmg: 110, hs: 0.8, rng: 5.5, tg: 'ground', r: 0.75, life: 30, col: '#66bb6a', proj: '#9ccc65', d: 'Gebäude: verteidigt den Boden mit Dauerfeuer.' },
    thor:      { n: 'Mjölnir', e: '🔨', q: 'Marvel – Thor', c: 2, t: 'spell', rar: 0, a: 0, rad: 2.5, dmg: 190, stun: 0.6, col: '#64b5f6', d: 'Blitzschlag: etwas Schaden und kurze Betäubung.' },
    hadouken:  { n: 'Hadouken', e: '🌀', q: 'Street Fighter', c: 4, t: 'spell', rar: 1, a: 0, rad: 2.5, dmg: 620, push: 1.2, col: '#29b6f6', d: 'Energiewelle mit Rückstoß.' },
    pilz:      { n: 'Super-Pilz', e: '🍄', q: 'Super Mario', c: 2, t: 'spell', rar: 2, a: 0, rad: 3, rage: 6, col: '#ef5350', d: 'Eigene Truppen im Kreis werden 6 s lang schneller.' },
    vader:     { n: 'Darth Vader', e: '🦹', q: 'Star Wars', c: 4, t: 'troop', rar: 2, a: 1, hp: 1050, dmg: 390, hs: 1.8, spd: 1.0, rng: 0.8, tg: 'ground', r: 0.5, col: '#263238', d: 'Lichtschwert-Hiebe mit riesigem Schaden.' },
    storm:     { n: 'Sturmtruppen', e: '🪖', q: 'Star Wars', c: 4, t: 'troop', rar: 0, a: 1, cnt: 4, hp: 270, dmg: 75, hs: 1.1, spd: 1.0, rng: 5, tg: 'all', r: 0.35, col: '#eceff1', proj: '#ff5252', miss: 0.35, d: 'Vier Schützen. Treffen … manchmal.' },
    sonic:     { n: 'Sonic', e: '🦔', q: 'Sonic the Hedgehog', c: 4, t: 'troop', rar: 1, a: 1, hp: 1150, dmg: 230, hs: 1.4, spd: 2.3, rng: 0.6, tg: 'buildings', jump: 1, r: 0.45, col: '#1e88e5', d: 'Rast über den Fluss direkt zu den Türmen.' },
    gandalf:   { n: 'Gandalf', e: '🧙', q: 'Der Herr der Ringe', c: 5, t: 'troop', rar: 1, a: 2, hp: 680, dmg: 210, hs: 1.4, spd: 1.0, rng: 5.5, tg: 'all', r: 0.45, col: '#bdbdbd', proj: '#fff59d', splash: 1.3, d: 'Zauber mit Flächenschaden. Du kommst nicht vorbei!' },
    drogon:    { n: 'Drogon', e: '🐉', q: 'Game of Thrones', c: 4, t: 'troop', rar: 2, a: 2, fly: 1, hp: 1050, dmg: 140, hs: 1.6, spd: 1.4, rng: 3.5, tg: 'all', r: 0.6, col: '#5d4037', proj: '#ff7043', splash: 1.2, d: 'Fliegender Drache mit Feueratem.' },
    pipe:      { n: 'Goomba-Röhre', e: '🟩', q: 'Super Mario', c: 5, t: 'building', rar: 1, a: 2, hp: 1000, life: 40, r: 0.8, spawn: 'goomba', every: 5, col: '#2e7d32', d: 'Gebäude: spuckt alle 5 s einen Goomba aus.' },
    goomba:    { n: 'Goomba', e: '🌰', c: 0, t: 'troop', hidden: 1, hp: 200, dmg: 75, hs: 1.1, spd: 1.1, rng: 0.5, tg: 'ground', r: 0.35, col: '#8d6e63' },
    ironman:   { n: 'Iron Man', e: '🦾', q: 'Marvel', c: 5, t: 'troop', rar: 2, a: 3, fly: 1, hp: 950, dmg: 30, hs: 0.4, spd: 1.2, rng: 4, tg: 'all', r: 0.5, col: '#c62828', beam: 1, d: 'Fliegt. Sein Repulsor-Strahl wird immer stärker.' },
    hulk:      { n: 'Hulk', e: '💪', q: 'Marvel', c: 7, t: 'troop', rar: 3, a: 3, hp: 3400, dmg: 250, hs: 1.7, spd: 1.0, rng: 0.8, tg: 'ground', r: 0.7, col: '#2e7d32', splash: 1.3, land: { rad: 2.3, dmg: 280 }, d: 'Landet mit Erdbeben-Sprung. Hulk zerschmettert!' },
    spiderman: { n: 'Spider-Man', e: '🕷️', q: 'Marvel', c: 4, t: 'troop', rar: 2, a: 3, hp: 820, dmg: 150, hs: 1.2, spd: 1.3, rng: 3, tg: 'all', r: 0.45, col: '#d32f2f', proj: '#fafafa', slow: 2, jump: 1, d: 'Schwingt über den Fluss, Netze verlangsamen Gegner.' },
    snap:      { n: 'Fingerschnipp', e: '🫰', q: 'Marvel – Thanos', c: 6, t: 'spell', rar: 3, a: 3, rad: 3.5, half: 1, dmg: 300, col: '#ab47bc', d: 'Gegnerische Truppen im Kreis verlieren die Hälfte ihrer Leben.' },
    link:      { n: 'Link', e: '🗡️', q: 'The Legend of Zelda', c: 4, t: 'troop', rar: 1, a: 4, hp: 1350, dmg: 200, hs: 1.5, spd: 1.0, rng: 0.7, tg: 'ground', r: 0.5, col: '#43a047', spin: 1.5, d: 'Wirbelattacke trifft alles rundherum.' },
    pikachu:   { n: 'Pikachu', e: '⚡', q: 'Pokémon', c: 4, t: 'troop', rar: 3, a: 4, hp: 560, dmg: 100, hs: 1.7, spd: 1.3, rng: 4.5, tg: 'all', r: 0.4, col: '#fdd835', proj: '#fff176', stun: 0.5, chain: 1, d: 'Donnerblitz betäubt und springt auf einen zweiten Gegner über.' },
    elsa:      { n: 'Elsas Eis', e: '❄️', q: 'Die Eiskönigin', c: 4, t: 'spell', rar: 2, a: 4, rad: 3, dmg: 100, stun: 4, col: '#b3e5fc', d: 'Friert alles im Kreis 4 s lang ein.' },
    godzilla:  { n: 'Godzilla', e: '🦖', q: 'Godzilla', c: 8, t: 'troop', rar: 2, a: 5, hp: 5200, dmg: 280, hs: 2.2, spd: 0.6, rng: 0.8, tg: 'buildings', r: 0.85, col: '#455a64', death: { rad: 2.5, dmg: 380 }, d: 'König der Monster, will nur Gebäude. Beim Fall bebt die Erde.' },
    goku:      { n: 'Goku', e: '🔥', q: 'Dragon Ball', c: 6, t: 'troop', rar: 3, a: 5, hp: 1250, dmg: 1050, hs: 5, spd: 0.8, rng: 5, tg: 'ground', r: 0.5, col: '#ff9800', splash: 1.6, charge: 1, d: 'Lädt das Kamehameha auf – dann wird es heftig.' },
    kirby:     { n: 'Kirby', e: '🩷', q: 'Kirby', c: 2, t: 'troop', rar: 0, a: 0, hp: 430, dmg: 95, hs: 0.9, spd: 1.3, rng: 0.5, tg: 'ground', r: 0.4, col: '#f48fb1', d: 'Klein, rund und hungrig. Günstiger Nahkämpfer.' },
    pacman:    { n: 'Pac-Man', e: '🟡', q: 'Pac-Man', c: 3, t: 'troop', rar: 1, a: 0, hp: 650, dmg: 115, hs: 0.8, spd: 2.0, rng: 0.5, tg: 'ground', r: 0.42, col: '#ffeb3b', d: 'Waka waka! Superschnell und frisst alles am Boden.' },
    spongebob: { n: 'SpongeBob', e: '🧽', q: 'SpongeBob Schwammkopf', c: 2, t: 'troop', rar: 0, a: 1, hp: 320, dmg: 75, hs: 1.0, spd: 1.1, rng: 4, tg: 'all', r: 0.4, col: '#fff176', proj: '#b3e5fc', d: 'Pustet Seifenblasen auf Boden- und Luftziele.' },
    batman:    { n: 'Batman', e: '🦇', q: 'DC – Batman', c: 4, t: 'troop', rar: 2, a: 1, hp: 950, dmg: 200, hs: 1.1, spd: 1.45, rng: 0.7, tg: 'ground', jump: 1, r: 0.45, col: '#37474f', d: 'Gleitet mit dem Umhang über den Fluss.' },
    bowser:    { n: 'Bowser', e: '🐢', q: 'Super Mario', c: 6, t: 'troop', rar: 2, a: 1, hp: 2700, dmg: 170, hs: 1.8, spd: 0.8, rng: 2, tg: 'ground', r: 0.7, col: '#8bc34a', splash: 1.6, d: 'Panzer-Koloss mit Feueratem, der Gruppen grillt.' },
    dk:        { n: 'Donkey Kong', e: '🦍', q: 'Donkey Kong', c: 6, t: 'troop', rar: 1, a: 2, hp: 2100, dmg: 190, hs: 1.6, spd: 0.75, rng: 5, tg: 'buildings', r: 0.65, col: '#6d4c41', proj: '#a1887f', d: 'Wirft Fässer auf Gebäude – aus sicherer Entfernung.' },
    harry:     { n: 'Harry Potter', e: '🪄', q: 'Harry Potter', c: 4, t: 'troop', rar: 1, a: 2, hp: 600, dmg: 155, hs: 1.2, spd: 1.0, rng: 5.5, tg: 'all', r: 0.42, col: '#7b1fa2', proj: '#ff5252', d: 'Stupor! Schnelle Zauberblitze auf alles.' },
    yoda:      { n: 'Yoda', e: '🟢', q: 'Star Wars', c: 4, t: 'troop', rar: 3, a: 2, hp: 560, dmg: 130, hs: 1.4, spd: 1.1, rng: 4.5, tg: 'all', r: 0.35, col: '#9ccc65', proj: '#b2ff59', push: 0.9, d: 'Die Macht stößt Gegner zurück, sie tut.' },
    senzu:     { n: 'Senzu-Bohne', e: '🫘', q: 'Dragon Ball', c: 3, t: 'spell', rar: 1, a: 2, rad: 3, heal: 550, col: '#9ccc65', d: 'Heilt eigene Truppen im Kreis um 550 Leben.' },
    chief:     { n: 'Master Chief', e: '🪖', q: 'Halo', c: 5, t: 'troop', rar: 1, a: 3, hp: 1350, dmg: 70, hs: 0.45, spd: 1.0, rng: 5, tg: 'all', r: 0.5, col: '#558b2f', proj: '#ffee58', d: 'Spartaner mit Sturmgewehr – Dauerfeuer auf alles.' },
    homer:     { n: 'Homer', e: '🍩', q: 'Die Simpsons', c: 3, t: 'troop', rar: 0, a: 3, hp: 1450, dmg: 85, hs: 1.5, spd: 0.8, rng: 0.6, tg: 'ground', r: 0.55, col: '#fdd835', d: 'Nimmt viel Schaden. Nennt sich selbst Tank. Nennt das Mittagessen.' },
    panzer:    { n: 'Stachi-Panzer', e: '🐚', q: 'Mario Kart', c: 6, t: 'spell', rar: 2, a: 3, rad: 2, dmg: 1050, col: '#2979ff', d: 'Der blaue Panzer: riesiger Schaden auf kleiner Fläche.' },
    kratos:    { n: 'Kratos', e: '🪓', q: 'God of War', c: 5, t: 'troop', rar: 2, a: 4, hp: 1650, dmg: 270, hs: 1.4, spd: 1.0, rng: 0.9, tg: 'ground', r: 0.55, col: '#eceff1', splash: 1.3, d: 'Die Leviathan-Axt trifft alle Gegner vor ihm.' },
    groot:     { n: 'Groot', e: '🌳', q: 'Guardians of the Galaxy', c: 6, t: 'troop', rar: 3, a: 4, hp: 3600, dmg: 150, hs: 1.5, spd: 0.75, rng: 0.8, tg: 'ground', r: 0.7, col: '#795548', spawnTod: 'babygroot', spawnN: 3, d: 'Ich bin Groot. Zerfällt in drei Baby-Groots.' },
    babygroot: { n: 'Baby-Groot', e: '🌱', c: 0, t: 'troop', hidden: 1, hp: 220, dmg: 70, hs: 1.0, spd: 1.2, rng: 0.5, tg: 'ground', r: 0.3, col: '#8d6e63' }
  };
  const TUERME = {
    princess: { hp: 1750, dmg: 72, hs: 0.8, rng: 7.5, r: 1.4 },
    king:     { hp: 2900, dmg: 85, hs: 1.0, rng: 7, r: 1.8 }
  };
  const ARENEN = [
    { n: 'Pilzkönigreich', ab: 0, e: '🍄', gras: ['#7cc35a', '#71b850'] },
    { n: 'Weit, weit weg', ab: 300, e: '🌌', gras: ['#d1b97c', '#c6ae71'] },
    { n: 'Mittelerde', ab: 600, e: '💍', gras: ['#6aa84a', '#5f9d41'] },
    { n: 'Avengers-Turm', ab: 1000, e: '🦸', gras: ['#97a9b9', '#8b9eaf'] },
    { n: 'Hyrule', ab: 1500, e: '🗡️', gras: ['#8acb6b', '#7fbf60'] },
    { n: 'Multiversum', ab: 2000, e: '🌀', gras: ['#8573bd', '#7a68b2'] }
  ];
  const STARTDECK = ['mario', 'minions', 'zombies', 'legolas', 'creeper', 'shrek', 'thor', 'hadouken'];
  const SPIELBAR = Object.keys(KARTEN).filter(k => !KARTEN[k].hidden);

  const arenaVon = trophaeen => { let a = 0; ARENEN.forEach((x, i) => { if (trophaeen >= x.ab) a = i; }); return a; };
  const abstand = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const klemmen = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const mischen = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  function deckPruefen(deck) {
    const d = Array.isArray(deck) ? [...new Set(deck.filter(k => SPIELBAR.includes(k)))].slice(0, 8) : [];
    for (const k of STARTDECK) if (d.length < 8 && !d.includes(k)) d.push(k);
    return d;
  }

  class Sim {
    constructor(decks, stufen) {
      this.stufen = [0, 1].map(t => (stufen && stufen[t]) || {});
      this.zeit = 0; this.vorbei = false; this.sieger = -1; this.verl = false;
      this.kronen = [0, 0]; this.elixier = [5, 5]; this.nid = 0;
      this.ents = []; this.geschosse = []; this.zonen = []; this.fx = [];
      this.stapel = [0, 1].map(t => mischen(deckPruefen(decks && decks[t])));
      for (const t of [0, 1]) {
        const unten = t === 0, ky = unten ? 29 : 3, py = unten ? 25.5 : 6.5;
        this.turm(t, 'king', 9, ky); this.turm(t, 'princess', 3.5, py); this.turm(t, 'princess', 14.5, py);
      }
    }
    hand(t) { return this.stapel[t].slice(0, 4); }
    naechste(t) { return this.stapel[t][4]; }
    turm(team, art, x, y) {
      const d = TUERME[art];
      const e = { id: ++this.nid, team, key: art, kind: 'tower', x, y, r: d.r, hp: d.hp, max: d.hp, dmg: d.dmg, hs: d.hs, rng: d.rng,
        tg: 'all', cd: 0, stun: 0, slow: 0, rage: 0, angriff: 0, deploy: 0, aktiv: art === 'princess', ziel: null };
      this.ents.push(e); return e;
    }
    restZeit() { return this.verl ? Math.max(0, SPIELZEIT + VERLAENGERUNG - this.zeit) : Math.max(0, SPIELZEIT - this.zeit); }
    doppelt() { return this.zeit >= SPIELZEIT - 60; }
    prinzessinLebt(team, links) { return this.ents.some(e => e.kind === 'tower' && e.team === team && e.key === 'princess' && (e.x < 9) === links && e.hp > 0); }

    gueltig(team, key, x, y) {
      const k = KARTEN[key];
      if (!k || x < 0.3 || x > W - 0.3 || y < 0.3 || y > H - 0.3) return false;
      if (k.t === 'spell') return true;
      const gegner = 1 - team, links = x < 9;
      if (team === 0) return y >= FLUSS_U + 0.3 || (!this.prinzessinLebt(gegner, links) && y >= 10);
      return y <= FLUSS_O - 0.3 || (!this.prinzessinLebt(gegner, links) && y <= H - 10);
    }

    spielen(team, key, x, y) {
      if (this.vorbei) return false;
      const k = KARTEN[key], idx = this.stapel[team].indexOf(key);
      if (!k || idx < 0 || idx > 3) return false;
      if (this.elixier[team] < k.c) return false;
      x = klemmen(+x, 0.5, W - 0.5); y = klemmen(+y, 0.5, H - 0.5);
      if (!Number.isFinite(x) || !Number.isFinite(y) || !this.gueltig(team, key, x, y)) return false;
      this.elixier[team] -= k.c;
      this.stapel[team].splice(idx, 1); this.stapel[team].push(key);
      if (k.t === 'spell') this.zauber(team, key, x, y);
      else {
        const n = k.cnt || 1;
        for (let i = 0; i < n; i++) {
          const w = n > 1 ? (i / n) * Math.PI * 2 : 0, rr = n > 1 ? (n > 5 ? 1.1 : 0.7) * (n > 5 && i % 2 ? 0.55 : 1) : 0;
          this.einheit(team, key, x + Math.cos(w) * rr, y + Math.sin(w) * rr);
        }
      }
      this.fx.push({ a: 'spiel', team, key, x, y });
      return true;
    }

    faktor(team, key) { const l = Math.max(1, Math.min(MAX_STUFE, Math.floor(+this.stufen[team][key] || 1))); return Math.pow(1.1, l - 1); }
    einheit(team, key, x, y) {
      const k = KARTEN[key], f = this.faktor(team, KARTEN[key].hidden ? (this.quelle || key) : key);
      const e = { id: ++this.nid, team, key, kind: k.t === 'building' ? 'building' : 'troop', x: klemmen(x, 0.4, W - 0.4), y: klemmen(y, 0.4, H - 0.4),
        r: k.r || 0.45, hp: Math.round(k.hp * f), max: Math.round(k.hp * f), dmg: Math.round((k.dmg || 0) * f), hs: k.hs || 1, rng: k.rng || 0, tg: k.tg || 'ground', fly: !!k.fly,
        cd: 0, stun: 0, slow: 0, rage: 0, angriff: 0, deploy: k.t === 'building' ? 0.6 : 1, ziel: null, lade: 0, ramp: 0, strahl: 0, spawnT: k.every || 0 };
      this.ents.push(e); return e;
    }

    zauber(team, key, x, y) {
      const k = KARTEN[key], f = this.faktor(team, key);
      this.fx.push({ a: 'zauber', key, x, y, rad: k.rad, col: k.col });
      if (k.rage) { this.zonen.push({ team, x, y, rad: k.rad, t: k.rage }); return; }
      if (k.heal) {
        for (const e of this.ents) if (e.team === team && e.kind === 'troop' && e.hp > 0 && Math.hypot(e.x - x, e.y - y) <= k.rad + e.r * 0.5) e.hp = Math.min(e.max, e.hp + k.heal * f);
        return;
      }
      for (const e of this.ents) {
        if (e.team === team || e.hp <= 0 || Math.hypot(e.x - x, e.y - y) > k.rad + e.r * 0.5) continue;
        const turm = e.kind === 'tower';
        if (k.half) this.schaden(e, e.kind === 'troop' ? Math.ceil(e.hp / 2) : k.dmg * f * (turm ? 0.35 : 1));
        else if (k.dmg) this.schaden(e, Math.round(k.dmg * f * (turm ? 0.35 : 1)));
        if (k.stun) { e.stun = Math.max(e.stun, k.stun); e.lade = 0; e.ramp = 0; }
        if (k.push && e.kind === 'troop' && e.hp > 0) {
          const d = Math.hypot(e.x - x, e.y - y) || 1;
          e.x = klemmen(e.x + (e.x - x) / d * k.push, 0.4, W - 0.4); e.y = klemmen(e.y + (e.y - y) / d * k.push, 0.4, H - 0.4);
        }
      }
    }

    schaden(e, n) {
      if (e.hp <= 0) return;
      e.hp -= n;
      if (e.kind === 'tower' && e.key === 'king') e.aktiv = true;
      if (e.hp <= 0) this.tod(e);
    }

    tod(e) {
      e.hp = 0;
      this.fx.push({ a: 'tod', x: e.x, y: e.y, r: e.r, kind: e.kind, team: e.team });
      if (e.kind === 'tower') {
        const gegner = 1 - e.team;
        if (e.key === 'king') { this.kronen[gegner] = 3; this.ende(gegner); return; }
        this.kronen[gegner] = Math.min(3, this.kronen[gegner] + 1);
        for (const k of this.ents) if (k.kind === 'tower' && k.team === e.team && k.key === 'king') k.aktiv = true;
        if (this.verl) this.ende(gegner);
        return;
      }
      const k = KARTEN[e.key];
      if (k.death) this.flaeche(e.team, e.x, e.y, k.death.rad, k.death.dmg * this.faktor(e.team, e.key), 'ground', k.col);
      if (k.spawnTod) { this.quelle = e.key; for (let i = 0; i < k.spawnN; i++) { const w = i / k.spawnN * Math.PI * 2; this.einheit(e.team, k.spawnTod, e.x + Math.cos(w) * 0.6, e.y + Math.sin(w) * 0.6).deploy = 0.3; } this.quelle = null; }
    }

    ende(sieger) {
      if (this.vorbei) return;
      this.vorbei = true; this.sieger = sieger;
      this.fx.push({ a: 'ende', sieger });
    }

    flaeche(team, x, y, rad, dmg, tg, col, ausser) {
      this.fx.push({ a: 'knall', x, y, rad, col: col || '#ffcc80' });
      for (const e of this.ents) {
        if (e.team === team || e.hp <= 0 || e === ausser) continue;
        if (tg === 'ground' && e.fly) continue;
        if (Math.hypot(e.x - x, e.y - y) <= rad + e.r * 0.6) this.schaden(e, dmg);
      }
    }

    trifft(u, e) {
      if (!e || e.hp <= 0 || e.team === u.team) return false;
      if (u.tg === 'buildings') return e.kind !== 'troop';
      if (u.tg === 'ground') return !e.fly;
      return true;
    }
    kante(a, b) { return abstand(a, b) - a.r - b.r; }

    zielSuchen(u) {
      let best = null, bd = 1e9;
      const sicht = Math.max(5.5, u.rng + 1);
      for (const e of this.ents) {
        if (!this.trifft(u, e) || e.deploy > 0.5 && e.kind === 'troop' && false) continue;
        const d = this.kante(u, e);
        if (u.kind === 'troop' && u.tg !== 'buildings' && e.kind === 'troop' && d > sicht) continue;
        if (u.kind !== 'troop' && d > u.rng) continue;
        const gewicht = d + (e.kind === 'troop' ? 0 : (u.kind === 'troop' && u.tg !== 'buildings' ? 0.5 : 0));
        if (gewicht < bd) { bd = gewicht; best = e; }
      }
      return best;
    }

    wegpunkt(u, tx, ty) {
      if (u.fly || KARTEN[u.key].jump) return [tx, ty];
      const zielUnten = ty > 16, imFluss = u.y > FLUSS_O - 0.45 && u.y < FLUSS_U + 0.45;
      const bx = Math.abs(u.x - BRUECKEN[0]) < Math.abs(u.x - BRUECKEN[1]) ? BRUECKEN[0] : BRUECKEN[1];
      if (imFluss) return [bx, zielUnten ? FLUSS_U + 0.8 : FLUSS_O - 0.8];
      const unten = u.y > 16;
      if (unten === zielUnten) return [tx, ty];
      if (Math.abs(u.x - bx) > 0.35) return [bx, unten ? FLUSS_U + 0.6 : FLUSS_O - 0.6];
      return [bx, unten ? FLUSS_O - 0.8 : FLUSS_U + 0.8];
    }

    schiessen(u, ziel) {
      const k = KARTEN[u.key] || {};
      u.angriff = 0.35;
      if (u.kind === 'tower' || k.proj) {
        this.geschosse.push({ team: u.team, x: u.x, y: u.y - (u.kind === 'tower' ? 0.6 : 0), ziel, tx: ziel.x, ty: ziel.y, v: u.kind === 'tower' ? 14 : 11,
          dmg: u.dmg, splash: k.splash || 0, tg: u.tg, col: u.kind === 'tower' ? '#fff3e0' : k.proj, key: u.kind === 'tower' ? u.key : u.key,
          miss: k.miss && Math.random() < k.miss, stun: k.stun || 0, slow: k.slow || 0, chain: k.chain || 0, push: k.push || 0 });
        return;
      }
      if (k.boom) { this.flaeche(u.team, u.x, u.y, k.boom, u.dmg, 'all', '#a5d6a7'); u.hp = 0; this.fx.push({ a: 'tod', x: u.x, y: u.y, r: u.r, kind: 'troop', team: u.team }); return; }
      if (k.spin) { this.flaeche(u.team, u.x, u.y, k.spin, u.dmg, 'ground', '#c5e1a5'); return; }
      if (k.charge) {
        this.fx.push({ a: 'strahl', x: u.x, y: u.y, tx: ziel.x, ty: ziel.y, col: '#4fc3f7', dick: 0.5 });
        this.flaeche(u.team, ziel.x, ziel.y, k.splash, u.dmg, 'ground', '#81d4fa');
        return;
      }
      if (k.splash) { this.flaeche(u.team, ziel.x, ziel.y, k.splash, u.dmg, u.tg, k.col, null); return; }
      this.schaden(ziel, u.dmg);
      this.fx.push({ a: 'hieb', x: ziel.x, y: ziel.y, col: k.col });
    }

    step(dt) {
      if (this.vorbei) { this.fx.length > 200 && this.fx.splice(0, 100); return; }
      this.zeit += dt;
      const takt = this.doppelt() ? 2 : 1;
      for (const t of [0, 1]) this.elixier[t] = Math.min(10, this.elixier[t] + dt / ELIXIER_TAKT * takt);
      if (!this.verl && this.zeit >= SPIELZEIT) {
        if (this.kronen[0] !== this.kronen[1]) return this.ende(this.kronen[0] > this.kronen[1] ? 0 : 1);
        this.verl = true; this.fx.push({ a: 'verl' });
      }
      if (this.verl && this.zeit >= SPIELZEIT + VERLAENGERUNG) {
        const anteil = t => Math.min(...this.ents.filter(e => e.kind === 'tower' && e.team === t).map(e => e.hp / e.max));
        const a0 = anteil(0), a1 = anteil(1);
        return this.ende(Math.abs(a0 - a1) < 0.001 ? 2 : (a0 > a1 ? 0 : 1));
      }

      for (const z of this.zonen) {
        z.t -= dt;
        for (const e of this.ents) if (e.team === z.team && e.kind === 'troop' && Math.hypot(e.x - z.x, e.y - z.y) <= z.rad) e.rage = 0.4;
      }
      this.zonen = this.zonen.filter(z => z.t > 0);

      const neu = [];
      for (const u of this.ents) {
        if (u.hp <= 0) continue;
        if (u.stun > 0) u.stun -= dt;
        if (u.slow > 0) u.slow -= dt;
        if (u.rage > 0) u.rage -= dt;
        if (u.strahl > 0) u.strahl -= dt;
        if (u.angriff > 0) u.angriff -= dt;
        const k = KARTEN[u.key] || {};
        if (u.deploy > 0) {
          u.deploy -= dt;
          if (u.deploy <= 0 && k.land) this.flaeche(u.team, u.x, u.y, k.land.rad, k.land.dmg, 'ground', '#a5d6a7');
          continue;
        }
        if (u.kind === 'building') {
          u.hp -= u.max / k.life * dt;
          if (u.hp <= 0) { this.tod(u); continue; }
          if (k.spawn && (u.spawnT -= dt) <= 0) { u.spawnT = k.every; neu.push([u.team, k.spawn, u.x, u.y + (u.team === 0 ? -1 : 1), u.key]); }
        }
        if (u.stun > 0) { u.lade = 0; u.ramp = 0; continue; }
        if (u.kind === 'tower' && !u.aktiv) continue;
        const tempo = (u.slow > 0 ? 0.65 : 1) * (u.rage > 0 ? 1.35 : 1);
        u.cd = Math.max(0, u.cd - dt * tempo);
        if (k.charge) u.lade = Math.min(u.hs, u.lade + dt * tempo);

        if (!this.trifft(u, u.ziel) || (u.kind !== 'troop' && this.kante(u, u.ziel) > u.rng) || (u.kind === 'troop' && this.kante(u, u.ziel) > u.rng + 0.3 && Math.random() < 0.1))
          u.ziel = this.zielSuchen(u);
        if (u.kind === 'troop' && !u.ziel) u.ziel = this.zielSuchen(u);
        const z = u.ziel;
        if (!z) continue;
        const d = this.kante(u, z);
        if (d <= u.rng) {
          if (k.beam) {
            if (u.strahlZiel !== z.id) { u.strahlZiel = z.id; u.ramp = 0; }
            u.ramp += dt * tempo; u.strahl = 0.15; u.angriff = 0.2;
            if (u.cd <= 0) { u.cd = u.hs; this.schaden(z, u.ramp < 2 ? 30 : u.ramp < 4 ? 95 : 300); }
          } else if (k.charge) {
            if (u.lade >= u.hs) { u.lade = 0; this.schiessen(u, z); }
          } else if (u.cd <= 0) { u.cd = u.hs; this.schiessen(u, z); }
        } else if (u.kind === 'troop') {
          u.ramp = 0;
          const [wx, wy] = this.wegpunkt(u, z.x, z.y);
          const dx = wx - u.x, dy = wy - u.y, l = Math.hypot(dx, dy) || 1;
          const s = Math.min(l, (k.spd || 1) * tempo * dt);
          const nx = u.x + dx / l * s, ny = u.y + dy / l * s;
          u.x = klemmen(nx, 0.3, W - 0.3);
          if (u.fly || k.jump || this.begehbar(u.x, ny)) u.y = klemmen(ny, 0.3, H - 0.3);
        }
      }
      for (const n of neu) { this.quelle = n[4]; this.einheit(n[0], n[1], n[2], n[3]); this.quelle = null; }

      for (const g of this.geschosse) {
        if (g.ziel && g.ziel.hp > 0) { g.tx = g.ziel.x; g.ty = g.ziel.y; }
        const dx = g.tx - g.x, dy = g.ty - g.y, l = Math.hypot(dx, dy), s = g.v * dt;
        if (l <= s) {
          g.weg = true;
          if (g.miss) { this.fx.push({ a: 'daneben', x: g.tx, y: g.ty }); continue; }
          if (g.splash) this.flaeche(g.team, g.tx, g.ty, g.splash, g.dmg, g.tg, g.col);
          else if (g.ziel && g.ziel.hp > 0) {
            this.schaden(g.ziel, g.dmg);
            if (g.stun) { g.ziel.stun = Math.max(g.ziel.stun, g.stun); g.ziel.lade = 0; g.ziel.ramp = 0; }
            if (g.slow) g.ziel.slow = Math.max(g.ziel.slow, g.slow);
            if (g.push && g.ziel.kind === 'troop' && g.ziel.hp > 0) { const d = Math.hypot(g.ziel.x - g.x, g.ziel.y - g.y) || 1; this.schieben(g.ziel, (g.ziel.x - g.x) / d * g.push, (g.ziel.y - g.y) / d * g.push); }
            this.fx.push({ a: 'hieb', x: g.tx, y: g.ty, col: g.col });
            if (g.chain) {
              let n = null, nd = 3;
              for (const e of this.ents) if (e !== g.ziel && e.hp > 0 && e.team !== g.team && abstand(e, g.ziel) < nd) { nd = abstand(e, g.ziel); n = e; }
              if (n) {
                this.fx.push({ a: 'strahl', x: g.tx, y: g.ty, tx: n.x, ty: n.y, col: '#fff176', dick: 0.12 });
                this.schaden(n, g.dmg); n.stun = Math.max(n.stun, g.stun);
              }
            }
          }
        } else { g.x += dx / l * s; g.y += dy / l * s; }
      }
      this.geschosse = this.geschosse.filter(g => !g.weg);

      this.trennen();
      this.ents = this.ents.filter(e => e.hp > 0 || e.kind === 'tower');
    }

    begehbar(x, y) {
      if (y <= FLUSS_O - 0.35 || y >= FLUSS_U + 0.35) return true;
      return BRUECKEN.some(b => Math.abs(x - b) <= 1.05);
    }

    trennen() {
      const L = this.ents;
      for (let i = 0; i < L.length; i++) {
        const a = L[i];
        if (a.hp <= 0) continue;
        for (let j = i + 1; j < L.length; j++) {
          const b = L[j];
          if (b.hp <= 0 || a.fly !== b.fly) continue;
          const ra = a.kind === 'troop', rb = b.kind === 'troop';
          if (!ra && !rb) continue;
          const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), m = a.r + b.r;
          if (d >= m || d === 0 && !(ra && rb)) continue;
          const nx = d ? dx / d : Math.random() - 0.5, ny = d ? dy / d : Math.random() - 0.5, ueber = (m - d);
          if (ra && rb) {
            const wa = b.r * b.r / (a.r * a.r + b.r * b.r);
            this.schieben(a, -nx * ueber * wa * 0.5, -ny * ueber * wa * 0.5);
            this.schieben(b, nx * ueber * (1 - wa) * 0.5, ny * ueber * (1 - wa) * 0.5);
          } else if (ra) this.schieben(a, -nx * ueber, -ny * ueber);
          else this.schieben(b, nx * ueber, ny * ueber);
        }
      }
    }
    schieben(e, dx, dy) {
      const nx = klemmen(e.x + dx, 0.3, W - 0.3), ny = klemmen(e.y + dy, 0.3, H - 0.3);
      if (e.fly || KARTEN[e.key].jump || this.begehbar(nx, ny)) { e.x = nx; e.y = ny; }
      else if (this.begehbar(nx, e.y)) e.x = nx;
    }

    // Kompakter Zustand fürs Netz (Online-Duell)
    schnappschuss() {
      const r1 = v => Math.round(v * 100) / 100;
      return {
        z: r1(this.zeit), v: this.verl ? 1 : 0, k: this.kronen,
        e: this.ents.map(e => [e.id, e.key, e.team, r1(e.x), r1(e.y), Math.max(0, Math.round(e.hp)), e.max, e.r,
          (e.fly ? 1 : 0) | (e.deploy > 0 ? 2 : 0) | (e.stun > 0 ? 4 : 0) | (e.aktiv ? 8 : 0) | (e.strahl > 0 ? 16 : 0) | (e.rage > 0 ? 32 : 0) | (e.slow > 0 ? 64 : 0) | (e.angriff > 0 ? 128 : 0),
          e.ziel && e.ziel.hp > 0 ? [r1(e.ziel.x), r1(e.ziel.y)] : 0, e.lade && KARTEN[e.key].charge ? r1(e.lade / e.hs) : 0]),
        g: this.geschosse.map(g => [r1(g.x), r1(g.y), g.col || '#fff']),
        zo: this.zonen.map(z => [r1(z.x), r1(z.y), z.rad, z.team])
      };
    }
  }

  /* Computer-Gegner für Team 1 */
  class KI {
    constructor(sim, team, staerke) { this.sim = sim; this.team = team; this.t = 1.5; this.staerke = staerke || 0; this.ziel = 7 + Math.random() * 3; }
    step(dt) {
      const s = this.sim, t = this.team;
      if (s.vorbei || (this.t -= dt) > 0) return;
      this.t = Math.max(0.35, 1.3 - this.staerke * 0.17) + Math.random() * 0.5;
      const oben = t === 1, el = s.elixier[t], hand = s.hand(t);
      const gefahr = s.ents.filter(e => e.team !== t && e.kind === 'troop' && e.hp > 0 && (oben ? e.y < 20 : e.y > 12));
      const spielbar = hand.filter(k => KARTEN[k].c <= el);
      if (!spielbar.length) return;
      const spiegel = y => oben ? y : H - y;
      if (gefahr.length) {
        let mx = 0, my = 0, hp = 0;
        for (const g of gefahr) { mx += g.x * g.hp; my += g.y * g.hp; hp += g.hp; }
        mx /= hp; my /= hp;
        if (Math.random() < 0.25 && el < 6) return;    // manchmal wartet der Computer ab
        const viele = gefahr.length >= 3, flieger = gefahr.some(g => g.fly);
        const wert = k => {
          const c = KARTEN[k]; let w = Math.random() * 2;
          if (c.t === 'spell') w += (c.dmg || c.half ? (viele ? 4 : hp > 1200 ? 2 : -3) : -6);
          else if (c.t === 'building') w += 2;
          else { w += 3; if (flieger && c.tg !== 'all') w -= 4; if (viele && (c.splash || c.spin)) w += 3; if (c.tg === 'buildings') w -= 5; }
          return w - c.c * 0.2;
        };
        const k = spielbar.sort((a, b) => wert(b) - wert(a))[0];
        const c = KARTEN[k];
        if (c.t === 'spell') { if (!c.rage) s.spielen(t, k, mx, my); return; }
        const py = oben ? Math.min(my - 2.5, FLUSS_O - 1) : Math.max(my + 2.5, FLUSS_U + 1);
        const x = c.t === 'building' ? 9 : klemmen(mx + (Math.random() - 0.5) * 2, 1, W - 1);
        const y = c.t === 'building' ? spiegel(9.5) : klemmen(py, 1, H - 1);
        s.spielen(t, k, x, y);
        return;
      }
      if (el < this.ziel) return;
      this.ziel = 6 + Math.random() * 4;
      // Angriff: schwächere Seite des Gegners
      const anteil = links => { const p = s.ents.find(e => e.kind === 'tower' && e.team !== t && e.key === 'princess' && (e.x < 9) === links); return p ? p.hp : 0; };
      const links = anteil(true) <= anteil(false);
      const lx = links ? 3.5 : 14.5;
      const truppen = spielbar.filter(k => KARTEN[k].t === 'troop');
      if (!truppen.length) return;
      const k = truppen.sort((a, b) => (KARTEN[b].hp * (KARTEN[b].cnt || 1)) - (KARTEN[a].hp * (KARTEN[a].cnt || 1)))[Math.random() < 0.7 ? 0 : truppen.length - 1];
      const c = KARTEN[k];
      const hinten = c.tg === 'buildings' && c.spd < 1.5;
      s.spielen(t, k, lx + (Math.random() - 0.5), spiegel(hinten ? 2.5 : 13.5));
    }
  }

  const api = { MAX_STUFE, W, H, FLUSS_O, FLUSS_U, BRUECKEN, SPIELZEIT, VERLAENGERUNG, KARTEN, TUERME, ARENEN, STARTDECK, SPIELBAR, arenaVon, deckPruefen, Sim, KI };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.COT = api;
})(this);
