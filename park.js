// Auswertung von OpenStreetMap-Parkdaten. Laeuft im Browser und in node.

// Luftlinie in Metern zwischen zwei Koordinaten.
function distanz(lat1, lon1, lat2, lon2) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad, dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

// "2.1", "2,10 m", "2.1 m" -> 2.1 ; "default"/Unsinn -> null
function zahl(v) {
  if (v == null) return null;
  const m = String(v).replace(',', '.').match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

// Bei Strassenrand-Objekten stehen die Angaben unter parking:<seite>:<was>.
function seitenwert(t, was) {
  for (const seite of ['both', 'right', 'left']) {
    const v = t[`parking:${seite}:${was}`];
    if (v != null) return v;
  }
  return null;
}

function istStrassenrand(t) {
  if (t['parking'] === 'street_side' || t['parking'] === 'lane') return true;
  return ['both', 'right', 'left'].some(s => /^(lane|street_side)$/.test(t[`parking:${s}`] || ''));
}

function art(t) {
  if (istStrassenrand(t)) return 'Straßenrand';
  if (t['park_ride'] && t['park_ride'] !== 'no') return 'P+R';
  if (t['parking'] === 'park_and_ride') return 'P+R';
  if (t['parking'] === 'multi-storey' || t['parking'] === 'rooftop') return 'Parkhaus';
  if (t['parking'] === 'underground') return 'Tiefgarage';
  return 'Parkplatz';
}

function gebuehr(t) {
  const v = t['fee'] != null ? t['fee'] : seitenwert(t, 'fee');
  if (v == null) return 'unbekannt';
  if (v === 'no') return 'kostenlos';
  return 'gebuehrenpflichtig'; // yes, interval, "Mo-Fr 09:00-18:00" -> irgendwann zahlbar
}

function zugang(t) {
  const roh = t['access'] || seitenwert(t, 'restriction') || seitenwert(t, 'access');
  if (roh == null) return 'unbekannt';
  if (roh === 'private' || roh === 'no') return 'privat';
  if (roh === 'customers') return 'Kunden';
  if (roh === 'residents' || roh === 'permit') return 'Anwohner';
  if (roh === 'disabled') return 'Behindertenparkplatz';
  if (roh === 'yes' || roh === 'public' || roh === 'permissive' || roh === 'destination') return 'oeffentlich';
  return 'unbekannt';
}


// --- Deutsche Beschriftung der OSM-Rohdaten ---------------------------------
const BEGRIFFE = {
  amenity: 'Art', parking: 'Bauform', fee: 'Gebühr', charge: 'Preis', access: 'Zugang',
  capacity: 'Plätze', 'capacity:disabled': 'Behindertenplätze',
  'capacity:parent': 'Eltern-Kind-Plätze', 'capacity:charging': 'Ladeplätze',
  'capacity:women': 'Frauenparkplätze', maxheight: 'Einfahrtshöhe', maxwidth: 'Einfahrtsbreite',
  maxstay: 'Höchstparkdauer', opening_hours: 'Öffnungszeiten', operator: 'Betreiber',
  name: 'Name', 'name:de': 'Name (deutsch)', ref: 'Kennung', description: 'Beschreibung',
  surface: 'Belag', supervised: 'Bewacht', lit: 'Beleuchtet', covered: 'Überdacht',
  park_ride: 'Park & Ride', website: 'Website', 'contact:website': 'Website',
  phone: 'Telefon', 'contact:phone': 'Telefon', email: 'E-Mail', wheelchair: 'Rollstuhlgerecht',
  level: 'Ebene', layer: 'Kartenebene', restriction: 'Beschränkung', orientation: 'Aufstellung',
  'addr:street': 'Straße', 'addr:housenumber': 'Hausnummer', 'addr:postcode': 'PLZ',
  'addr:city': 'Ort', 'addr:country': 'Land', source: 'Quelle', operator_type: 'Betreiberart',
  'payment:cash': 'Zahlung bar', 'payment:coins': 'Zahlung Münzen',
  'payment:credit_cards': 'Zahlung Kreditkarte', 'payment:debit_cards': 'Zahlung EC-Karte',
  'payment:app': 'Zahlung per App', 'fee:conditional': 'Gebühr (bedingt)',
  zone: 'Zone', 'parking:condition': 'Bedingung', motorcar: 'Pkw', hgv: 'Lkw',
  bus: 'Bus', motorcycle: 'Motorrad', bicycle: 'Fahrrad', building: 'Gebäude',
  'survey:date': 'Zuletzt geprüft', 'check_date': 'Zuletzt geprüft', start_date: 'Seit',
};

const WERTE = {
  yes: 'ja', no: 'nein', parking: 'Parkplatz', 'multi-storey': 'Parkhaus',
  underground: 'Tiefgarage', surface: 'ebenerdig', rooftop: 'Dachparkplatz',
  street_side: 'Straßenrand', lane: 'Fahrbahnrand', park_and_ride: 'Park & Ride',
  customers: 'nur Kunden', private: 'privat', residents: 'nur Anwohner', permit: 'mit Genehmigung',
  permissive: 'geduldet', destination: 'nur Anlieger', public: 'öffentlich',
  disabled: 'Behinderte', designated: 'ausgewiesen', limited: 'eingeschränkt',
  asphalt: 'Asphalt', concrete: 'Beton', paving_stones: 'Pflastersteine', sett: 'Kopfsteinpflaster',
  gravel: 'Kies', fine_gravel: 'Feinkies', ground: 'Naturboden', grass: 'Rasen',
  compacted: 'wassergebundene Decke', paved: 'befestigt', unpaved: 'unbefestigt',
  disc: 'Parkscheibe', meter: 'Parkscheinautomat', interval: 'zeitabhängig',
  perpendicular: 'quer', parallel: 'längs', diagonal: 'schräg', only: 'ausschließlich',
};

const SEITE = { left: 'links', right: 'rechts', both: 'beidseitig' };
const ZEITSCHLUESSEL = ['opening_hours', 'fee', 'service_times', 'maxstay:conditional', 'fee:conditional'];

// Deutscher Name eines OSM-Schluessels. Unbekanntes bleibt stehen, damit nichts verschwindet.
function begriff(k) {
  if (BEGRIFFE[k]) return BEGRIFFE[k];
  const t = k.split(':');
  if (t[0] === 'parking' && SEITE[t[1]]) {
    if (t.length === 2) return 'Straßenrand ' + SEITE[t[1]];
    const rest = t.slice(2).join(':');
    return (BEGRIFFE[rest] || rest) + ' ' + SEITE[t[1]];
  }
  return k;
}

function wertText(k, v) {
  const roh = String(v);
  // Erst die Wertetabelle: "fee=yes" ist "ja", keine Zeitangabe.
  if (WERTE[roh] != null) return WERTE[roh];
  if (k === 'charge' || k.endsWith(':charge')) return preisText(roh);
  if (k === 'maxstay' || k.endsWith(':maxstay')) return dauer(roh);
  if (ZEITSCHLUESSEL.indexOf(k) >= 0 || k.endsWith(':opening_hours')) return zeitenText(roh);
  return roh;
}

// Ein OSM-Element -> die Angaben, die vor Ort zaehlen.
function dauer(v) {
  if (v == null) return null;
  return String(v)
    .replace(/hours?/i, 'Std.')
    .replace(/minutes?/i, 'Min.')
    .replace(/^1 days?$/i, '1 Tag')
    .replace(/days?/i, 'Tage')
    .replace(/^([0-9]+) *h$/i, '$1 Std.')
    .trim();
}

// OSM schreibt Preise und Zeiten englisch und uneinheitlich ("2.50 EUR/hour", "2EUR/1h").
function preisText(v) {
  if (v == null) return null;
  return String(v)
    .replace(/EUR/gi, '€')
    .replace(/([0-9])[.]([0-9])/g, '$1,$2')
    .split('/hour').join('/Std.')
    .split('/1h').join('/Std.')
    .split('/h').join('/Std.')
    .replace(/([0-9])€/g, '$1 €')
    .trim();
}

function zeitenText(v) {
  if (v == null) return null;
  return String(v)
    .split('24/7').join('durchgehend')
    .replace(/Tu/g, 'Di').replace(/We/g, 'Mi').replace(/Th/g, 'Do').replace(/Su/g, 'So')
    .replace(/PH/g, 'Feiertag')
    .trim();
}

function merkmale(el) {
  const t = el.tags || {};
  const pos = el.center || el; // Wege/Relationen liefern center, Knoten lat/lon direkt
  return {
    id: `${el.type}/${el.id}`,
    name: t.name || t.operator || null,
    art: art(t),
    gebuehr: gebuehr(t),
    zugang: zugang(t),
    kapazitaet: zahl(t['capacity']),
    maxdauer: dauer(t['maxstay'] || seitenwert(t, 'maxstay')),
    hoehe: zahl(t['maxheight']),
    preis: preisText(t['charge'] || seitenwert(t, 'charge')),
    zeiten: zeitenText(t['opening_hours'] || seitenwert(t, 'opening_hours')),
    web: t['website'] || t['contact:website'] || null,
    tags: t,
    lat: pos.lat,
    lon: pos.lon,
  };
}

// Merkmale + Entfernung zum Ziel, nach Naehe sortiert. Privates fliegt raus (nicht nutzbar).
function aufbereiten(elemente, zielLat, zielLon) {
  const alle = elemente
    .map(merkmale)
    .filter(p => p.lat != null && p.lon != null)
    .map(p => ({ ...p, meter: distanz(zielLat, zielLon, p.lat, p.lon) }));
  const nutzbar = alle.filter(p => p.zugang !== 'privat');
  return {
    treffer: nutzbar.sort((a, b) => a.meter - b.meter),
    privatAusgeblendet: alle.length - nutzbar.length,
  };
}

function filtern(treffer, nurKostenlos, ohneAnwohner) {
  return treffer.filter(p =>
    (!nurKostenlos || p.gebuehr !== 'gebuehrenpflichtig') &&
    (!ohneAnwohner || p.zugang !== 'Anwohner'));
}

if (typeof module !== 'undefined') {
  module.exports = { distanz, zahl, dauer, preisText, zeitenText, begriff, wertText, merkmale, aufbereiten, filtern, art, gebuehr, zugang };
}
