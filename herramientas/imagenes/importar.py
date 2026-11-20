"""Prepara las portadas reales (dominio público) y escribe el mapa para la app.

    python herramientas/imagenes/importar.py <carpeta_con_descargas>

La carpeta tiene <nombre>.jpg|png|gif y meta.json (archivo de Commons, página, licencia, autor),
como los deja la descarga desde la API de Wikimedia Commons. Solo se aceptan imágenes en dominio público.
Escribe assets/imagenes/<nombre>.jpg (512×512, recorte centrado arriba), src/content/imagenes-mapa.ts
y assets/imagenes/CREDITOS.md.
"""
import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "assets" / "imagenes"
MAPA = ROOT / "src" / "content" / "imagenes-mapa.ts"

# imagen -> historias o novelas que la usan
ASIGNACION = {
    "palma": ["polvos-de-la-condesa", "duendes-del-cuzco", "alma-de-fray-venancio", "amor-de-madre",
              "justicia-mayor-laycacota", "oficiosidad-no-agradecida", "alacran-fray-gomez", "a-la-carcel-todo-cristo"],
    "valdelomar": ["el-caballero-carmelo", "caballero-carmelo", "hebaristo"],
    "valdelomar-joven": ["vuelo-de-los-condores", "ojos-de-judas"],
    "vallejo": ["paco-yunque", "el-vencedor", "los-caynas"],
    "quiroga": ["tortuga-gigante", "loro-pelado"],
    "quiroga-1897": ["medias-de-los-flamencos", "gama-ciega"],
    "matto": ["aves-sin-nido"],
    "lazarillo": ["lazarillo-de-tormes"],
    "isaacs": ["maria"],
    "galdos": ["dona-perfecta"],
    "poma-manco": ["manco-capac", "los-hermanos-ayar"],
    "inca-manco": ["hermanos-ayar", "el-camino-hacia-el-sol", "chaymanta-huaynuy"],
    "titicaca": ["lago-titicaca"],
}


def cuadrar(im, lado=512):
    im = im.convert("RGB")
    w, h = im.size
    c = min(w, h)
    # Retratos: se recorta desde arriba (la cara suele estar en el tercio superior).
    top = 0 if h > w else 0
    left = (w - c) // 2
    im = im.crop((left, top, left + c, top + c))
    return im.resize((lado, lado), Image.LANCZOS)


def main():
    src = Path(sys.argv[1])
    meta = json.loads((src / "meta.json").read_text(encoding="utf-8"))
    OUT.mkdir(parents=True, exist_ok=True)
    mapa, creditos = {}, []
    for nombre, usos in ASIGNACION.items():
        f = next((p for p in src.glob(f"{nombre}.*") if p.suffix.lower() in (".jpg", ".jpeg", ".png", ".gif")), None)
        m = meta.get(nombre)
        if not f or not m:
            print("  falta", nombre)
            continue
        if "public domain" not in (m.get("licencia") or "").lower() and "dominio público" not in (m.get("licencia") or "").lower():
            print("  se omite (licencia)", nombre, m.get("licencia"))
            continue
        cuadrar(Image.open(f)).save(OUT / f"{nombre}.jpg", quality=85, optimize=True)
        for u in usos:
            mapa[u] = nombre
        creditos.append(f"| `{nombre}.jpg` | [{m['archivo']}]({m['pagina']}) | {m['licencia']} | {', '.join(usos)} |")
    lineas = [f"  '{k}': require('../../assets/imagenes/{v}.jpg')," for k, v in sorted(mapa.items())]
    MAPA.write_text(
        "// Generado por herramientas/imagenes/importar.py: no editar a mano.\n"
        "export const IMAGENES: Record<string, number> = {\n" + "\n".join(lineas) + "\n};\n",
        encoding="utf-8",
    )
    (OUT / "CREDITOS.md").write_text(
        "# Imágenes de las portadas\n\nImágenes de dominio público tomadas de Wikimedia Commons (retratos de los autores, "
        "ediciones antiguas y dibujos de época). No son ilustraciones generadas.\n\n"
        "| Archivo | Fuente | Licencia | Se usa en |\n|---|---|---|---|\n" + "\n".join(creditos) + "\n",
        encoding="utf-8",
    )
    print(f"{len(creditos)} imágenes, {len(mapa)} portadas")


if __name__ == "__main__":
    main()
