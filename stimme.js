// Natürliche deutsche Stimme (Piper mit der Thorsten-Stimme, gemeinfrei).
//
// Rechnet auf dem Gerät, nicht in der Cloud: nach dem einmaligen Laden von rund
// 60 MB liegt das Sprachmodell im privaten Dateispeicher des Browsers und spricht
// auch ohne Netz. Deshalb wird hier nichts fest ins Paket gebacken — die App bliebe
// sonst bei jeder Aktualisierung ein 90-MB-Download.
//
// ponytail: Modul, Lautschrift und Laufzeit kommen von öffentlichen Ausliefernetzen.
// Fallen die aus, spricht die App mit der Gerätestimme weiter — sie verstummt nie.

const PIPER_MODUL = 'https://cdn.jsdelivr.net/npm/@diffusionstudio/vits-web@1.0.3/dist/vits-web.js';
const PIPER_STIMME = 'de_DE-thorsten-medium';
const PIPER_MB = 60;

let piperModul = null, piperKlang = null, piperMarke = 0, piperLaeuft = false;

async function piperModulHolen() {
  if (!piperModul) piperModul = await import(PIPER_MODUL);
  return piperModul;
}

// Liegt das Sprachmodell schon auf dem Gerät?
async function piperVorhanden() {
  try {
    const m = await piperModulHolen();
    const da = await m.stored();
    return Array.isArray(da) && da.indexOf(PIPER_STIMME) >= 0;
  } catch (e) {
    return false;
  }
}

// Lädt das Sprachmodell. fortschritt() bekommt Werte zwischen 0 und 1.
async function piperHerunterladen(fortschritt) {
  if (piperLaeuft) return;
  piperLaeuft = true;
  try {
    const m = await piperModulHolen();
    await m.download(PIPER_STIMME, function (stand) {
      if (fortschritt && stand && stand.total) fortschritt(stand.loaded / stand.total);
    });
  } finally {
    piperLaeuft = false;
  }
}

// Bricht eine laufende Ansage ab und entwertet eine noch rechnende.
function piperStumm() {
  piperMarke++;
  if (piperKlang) {
    try { piperKlang.pause(); } catch (e) { /* schon vorbei */ }
    piperKlang = null;
  }
}

// Gemessen: rund sechs Sekunden Rechenzeit je Satz, weil die Laufzeit ohne besondere
// Sicherheitskopfzeilen einfädig läuft. Waehrend der Fahrt kaeme die Ansage damit zu
// spaet. Die Route kennt ihre Ansagen aber im Voraus - also vorher rechnen und ablegen.
const piperVorrat = new Map();          // Satz -> fertige Tonspur (null = wird gerade gerechnet)
let piperArbeit = Promise.resolve();

function piperVorbereiten(saetze) {
  (saetze || []).forEach(function (satz) {
    if (!satz || piperVorrat.has(satz)) return;
    piperVorrat.set(satz, null);
    piperArbeit = piperArbeit.then(async function () {
      try {
        const m = await piperModulHolen();
        piperVorrat.set(satz, await m.predict({ text: satz, voiceId: PIPER_STIMME }));
      } catch (e) {
        piperVorrat.delete(satz);       // beim naechsten Bedarf neu versuchen
      }
    });
  });
}

function piperVorratLeeren() {
  piperVorrat.clear();
}

// Spricht einen Satz. Ein neuer Aufruf überholt den vorherigen, damit bei schnell
// aufeinanderfolgenden Abbiegehinweisen nicht zwei Stimmen übereinander liegen.
async function piperSprechen(text) {
  piperStumm();
  const meine = piperMarke;
  // Wird der Satz gerade vorbereitet, auf die laufende Arbeit warten statt doppelt rechnen.
  if (piperVorrat.get(text) === null) { try { await piperArbeit; } catch (e) { /* egal */ } }
  let welle = piperVorrat.get(text);
  if (!welle) {
    const m = await piperModulHolen();
    welle = await m.predict({ text: text, voiceId: PIPER_STIMME });
    piperVorrat.set(text, welle);
  }
  if (meine !== piperMarke) return;                 // inzwischen überholt
  const adresse = URL.createObjectURL(welle);
  const klang = new Audio(adresse);
  piperKlang = klang;
  klang.onended = klang.onerror = function () { URL.revokeObjectURL(adresse); };
  await klang.play();
}

if (typeof module !== 'undefined') {
  module.exports = { PIPER_STIMME, PIPER_MB };
}
