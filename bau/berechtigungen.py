"""Traegt die Android-Berechtigungen ins erzeugte Manifest nach.

Capacitor legt ein Manifest an, das nur INTERNET anmeldet. Ohne Standortrecht
bekommt die Web-Ansicht die Freigabe nie zu sehen und navigator.geolocation
scheitert stumm - genau der Fehler, den die erste APK hatte.

Aufruf im Bau:  python3 bau/berechtigungen.py
"""
import pathlib
import sys

RECHTE = ("ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION", "RECORD_AUDIO")

# Android 11 und neuer verlangt diese Abfrage, sonst findet die App keinen
# Spracherkenner, obwohl einer installiert ist.
ABFRAGE = (
    "    <queries><intent><action "
    'android:name="android.speech.RecognitionService" /></intent></queries>'
)


def main():
    pfad = pathlib.Path("android/app/src/main/AndroidManifest.xml")
    if not pfad.exists():
        sys.exit("Manifest nicht gefunden: " + str(pfad))

    text = pfad.read_text(encoding="utf-8")
    zusatz = [
        '    <uses-permission android:name="android.permission.%s" />' % recht
        for recht in RECHTE
        if recht not in text
    ]
    if "RecognitionService" not in text:
        zusatz.append(ABFRAGE)

    if zusatz:
        text = text.replace("</manifest>", "\n".join(zusatz) + "\n</manifest>")
        pfad.write_text(text, encoding="utf-8")
        print("ergaenzt:", len(zusatz), "Eintraege")
    else:
        print("nichts zu ergaenzen")

    for recht in RECHTE:
        if recht not in text:
            sys.exit("FEHLER: " + recht + " fehlt trotz Nachtrag im Manifest")
    print(text)


if __name__ == "__main__":
    main()
