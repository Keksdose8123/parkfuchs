// Routenführung: Route holen, deutsche Anweisungen erzeugen, Abweichung erkennen.
// Läuft im Browser und in node (für die Selbstprüfung).

const OSRM = 'https://router.project-osrm.org/route/v1/driving/';

/* ---------- Anweisungen auf Deutsch --------------------------------------- */

const RICHTUNG = {
  'sharp right': 'scharf rechts', 'right': 'rechts', 'slight right': 'leicht rechts',
  'straight': 'geradeaus', 'slight left': 'leicht links', 'left': 'links',
  'sharp left': 'scharf links',
};

const gross = s => s.charAt(0).toUpperCase() + s.slice(1);
const klein = s => s.charAt(0).toLowerCase() + s.slice(1);

// Vorgelesen klingt "auf Wilhelmshöher Allee" falsch — im Akkusativ fehlt der Artikel.
// Nach der Endung geraten; wenn unklar, lieber gar keiner als der falsche.
const ENDUNGEN = [
  [['straße', 'strasse', 'allee', 'gasse', 'chaussee', 'promenade', 'brücke', 'zeile', 'spange'], 'die'],
  [['weg', 'ring', 'platz', 'damm', 'berg', 'hof', 'markt', 'steig', 'pfad', 'graben',
    'anger', 'wall', 'park', 'bogen', 'kamp'], 'den'],
  [['tor', 'feld', 'ufer', 'eck', 'kreuz', 'dreieck'], 'das'],
];

function aufArtikel(name) {
  const n = String(name || '').toLowerCase().trim();
  if (/^[ab]\s?\d+$/.test(n)) return 'die';        // A7, B83 -> die Autobahn, die Bundesstraße
  for (let i = 0; i < ENDUNGEN.length; i++) {
    const liste = ENDUNGEN[i][0];
    for (let j = 0; j < liste.length; j++) if (n.endsWith(liste[j])) return ENDUNGEN[i][1];
  }
  return '';
}

// Die Ortsangabe: geschrieben knapp, gesprochen mit Artikel und Atempause davor.
function phrase(name, gesprochen) {
  if (!name) return '';
  if (!gesprochen) return ' auf ' + name;
  const a = aufArtikel(name);
  return ', auf ' + (a ? a + ' ' : '') + name;
}

// Ein OSRM-Schritt -> ein deutscher Satz. Unbekannte Typen fallen auf "Weiter" zurück,
// damit nie eine leere oder englische Ansage herauskommt.
function anweisung(schritt, gesprochen) {
  const m = (schritt && schritt.maneuver) || {};
  const mod = m.modifier;
  const name = (schritt && schritt.name) || '';
  const auf = phrase(name, gesprochen);
  const richtung = RICHTUNG[mod];

  switch (m.type) {
    case 'depart':
      return name ? 'Losfahren' + auf : 'Losfahren';
    case 'arrive':
      return 'Ziel erreicht';
    case 'turn':
      if (mod === 'uturn') return 'Wenden';
      if (mod === 'straight') return 'Geradeaus weiter' + auf;
      return richtung ? gross(richtung) + ' abbiegen' + auf : 'Weiter' + auf;
    case 'new name':
      return 'Weiter' + auf;
    case 'continue':
      if (mod === 'uturn') return 'Wenden';
      return richtung && mod !== 'straight' ? gross(richtung) + ' halten' + auf : 'Geradeaus weiter' + auf;
    case 'merge':
      return 'Einfädeln' + auf;
    case 'on ramp':
      return 'Auffahren' + auf;
    case 'off ramp':
      return richtung ? gross(richtung) + ' abfahren' + auf : 'Abfahren' + auf;
    case 'fork':
      return richtung ? gross(richtung) + ' halten' + auf : 'Weiter' + auf;
    case 'end of road':
      return 'Am Straßenende ' + (richtung || 'weiter') + auf;
    case 'roundabout':
    case 'rotary':
      return 'Im Kreisverkehr die ' + (m.exit || 1) + '. Ausfahrt nehmen' + auf;
    case 'exit roundabout':
    case 'exit rotary':
      return 'Kreisverkehr verlassen' + auf;
    default:
      return richtung ? gross(richtung) + auf : 'Weiter' + auf;
  }
}

// 137 -> 140, 380 -> 400. Krumme Meterzahlen klingen vorgelesen albern.
function rundMeter(m) {
  if (m >= 1000) return Math.round(m / 100) * 100;
  if (m >= 100) return Math.round(m / 50) * 50;
  return Math.max(10, Math.round(m / 10) * 10);
}

function ansageText(schritt, meter) {
  const typ = (schritt && schritt.maneuver && schritt.maneuver.type) || '';
  if (typ === 'depart') return anweisung(schritt, true) + '.';   // "In 300 Metern losfahren" wäre Unsinn
  if (typ === 'arrive') {
    return meter < 60 ? 'Du bist da.' : 'In ' + rundMeter(meter) + ' Metern ist dein Ziel erreicht.';
  }
  const text = anweisung(schritt, true);
  if (meter < 40) return 'Jetzt ' + klein(text) + '.';
  return 'In ' + rundMeter(meter) + ' Metern ' + klein(text) + '.';
}

function fahrzeit(sekunden) {
  const min = Math.max(1, Math.round(sekunden / 60));
  if (min < 60) return min + ' Min';
  return Math.floor(min / 60) + ' Std. ' + (min % 60) + ' Min';
}

function fahrstrecke(meter) {
  return meter < 1000 ? meter + ' m' : (meter / 1000).toFixed(1).replace('.', ',') + ' km';
}

// Abkürzungen ausschreiben. Sprachausgaben lesen "Std." sonst Buchstabe für Buchstabe vor.
function vorlesbar(text) {
  return String(text)
    .split('/Std.').join(' pro Stunde')
    .split('€').join(' Euro')
    .split('max.').join('höchstens')
    .replace(/\bStd\./g, 'Stunden')
    .replace(/\bMin\.?\b/g, 'Minuten')
    .replace(/([A-Za-zäöüÄÖÜß])[Ss]tr\./g, '$1straße')   // Bahnhofstr. -> Bahnhofstraße
    .replace(/\bStr\./g, 'Straße')                        // freistehendes "Str. 5"
    .replace(/(\d)\s*km\b/g, '$1 Kilometer')
    .replace(/(\d)\s*m\b/g, '$1 Meter')
    .replace(/\s+/g, ' ')
    .replace(/ ,/g, ',')
    .trim();
}

/* ---------- Geometrie ------------------------------------------------------ */

// Lokale Umrechnung Grad -> Meter. Auf Stadtgroesse genau genug, spart Trigonometrie.
function proGrad(lat) {
  return { x: 111320 * Math.cos(lat * Math.PI / 180), y: 110540 };
}

// Abstand eines Punktes zur Strecke a-b, in Metern.
function punktZuStrecke(p, a, b) {
  const s = proGrad(p[0]);
  const px = (p[1] - a[1]) * s.x, py = (p[0] - a[0]) * s.y;
  const bx = (b[1] - a[1]) * s.x, by = (b[0] - a[0]) * s.y;
  const laenge = bx * bx + by * by;
  let t = laenge ? (px * bx + py * by) / laenge : 0;
  t = Math.max(0, Math.min(1, t));
  const dx = px - bx * t, dy = py - by * t;
  return Math.sqrt(dx * dx + dy * dy);
}

// Kuerzester Abstand zur gesamten Route, in Metern.
function abstandZurRoute(p, linie) {
  let min = Infinity;
  for (let i = 1; i < linie.length; i++) {
    const d = punktZuStrecke(p, linie[i - 1], linie[i]);
    if (d < min) min = d;
  }
  return min;
}

function luftlinie(a, b) {
  const s = proGrad(a[0]);
  const dx = (b[1] - a[1]) * s.x, dy = (b[0] - a[0]) * s.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/* ---------- Route ---------------------------------------------------------- */

async function routeHolen(von, nach) {
  const url = OSRM + von[1] + ',' + von[0] + ';' + nach[1] + ',' + nach[0]
    + '?overview=full&geometries=geojson&steps=true';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Routendienst antwortet nicht (' + res.status + ').');
  const d = await res.json();
  if (d.code !== 'Ok' || !d.routes || !d.routes.length) throw new Error('Keine Route gefunden.');
  const r = d.routes[0];
  return {
    meter: Math.round(r.distance),
    sekunden: Math.round(r.duration),
    linie: r.geometry.coordinates.map(c => [c[1], c[0]]),   // OSRM liefert lon,lat
    schritte: (r.legs[0] && r.legs[0].steps) || [],
  };
}

if (typeof module !== 'undefined') {
  module.exports = { anweisung, ansageText, rundMeter, fahrzeit, fahrstrecke, vorlesbar, aufArtikel,
                     punktZuStrecke, abstandZurRoute, luftlinie, routeHolen };
}
