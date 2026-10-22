/* Clash of Taddel – 3D-Grafik mit Three.js.
   Welt: 1 Einheit = 1 Kachel. Arena-x 0..18 -> X -9..9, Arena-y 0..32 -> Z -16..16, Boden bei Y = 0. */
import * as THREE from '/vendor/three.module.min.js';

const { KARTEN, ARENEN, W, H } = window.COT;
const wx = x => x - W / 2, wz = y => y - H / 2;
const GROSS = 1.55;   // Figuren größer als ihr Trefferkreis, wie im Original

/* ---------- Bausteine ---------- */
const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  kugel: new THREE.SphereGeometry(1, 20, 14),
  kugelGrob: new THREE.SphereGeometry(1, 10, 8),
  zyl: new THREE.CylinderGeometry(1, 1, 1, 18),
  kegel: new THREE.ConeGeometry(1, 1, 16),
  ring: new THREE.RingGeometry(0.82, 1, 40),
  scheibe: new THREE.CircleGeometry(1, 40)
};
const geoCache = new Map();
const zylGeo = (o, u) => { const k = o + '|' + u; if (!geoCache.has(k)) geoCache.set(k, new THREE.CylinderGeometry(o, u, 1, 18)); return geoCache.get(k); };
const matCache = new Map();
function M(col, opt) {
  const k = col + JSON.stringify(opt || {});
  if (!matCache.has(k)) matCache.set(k, opt && opt.leucht
    ? new THREE.MeshBasicMaterial({ color: col, transparent: !!opt.alpha, opacity: opt.alpha || 1 })
    : new THREE.MeshLambertMaterial({ color: col, emissive: opt && opt.glanz ? col : 0x000000, emissiveIntensity: opt && opt.glanz ? 0.35 : 0 }));
  return matCache.get(k);
}
function teil(geo, col, x, y, z, sx, sy, sz, opt) {
  const m = new THREE.Mesh(geo, M(col, opt));
  m.position.set(x || 0, y || 0, z || 0); m.scale.set(sx || 1, sy == null ? sx || 1 : sy, sz == null ? sx || 1 : sz);
  m.castShadow = true;
  return m;
}
const box = (col, x, y, z, sx, sy, sz, opt) => teil(GEO.box, col, x, y, z, sx, sy, sz, opt);
const kugel = (col, x, y, z, sx, sy, sz, opt) => teil(GEO.kugel, col, x, y, z, sx, sy, sz, opt);
const zyl = (col, x, y, z, r, h, opt) => teil(GEO.zyl, col, x, y, z, r, h, r, opt);
const kegel = (col, x, y, z, r, h, opt) => teil(GEO.kegel, col, x, y, z, r, h, r, opt);
const kegelstumpf = (col, x, y, z, o, u, h) => { const m = new THREE.Mesh(zylGeo(o, u), M(col)); m.position.set(x, y, z); m.scale.set(1, h, 1); m.castShadow = true; return m; };
const dreh = (m, rx, ry, rz) => { m.rotation.set(rx || 0, ry || 0, rz || 0); return m; };
const gruppe = (...kinder) => { const g = new THREE.Group(); kinder.forEach(k => k && g.add(k)); return g; };

/* Augen im Chibi-Stil: großes Weiß, dunkle Pupille, Glanzpunkt */
function augen(g, y, z, abst, gr, farbe) {
  for (const s of [-1, 1]) {
    g.add(kugel('#ffffff', s * abst, y, z, gr, gr * 1.15, gr * 0.6));
    g.add(kugel(farbe || '#1b1b1b', s * abst, y - gr * 0.05, z + gr * 0.42, gr * 0.55, gr * 0.7, gr * 0.3));
    g.add(kugel('#ffffff', s * abst + gr * 0.18, y + gr * 0.25, z + gr * 0.55, gr * 0.16, gr * 0.16, gr * 0.1, { leucht: 1 }));
  }
}

/* Chibi-Figur: großer Kopf, kleiner Körper. Vorne ist +Z. */
function chibi(o) {
  const g = new THREE.Group(), b = o.breit || 1, kopf = new THREE.Group();
  const beinL = gruppe(box(o.hose, 0, -0.14, 0, 0.17 * b, 0.3, 0.2), box(o.schuh || '#3e2723', 0, -0.3, 0.04, 0.2 * b, 0.1, 0.28));
  const beinR = beinL.clone();
  beinL.position.set(-0.13 * b, 0.36, 0); beinR.position.set(0.13 * b, 0.36, 0);
  g.add(beinL, beinR);
  const koerper = new THREE.Group();
  koerper.add(kugel(o.koerper, 0, 0, 0, 0.3 * b, 0.32, 0.24 * Math.max(1, b * 0.85)));
  if (o.guertel) koerper.add(zyl(o.guertel, 0, -0.14, 0, 0.29 * b, 0.07));
  koerper.position.y = 0.58;
  g.add(koerper);
  const armL = new THREE.Group(), armR = new THREE.Group();
  for (const [arm, s] of [[armL, -1], [armR, 1]]) {
    arm.add(kugel(o.arm || o.koerper, 0, -0.12, 0, 0.09 * b, 0.17, 0.09 * b));
    arm.add(kugel(o.hand || o.haut, 0, -0.28, 0.02, 0.08 * b, 0.08, 0.08 * b));
    arm.position.set(s * 0.33 * b, 0.72, 0);
    g.add(arm);
  }
  kopf.add(kugel(o.haut, 0, 0, 0, 0.36 * (o.kopf || 1), 0.34 * (o.kopf || 1), 0.33 * (o.kopf || 1)));
  if (!o.ohneAugen) augen(kopf, 0.02, 0.26 * (o.kopf || 1), 0.12, 0.075, o.augen);
  kopf.position.y = 1.08 + (o.kopf ? (o.kopf - 1) * 0.3 : 0);
  g.add(kopf);
  g.userData = { kopf, armL, armR, beinL, beinR, koerper };
  return g;
}
const halt = (arm, obj) => { obj.position.y += -0.3; arm.add(obj); return obj; };

/* ---------- Figuren ---------- */
const FIGUREN = {
  mario() {
    const g = chibi({ haut: '#ffcc99', koerper: '#1e4fd6', arm: '#e53935', hose: '#1e4fd6', hand: '#ffffff', schuh: '#5d3a1a' });
    const k = g.userData.kopf;
    k.add(kugel('#e53935', 0, 0.12, -0.02, 0.37, 0.24, 0.36), box('#e53935', 0, 0.06, 0.3, 0.42, 0.05, 0.2));
    k.add(kugel('#ffffff', 0, 0.22, 0.27, 0.09, 0.09, 0.03), box('#e53935', 0, 0.22, 0.3, 0.06, 0.07, 0.01));
    k.add(kugel('#ffb37a', 0, -0.06, 0.34, 0.08), box('#3e2723', 0, -0.13, 0.31, 0.24, 0.06, 0.06));
    g.userData.koerper.add(kugel('#e53935', 0, 0.14, 0, 0.27, 0.16, 0.22), kugel('#ffd54f', -0.1, 0.06, 0.22, 0.035), kugel('#ffd54f', 0.1, 0.06, 0.22, 0.035));
    return g;
  },
  minions() {
    const g = new THREE.Group(), k = new THREE.Group();
    k.add(zyl('#fdd835', 0, 0.55, 0, 0.3, 0.6), kugel('#fdd835', 0, 0.85, 0, 0.3), kugel('#1e5aa8', 0, 0.25, 0, 0.3, 0.2, 0.3));
    k.add(zyl('#1e5aa8', 0, 0.4, 0, 0.305, 0.3));
    k.add(dreh(zyl('#9e9e9e', 0, 0.72, 0.24, 0.15, 0.1), Math.PI / 2), kugel('#ffffff', 0, 0.72, 0.29, 0.11, 0.11, 0.05), kugel('#6d4c41', 0, 0.72, 0.33, 0.05, 0.05, 0.02));
    k.add(zyl('#212121', 0, 0.72, 0, 0.31, 0.05));
    k.add(box('#5d4037', -0.08, 0.5, 0.29, 0.1, 0.02, 0.02), box('#5d4037', 0.08, 0.5, 0.29, 0.1, 0.02, 0.02));
    const rotor = gruppe(box('#455a64', 0, 0, 0, 0.9, 0.03, 0.08), box('#455a64', 0, 0, 0, 0.08, 0.03, 0.9));
    rotor.position.y = 1.25; k.add(zyl('#455a64', 0, 1.15, 0, 0.03, 0.12), rotor);
    const armL = gruppe(kugel('#fdd835', 0, -0.1, 0, 0.06, 0.14, 0.06)), armR = armL.clone();
    armL.position.set(-0.32, 0.6, 0); armR.position.set(0.32, 0.6, 0);
    g.add(k, armL, armR);
    g.userData = { kopf: k, armL, armR, rotor };
    return g;
  },
  zombies() {
    const g = chibi({ haut: '#9ccc65', koerper: '#6d4c41', hose: '#37474f', schuh: '#263238', augen: '#b71c1c' });
    g.userData.kopf.add(box('#4e342e', 0, 0.26, -0.05, 0.3, 0.06, 0.3), box('#3e2723', 0, -0.17, 0.27, 0.16, 0.04, 0.04));
    g.userData.koerper.add(box('#c62828', 0, 0.05, 0.22, 0.06, 0.25, 0.03));
    g.userData.armL.rotation.x = g.userData.armR.rotation.x = -1.3;
    return g;
  },
  legolas() {
    const g = chibi({ haut: '#ffe0bd', koerper: '#558b2f', hose: '#6d4c41', guertel: '#4e342e', augen: '#1565c0' });
    const k = g.userData.kopf;
    k.add(kugel('#f5e08a', 0, 0.1, -0.06, 0.37, 0.3, 0.33), box('#f5e08a', 0, -0.15, -0.2, 0.42, 0.45, 0.12));
    k.add(dreh(kegel('#ffe0bd', -0.36, 0.04, 0, 0.05, 0.22), 0, 0, Math.PI / 2.4), dreh(kegel('#ffe0bd', 0.36, 0.04, 0, 0.05, 0.22), 0, 0, -Math.PI / 2.4));
    const bogen = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.025, 6, 20, Math.PI), M('#6d4c41'));
    bogen.rotation.set(0, Math.PI / 2, Math.PI / 2); bogen.position.set(0, -0.3, 0.06);
    g.userData.armL.add(bogen);
    g.userData.koerper.add(dreh(zyl('#5d4037', 0.08, 0.1, -0.24, 0.07, 0.45), 0.3, 0, 0.4));
    return g;
  },
  creeper() {
    const g = new THREE.Group(), gruen = '#4caf50';
    const c = document.createElement('canvas'); c.width = c.height = 8; const x = c.getContext('2d');
    x.fillStyle = gruen; x.fillRect(0, 0, 8, 8);
    for (let i = 0; i < 18; i++) { x.fillStyle = ['#66bb6a', '#388e3c', '#81c784'][i % 3]; x.fillRect(Math.random() * 8 | 0, Math.random() * 8 | 0, 1, 1); }
    const seite = new THREE.CanvasTexture(c); seite.magFilter = THREE.NearestFilter;
    const f = c.cloneNode(); const fx = f.getContext('2d'); fx.drawImage(c, 0, 0); fx.fillStyle = '#111';
    fx.fillRect(1, 2, 2, 2); fx.fillRect(5, 2, 2, 2); fx.fillRect(3, 4, 2, 2); fx.fillRect(2, 5, 4, 2); fx.clearRect(3, 7, 2, 1); fx.fillRect(2, 7, 1, 1); fx.fillRect(5, 7, 1, 1);
    const gesicht = new THREE.CanvasTexture(f); gesicht.magFilter = THREE.NearestFilter;
    const ms = new THREE.MeshLambertMaterial({ map: seite }), mg = new THREE.MeshLambertMaterial({ map: gesicht });
    const kopf = new THREE.Mesh(GEO.box, [ms, ms, ms, ms, mg, ms]); kopf.scale.set(0.5, 0.5, 0.5); kopf.position.y = 1.0; kopf.castShadow = true;
    const rumpf = new THREE.Mesh(GEO.box, ms); rumpf.scale.set(0.36, 0.55, 0.26); rumpf.position.y = 0.5; rumpf.castShadow = true;
    g.add(kopf, rumpf);
    const beine = [];
    for (const [bx, bz] of [[-0.11, 0.2], [0.11, 0.2], [-0.11, -0.2], [0.11, -0.2]]) { const b = new THREE.Mesh(GEO.box, ms); b.scale.set(0.2, 0.25, 0.2); b.position.set(bx, 0.12, bz); b.castShadow = true; g.add(b); beine.push(b); }
    g.userData = { kopf, beine, koerper: rumpf };
    return g;
  },
  shrek() {
    const g = chibi({ haut: '#8bc34a', koerper: '#efe6cf', hose: '#6d4c41', guertel: '#4e342e', breit: 1.35, schuh: '#4e342e', augen: '#5d4037' });
    const k = g.userData.kopf;
    for (const s of [-1, 1]) k.add(dreh(zylGeoTeil('#8bc34a', s * 0.33, 0.14, 0, 0.04, 0.07, 0.2), 0, 0, -s * 0.9));
    k.add(kugel('#7cb342', 0, -0.06, 0.32, 0.09, 0.07, 0.06), box('#5d4037', 0, -0.17, 0.3, 0.16, 0.025, 0.02));
    g.userData.koerper.add(box('#5d4037', -0.2, 0.02, 0.17, 0.14, 0.4, 0.06), box('#5d4037', 0.2, 0.02, 0.17, 0.14, 0.4, 0.06));
    return g;
  },
  peashooter() {
    const g = new THREE.Group();
    g.add(kugel('#6d4c41', 0, 0, 0, 0.75, 0.25, 0.75));
    for (let i = 0; i < 4; i++) { const b = kugel('#43a047', Math.cos(i * 1.57) * 0.4, 0.15, Math.sin(i * 1.57) * 0.4, 0.3, 0.06, 0.15); b.rotation.y = -i * 1.57; g.add(b); }
    g.add(zyl('#558b2f', 0, 0.55, 0, 0.07, 0.8));
    const kopf = new THREE.Group();
    kopf.add(kugel('#7cb342', 0, 0, 0, 0.38));
    kopf.add(dreh(zyl('#7cb342', 0, 0, 0.42, 0.17, 0.35), Math.PI / 2), dreh(zyl('#2e3d1e', 0, 0, 0.6, 0.12, 0.02), Math.PI / 2));
    kopf.add(dreh(kegel('#558b2f', 0, 0.2, -0.38, 0.12, 0.35), -2.2));
    augen(kopf, 0.12, 0.28, 0.13, 0.08);
    kopf.position.y = 1.15; g.add(kopf);
    g.userData = { kopf, turm: kopf };
    return g;
  },
  vader() {
    const g = chibi({ haut: '#1a1a1a', koerper: '#1a1a1a', hose: '#141414', schuh: '#0d0d0d', hand: '#111', ohneAugen: 1, guertel: '#9e9e9e' });
    const k = g.userData.kopf;
    k.add(kugel('#111111', 0, 0.06, -0.02, 0.38, 0.32, 0.37, { glanz: 1 }), kegelstumpf('#111111', 0, -0.12, -0.03, 0.34, 0.42, 0.2));
    k.add(box('#424242', 0, -0.1, 0.33, 0.18, 0.14, 0.05), box('#212121', -0.1, 0.03, 0.32, 0.12, 0.06, 0.04), box('#212121', 0.1, 0.03, 0.32, 0.12, 0.06, 0.04));
    g.userData.koerper.add(box('#424242', 0, 0.06, 0.22, 0.16, 0.12, 0.04), kugel('#e53935', -0.04, 0.07, 0.25, 0.02, 0.02, 0.01, { leucht: 1 }), kugel('#4fc3f7', 0.04, 0.07, 0.25, 0.02, 0.02, 0.01, { leucht: 1 }));
    g.add(box('#0d0d0d', 0, 0.62, -0.24, 0.62, 0.8, 0.04));
    const schwert = gruppe(zyl('#9e9e9e', 0, 0, 0, 0.035, 0.18), zyl('#ff1744', 0, 0.48, 0, 0.03, 0.8, { leucht: 1 }), zyl('#ff8a80', 0, 0.48, 0, 0.05, 0.82, { leucht: 1, alpha: 0.35 }));
    schwert.position.set(0, -0.32, 0.05); schwert.rotation.x = 1.2;
    g.userData.armR.add(schwert);
    return g;
  },
  storm() {
    const g = chibi({ haut: '#f5f5f5', koerper: '#fafafa', hose: '#eeeeee', schuh: '#e0e0e0', hand: '#212121', ohneAugen: 1, guertel: '#212121' });
    const k = g.userData.kopf;
    k.add(box('#111', -0.1, 0.02, 0.3, 0.12, 0.08, 0.06), box('#111', 0.1, 0.02, 0.3, 0.12, 0.08, 0.06), box('#424242', 0, -0.15, 0.3, 0.2, 0.06, 0.06));
    k.add(box('#111', 0, -0.06, 0.32, 0.03, 0.08, 0.03));
    g.userData.armR.add(dreh(box('#212121', 0, -0.32, 0.12, 0.06, 0.08, 0.36), 0.2));
    g.userData.armR.rotation.x = -1.2; g.userData.armL.rotation.x = -1.0;
    return g;
  },
  sonic() {
    const g = chibi({ haut: '#1e88e5', koerper: '#1e88e5', hose: '#1e88e5', schuh: '#e53935', hand: '#ffffff', augen: '#2e7d32', kopf: 1.1 });
    const k = g.userData.kopf;
    for (let i = 0; i < 5; i++) { const w = (i - 2) * 0.32; k.add(dreh(kegel('#1e88e5', Math.sin(w) * 0.2, 0.05 + Math.cos(w * 2) * 0.12 - Math.abs(w) * 0.2, -0.38, 0.13, 0.5), -1.9 + Math.abs(w) * 0.3, 0, w)); }
    k.add(kugel('#ffcc99', 0, -0.12, 0.24, 0.22, 0.14, 0.14), kugel('#111', 0, -0.03, 0.38, 0.05, 0.04, 0.04));
    for (const s of [-1, 1]) k.add(dreh(kegel('#1e88e5', s * 0.25, 0.32, 0, 0.1, 0.25), 0, 0, -s * 0.4));
    g.userData.koerper.add(kugel('#ffcc99', 0, -0.02, 0.12, 0.2, 0.22, 0.15));
    return g;
  },
  gandalf() {
    const g = chibi({ haut: '#ffe0bd', koerper: '#9e9e9e', hose: '#8d8d8d', schuh: '#5d4037', augen: '#37474f' });
    g.userData.koerper.add(kegelstumpf('#9e9e9e', 0, -0.2, 0, 0.25, 0.4, 0.45));
    const k = g.userData.kopf;
    k.add(zyl('#8a8a8a', 0, 0.2, 0, 0.55, 0.03), dreh(kegel('#8a8a8a', 0, 0.55, -0.08, 0.3, 0.75), -0.25));
    k.add(dreh(kegel('#eeeeee', 0, -0.32, 0.18, 0.22, 0.5), Math.PI), kugel('#eeeeee', 0, -0.1, 0.26, 0.2, 0.08, 0.06));
    k.add(box('#eeeeee', -0.1, 0.1, 0.31, 0.1, 0.03, 0.02), box('#eeeeee', 0.1, 0.1, 0.31, 0.1, 0.03, 0.02));
    const stab = gruppe(zyl('#6d4c41', 0, 0.2, 0, 0.03, 1.3), kugel('#ffffff', 0, 0.9, 0, 0.09, 0.09, 0.09, { leucht: 1 }), kugel('#fff59d', 0, 0.9, 0, 0.16, 0.16, 0.16, { leucht: 1, alpha: 0.35 }));
    stab.position.set(0, -0.3, 0.05); g.userData.armR.add(stab);
    return g;
  },
  drogon() {
    const g = new THREE.Group(), dunkel = '#2b1d16', rot = '#8e1b1b';
    const koerper = gruppe(kugel(dunkel, 0, 0, 0, 0.42, 0.36, 0.6), kugel(rot, 0, -0.14, 0.05, 0.3, 0.22, 0.48));
    koerper.position.y = 0.75; g.add(koerper);
    const hals = dreh(zyl(dunkel, 0, 1.05, 0.45, 0.13, 0.55), 0.7); g.add(hals);
    const kopf = gruppe(box(dunkel, 0, 0, 0, 0.32, 0.24, 0.42), box(dunkel, 0, -0.06, 0.28, 0.24, 0.14, 0.3), dreh(kegel('#d7ccc8', -0.12, 0.16, -0.12, 0.04, 0.28), -0.8), dreh(kegel('#d7ccc8', 0.12, 0.16, -0.12, 0.04, 0.28), -0.8),
      kugel('#ffb300', -0.12, 0.05, 0.16, 0.04, 0.04, 0.03, { leucht: 1 }), kugel('#ffb300', 0.12, 0.05, 0.16, 0.04, 0.04, 0.03, { leucht: 1 }));
    kopf.position.set(0, 1.3, 0.72); g.add(kopf);
    g.add(dreh(kegel(dunkel, 0, 0.65, -0.85, 0.16, 0.9), -1.75));
    const form = new THREE.Shape(); form.moveTo(0, 0); form.lineTo(1.3, 0.25); form.lineTo(1.1, -0.2); form.lineTo(0.75, -0.05); form.lineTo(0.5, -0.35); form.lineTo(0.2, -0.1); form.lineTo(0, -0.3);
    const fg = new THREE.ShapeGeometry(form), fm = new THREE.MeshLambertMaterial({ color: '#5d1a1a', side: THREE.DoubleSide });
    const flL = new THREE.Group(), flR = new THREE.Group();
    const a = new THREE.Mesh(fg, fm); a.rotation.x = -Math.PI / 2; a.castShadow = true; flR.add(a);
    const b = new THREE.Mesh(fg, fm); b.rotation.x = -Math.PI / 2; b.scale.x = -1; b.castShadow = true; flL.add(b);
    flL.position.set(-0.25, 0.95, 0.1); flR.position.set(0.25, 0.95, 0.1);
    g.add(flL, flR);
    g.userData = { kopf, fluegel: [flL, flR], koerper };
    return g;
  },
  pipe() {
    const g = new THREE.Group();
    g.add(zyl('#2e7d32', 0, 0.55, 0, 0.55, 1.1, { glanz: 1 }), zyl('#388e3c', 0, 1.18, 0, 0.7, 0.3, { glanz: 1 }), zyl('#0b2e0f', 0, 1.34, 0, 0.55, 0.02));
    g.add(box('#81c784', 0.32, 0.55, 0.35, 0.08, 1.0, 0.04), box('#a5d6a7', 0.45, 1.18, 0.45, 0.08, 0.26, 0.04));
    g.userData = {};
    return g;
  },
  goomba() {
    const g = new THREE.Group(), kopf = new THREE.Group();
    kopf.add(kugel('#8d5a2b', 0, 0, 0, 0.42, 0.3, 0.42), kugel('#a0682f', 0, -0.12, 0, 0.44, 0.15, 0.44));
    augen(kopf, 0.02, 0.33, 0.11, 0.08);
    kopf.add(dreh(box('#111', -0.12, 0.13, 0.36, 0.14, 0.03, 0.03), 0, 0, -0.4), dreh(box('#111', 0.12, 0.13, 0.36, 0.14, 0.03, 0.03), 0, 0, 0.4));
    kopf.add(kegel('#ffffff', -0.08, -0.12, 0.38, 0.03, 0.06), kegel('#ffffff', 0.08, -0.12, 0.38, 0.03, 0.06));
    kopf.position.y = 0.55;
    const beinL = gruppe(kugel('#3e2723', 0, 0, 0.05, 0.13, 0.08, 0.17)), beinR = beinL.clone();
    beinL.position.set(-0.13, 0.08, 0); beinR.position.set(0.13, 0.08, 0);
    g.add(kugel('#f5deb3', 0, 0.25, 0, 0.2, 0.18, 0.2), kopf, beinL, beinR);
    g.userData = { kopf, beinL, beinR };
    return g;
  },
  ironman() {
    const g = chibi({ haut: '#b71c1c', koerper: '#c62828', arm: '#c62828', hose: '#c62828', hand: '#ffca28', schuh: '#ffca28', ohneAugen: 1, guertel: '#ffca28' });
    const k = g.userData.kopf;
    k.add(kugel('#c62828', 0, 0, 0, 0.37, 0.35, 0.34, { glanz: 1 }), box('#ffca28', 0, -0.03, 0.27, 0.36, 0.42, 0.12, { glanz: 1 }));
    k.add(box('#e0f7fa', -0.09, 0.04, 0.34, 0.11, 0.035, 0.02, { leucht: 1 }), box('#e0f7fa', 0.09, 0.04, 0.34, 0.11, 0.035, 0.02, { leucht: 1 }));
    g.userData.koerper.add(dreh(zyl('#80deea', 0, 0.05, 0.22, 0.07, 0.03, { leucht: 1 }), Math.PI / 2), kugel('#e0f7fa', 0, 0.05, 0.24, 0.12, 0.12, 0.02, { leucht: 1, alpha: 0.4 }));
    for (const s of [-1, 1]) g.add(kegel('#ffab40', s * 0.13, -0.05, 0, 0.09, 0.25, { leucht: 1, alpha: 0.75 }), kugel('#fff8e1', s * 0.13, 0.03, 0, 0.06, 0.06, 0.06, { leucht: 1 }));
    g.children.filter(c => c.geometry === GEO.kegel).forEach(c => (c.rotation.x = Math.PI));
    return g;
  },
  hulk() {
    const g = chibi({ haut: '#4caf50', koerper: '#4caf50', hose: '#6a1b9a', schuh: '#4caf50', breit: 1.55, augen: '#33691e' });
    g.userData.kopf.add(kugel('#212121', 0, 0.16, -0.05, 0.37, 0.22, 0.32), box('#2e7d32', 0, 0.11, 0.29, 0.3, 0.05, 0.04), box('#1b5e20', 0, -0.17, 0.3, 0.18, 0.05, 0.03));
    for (const a of [g.userData.armL, g.userData.armR]) { a.scale.set(1.3, 1.25, 1.3); a.children[1].scale.set(0.16, 0.15, 0.16); }
    g.userData.koerper.add(kugel('#43a047', -0.13, 0.08, 0.2, 0.14, 0.11, 0.06), kugel('#43a047', 0.13, 0.08, 0.2, 0.14, 0.11, 0.06));
    return g;
  },
  spiderman() {
    const g = chibi({ haut: '#d32f2f', koerper: '#d32f2f', arm: '#1565c0', hose: '#1565c0', hand: '#d32f2f', schuh: '#d32f2f', ohneAugen: 1 });
    const k = g.userData.kopf;
    for (const s of [-1, 1]) { const a = kugel('#111', s * 0.13, 0.05, 0.27, 0.12, 0.09, 0.06); a.rotation.z = s * 0.5; const w = kugel('#ffffff', s * 0.13, 0.05, 0.29, 0.1, 0.07, 0.05); w.rotation.z = s * 0.5; k.add(a, w); }
    g.userData.koerper.add(kugel('#111', 0, 0.08, 0.23, 0.05, 0.07, 0.02), box('#111', 0, 0.08, 0.235, 0.18, 0.012, 0.01), box('#111', 0, 0.08, 0.235, 0.012, 0.18, 0.01));
    return g;
  },
  link() {
    const g = chibi({ haut: '#ffe0bd', koerper: '#2e7d32', arm: '#f1e4c8', hose: '#f1e4c8', schuh: '#5d4037', guertel: '#5d4037', augen: '#1565c0' });
    const k = g.userData.kopf;
    k.add(kugel('#f5d76e', 0, 0.12, 0.05, 0.37, 0.24, 0.33), dreh(kegel('#2e7d32', 0, 0.25, -0.3, 0.3, 0.7), -2.1));
    k.add(dreh(kegel('#ffe0bd', -0.37, 0.02, 0, 0.05, 0.22), 0, 0, Math.PI / 2.3), dreh(kegel('#ffe0bd', 0.37, 0.02, 0, 0.05, 0.22), 0, 0, -Math.PI / 2.3));
    const schwert = gruppe(box('#1565c0', 0, 0, 0, 0.16, 0.04, 0.05), box('#5d4037', 0, -0.08, 0, 0.04, 0.12, 0.04), box('#e0e0e0', 0, 0.32, 0, 0.06, 0.6, 0.02, { glanz: 1 }));
    schwert.position.set(0, -0.3, 0.05); schwert.rotation.x = 1.3; g.userData.armR.add(schwert);
    const schild = gruppe(box('#1565c0', 0, 0, 0, 0.32, 0.4, 0.05), kegel('#c62828', 0, 0.02, 0.03, 0.08, 0.12), box('#c0c0c0', 0, 0.17, 0.03, 0.3, 0.04, 0.02));
    schild.position.set(-0.08, -0.2, 0.12); schild.rotation.y = -0.4; g.userData.armL.add(schild);
    return g;
  },
  pikachu() {
    const g = chibi({ haut: '#fdd835', koerper: '#fdd835', hose: '#fdd835', schuh: '#f9a825', kopf: 1.1 });
    const k = g.userData.kopf;
    for (const s of [-1, 1]) {
      const ohr = gruppe(kegel('#fdd835', 0, 0, 0, 0.09, 0.5), kegel('#111', 0, 0.17, 0, 0.05, 0.17));
      ohr.position.set(s * 0.2, 0.45, -0.05); ohr.rotation.z = -s * 0.45; k.add(ohr);
      k.add(dreh(zyl('#e53935', s * 0.24, -0.09, 0.25, 0.07, 0.02), Math.PI / 2, s * 0.6, 0));
    }
    k.add(kugel('#3e2723', 0, -0.06, 0.37, 0.02, 0.015, 0.01));
    const schwanz = gruppe(box('#6d4c41', 0, 0, 0, 0.08, 0.2, 0.06), box('#fdd835', 0.08, 0.18, 0, 0.08, 0.22, 0.06), box('#fdd835', 0, 0.36, 0, 0.26, 0.2, 0.06));
    schwanz.position.set(0.1, 0.55, -0.3); schwanz.rotation.z = -0.3; g.add(schwanz);
    return g;
  },
  godzilla() {
    const g = new THREE.Group(), haut = '#3d4a3d';
    const koerper = gruppe(kugel(haut, 0, 0, 0, 0.45, 0.6, 0.42), kugel('#5b6b55', 0, -0.05, 0.18, 0.32, 0.45, 0.28));
    koerper.position.y = 0.85; koerper.rotation.x = 0.15; g.add(koerper);
    const kopf = gruppe(kugel(haut, 0, 0, 0, 0.25, 0.22, 0.28), box(haut, 0, -0.06, 0.24, 0.26, 0.16, 0.25), kugel('#ffeb3b', -0.13, 0.06, 0.17, 0.04, 0.03, 0.03, { leucht: 1 }), kugel('#ffeb3b', 0.13, 0.06, 0.17, 0.04, 0.03, 0.03, { leucht: 1 }),
      box('#eeeeee', 0, -0.12, 0.36, 0.18, 0.03, 0.02));
    kopf.position.set(0, 1.55, 0.2); g.add(kopf);
    for (let i = 0; i < 6; i++) g.add(dreh(kegel('#cfd8dc', 0, 1.45 - i * 0.18, -0.32 - i * 0.06, 0.1 - i * 0.01, 0.3), -0.5));
    g.add(dreh(kegel(haut, 0, 0.35, -0.9, 0.25, 1.2), -1.4));
    const beinL = gruppe(zyl(haut, 0, 0, 0, 0.17, 0.5), kugel(haut, 0, -0.25, 0.06, 0.18, 0.1, 0.24)), beinR = beinL.clone();
    beinL.position.set(-0.25, 0.3, 0); beinR.position.set(0.25, 0.3, 0); g.add(beinL, beinR);
    const armL = gruppe(dreh(zyl(haut, 0, -0.1, 0.05, 0.07, 0.3), 0.6)), armR = armL.clone();
    armL.position.set(-0.4, 1.05, 0.2); armR.position.set(0.4, 1.05, 0.2); g.add(armL, armR);
    g.userData = { kopf, koerper, beinL, beinR, armL, armR };
    return g;
  },
  goku() {
    const g = chibi({ haut: '#ffe0bd', koerper: '#ff8f00', arm: '#ffe0bd', hose: '#ff8f00', schuh: '#1565c0', guertel: '#1565c0' });
    const k = g.userData.kopf;
    for (let i = 0; i < 9; i++) { const w = i / 9 * Math.PI * 2; k.add(dreh(kegel('#111', Math.cos(w) * 0.18, 0.22 + Math.sin(w) * 0.1, -0.06 + Math.sin(w) * 0.12, 0.12, 0.45), Math.sin(w) * 0.9 - 0.2, 0, -Math.cos(w) * 1.0)); }
    k.add(kugel('#111', 0, 0.12, -0.04, 0.36, 0.24, 0.33), dreh(kegel('#111', 0.08, 0.2, 0.24, 0.07, 0.2), 1.3, 0, 0.3));
    g.userData.koerper.add(box('#1565c0', 0, 0.07, 0.2, 0.12, 0.2, 0.02));
    const ball = kugel('#4fc3f7', 0, 0.62, 0.42, 0.01, 0.01, 0.01, { leucht: 1, alpha: 0.85 });
    g.add(ball); g.userData.ball = ball;
    return g;
  },
  kirby() {
    const g = new THREE.Group(), k = new THREE.Group();
    k.add(kugel('#f8a5c2', 0, 0, 0, 0.45, 0.43, 0.42));
    for (const sx of [-1, 1]) { k.add(kugel('#1a237e', sx * 0.1, 0.08, 0.36, 0.05, 0.12, 0.04), kugel('#ffffff', sx * 0.1, 0.13, 0.39, 0.025, 0.04, 0.02, { leucht: 1 }), kugel('#ff6f91', sx * 0.22, -0.04, 0.33, 0.07, 0.04, 0.03)); }
    k.add(kugel('#c2185b', 0, -0.08, 0.4, 0.04, 0.03, 0.02));
    k.position.y = 0.55; g.add(k);
    const beinL = gruppe(kugel('#e53935', 0, 0, 0.05, 0.17, 0.1, 0.24)), beinR = beinL.clone();
    beinL.position.set(-0.18, 0.1, 0); beinR.position.set(0.18, 0.1, 0); g.add(beinL, beinR);
    const armL = gruppe(kugel('#f8a5c2', 0, -0.05, 0, 0.12, 0.09, 0.1)), armR = armL.clone();
    armL.position.set(-0.42, 0.55, 0.05); armR.position.set(0.42, 0.55, 0.05); g.add(armL, armR);
    g.userData = { kopf: k, beinL, beinR, armL, armR };
    return g;
  },
  pacman() {
    const g = new THREE.Group(), k = new THREE.Group();
    const oben = new THREE.Mesh(new THREE.SphereGeometry(0.45, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M('#ffeb3b'));
    const unten = new THREE.Mesh(new THREE.SphereGeometry(0.45, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M('#ffeb3b'));
    oben.castShadow = unten.castShadow = true;
    k.add(oben, unten, kugel('#111', -0.17, 0.25, 0.25, 0.05, 0.07, 0.04), kugel('#111', 0.17, 0.25, 0.25, 0.05, 0.07, 0.04));
    k.position.y = 0.5; g.add(k);
    const beinL = gruppe(box('#5d4037', 0, 0, 0.05, 0.12, 0.08, 0.2)), beinR = beinL.clone();
    beinL.position.set(-0.15, 0.04, 0); beinR.position.set(0.15, 0.04, 0); g.add(beinL, beinR);
    g.userData = { kopf: k, beinL, beinR, maulO: oben, maulU: unten };
    return g;
  },
  spongebob() {
    const g = new THREE.Group(), k = new THREE.Group();
    k.add(box('#fff176', 0, 0, 0, 0.6, 0.62, 0.3));
    for (let i = 0; i < 6; i++) k.add(kugel('#c0ca33', -0.22 + (i % 3) * 0.22, -0.2 + Math.floor(i / 3) * 0.4, 0.15, 0.04, 0.05, 0.02));
    augen(k, 0.1, 0.16, 0.11, 0.1, '#1565c0');
    k.add(box('#8d1c1c', 0, -0.12, 0.155, 0.22, 0.06, 0.01), box('#ffffff', -0.04, -0.09, 0.16, 0.05, 0.05, 0.01), box('#ffffff', 0.04, -0.09, 0.16, 0.05, 0.05, 0.01));
    k.add(box('#ffffff', 0, -0.36, 0, 0.6, 0.1, 0.3), box('#6d4c41', 0, -0.47, 0, 0.6, 0.12, 0.3), box('#e53935', 0, -0.36, 0.16, 0.06, 0.1, 0.01));
    k.position.y = 0.82; g.add(k);
    const beinL = gruppe(box('#fff176', 0, -0.12, 0, 0.06, 0.25, 0.06), box('#111', 0, -0.27, 0.04, 0.12, 0.07, 0.18)), beinR = beinL.clone();
    beinL.position.set(-0.12, 0.3, 0); beinR.position.set(0.12, 0.3, 0); g.add(beinL, beinR);
    const armL = gruppe(box('#fff176', 0, -0.15, 0, 0.05, 0.3, 0.05)), armR = armL.clone();
    armL.position.set(-0.33, 0.85, 0); armR.position.set(0.33, 0.85, 0); g.add(armL, armR);
    g.userData = { kopf: k, beinL, beinR, armL, armR };
    return g;
  },
  batman() {
    const g = chibi({ haut: '#455a64', koerper: '#546e7a', arm: '#546e7a', hose: '#37474f', hand: '#212121', schuh: '#212121', ohneAugen: 1, guertel: '#fbc02d' });
    const k = g.userData.kopf;
    k.add(kugel('#263238', 0, 0.06, -0.02, 0.37, 0.33, 0.35), kugel('#ffe0bd', 0, -0.17, 0.2, 0.2, 0.12, 0.13));
    k.add(dreh(kegel('#263238', -0.17, 0.42, 0, 0.06, 0.25), 0, 0, 0.15), dreh(kegel('#263238', 0.17, 0.42, 0, 0.06, 0.25), 0, 0, -0.15));
    k.add(box('#ffffff', -0.1, 0.04, 0.32, 0.1, 0.035, 0.02, { leucht: 1 }), box('#ffffff', 0.1, 0.04, 0.32, 0.1, 0.035, 0.02, { leucht: 1 }));
    g.userData.koerper.add(kugel('#fbc02d', 0, 0.08, 0.22, 0.12, 0.06, 0.02), box('#111', 0, 0.08, 0.235, 0.14, 0.03, 0.01));
    const umhang = kegelstumpf('#212121', 0, 0.55, -0.12, 0.18, 0.55, 0.85); umhang.scale.z = 0.25; g.add(umhang);
    return g;
  },
  bowser() {
    const g = chibi({ haut: '#fdd835', koerper: '#ffe082', arm: '#fdd835', hose: '#fdd835', schuh: '#ffb74d', breit: 1.5, augen: '#b71c1c', kopf: 1.05 });
    const k = g.userData.kopf;
    k.add(kugel('#ff7043', 0, 0.2, -0.08, 0.3, 0.2, 0.3), box('#fdd835', 0, -0.1, 0.28, 0.32, 0.18, 0.22));
    for (let i = 0; i < 4; i++) k.add(dreh(kegel('#ff7043', 0, 0.3 - i * 0.07, -0.18 - i * 0.07, 0.06, 0.18), -0.9));
    k.add(dreh(kegel('#fff8e1', -0.24, 0.3, 0, 0.06, 0.28), 0, 0, 0.6), dreh(kegel('#fff8e1', 0.24, 0.3, 0, 0.06, 0.28), 0, 0, -0.6));
    const panzer = gruppe(kugel('#2e7d32', 0, 0, 0, 0.42, 0.44, 0.3), zyl('#fff8e1', 0, 0, 0, 0.43, 0.05));
    for (let i = 0; i < 6; i++) { const w = i / 6 * Math.PI * 2; panzer.add(dreh(kegel('#fff8e1', Math.cos(w) * 0.2, Math.sin(w) * 0.2, -0.22, 0.05, 0.16), -Math.PI / 2)); }
    panzer.position.set(0, 0.62, -0.18); g.add(panzer);
    for (const a of [g.userData.armL, g.userData.armR]) a.add(zyl('#212121', 0, -0.1, 0, 0.11, 0.06));
    return g;
  },
  dk() {
    const g = chibi({ haut: '#6d4c41', koerper: '#5d4037', arm: '#5d4037', hose: '#5d4037', schuh: '#4e342e', hand: '#bcaaa4', breit: 1.5, augen: '#3e2723' });
    const k = g.userData.kopf;
    k.add(kugel('#bcaaa4', 0, -0.08, 0.2, 0.26, 0.18, 0.16), kugel('#3e2723', 0, 0.2, 0, 0.32, 0.12, 0.3), kugel('#bcaaa4', -0.12, 0.08, 0.24, 0.1, 0.12, 0.06), kugel('#bcaaa4', 0.12, 0.08, 0.24, 0.1, 0.12, 0.06));
    g.userData.koerper.add(box('#e53935', -0.08, 0.02, 0.2, 0.18, 0.18, 0.04), box('#fdd835', -0.08, 0.02, 0.22, 0.06, 0.08, 0.01));
    for (const a of [g.userData.armL, g.userData.armR]) a.scale.set(1.4, 1.35, 1.4);
    const fass = gruppe(zyl('#8d6e63', 0, 0, 0, 0.2, 0.3), zyl('#424242', 0, 0.1, 0, 0.21, 0.03), zyl('#424242', 0, -0.1, 0, 0.21, 0.03));
    fass.position.set(0, -0.35, 0.1); fass.rotation.z = Math.PI / 2; g.userData.armR.add(fass);
    return g;
  },
  harry() {
    const g = chibi({ haut: '#ffe0bd', koerper: '#212121', arm: '#212121', hose: '#424242', schuh: '#212121', guertel: '#b71c1c', augen: '#2e7d32' });
    const k = g.userData.kopf;
    k.add(kugel('#3e2723', 0, 0.13, -0.03, 0.37, 0.25, 0.34), box('#3e2723', 0, 0.22, 0.2, 0.36, 0.08, 0.12));
    for (const sx of [-1, 1]) k.add(dreh(new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.012, 6, 16), M('#111')), 0, 0, 0)).children.at(-1).position.set(sx * 0.12, 0.02, 0.33);
    k.add(box('#111', 0, 0.02, 0.33, 0.06, 0.012, 0.012), box('#b71c1c', 0.08, 0.17, 0.3, 0.02, 0.07, 0.01));
    g.userData.koerper.add(box('#b71c1c', 0, 0.16, 0.2, 0.06, 0.12, 0.03), box('#fbc02d', 0, 0.1, 0.205, 0.06, 0.03, 0.03));
    const stab = gruppe(zyl('#5d4037', 0, 0.2, 0, 0.02, 0.4), kugel('#ff8a80', 0, 0.42, 0, 0.05, 0.05, 0.05, { leucht: 1 }));
    stab.position.set(0, -0.32, 0.05); stab.rotation.x = 1.2; g.userData.armR.add(stab);
    return g;
  },
  yoda() {
    const g = chibi({ haut: '#9ccc65', koerper: '#a1887f', arm: '#a1887f', hose: '#8d6e63', schuh: '#6d4c41', augen: '#3e2723', kopf: 1.1 });
    const k = g.userData.kopf;
    for (const sx of [-1, 1]) { const ohr = kegel('#9ccc65', sx * 0.48, 0.05, -0.02, 0.12, 0.5); ohr.rotation.z = -sx * Math.PI / 2.2; ohr.scale.z = 0.05; k.add(ohr); }
    k.add(kugel('#e0e0e0', 0, 0.3, -0.05, 0.12, 0.05, 0.12));
    g.userData.koerper.add(kegelstumpf('#8d6e63', 0, -0.2, 0, 0.25, 0.38, 0.4));
    const stock = gruppe(zyl('#6d4c41', 0, 0.1, 0, 0.025, 0.8));
    stock.position.set(0, -0.3, 0.05); g.userData.armL.add(stock);
    return g;
  },
  chief() {
    const g = chibi({ haut: '#558b2f', koerper: '#689f38', arm: '#558b2f', hose: '#558b2f', schuh: '#33691e', hand: '#263238', ohneAugen: 1, breit: 1.2, guertel: '#37474f' });
    const k = g.userData.kopf;
    k.add(kugel('#689f38', 0, 0, 0, 0.37, 0.35, 0.35, { glanz: 1 }), kugel('#ffb300', 0, 0.0, 0.2, 0.26, 0.13, 0.18, { glanz: 1 }));
    g.userData.koerper.add(box('#455a64', 0, 0.06, 0.18, 0.4, 0.22, 0.1));
    const gewehr = gruppe(box('#37474f', 0, 0, 0.15, 0.08, 0.12, 0.55), box('#263238', 0, -0.1, 0.05, 0.06, 0.14, 0.08));
    gewehr.position.set(0, -0.32, 0.05); g.userData.armR.add(gewehr);
    g.userData.armR.rotation.x = -1.1; g.userData.armL.rotation.x = -1.0;
    return g;
  },
  homer() {
    const g = chibi({ haut: '#fdd835', koerper: '#ffffff', arm: '#ffffff', hose: '#1e88e5', schuh: '#424242', breit: 1.45, augen: '#111' });
    const k = g.userData.kopf;
    k.add(kugel('#a1887f', 0, -0.17, 0.12, 0.27, 0.15, 0.24), kugel('#fdd835', 0, -0.03, 0.34, 0.07, 0.06, 0.08));
    k.add(dreh(new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.01, 4, 12, Math.PI), M('#3e2723')), 0, 0, 0)).children.at(-1).position.set(0, 0.36, 0);
    const donut = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.05, 8, 16), M('#f06292')); donut.position.set(0, -0.32, 0.05); donut.rotation.x = Math.PI / 2;
    g.userData.armR.add(donut);
    return g;
  },
  kratos() {
    const g = chibi({ haut: '#eceff1', koerper: '#eceff1', arm: '#eceff1', hose: '#5d4037', schuh: '#3e2723', breit: 1.35, augen: '#ffb300', guertel: '#8d6e63' });
    const k = g.userData.kopf;
    k.add(kugel('#4e342e', 0, -0.2, 0.18, 0.26, 0.16, 0.15), box('#b71c1c', 0.2, 0.08, 0.27, 0.03, 0.3, 0.02), box('#b71c1c', 0, 0.2, 0.25, 0.03, 0.25, 0.08));
    g.userData.koerper.add(box('#b71c1c', 0.08, 0.05, 0.22, 0.06, 0.4, 0.02));
    const axt = gruppe(zyl('#5d4037', 0, 0.15, 0, 0.03, 0.6), box('#b0bec5', 0.12, 0.42, 0, 0.26, 0.22, 0.04, { glanz: 1 }), box('#4fc3f7', 0.0, 0.34, 0, 0.04, 0.06, 0.05, { leucht: 1 }));
    axt.position.set(0, -0.32, 0.05); axt.rotation.x = 1.2; g.userData.armR.add(axt);
    return g;
  },
  groot() {
    const g = chibi({ haut: '#8d6e63', koerper: '#795548', arm: '#795548', hose: '#6d4c41', schuh: '#5d4037', breit: 1.3, augen: '#3e2723' });
    const k = g.userData.kopf;
    for (let i = 0; i < 6; i++) { const w = i / 6 * Math.PI * 2; k.add(dreh(kegel('#6d4c41', Math.cos(w) * 0.18, 0.32, Math.sin(w) * 0.18, 0.05, 0.25), Math.sin(w) * 0.4, 0, -Math.cos(w) * 0.4)); }
    k.add(kugel('#66bb6a', 0.2, 0.38, 0.05, 0.1, 0.06, 0.08), kugel('#66bb6a', -0.15, 0.4, -0.1, 0.08, 0.05, 0.07));
    for (let i = 0; i < 5; i++) g.userData.koerper.add(box('#5d4037', -0.2 + i * 0.1, 0, 0.2, 0.025, 0.5, 0.02));
    for (const a of [g.userData.armL, g.userData.armR]) a.scale.set(1, 1.5, 1);
    return g;
  },
  babygroot() {
    const g = chibi({ haut: '#a1887f', koerper: '#8d6e63', hose: '#795548', schuh: '#6d4c41', kopf: 1.2, augen: '#3e2723' });
    g.userData.kopf.add(kugel('#66bb6a', 0.12, 0.4, 0, 0.1, 0.05, 0.08), dreh(kegel('#795548', 0, 0.38, 0, 0.04, 0.2), 0, 0, 0.3));
    return g;
  },
  senzu() {
    const g = new THREE.Group();
    for (const [x, y, rz] of [[0, 0.9, 0.3], [-0.3, 0.6, -0.6], [0.32, 0.55, 1.2]]) { const b = kugel('#aed581', x, y, 0, 0.32, 0.2, 0.2, { glanz: 1 }); b.rotation.z = rz; g.add(b); }
    g.add(kugel('#e8f5e9', 0.1, 1.0, 0.15, 0.05, 0.05, 0.03, { leucht: 1 }));
    return g;
  },
  panzer() {
    const g = gruppe(kugel('#2979ff', 0, 0.8, 0, 0.55, 0.4, 0.55, { glanz: 1 }), zyl('#ffffff', 0, 0.55, 0, 0.6, 0.12));
    for (let i = 0; i < 6; i++) { const w = i / 6 * Math.PI * 2; g.add(dreh(kegel('#ffffff', Math.cos(w) * 0.32, 0.95, Math.sin(w) * 0.32, 0.08, 0.25), Math.sin(w) * 0.6, 0, -Math.cos(w) * 0.6)); }
    g.add(kegel('#ffffff', 0, 1.3, 0, 0.09, 0.25));
    for (const s of [-1, 1]) { const f = kugel('#ffffff', s * 0.6, 0.85, 0, 0.3, 0.12, 0.05); f.rotation.z = s * 0.4; g.add(f); }
    return g;
  },
  // Zauber-Symbole (nur für Kartenbilder)
  thor() {
    const g = gruppe(box('#90a4ae', 0, 1.0, 0, 0.75, 0.42, 0.42, { glanz: 1 }), box('#607d8b', 0, 1.0, 0, 0.77, 0.12, 0.44), zyl('#6d4c41', 0, 0.45, 0, 0.07, 0.75), zyl('#4e342e', 0, 0.2, 0, 0.08, 0.2));
    g.rotation.z = 0.4; return g;
  },
  hadouken() {
    return gruppe(kugel('#e1f5fe', 0, 0.9, 0, 0.3, 0.3, 0.3, { leucht: 1 }), kugel('#29b6f6', 0, 0.9, 0, 0.48, 0.48, 0.48, { leucht: 1, alpha: 0.55 }), kugel('#0277bd', 0, 0.9, -0.3, 0.42, 0.3, 0.55, { leucht: 1, alpha: 0.35 }));
  },
  pilz() {
    const g = gruppe(zyl('#fff3e0', 0, 0.45, 0, 0.25, 0.55), kugel('#e53935', 0, 0.85, 0, 0.55, 0.38, 0.55), kugel('#ffffff', 0, 1.18, 0.1, 0.16, 0.1, 0.16), kugel('#ffffff', 0.38, 0.95, 0.2, 0.12, 0.12, 0.12), kugel('#ffffff', -0.38, 0.95, 0.2, 0.12, 0.12, 0.12));
    g.add(box('#111', -0.08, 0.5, 0.25, 0.04, 0.12, 0.02), box('#111', 0.08, 0.5, 0.25, 0.04, 0.12, 0.02));
    return g;
  },
  elsa() {
    const g = new THREE.Group(), oct = new THREE.OctahedronGeometry(1);
    const m = new THREE.MeshLambertMaterial({ color: '#b3e5fc', emissive: '#4fc3f7', emissiveIntensity: 0.4, transparent: true, opacity: 0.9 });
    for (const [x, y, s] of [[0, 0.9, 0.45], [0.42, 0.6, 0.25], [-0.4, 0.65, 0.28], [0.15, 1.35, 0.2]]) { const o = new THREE.Mesh(oct, m); o.position.set(x, y, 0); o.scale.set(s * 0.7, s * 1.3, s * 0.7); g.add(o); }
    return g;
  },
  snap() {
    const gold = '#ffb300', g = gruppe(box(gold, 0, 0.75, 0, 0.5, 0.55, 0.22, { glanz: 1 }), zyl(gold, 0, 0.35, 0, 0.22, 0.4));
    for (let i = 0; i < 4; i++) g.add(box(gold, -0.18 + i * 0.12, 1.17, 0, 0.09, 0.32, 0.12, { glanz: 1 }));
    g.add(dreh(box(gold, 0.32, 0.9, 0, 0.09, 0.3, 0.12), 0, 0, -0.6));
    ['#e53935', '#1e88e5', '#8e24aa', '#43a047', '#fdd835'].forEach((c, i) => g.add(kugel(c, -0.18 + i * 0.09 + (i === 4 ? 0.0 : 0), i === 4 ? 0.75 : 1.08, 0.12, 0.04, 0.04, 0.03, { leucht: 1 })));
    g.add(kugel('#ff9800', 0, 0.72, 0.12, 0.08, 0.08, 0.04, { leucht: 1 }));
    return g;
  }
};
// Truhen (für Menü und Öffnen)
function truhe(holz, beschlag, edel) {
  const g = new THREE.Group();
  g.add(box(holz, 0, 0.4, 0, 1.4, 0.8, 0.95, { glanz: edel }));
  const deckel = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 1.4, 20, 1, false, 0, Math.PI), M(holz, { glanz: edel }));
  deckel.rotation.z = Math.PI / 2; deckel.position.y = 0.8; deckel.castShadow = true; g.add(deckel);
  for (const x of [-0.55, 0, 0.55]) {
    g.add(box(beschlag, x, 0.4, 0, 0.14, 0.84, 0.99, { glanz: 1 }));
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.14, 20, 1, false, 0, Math.PI), M(beschlag, { glanz: 1 })); b.rotation.z = Math.PI / 2; b.position.set(x, 0.8, 0); g.add(b);
  }
  g.add(box(beschlag, 0, 0.78, 0.5, 0.26, 0.32, 0.08, { glanz: 1 }), box('#212121', 0, 0.74, 0.55, 0.06, 0.1, 0.02));
  if (edel) g.add(kugel(edel, 0, 0.95, 0.52, 0.09, 0.09, 0.05, { leucht: 1 }));
  return g;
}
Object.assign(FIGUREN, {
  truhe_holz: () => truhe('#8d6e63', '#5d4037'),
  truhe_silber: () => truhe('#78909c', '#cfd8dc', null),
  truhe_gold: () => truhe('#ffb300', '#fff59d', '#ff7043'),
  truhe_magisch: () => truhe('#7b1fa2', '#ffca28', '#e040fb'),
  truhe_legendaer: () => truhe('#00bcd4', '#ffffff', '#ffeb3b')
});
function zylGeoTeil(col, x, y, z, o, u, h) { return kegelstumpf(col, x, y, z, o, u, h); }

/* Turm-Figuren */
function prinzessin(farbe) {
  const g = chibi({ haut: '#ffe0bd', koerper: farbe, hose: farbe, schuh: '#5d4037', augen: '#5d4037' });
  g.userData.koerper.add(kegelstumpf(farbe, 0, -0.2, 0, 0.22, 0.38, 0.4));
  g.userData.kopf.add(kugel('#ff8a65', 0, 0.1, -0.05, 0.37, 0.28, 0.34), box('#ff8a65', 0, -0.12, -0.22, 0.36, 0.42, 0.1));
  g.userData.kopf.add(zyl('#ffd54f', 0, 0.33, 0, 0.12, 0.08), kugel('#e91e63', 0, 0.36, 0.12, 0.03, 0.03, 0.02, { leucht: 1 }));
  const bogen = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.025, 6, 18, Math.PI), M('#8d6e63'));
  bogen.rotation.set(0, Math.PI / 2, Math.PI / 2); bogen.position.set(0, -0.3, 0.06); g.userData.armL.add(bogen);
  return g;
}
function koenig(farbe) {
  const g = chibi({ haut: '#ffe0bd', koerper: farbe, hose: farbe, schuh: '#4e342e', breit: 1.3, augen: '#3e2723', kopf: 1.1 });
  const k = g.userData.kopf;
  k.add(kugel('#8d6e63', 0, -0.2, 0.2, 0.28, 0.2, 0.15), box('#8d6e63', 0, -0.06, 0.34, 0.26, 0.05, 0.04));
  const krone = gruppe(zyl('#ffc107', 0, 0, 0, 0.27, 0.14, { glanz: 1 }));
  for (let i = 0; i < 5; i++) { const w = i / 5 * Math.PI * 2; krone.add(kegel('#ffc107', Math.cos(w) * 0.24, 0.14, Math.sin(w) * 0.24, 0.06, 0.16, { glanz: 1 })); }
  krone.add(kugel('#e53935', 0, 0.02, 0.27, 0.04, 0.04, 0.02, { leucht: 1 }));
  krone.position.y = 0.36; k.add(krone);
  g.userData.koerper.add(kugel('#ffffff', 0, 0.2, 0, 0.32, 0.08, 0.26));
  const schwert = gruppe(box('#ffc107', 0, 0, 0, 0.16, 0.04, 0.05), box('#e0e0e0', 0, 0.32, 0, 0.06, 0.55, 0.02, { glanz: 1 }));
  schwert.position.set(0, -0.3, 0.05); schwert.rotation.x = 0.4; g.userData.armR.add(schwert);
  return g;
}

function turmModell(art, farbe) {
  const g = new THREE.Group(), koenigT = art === 'king', b = koenigT ? 3.5 : 2.7, h = koenigT ? 2.2 : 2.6;
  const stein = '#9aa0aa', hell = '#b9bec8', dunkel = '#767c87';
  g.add(box(dunkel, 0, 0.12, 0, b + 0.3, 0.24, b + 0.3));
  const rumpf = box(stein, 0, h / 2, 0, b, h, b); rumpf.receiveShadow = true; g.add(rumpf);
  for (let i = 0; i < 4; i++) g.add(box(i % 2 ? hell : dunkel, 0, 0.5 + i * 0.5, b / 2 + 0.01, b * (0.3 + (i % 2) * 0.2), 0.08, 0.02));
  g.add(box(hell, 0, h + 0.08, 0, b + 0.2, 0.16, b + 0.2));
  const n = koenigT ? 5 : 4;
  for (let i = 0; i < n; i++) for (const s of [-1, 1]) {
    const p = -b / 2 + (i + 0.5) * b / n;
    g.add(box(hell, p, h + 0.38, s * (b / 2 + 0.02), 0.34, 0.42, 0.28), box(hell, s * (b / 2 + 0.02), h + 0.38, p, 0.28, 0.42, 0.34));
  }
  // Teamfarbe: Banner vorne und Fahne
  g.add(box(farbe, 0, h * 0.62, b / 2 + 0.04, b * 0.42, h * 0.5, 0.04), kegel(farbe, 0, h * 0.35, b / 2 + 0.04, b * 0.21, 0.3));
  g.children[g.children.length - 1].rotation.x = Math.PI; g.children[g.children.length - 1].scale.z = 0.05;
  g.add(box(farbe, -b / 2 + 0.2, h + 1.6, -b / 2 + 0.2, 0.04, 0.0, 0.04));
  g.add(zyl('#6d4c41', -b / 2 + 0.2, h + 0.9, -b / 2 + 0.2, 0.04, 1.6), box(farbe, -b / 2 + 0.55, h + 1.45, -b / 2 + 0.2, 0.7, 0.42, 0.03));
  if (koenigT) {
    const kanone = gruppe(zyl('#37474f', 0, 0, 0, 0.42, 0.3), dreh(zyl('#263238', 0, 0.2, 0.45, 0.18, 0.9), Math.PI / 2 - 0.15));
    kanone.position.set(0, h + 0.3, 0.6);
    g.add(kanone);
    g.userData.kanone = kanone;
  }
  const figur = koenigT ? koenig(farbe) : prinzessin(farbe);
  figur.position.set(0, h + 0.16, koenigT ? -0.7 : 0); if (koenigT) figur.scale.setScalar(1.9); else figur.scale.setScalar(1.6);
  g.add(figur);
  g.userData.figur = figur; g.userData.hoehe = h + (koenigT ? 2.7 : 2.3);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}
function truemmer() {
  const g = new THREE.Group();
  for (let i = 0; i < 12; i++) { const s = 0.3 + Math.random() * 0.5; const m = box(i % 3 ? '#8a8f99' : '#6f747d', (Math.random() - 0.5) * 2.4, s / 2, (Math.random() - 0.5) * 2.4, s, s * 0.7, s); m.rotation.y = Math.random() * 3; g.add(m); }
  g.add(dreh(teil(GEO.scheibe, '#4a4038', 0, 0.02, 0, 1.6, 1.6, 1), -Math.PI / 2));
  return g;
}

/* ---------- Szene ---------- */
const S = {};
export function init(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
  S.r = r;
  S.szene = new THREE.Scene();
  S.szene.background = new THREE.Color('#8fd0ff');
  S.szene.fog = new THREE.Fog('#8fd0ff', 55, 110);
  S.kamera = new THREE.PerspectiveCamera(36, 1, 0.5, 200);
  S.szene.add(new THREE.HemisphereLight('#e8f4ff', '#5a7a3a', 1.25));
  const sonne = new THREE.DirectionalLight('#fff3dc', 2.2);
  sonne.position.set(-14, 30, 12); sonne.castShadow = true;
  sonne.shadow.mapSize.set(2048, 2048);
  Object.assign(sonne.shadow.camera, { left: -20, right: 20, top: 24, bottom: -24, near: 1, far: 80 });
  sonne.shadow.bias = -0.0008; sonne.shadow.normalBias = 0.02;
  S.szene.add(sonne);
  S.ray = new THREE.Raycaster(); S.boden = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  S.objekte = new Map(); S.geschosse = []; S.zonen = []; S.partikel = []; S.blitze = [];
  S.arenaGruppe = new THREE.Group(); S.szene.add(S.arenaGruppe);
  S.einheiten = new THREE.Group(); S.szene.add(S.einheiten);
  S.zeit = 0; S.modus = 'menu'; S.team = 0; S.arena = -1;
  S.vorschau = new THREE.Group(); S.szene.add(S.vorschau); S.vorschau.visible = false;
  S.sperre = new THREE.Group(); S.szene.add(S.sperre);
  arenaBauen(0);
}

function grasTextur(arena) {
  const ar = ARENEN[arena], k = 32, c = document.createElement('canvas'); c.width = W * k; c.height = H * k;
  const g = c.getContext('2d');
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { g.fillStyle = ar.gras[(x + y) % 2]; g.fillRect(x * k, y * k, k, k); }
  // feine Grashalme
  for (let i = 0; i < 3000; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.05)'; g.fillRect(Math.random() * c.width, Math.random() * c.height, 2, 3); }
  // Wege
  g.fillStyle = 'rgba(222,190,130,.85)';
  const weg = (x, y, w, h) => { g.beginPath(); g.roundRect(x * k, y * k, w * k, h * k, k * 0.4); g.fill(); };
  for (const bx of [3.5, 14.5]) { weg(bx - 0.75, 6.5, 1.5, 6.6); weg(bx - 0.75, 18.9, 1.5, 6.6); }
  weg(3.5, 2.6, 11, 1.4); weg(3.5, 28, 11, 1.4); weg(2.75, 2.6, 1.5, 4.5); weg(13.75, 2.6, 1.5, 4.5); weg(2.75, 25, 1.5, 4.4); weg(13.75, 25, 1.5, 4.4);
  // Ufer
  g.fillStyle = '#6b5236'; g.fillRect(0, 14.7 * k, c.width, 2.6 * k);
  g.fillStyle = '#2b6fa8'; g.fillRect(0, 15 * k, c.width, 2 * k);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function wasserTextur() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d');
  const v = g.createLinearGradient(0, 0, 0, 64); v.addColorStop(0, '#3fa9f0'); v.addColorStop(0.5, '#66c6ff'); v.addColorStop(1, '#3a9be0');
  g.fillStyle = v; g.fillRect(0, 0, 256, 64);
  g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 3;
  for (let i = 0; i < 14; i++) { const x = Math.random() * 256, y = 8 + Math.random() * 48; g.beginPath(); g.arc(x, y, 9, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 1); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function baum(x, z, s, farbe) {
  const g = gruppe(zyl('#6d4c41', 0, 0.6, 0, 0.18, 1.2), kegel(farbe, 0, 1.6, 0, 0.9, 1.4), kegel(farbe, 0, 2.4, 0, 0.7, 1.2), kegel(farbe, 0, 3.1, 0, 0.45, 0.9));
  g.position.set(x, 0, z); g.scale.setScalar(s); g.rotation.y = Math.random() * 6; return g;
}
function busch(x, z, s, farbe) { const g = gruppe(kugel(farbe, 0, 0.35, 0, 0.6, 0.45, 0.6), kugel(farbe, 0.45, 0.3, 0.1, 0.45, 0.35, 0.45), kugel(farbe, -0.4, 0.28, -0.1, 0.4, 0.3, 0.4)); g.position.set(x, 0, z); g.scale.setScalar(s); return g; }
function stein(x, z, s) { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), M('#9e9e9e')); m.position.set(x, s * 0.4, z); m.scale.set(s, s * 0.7, s); m.rotation.set(Math.random(), Math.random() * 3, 0); m.castShadow = true; return m; }

function arenaBauen(arena) {
  if (S.arena === arena) return;
  S.arena = arena;
  const g = S.arenaGruppe; g.clear();
  const ar = ARENEN[arena];
  const dekor = [['#2e7d32', '#43a047'], ['#a1887f', '#8d6e63'], ['#1b5e20', '#2e7d32'], ['#546e7a', '#78909c'], ['#388e3c', '#66bb6a'], ['#4527a0', '#7e57c2']][arena];
  S.szene.background.set(['#8fd0ff', '#f2c58f', '#9ccfe8', '#9fb7d6', '#a6e3ff', '#2b1f5c'][arena]);
  S.szene.fog.color.copy(S.szene.background);
  // Außenboden
  const aussen = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.MeshLambertMaterial({ color: new THREE.Color(dekor[1]).multiplyScalar(0.8) }));
  aussen.rotation.x = -Math.PI / 2; aussen.position.y = -0.62; aussen.receiveShadow = true; g.add(aussen);
  // Spielfeld als erhöhte Plattform
  const sockel = box('#7a6a55', 0, -0.32, 0, W + 1.6, 0.6, H + 1.6); sockel.receiveShadow = true; g.add(sockel);
  const feld = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshLambertMaterial({ map: grasTextur(arena) }));
  feld.rotation.x = -Math.PI / 2; feld.receiveShadow = true; g.add(feld);
  // Randmauer
  for (const s of [-1, 1]) {
    g.add(box('#a1a6b0', s * (W / 2 + 0.45), 0.2, 0, 0.7, 0.9, H + 1.6), box('#a1a6b0', 0, 0.2, s * (H / 2 + 0.45), W + 1.6, 0.9, 0.7));
    for (let i = 0; i < 17; i++) g.add(box('#bfc4cc', s * (W / 2 + 0.45), 0.8, -H / 2 + 1 + i * 1.88, 0.75, 0.35, 0.9));
    for (let i = 0; i < 10; i++) g.add(box('#bfc4cc', -W / 2 + 0.5 + i * 1.9, 0.8, s * (H / 2 + 0.45), 0.9, 0.35, 0.75));
  }
  // Fluss
  S.wasserTex = wasserTextur();
  const wasser = new THREE.Mesh(new THREE.PlaneGeometry(W + 1.6, 2), new THREE.MeshLambertMaterial({ map: S.wasserTex, transparent: true, opacity: 0.92, emissive: '#1a6fb5', emissiveIntensity: 0.25 }));
  wasser.rotation.x = -Math.PI / 2; wasser.position.y = 0.03; g.add(wasser);
  // Brücken
  for (const bx of [3.5, 14.5]) {
    const br = new THREE.Group();
    br.add(box('#7b4f27', 0, 0.06, 0, 2.3, 0.14, 3.0));
    for (let i = 0; i < 7; i++) br.add(box(i % 2 ? '#a8703c' : '#b97d45', 0, 0.16, -1.35 + i * 0.45, 2.1, 0.08, 0.38));
    for (const s of [-1, 1]) { br.add(box('#5d3a1a', s * 1.1, 0.42, 0, 0.12, 0.12, 3.0)); for (let i = 0; i < 4; i++) br.add(box('#5d3a1a', s * 1.1, 0.25, -1.4 + i * 0.93, 0.14, 0.42, 0.14)); }
    br.position.set(wx(bx), 0, 0); br.traverse(o => { if (o.isMesh) o.receiveShadow = true; });
    g.add(br);
  }
  // Deko rundherum
  const zufall = (a, b) => a + Math.random() * (b - a);
  for (let i = 0; i < 46; i++) {
    const seite = i % 2 ? 1 : -1, x = seite * zufall(W / 2 + 2.5, W / 2 + 14), z = zufall(-H / 2 - 6, H / 2 + 6);
    g.add(Math.random() < 0.6 ? baum(x, z, zufall(0.8, 1.5), dekor[i % 2]) : busch(x, z, zufall(0.8, 1.4), dekor[1]));
  }
  for (let i = 0; i < 20; i++) { const s = i % 2 ? 1 : -1; g.add(stein(zufall(-W / 2 - 8, W / 2 + 8), s * zufall(H / 2 + 2.5, H / 2 + 10), zufall(0.4, 1.1))); }
  for (let i = 0; i < 14; i++) { const s = i % 2 ? 1 : -1; g.add(baum(zufall(-W / 2 - 4, W / 2 + 4), s * zufall(H / 2 + 3, H / 2 + 12), zufall(0.9, 1.6), dekor[0])); }
  // Arena-Wahrzeichen am Rand
  const mark = kugel('#ffffff', 0, 0, 0, 0.01); g.add(mark);
}

/* ---------- Kamera ---------- */
let bereich = { oben: 0, unten: 0 };
export function groesse(oben, unten, rechts) {
  const c = S.r.domElement, w = c.clientWidth, h = c.clientHeight;
  if (!w || !h) return;
  S.r.setSize(w, h, false);
  bereich = { oben: oben || 0, unten: unten || 0, rechts: rechts || 0, w, h };
  kameraSetzen();
}
function kameraSetzen() {
  const { w, h, oben, unten, rechts } = bereich; if (!w) return;
  const k = S.kamera;
  if (S.modus === 'kampf') {
    const rh = Math.max(100, h - oben - unten), rw = Math.max(100, w - rechts);
    k.aspect = rw / rh; k.fov = 36; k.clearViewOffset();
    // Breite Bildschirme (iPad quer): flacher schauen, dann wird das Feld größer
    const quer = rw / rh > 0.75;
    const s = S.team === 1 ? -1 : 1, neig = (quer ? 50 : 62) * Math.PI / 180, ziel = new THREE.Vector3(0, 0, s * (quer ? 2.2 : 1.2));
    const richtung = new THREE.Vector3(0, Math.sin(neig), s * Math.cos(neig));
    const ecken = [[-9.3, -16.3], [9.3, -16.3], [-9.3, 16.3], [9.3, 16.3]].map(([x, z]) => new THREE.Vector3(x, 0, z)).concat([new THREE.Vector3(0, 3, -s * 14)]);
    let d = 20;
    for (; d < 120; d += 0.5) {
      k.position.copy(ziel).addScaledVector(richtung, d); k.lookAt(ziel); k.updateMatrixWorld(); k.updateProjectionMatrix();
      if (ecken.every(p => { const v = p.clone().project(k); return Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1; })) break;
    }
    k.setViewOffset(rw, rh, 0, -oben, w, h);
    k.updateProjectionMatrix();
  } else { k.aspect = w / h; k.fov = 45; k.clearViewOffset(); k.updateProjectionMatrix(); }
}
export function modus(m, team, arena) {
  S.modus = m; S.team = team || 0;
  if (arena != null) arenaBauen(arena);
  if (m !== 'kampf') leeren();
  kameraSetzen();
}
function leeren() {
  for (const o of S.objekte.values()) S.einheiten.remove(o.g);
  S.objekte.clear();
  for (const p of S.partikel) S.szene.remove(p.m); S.partikel = [];
  for (const b of S.blitze) S.szene.remove(b.m); S.blitze = [];
  if (S.modus !== 'kampf') menuTuerme();
}
function menuTuerme() {
  for (const [t, x, y] of [[0, 9, 29], [0, 3.5, 25.5], [0, 14.5, 25.5], [1, 9, 3], [1, 3.5, 6.5], [1, 14.5, 6.5]]) {
    const art = y === 29 || y === 3 ? 'king' : 'princess';
    const g = turmModell(art, t ? '#e5393b' : '#2f7bf6'); g.position.set(wx(x), 0, wz(y)); if (t) g.rotation.y = Math.PI;
    S.einheiten.add(g); S.objekte.set('m' + t + x, { g, menu: 1 });
  }
}

/* Bildschirmpunkt -> Arena-Koordinaten */
export function arenaPunkt(cx, cy) {
  const c = S.r.domElement.getBoundingClientRect();
  const v = new THREE.Vector2((cx - c.left) / c.width * 2 - 1, -((cy - c.top) / c.height) * 2 + 1);
  S.ray.setFromCamera(v, S.kamera);
  const p = new THREE.Vector3();
  if (!S.ray.ray.intersectPlane(S.boden, p)) return null;
  const x = p.x + W / 2, y = p.z + H / 2;
  if (x < 0 || x > W || y < 0 || y > H) return null;
  return { x, y };
}
export function bildschirmPunkt(x, y, hoehe) {
  const v = new THREE.Vector3(wx(x), hoehe || 0, wz(y)).project(S.kamera), c = S.r.domElement;
  return { x: (v.x + 1) / 2 * c.clientWidth, y: (1 - v.y) / 2 * c.clientHeight };
}

/* ---------- Lebensbalken ---------- */
const balkenTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 4; c.getContext('2d').fillStyle = '#fff'; c.getContext('2d').fillRect(0, 0, 4, 4); return new THREE.CanvasTexture(c); })();
function balken(breite, mein) {
  const g = new THREE.Group();
  const bg = new THREE.Sprite(new THREE.SpriteMaterial({ map: balkenTex, color: '#1a1a1a', depthTest: false, depthWrite: false }));
  bg.scale.set(breite + 0.08, 0.2, 1); bg.renderOrder = 10;
  const fill = new THREE.Sprite(new THREE.SpriteMaterial({ map: balkenTex, color: mein ? '#3d9bff' : '#ff4a4a', depthTest: false, depthWrite: false }));
  fill.center.set(0, 0.5); fill.position.x = -breite / 2; fill.scale.set(breite, 0.13, 1); fill.renderOrder = 11;
  g.add(bg, fill); g.userData = { fill, breite };
  return g;
}
function turmSchild(mein) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 72;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, depthWrite: false })); s.renderOrder = 12;
  s.scale.set(3.2, 0.9, 1);
  s.userData = { c, t, mein, wert: -1 };
  return s;
}
function schildMalen(s, hp, max) {
  const wert = Math.ceil(hp); if (s.userData.wert === wert) return; s.userData.wert = wert;
  const { c, t, mein } = s.userData, g = c.getContext('2d');
  g.clearRect(0, 0, 256, 72);
  g.fillStyle = 'rgba(0,0,0,.75)'; g.beginPath(); g.roundRect(8, 30, 240, 30, 10); g.fill();
  g.fillStyle = mein ? '#3d9bff' : '#ff4a4a'; g.beginPath(); g.roundRect(12, 34, Math.max(0, 232 * hp / max), 22, 8); g.fill();
  g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(14, 35, Math.max(0, 228 * hp / max), 6);
  g.font = '900 30px system-ui, sans-serif'; g.textAlign = 'center'; g.lineWidth = 6; g.strokeStyle = '#000'; g.fillStyle = '#fff';
  g.strokeText(wert, 128, 30); g.fillText(wert, 128, 30);
  t.needsUpdate = true;
}
function textSprite(text, farbe, groesse) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d');
  g.font = `${groesse || 64}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji", system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 8; g.strokeStyle = 'rgba(0,0,0,.8)'; g.strokeText(text, 128, 64); g.fillStyle = farbe || '#fff'; g.fillText(text, 128, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.renderOrder = 20; s.scale.set(2, 1, 1);
  return s;
}

/* ---------- Partikel & Effekte ---------- */
function partikel(x, y, z, farbe, n, kraft, groesse, dauer, schwer) {
  for (let i = 0; i < n; i++) {
    if (S.partikel.length > 380) return;
    const m = new THREE.Mesh(i % 2 ? GEO.kugelGrob : GEO.box, new THREE.MeshBasicMaterial({ color: farbe, transparent: true }));
    const s = (groesse || 0.15) * (0.6 + Math.random() * 0.8); m.scale.setScalar(s);
    m.position.set(x, y, z);
    const w = Math.random() * Math.PI * 2, h = Math.random();
    S.szene.add(m);
    S.partikel.push({ m, v: new THREE.Vector3(Math.cos(w) * kraft * (0.4 + Math.random()), kraft * (0.5 + h * 1.2), Math.sin(w) * kraft * (0.4 + Math.random())), t: 0, d: (dauer || 0.6) * (0.7 + Math.random() * 0.6), s, schwer: schwer == null ? 9 : schwer });
  }
}
function blitzMesh(m, d, wachs) {
  m.traverse(o => { if (o.material && !o.material.userData.eigen) { o.material = o.material.clone(); o.material.userData = { eigen: 1 }; } });
  S.szene.add(m); S.blitze.push({ m, t: 0, d, wachs: wachs || 0, s0: m.scale.clone() }); return m; }
function ringEffekt(x, z, rad, farbe, d) {
  const m = new THREE.Mesh(GEO.ring, new THREE.MeshBasicMaterial({ color: farbe, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, 0.12, z); m.scale.setScalar(rad * 0.3);
  return blitzMesh(m, d || 0.5, rad);
}
function scheibeEffekt(x, z, rad, farbe, d, alpha) {
  const m = new THREE.Mesh(GEO.scheibe, new THREE.MeshBasicMaterial({ color: farbe, transparent: true, opacity: alpha || 0.45, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, 0.1, z); m.scale.setScalar(rad); m.userData.alpha0 = alpha || 0.45;
  return blitzMesh(m, d || 0.6);
}
function strahl(x1, y1, z1, x2, y2, z2, farbe, dicke, d) {
  const a = new THREE.Vector3(x1, y1, z1), b = new THREE.Vector3(x2, y2, z2), l = a.distanceTo(b);
  const g = new THREE.Group();
  g.add(new THREE.Mesh(GEO.zyl, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true })));
  g.add(new THREE.Mesh(GEO.zyl, new THREE.MeshBasicMaterial({ color: farbe, transparent: true, opacity: 0.6 })));
  g.children[0].scale.set(dicke * 0.45, l, dicke * 0.45); g.children[1].scale.set(dicke, l, dicke);
  g.position.copy(a).lerp(b, 0.5); g.lookAt(b); g.rotateX(Math.PI / 2);
  S.szene.add(g); S.blitze.push({ m: g, t: 0, d: d || 0.3, wachs: 0, s0: g.scale.clone(), gruppe: 1 });
}

export function effekte(liste, meinTeam) {
  for (const f of liste) {
    const x = f.x != null ? wx(f.x) : 0, z = f.y != null ? wz(f.y) : 0;
    if (f.a === 'spiel') {
      const k = KARTEN[f.key];
      if (k.t !== 'spell') { partikel(x, 0.2, z, '#e040fb', 14, 2.2, 0.12, 0.5); ringEffekt(x, z, 1.5, '#f48fb1', 0.45); }
    } else if (f.a === 'zauber') {
      const k = KARTEN[f.key];
      scheibeEffekt(x, z, f.rad, f.col, 0.9, 0.35); ringEffekt(x, z, f.rad, f.col, 0.7);
      if (f.key === 'thor') { strahl(x, 18, z, x, 0, z, '#bbdefb', 0.5, 0.35); partikel(x, 0.3, z, '#e3f2fd', 26, 5, 0.12, 0.5); }
      else if (f.key === 'hadouken') { const kug = kugel('#4fc3f7', x, 1, z, 1.2, 1.2, 1.2, { leucht: 1, alpha: 0.7 }); blitzMesh(kug, 0.5, 2.5); partikel(x, 0.6, z, '#81d4fa', 40, 6, 0.2, 0.6); }
      else if (f.key === 'elsa') { for (let i = 0; i < 9; i++) { const o = new THREE.Mesh(new THREE.OctahedronGeometry(1), new THREE.MeshLambertMaterial({ color: '#e1f5fe', emissive: '#4fc3f7', emissiveIntensity: 0.4, transparent: true, opacity: 0.85 })); const w = i / 9 * 6.28, rr = Math.random() * f.rad * 0.8; o.position.set(x + Math.cos(w) * rr, 0.6, z + Math.sin(w) * rr); o.scale.set(0.3, 0.9, 0.3); blitzMesh(o, 4); } partikel(x, 0.5, z, '#ffffff', 30, 3, 0.1, 1, 2); }
      else if (f.key === 'snap') { partikel(x, 0.5, z, '#8d6e63', 60, 3, 0.1, 1.4, -1); scheibeEffekt(x, z, f.rad, '#ffffff', 0.25, 0.8); }
      else if (f.key === 'pilz') partikel(x, 0.3, z, '#ff8a80', 24, 2.5, 0.18, 0.8, -2);
      else if (f.key === 'senzu') partikel(x, 0.3, z, '#b9f6ca', 40, 2.5, 0.14, 1, -3);
      else if (f.key === 'panzer') { const p = FIGUREN.panzer(); p.position.set(x, 0, z); blitzMesh(p, 0.6, 0); partikel(x, 0.5, z, '#2979ff', 40, 7, 0.22, 0.7); partikel(x, 0.5, z, '#ffffff', 20, 6, 0.15, 0.6); }
    } else if (f.a === 'knall') { scheibeEffekt(x, z, f.rad, f.col || '#ffcc80', 0.35, 0.5); ringEffekt(x, z, f.rad, '#ffffff', 0.35); partikel(x, 0.4, z, f.col || '#ffab40', 10 + f.rad * 6, 4, 0.14, 0.45); }
    else if (f.a === 'hieb') partikel(x, 0.8, z, f.col || '#ffffff', 5, 2.5, 0.08, 0.3);
    else if (f.a === 'strahl') strahl(x, 1, z, wx(f.tx), 0.8, wz(f.ty), f.col, f.dick > 0.3 ? 0.7 : 0.12, f.dick > 0.3 ? 0.5 : 0.25);
    else if (f.a === 'daneben') { const s = textSprite('daneben!', '#ffffff', 46); s.position.set(x, 1.6, z); s.scale.set(1.6, 0.8, 1); blitzMesh(s, 0.8); s.userData.steigen = 1; }
    else if (f.a === 'tod') {
      if (f.kind === 'tower') { partikel(x, 1.5, z, '#9e9e9e', 50, 7, 0.35, 1.2); partikel(x, 1.5, z, '#ff9800', 30, 6, 0.25, 0.7); scheibeEffekt(x, z, 3, '#ffcc80', 0.6, 0.7); }
      else { partikel(x, 0.6, z, '#ffffff', 12, 2.5, 0.18, 0.5, 1); }
    }
  }
}
export function emote(team, text) {
  const mein = team === S.team, s = textSprite(text, '#fff', 90);
  const ty = (team === 0 ? 29 : 3);
  s.position.set(wx(9) + (mein ? 2.4 : -2.4) * (S.team === 1 ? -1 : 1), 6.5, wz(ty)); s.scale.set(3, 1.5, 1);
  blitzMesh(s, 2.2);
}

/* ---------- Vorschau beim Platzieren ---------- */
let vorschauKey = null;
export function vorschau(key, x, y, ok, gueltigFn) {
  sperrzone(key, gueltigFn);
  if (!key || x == null) { S.vorschau.visible = false; return; }
  const k = KARTEN[key];
  if (vorschauKey !== key) {
    S.vorschau.clear(); vorschauKey = key;
    const rad = k.t === 'spell' ? k.rad : (k.cnt > 1 ? 1.4 : k.r * 1.6);
    const ring = new THREE.Mesh(GEO.ring, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.08; ring.scale.setScalar(rad);
    const scheibe = new THREE.Mesh(GEO.scheibe, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.25, depthWrite: false }));
    scheibe.rotation.x = -Math.PI / 2; scheibe.position.y = 0.07; scheibe.scale.setScalar(rad);
    S.vorschau.add(ring, scheibe); S.vorschau.userData = { ring, scheibe };
    if (k.t !== 'spell') { const f = figur(key, true); f.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.6; } }); S.vorschau.add(f); }
    if (k.rng > 2 && k.t !== 'spell') { const r2 = new THREE.Mesh(new THREE.RingGeometry(0.97, 1, 64), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5, depthWrite: false })); r2.rotation.x = -Math.PI / 2; r2.position.y = 0.06; r2.scale.setScalar(k.rng + k.r); S.vorschau.add(r2); }
  }
  S.vorschau.visible = true;
  S.vorschau.position.set(wx(x), 0, wz(y));
  const farbe = ok ? '#ffffff' : '#ff3b3b';
  S.vorschau.userData.ring.material.color.set(farbe); S.vorschau.userData.scheibe.material.color.set(farbe);
}
let sperrKey = null, sperrStand = '';
function sperrzone(key, gueltigFn) {
  const k = key && KARTEN[key];
  const zeigen = k && k.t !== 'spell';
  const stand = zeigen ? [0.5, 17.5].map(x => [11, 20].map(y => gueltigFn(key, x, y) ? 1 : 0).join('')).join('') : '';
  if (sperrKey === (zeigen ? 'z' : null) && sperrStand === stand) return;
  sperrKey = zeigen ? 'z' : null; sperrStand = stand;
  S.sperre.clear();
  if (!zeigen) return;
  const mat = new THREE.MeshBasicMaterial({ color: '#ff2a2a', transparent: true, opacity: 0.22, depthWrite: false });
  for (const [x0, x1] of [[0, 9], [9, 18]]) {
    let y0 = null;
    for (let y = 0; y <= H; y += 0.5) {
      const frei = y < H && gueltigFn(key, (x0 + x1) / 2, y + 0.25);
      if (!frei && y < H && y0 === null) y0 = y;
      if ((frei || y >= H) && y0 !== null) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y - y0), mat); m.rotation.x = -Math.PI / 2;
        m.position.set(wx((x0 + x1) / 2), 0.05, wz((y0 + y) / 2)); S.sperre.add(m); y0 = null;
      }
    }
  }
}

/* ---------- Figuren erzeugen ---------- */
export function figur(key) {
  const f = FIGUREN[key] ? FIGUREN[key]() : chibi({ haut: '#ffe0bd', koerper: KARTEN[key] ? KARTEN[key].col : '#999', hose: '#555' });
  const k = KARTEN[key];
  const ziel = k && k.r ? k.r / 0.45 : 1;
  const wrap = new THREE.Group(); wrap.add(f);
  f.scale.setScalar(ziel * GROSS * (k && k.t === 'building' ? 0.85 : 0.95));
  wrap.userData = Object.assign({}, f.userData, { inner: f, skala: ziel * GROSS });
  wrap.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return wrap;
}

/* ---------- Synchronisieren & Zeichnen ---------- */
const winkelLerp = (a, b, t) => { let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * t; };
export function bild(ansicht, dt, meinTeam) {
  S.zeit += dt;
  if (S.wasserTex) S.wasserTex.offset.x = (S.zeit * 0.05) % 1;
  if (S.modus === 'kampf' && ansicht) synchron(ansicht, dt, meinTeam);
  else if (S.modus !== 'kampf') {
    const w = S.zeit * 0.08, k = S.kamera;
    k.position.set(Math.sin(w) * 34, 22, Math.cos(w) * 34); k.lookAt(0, 0, 0);
  }
  // Partikel
  for (const p of S.partikel) {
    p.t += dt; p.v.y -= p.schwer * dt; p.m.position.addScaledVector(p.v, dt);
    if (p.m.position.y < 0.05 && p.schwer > 0) { p.m.position.y = 0.05; p.v.multiplyScalar(0.6); }
    const a = 1 - p.t / p.d; p.m.material.opacity = Math.max(0, a); p.m.scale.setScalar(p.s * (0.5 + a * 0.5));
    p.m.rotation.x += dt * 4; p.m.rotation.y += dt * 3;
  }
  S.partikel = S.partikel.filter(p => { if (p.t >= p.d) { S.szene.remove(p.m); p.m.material.dispose(); return false; } return true; });
  for (const b of S.blitze) {
    b.t += dt; const a = Math.max(0, 1 - b.t / b.d);
    if (b.wachs) b.m.scale.copy(b.s0).multiplyScalar(1 + (b.t / b.d) * (b.wachs / Math.max(0.01, b.s0.x) - 1));
    if (b.m.userData.steigen) b.m.position.y += dt * 1.2;
    b.m.traverse(o => { if (o.material) { o.material.transparent = true; o.material.opacity = (o.material.userData.o0 ??= o.material.opacity) * Math.min(1, a * 2.5); } });
  }
  S.blitze = S.blitze.filter(b => { if (b.t >= b.d) { S.szene.remove(b.m); return false; } return true; });
  S.r.render(S.szene, S.kamera);
}

function synchron(A, dt, meinTeam) {
  const gesehen = new Set();
  for (const e of A.ents) {
    gesehen.add(e.id);
    let o = S.objekte.get(e.id);
    const mein = e.team === meinTeam, turm = e.key === 'king' || e.key === 'princess';
    if (!o) {
      o = { key: e.key, team: e.team, geboren: S.zeit, x: e.x, y: e.y, winkel: e.team === 0 ? Math.PI : 0, lauf: Math.random() * 6, hieb: 0, angriffAlt: false };
      if (turm) {
        o.g = turmModell(e.key, mein ? '#2f7bf6' : '#e5393b'); o.g.rotation.y = e.team === 0 ? Math.PI : 0;
        o.schild = turmSchild(mein); o.schild.position.set(0, o.g.userData.hoehe + 0.9, 0); o.g.add(o.schild);
        o.zzz = textSprite('💤', '#fff', 70); o.zzz.position.set(0.8, o.g.userData.hoehe + 1.6, 0); o.zzz.scale.set(1.4, 0.7, 1); o.g.add(o.zzz);
      } else {
        o.g = new THREE.Group(); o.modell = figur(e.key); o.g.add(o.modell);
        const fuss = new THREE.Mesh(GEO.ring, new THREE.MeshBasicMaterial({ color: mein ? '#3d9bff' : '#ff4a4a', transparent: true, opacity: 0.85, depthWrite: false }));
        fuss.rotation.x = -Math.PI / 2; fuss.position.y = 0.04; fuss.scale.setScalar(e.r * 1.05); o.g.add(fuss); o.fuss = fuss;
        o.balken = balken(Math.max(0.8, e.r * 2.2), mein); o.balken.position.y = e.r * 2.6 * GROSS + 0.5 + (e.fly ? 1.3 : 0); o.g.add(o.balken); o.balken.visible = false;
        if (KARTEN[e.key].t !== 'building') { o.modell.position.y = 3; }
        o.betaeubt = textSprite('💫', '#fff', 70); o.betaeubt.scale.set(1, 0.5, 1); o.betaeubt.position.y = e.r * 2.6 * GROSS + 1; o.g.add(o.betaeubt); o.betaeubt.visible = false;
      }
      o.g.position.set(wx(e.x), 0, wz(e.y));
      S.einheiten.add(o.g); S.objekte.set(e.id, o);
    }
    const ud = o.g.userData, md = o.modell ? o.modell.userData : null;
    // Bewegung & Ausrichtung
    const dx = e.x - o.x, dy = e.y - o.y, v = Math.hypot(dx, dy) / Math.max(dt, 0.001);
    o.x = e.x; o.y = e.y;
    o.g.position.x = wx(e.x); o.g.position.z = wz(e.y);
    if (turm) {
      if (e.hp <= 0) {
        if (!o.kaputt) { o.kaputt = true; S.einheiten.remove(o.g); o.g = truemmer(); o.g.position.set(wx(e.x), 0, wz(e.y)); S.einheiten.add(o.g); }
        continue;
      }
      schildMalen(o.schild, e.hp, e.max);
      o.zzz.visible = e.key === 'king' && !e.aktiv;
      const f = ud.figur;
      if (e.ziel) { const zw = Math.atan2(wx(e.ziel[0]) - o.g.position.x, wz(e.ziel[1]) - o.g.position.z) - o.g.rotation.y; f.rotation.y = winkelLerp(f.rotation.y, zw, Math.min(1, dt * 10)); if (ud.kanone) ud.kanone.rotation.y = f.rotation.y; }
      if (e.angriff && !o.angriffAlt) o.hieb = 0.3;
      o.angriffAlt = e.angriff;
      o.hieb = Math.max(0, o.hieb - dt);
      f.userData.armR.rotation.x = -o.hieb * 5; f.userData.armL.rotation.x = -1.2 * (e.ziel ? 1 : 0.2);
      f.userData.kopf.rotation.z = e.key === 'king' && !e.aktiv ? 0.35 + Math.sin(S.zeit * 2) * 0.05 : 0;
      if (ud.kanone && o.hieb > 0.2) ud.kanone.position.z = 0.6 - (o.hieb - 0.2) * 3; else if (ud.kanone) ud.kanone.position.z = 0.6;
      continue;
    }
    const k = KARTEN[e.key], m = o.modell, innen = md.inner;
    // Landung beim Ausspielen
    if (k.t !== 'building') {
      const ziel = e.fly ? 1.3 + Math.sin(S.zeit * 3 + o.lauf) * 0.12 : 0;
      if (m.position.y > ziel + 0.01 && e.deploy) m.position.y = Math.max(ziel, m.position.y - dt * 9);
      else m.position.y += (ziel - m.position.y) * Math.min(1, dt * 8);
      if (o.gelandet !== true && m.position.y <= ziel + 0.02) { o.gelandet = true; partikel(o.g.position.x, 0.1, o.g.position.z, '#d7ccc8', 6, 1.5, 0.12, 0.4); }
    } else {
      const t = Math.min(1, (S.zeit - o.geboren) / 0.5); m.scale.set(1, t, 1);
    }
    let soll = o.winkel;
    if (e.ziel && (e.angriff || v < 0.2)) soll = Math.atan2(wx(e.ziel[0]) - o.g.position.x, wz(e.ziel[1]) - o.g.position.z);
    else if (v > 0.2) soll = Math.atan2(dx, dy);
    if (k.t === 'building') { if (md.turm && e.ziel) md.turm.rotation.y = winkelLerp(md.turm.rotation.y, soll, Math.min(1, dt * 10)); }
    else { o.winkel = winkelLerp(o.winkel, soll, Math.min(1, dt * 10)); m.rotation.y = o.winkel; }
    // Laufen
    const laeuft = v > 0.2 && !e.deploy && !e.stun;
    o.lauf += dt * (laeuft ? 10 * (e.rage ? 1.4 : 1) : 0);
    const sw = laeuft ? Math.sin(o.lauf) : 0;
    if (md.beinL) { md.beinL.rotation.x = sw * 0.7; md.beinR.rotation.x = -sw * 0.7; }
    if (md.beine) md.beine.forEach((b, i) => (b.rotation.x = (i % 2 ? sw : -sw) * 0.6));
    if (!e.fly && innen) innen.position.y = laeuft ? Math.abs(sw) * 0.06 : 0;
    // Angriff
    if (e.angriff && !o.angriffAlt) o.hieb = 0.35;
    o.angriffAlt = e.angriff;
    o.hieb = Math.max(0, o.hieb - dt);
    const h = o.hieb > 0 ? Math.sin((1 - o.hieb / 0.35) * Math.PI) : 0;
    if (md.armR && e.key !== 'zombies' && e.key !== 'storm') { md.armR.rotation.x = -h * 2.2 + (laeuft ? -sw * 0.5 : 0); md.armL.rotation.x = laeuft ? sw * 0.5 : (e.key === 'legolas' ? -1.2 : 0); }
    if (e.key === 'storm' && md.armR) md.armR.rotation.x = -1.2 - h * 0.3;
    if (innen) innen.position.z = h * 0.15;
    if (md.rotor) md.rotor.rotation.y += dt * 30;
    if (md.maulO) { const w = 0.15 + Math.abs(Math.sin(S.zeit * 12)) * 0.45; md.maulO.rotation.x = -w; md.maulU.rotation.x = w; }
    if (md.fluegel) { const fl = Math.sin(S.zeit * 8 + o.lauf) * 0.5; md.fluegel[0].rotation.z = fl; md.fluegel[1].rotation.z = -fl; }
    if (md.ball) { const l = e.lade || 0; md.ball.scale.setScalar(0.02 + l * 0.22); md.ball.visible = l > 0.05; }
    if (e.key === 'creeper' && md.koerper) { const n = S.objekte.get(e.id); const s = 1 + (e.angriff ? 0.25 : 0); md.inner.scale.setScalar(md.skala * 0.95 * s); }
    if (e.rage) innen.scale.setScalar(md.skala * 0.95 * 1.15); else if (e.key !== 'creeper' && k.t !== 'building') innen.scale.setScalar(md.skala * 0.95);
    // Beam (Iron Man)
    if (e.strahl && e.ziel && Math.random() < 0.5) strahl(o.g.position.x, m.position.y + 0.8 * md.skala, o.g.position.z, wx(e.ziel[0]), 0.8, wz(e.ziel[1]), '#ff7043', 0.18, 0.08);
    // Anzeigen
    o.balken.visible = e.hp < e.max && !e.deploy;
    if (o.balken.visible) o.balken.userData.fill.scale.x = o.balken.userData.breite * Math.max(0, e.hp / e.max);
    o.betaeubt.visible = !!e.stun; if (e.stun) o.betaeubt.position.y = e.r * 2.6 * GROSS + 1.1 + (e.fly ? 1.3 : 0);
    o.fuss.material.opacity = e.deploy ? 0.4 : 0.85;
  }
  for (const [id, o] of S.objekte) if (!gesehen.has(id)) { S.einheiten.remove(o.g); S.objekte.delete(id); }
  // Geschosse
  while (S.geschosse.length < A.geschosse.length) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(GEO.kugelGrob, new THREE.MeshBasicMaterial({ color: '#ffffff' })));
    g.add(new THREE.Mesh(GEO.kugelGrob, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35 })));
    g.children[0].scale.setScalar(0.14); g.children[1].scale.setScalar(0.3);
    S.szene.add(g); S.geschosse.push(g);
  }
  S.geschosse.forEach((g, i) => {
    const p = A.geschosse[i];
    g.visible = !!p; if (!p) return;
    g.position.set(wx(p[0]), 1.3, wz(p[1]));
    g.children[0].material.color.set(p[2]); g.children[1].material.color.set(p[2]);
  });
  // Zonen (Super-Pilz)
  while (S.zonen.length < A.zonen.length) {
    const m = new THREE.Mesh(GEO.scheibe, new THREE.MeshBasicMaterial({ color: '#ff5252', transparent: true, opacity: 0.22, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.09; S.szene.add(m); S.zonen.push(m);
  }
  S.zonen.forEach((m, i) => { const z = A.zonen[i]; m.visible = !!z; if (z) { m.position.x = wx(z[0]); m.position.z = wz(z[1]); m.scale.setScalar(z[2] * (1 + Math.sin(S.zeit * 6) * 0.03)); } });
}

/* ---------- Kartenbilder aus den 3D-Modellen ---------- */
export function kartenBilder(keys) {
  const c = document.createElement('canvas'); c.width = 192; c.height = 240;
  const r = new THREE.WebGLRenderer({ canvas: c, antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping;
  const sz = new THREE.Scene();
  sz.add(new THREE.HemisphereLight('#ffffff', '#6a5a8a', 1.6));
  const l = new THREE.DirectionalLight('#fff3dc', 2.2); l.position.set(2, 4, 5); sz.add(l);
  const kam = new THREE.PerspectiveCamera(30, 192 / 240, 0.1, 50);
  const bilder = {};
  for (const key of keys) {
    const f = FIGUREN[key] ? FIGUREN[key]() : chibi({ haut: '#ffe0bd', koerper: '#999', hose: '#555' });
    if (f.userData.ball) f.userData.ball.scale.setScalar(0.15);
    sz.add(f);
    const b = new THREE.Box3().setFromObject(f), mitte = b.getCenter(new THREE.Vector3()), gr = b.getSize(new THREE.Vector3());
    const h = Math.max(gr.y, gr.x * 1.15) * 0.62;
    f.rotation.y = 0.35;
    kam.position.set(mitte.x + h * 0.9, mitte.y + h * 0.55, mitte.z + h * 3.6); kam.lookAt(mitte.x, mitte.y + h * 0.05, mitte.z);
    r.setClearColor(0x000000, 0); r.clear(); r.render(sz, kam);
    bilder[key] = c.toDataURL('image/png');
    sz.remove(f);
  }
  r.dispose();
  return bilder;
}
