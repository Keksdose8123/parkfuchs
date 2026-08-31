// Selbstpruefung der Merkmals-Auswertung.  Aufruf:  node test.js
const assert = require('assert');
const { distanz, zahl, dauer, preisText, zeitenText, begriff, wertText, merkmale, aufbereiten, filtern } = require('./park.js');

const knoten = (tags, lat = 50, lon = 8) => ({ type: 'node', id: 1, lat, lon, tags });

// Entfernung: Kassel -> Frankfurt sind rund 145 km Luftlinie
assert.ok(Math.abs(distanz(51.3127, 9.4797, 50.1109, 8.6821) - 145000) < 5000, 'Entfernung grob falsch');
assert.strictEqual(distanz(50, 8, 50, 8), 0, 'gleicher Punkt ist nicht 0');

// Zahlen aus OSM-Schreibweisen
assert.strictEqual(zahl('2.1'), 2.1);
assert.strictEqual(zahl('2,10 m'), 2.1, 'Komma-Schreibweise nicht erkannt');
assert.strictEqual(zahl('default'), null, '"default" muss null sein, nicht 0');
assert.strictEqual(zahl(undefined), null);

// Art
assert.strictEqual(merkmale(knoten({ amenity: 'parking', parking: 'multi-storey' })).art, 'Parkhaus');
assert.strictEqual(merkmale(knoten({ amenity: 'parking', parking: 'underground' })).art, 'Tiefgarage');
assert.strictEqual(merkmale(knoten({ amenity: 'parking' })).art, 'Parkplatz');
assert.strictEqual(merkmale(knoten({ amenity: 'parking', park_ride: 'yes' })).art, 'P+R');
assert.strictEqual(merkmale(knoten({ 'parking:right': 'lane' })).art, 'Straßenrand');

// Maximalparkdauer kommt englisch aus OSM
assert.strictEqual(dauer('3 hours'), '3 Std.');
assert.strictEqual(dauer('30 minutes'), '30 Min.');
assert.strictEqual(dauer('2 h'), '2 Std.');
assert.strictEqual(dauer(null), null);

// Gebuehr - fehlend heisst unbekannt, nicht kostenlos.  Das ist der teure Irrtum.
assert.strictEqual(merkmale(knoten({ amenity: 'parking' })).gebuehr, 'unbekannt');
assert.strictEqual(merkmale(knoten({ amenity: 'parking', fee: 'no' })).gebuehr, 'kostenlos');
assert.strictEqual(merkmale(knoten({ amenity: 'parking', fee: 'yes' })).gebuehr, 'gebuehrenpflichtig');
assert.strictEqual(merkmale(knoten({ amenity: 'parking', fee: 'Mo-Fr 09:00-18:00' })).gebuehr, 'gebuehrenpflichtig');
assert.strictEqual(merkmale(knoten({ 'parking:right': 'lane', 'parking:right:fee': 'yes' })).gebuehr, 'gebuehrenpflichtig');

// Zugang
assert.strictEqual(merkmale(knoten({ amenity: 'parking', access: 'customers' })).zugang, 'Kunden');
assert.strictEqual(merkmale(knoten({ amenity: 'parking', access: 'private' })).zugang, 'privat');
assert.strictEqual(merkmale(knoten({ 'parking:left': 'lane', 'parking:left:restriction': 'residents' })).zugang, 'Anwohner');
assert.strictEqual(merkmale(knoten({ amenity: 'parking' })).zugang, 'unbekannt');

// Preis und Bezahlzeiten - selten hinterlegt, aber wenn, dann muss es durchkommen
const bezahlt = merkmale(knoten({ amenity: 'parking', fee: 'yes',
  charge: '1.50 EUR/hour', opening_hours: 'Mo-Sa 08:00-20:00', website: 'https://x.de' }));
assert.strictEqual(bezahlt.preis, '1,50 €/Std.');
assert.strictEqual(bezahlt.zeiten, 'Mo-Sa 08:00-20:00');
assert.strictEqual(preisText('2EUR/1h'), '2 €/Std.');
assert.strictEqual(preisText('2.50 EUR/hour'), '2,50 €/Std.');
assert.strictEqual(zeitenText('24/7'), 'durchgehend');
assert.strictEqual(zeitenText('Mo-Sa 07:00-22:15; Su 13:00-18:00'), 'Mo-Sa 07:00-22:15; So 13:00-18:00');
assert.strictEqual(preisText(null), null);
assert.strictEqual(bezahlt.web, 'https://x.de');
assert.strictEqual(merkmale(knoten({ amenity: 'parking', fee: 'yes' })).preis, null);
assert.strictEqual(merkmale(knoten({ 'parking:right': 'lane', 'parking:right:charge': '2 EUR' })).preis, '2 €');
// Rohdaten muessen vollstaendig durchgereicht werden - der Nutzer will alles sehen
assert.strictEqual(bezahlt.tags.charge, '1.50 EUR/hour');

// Hoehe und Kapazitaet
const tg = merkmale(knoten({ amenity: 'parking', parking: 'underground', maxheight: '1,90 m', capacity: '250' }));
assert.strictEqual(tg.hoehe, 1.9);
assert.strictEqual(tg.kapazitaet, 250);

// Wege liefern die Position unter center
assert.strictEqual(merkmale({ type: 'way', id: 2, center: { lat: 51, lon: 9 }, tags: { amenity: 'parking' } }).lat, 51);

// Sortierung nach Naehe, Privates raus
const roh = [
  { type: 'node', id: 1, lat: 50.010, lon: 8, tags: { amenity: 'parking', name: 'fern' } },
  { type: 'node', id: 2, lat: 50.001, lon: 8, tags: { amenity: 'parking', name: 'nah' } },
  { type: 'node', id: 3, lat: 50.002, lon: 8, tags: { amenity: 'parking', access: 'private' } },
];
const { treffer, privatAusgeblendet } = aufbereiten(roh, 50, 8);
assert.deepStrictEqual(treffer.map(p => p.name), ['nah', 'fern'], 'nicht nach Naehe sortiert');
assert.strictEqual(privatAusgeblendet, 1, 'Privates nicht gezaehlt');

// Filter: "nur kostenlos" behaelt Unbekanntes - sonst verschwindet fast alles
const liste = [
  { gebuehr: 'kostenlos', zugang: 'oeffentlich' },
  { gebuehr: 'unbekannt', zugang: 'oeffentlich' },
  { gebuehr: 'gebuehrenpflichtig', zugang: 'oeffentlich' },
  { gebuehr: 'kostenlos', zugang: 'Anwohner' },
];
assert.strictEqual(filtern(liste, true, false).length, 3, 'Unbekanntes darf der Kostenlos-Filter nicht schlucken');
assert.strictEqual(filtern(liste, false, true).length, 3);
assert.strictEqual(filtern(liste, true, true).length, 2);

// Deutsche Beschriftung der Rohdaten - Unbekanntes muss stehenbleiben, nicht verschwinden
assert.strictEqual(begriff('maxheight'), 'Einfahrtshöhe');
assert.strictEqual(begriff('parking:right'), 'Straßenrand rechts');
assert.strictEqual(begriff('parking:left:fee'), 'Gebühr links');
assert.strictEqual(begriff('voellig:unbekannt'), 'voellig:unbekannt');
assert.strictEqual(wertText('parking', 'multi-storey'), 'Parkhaus');
assert.strictEqual(wertText('fee', 'yes'), 'ja');
assert.strictEqual(wertText('charge', '2.50 EUR/hour'), '2,50 €/Std.');
assert.strictEqual(wertText('opening_hours', '24/7'), 'durchgehend');
assert.strictEqual(wertText('name', 'Parkhaus Mitte'), 'Parkhaus Mitte');

/* ---------- Routenfuehrung ------------------------------------------------- */
const N = require('./navi.js');

const schritt = (type, modifier, name, extra) =>
  Object.assign({ name: name || '', maneuver: { type, modifier } }, extra || {});

assert.strictEqual(N.anweisung(schritt('depart', null, 'Kölnische Straße')), 'Losfahren auf Kölnische Straße');
assert.strictEqual(N.anweisung(schritt('turn', 'right', 'Bahnhofstraße')), 'Rechts abbiegen auf Bahnhofstraße');
assert.strictEqual(N.anweisung(schritt('turn', 'slight left', '')), 'Leicht links abbiegen');
assert.strictEqual(N.anweisung(schritt('turn', 'uturn', 'Egal')), 'Wenden');
assert.strictEqual(N.anweisung(schritt('turn', 'straight', 'Hauptstraße')), 'Geradeaus weiter auf Hauptstraße');
assert.strictEqual(N.anweisung(schritt('end of road', 'left', 'Ring')), 'Am Straßenende links auf Ring');
assert.strictEqual(N.anweisung(schritt('fork', 'right', 'A7')), 'Rechts halten auf A7');
assert.strictEqual(N.anweisung({ name: 'Kreisel', maneuver: { type: 'roundabout', exit: 3 } }),
  'Im Kreisverkehr die 3. Ausfahrt nehmen auf Kreisel');
assert.strictEqual(N.anweisung(schritt('arrive', null, 'Ziel')), 'Ziel erreicht');
// Unbekannte Typen duerfen nie englisch oder leer durchkommen
assert.strictEqual(N.anweisung(schritt('voellig unbekannt', null, 'Weg')), 'Weiter auf Weg');
assert.strictEqual(N.anweisung({}), 'Weiter');

// Vorgelesene Meterzahlen werden gerundet
assert.strictEqual(N.rundMeter(137), 150);
assert.strictEqual(N.rundMeter(383), 400);
assert.strictEqual(N.rundMeter(1240), 1200);
assert.strictEqual(N.rundMeter(7), 10);
// Gesprochen mit Artikel und Atempause, geschrieben knapp
assert.strictEqual(N.ansageText(schritt('turn', 'right', 'Bahnhofstraße'), 280),
  'In 300 Metern rechts abbiegen, auf die Bahnhofstraße.');
assert.strictEqual(N.ansageText(schritt('turn', 'right', 'Bahnhofstraße'), 25),
  'Jetzt rechts abbiegen, auf die Bahnhofstraße.');
assert.strictEqual(N.ansageText(schritt('arrive', null, 'Ziel'), 20), 'Du bist da.');

// Artikel im Akkusativ nach Endung; unbekannt heisst lieber keiner als ein falscher
assert.strictEqual(N.aufArtikel('Bahnhofstraße'), 'die');
assert.strictEqual(N.aufArtikel('Wilhelmshöher Allee'), 'die');
assert.strictEqual(N.aufArtikel('Friedrichsplatz'), 'den');
assert.strictEqual(N.aufArtikel('Königstor'), 'das');
assert.strictEqual(N.aufArtikel('A7'), 'die');
assert.strictEqual(N.aufArtikel('Zamboni'), '');

// Abkuerzungen ausschreiben, sonst liest die Stimme "Es-Te-De"
assert.strictEqual(N.vorlesbar('2,50 €/Std.'), '2,50 Euro pro Stunde');
assert.strictEqual(N.vorlesbar('2,4 km'), '2,4 Kilometer');
assert.strictEqual(N.vorlesbar('850 m'), '850 Meter');
assert.strictEqual(N.vorlesbar('5 Min'), '5 Minuten');
assert.strictEqual(N.vorlesbar('max. 3 Std.'), 'höchstens 3 Stunden');
assert.strictEqual(N.vorlesbar('Rechts abbiegen, auf die Bahnhofstr.'), 'Rechts abbiegen, auf die Bahnhofstraße');

assert.strictEqual(N.fahrzeit(90), '2 Min');
assert.strictEqual(N.fahrzeit(3900), '1 Std. 5 Min');
assert.strictEqual(N.fahrstrecke(850), '850 m');
assert.strictEqual(N.fahrstrecke(2400), '2,4 km');

// Geometrie: senkrechter Abstand, Punkt auf der Linie, Punkt hinter dem Ende
const a = [50.0, 8.0], b = [50.0, 8.01];
assert.ok(Math.abs(N.punktZuStrecke([50.001, 8.005], a, b) - 110.5) < 3, 'senkrechter Abstand falsch');
assert.ok(N.punktZuStrecke([50.0, 8.005], a, b) < 0.5, 'Punkt auf der Linie ist nicht 0');
assert.ok(Math.abs(N.punktZuStrecke([50.0, 8.02], a, b) - 715) < 15, 'Abstand hinter dem Ende falsch');

// Abweichung von der Route: auf der Route nahe null, 100 m daneben rund 110 m
const linie = [[50.0, 8.0], [50.0, 8.01], [50.005, 8.01]];
assert.ok(N.abstandZurRoute([50.003, 8.01], linie) < 1, 'Punkt auf der Route gilt als abweichend');
assert.ok(Math.abs(N.abstandZurRoute([50.001, 8.005], linie) - 110.5) < 3, 'Abweichung falsch berechnet');

console.log('alle Pruefungen bestanden');
