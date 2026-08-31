# Parkfuchs

Findet Parkmöglichkeiten rund um ein Ziel und führt dich hin — in **Deutschland, Österreich
und Italien**, flächendeckend, auch im Dorf und nicht nur in Großstädten.

Ziel eingeben oder diktieren, oder die App beim Start einfach den eigenen Standort nehmen
lassen. Du bekommst eine nach Entfernung sortierte Liste plus Karte, mit Gebühr, Preis
(soweit hinterlegt), Anwohner-Beschränkung, Höchstparkdauer, Kapazität und Einfahrtshöhe.
Ein Tipp auf einen Eintrag startet die Routenführung mit deutschen Sprachansagen.

## Was die App kann — und was nicht

**Sie sagt dir nicht, ob ein Platz gerade frei ist.** Flächendeckende Echtzeit-Belegung
gibt es für diese drei Länder nirgends kostenlos; Live-Daten liefern nur einzelne Großstädte,
jede in einem anderen Format. Was die App stattdessen beantwortet: *wo* darf ich hier parken,
zu welchen Bedingungen, und wie komme ich hin.

**Preise stehen selten in den Daten.** Stichprobe: von 106 kostenpflichtigen Parkflächen in
Kassel hat genau eine einen Preis hinterlegt, in Verona keine von 47. Wo ein Preis da ist,
wird er angezeigt. Sonst steht ehrlich „Preis nicht hinterlegt“ statt einer Erfindung.
Über „alle Angaben“ siehst du zu jedem Eintrag sämtliche Rohdaten, deutsch beschriftet.

**Italien: ZTL-Zonen sind nicht abgedeckt.** In Fahrverbotszonen einzufahren kostet Strafe;
OpenStreetMap erfasst die nur lückenhaft. Darauf verlässt sich die App nicht.

## Auf dem Handy installieren

**Als Web-App (sofort):** Seite im Browser öffnen, dann „Zum Startbildschirm hinzufügen“.
Danach eigenes Symbol, Vollbild, kein Browser-Rahmen.

**Als APK (Android):** unter [Releases](../../releases) liegt `parkfuchs.apk`. Herunterladen,
Installation aus unbekannten Quellen erlauben, installieren. Bei neueren Samsung-Geräten muss
zusätzlich die „Automatische Blockierung“ unter Sicherheit aus sein.

Das Paket ist ein Release-Bau, fest signiert mit einem Schlüssel aus den Repo-Geheimnissen
(nie im Repo selbst). Dadurch lässt sich eine neue Fassung über eine installierte legen, ohne
vorher zu deinstallieren; die Versionsnummer zählt mit jedem Bau hoch. Für den Play Store
wäre es trotzdem nicht gedacht.

Meldet das Handy „Problem beim Parsen des Pakets“, ist fast immer der Download unvollständig:
Größe und SHA-256 stehen in der Freigabe-Beschreibung, beides lässt sich vergleichen.

## Datenquellen

| Zweck | Dienst |
|---|---|
| Parkflächen und Straßenrand-Regeln | OpenStreetMap über Overpass |
| Adresse → Koordinaten | Nominatim |
| Kartenbilder | OpenStreetMap |
| Routen und Abbiegehinweise | OSRM |

Alle öffentlich und kostenlos, alle gedrosselt. Overpass fällt gelegentlich aus; die App
meldet das dann klar und bietet einen Wiederholen-Knopf, statt endlos zu laden.

## Aufbau

    index.html    Oberfläche und Ablauf
    park.js       Auswertung der OSM-Parkdaten, deutsche Beschriftung der Rohdaten
    navi.js       Routen, deutsche Abbiegeanweisungen, Abweichungserkennung
    test.js       Selbstprüfung, Aufruf: node test.js
    logo.py       erzeugt sämtliche Symbole, Aufruf: python logo.py

Kein Bauwerkzeug, keine Abhängigkeiten. Die Dateien lassen sich direkt ausliefern.
Für den Browser wird nur Leaflet nachgeladen (Karte).

## Prüfen

    node test.js

Prüft die Stellen, an denen Fehler teuer wären: fehlende Gebührenangabe darf nicht als
„kostenlos“ durchgehen, Höhenangaben mit Komma müssen richtig gelesen werden, Anweisungen
dürfen nie leer oder englisch herauskommen, und die Abweichungserkennung muss stimmen.
