"""Erzeugt die App-Icons. Aufruf: python logo.py"""
from PIL import Image, ImageDraw

GRUEN = (22, 88, 63, 255)
HELL = (255, 255, 255, 255)
UEBER = 6  # Overscan, danach verkleinern -> saubere Kanten

def logo(px):
    g = px * UEBER
    img = Image.new("RGBA", (g, g), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, g-1, g-1], radius=int(g*0.225), fill=GRUEN)

    x0, y0, y1 = g*0.315, g*0.175, g*0.825
    stamm, bh, rechts = g*0.125, g*0.335, g*0.695

    r = min(bh/2, (rechts-x0)/2)                       # Radius nie groesser als halbe Breite
    d.rounded_rectangle([x0, y0, rechts, y0+bh], radius=int(r), fill=HELL)
    d.rectangle([x0, y0, x0+r, y0+bh], fill=HELL)      # linke Rundung des Bogens begradigen
    d.rounded_rectangle([x0, y0, x0+stamm, y1], radius=int(stamm*0.36), fill=HELL)

    pb, ph = g*0.100, g*0.178                          # Punze im Format einer Parkbucht
    cx = (x0 + r + rechts) / 2
    d.rounded_rectangle([cx-pb/2, y0+(bh-ph)/2, cx+pb/2, y0+(bh+ph)/2],
                        radius=int(pb*0.34), fill=GRUEN)
    return img.resize((px, px), Image.LANCZOS)

def kachel(px, anteil=0.52):
    """Randlose Kachel fuer den Android-Starter. Android beschneidet Startsymbole auf
    die mittleren rund 70 % (Kreis, Quadrat, Kleeblatt), darum wird das P ueber seinen
    tatsaechlichen Umriss vermessen und auf einen festen Anteil der Kachel skaliert."""
    quelle = logo(1024)
    breite, hoehe = quelle.size
    px_q = quelle.load()
    maske = Image.new("L", quelle.size, 0)
    px_m = maske.load()
    for y in range(hoehe):
        for x in range(breite):
            r, g, b, a = px_q[x, y]
            px_m[x, y] = a if (r > 180 and g > 180 and b > 180) else 0

    kasten = maske.getbbox()                       # der reine P-Umriss
    p_maske = maske.crop(kasten)
    # Nach der laengeren Seite skalieren - das P ist deutlich hoeher als breit,
    # nach Breite skaliert wuerde es oben und unten aus dem Beschnitt ragen.
    faktor = (px * anteil) / max(p_maske.width, p_maske.height)
    ziel_b = max(1, int(p_maske.width * faktor))
    ziel_h = max(1, int(p_maske.height * faktor))
    p_maske = p_maske.resize((ziel_b, ziel_h), Image.LANCZOS)

    tafel = Image.new("RGBA", (px, px), GRUEN)
    weiss = Image.new("RGBA", p_maske.size, HELL)
    tafel.paste(weiss, ((px - ziel_b) // 2, (px - ziel_h) // 2), p_maske)
    return tafel


def startbild(px=2732):
    bild = Image.new("RGBA", (px, px), GRUEN)
    zeichen = kachel(int(px * 0.34))
    bild.paste(zeichen, ((px - zeichen.width) // 2, (px - zeichen.height) // 2), zeichen)
    return bild


if __name__ == "__main__":
    for px in (64, 180, 192, 512):
        logo(px).save(f"icon-{px}.png")
    logo(64).save("favicon.png")
    import os
    os.makedirs("assets", exist_ok=True)
    kachel(1024).save("assets/icon.png")          # Quelle fuer die Android-Startsymbole
    startbild().save("assets/splash.png")
    print("Icons erzeugt (inkl. assets/ fuer den APK-Bau)")
