"""Corta una muestra de voz (20 s de lectura limpia) de cada lector de LibriVox que ya usa Sinapse.

Sirve para elegir con el oído qué voz usar como `narrador.wav` en narrar_cuentos.py (Chatterbox) y así
narrar con una sola voz parecida todos los cuentos y novelas que hoy suenan a voz de IA distinta.

    python extraer_referencias_librivox.py            # crea ./voces_candidatas/<lector>.wav
    python extraer_referencias_librivox.py --solo librivox-luis-alberto-martin

Requiere ffmpeg. Descarga solo el principio de cada audio. Las grabaciones de LibriVox son de dominio
público, pero RECREAR la voz de una persona con IA es otra cosa: avísale (LibriVox permite contactar a
cada lector desde su perfil) y deja constancia de su permiso antes de publicar. Estas muestras NO se suben a git.
"""
import argparse
import json
import subprocess
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
SALIDA = Path(__file__).resolve().parent / "voces_candidatas"


def pistas():
    """Un audio por lector: (lector, url, segundo en que empieza el texto)."""
    vistos = {}
    archivos = list((REPO / "src/content/historias").glob("*.json")) + list((REPO / "src/content/novelas").glob("*.json"))
    for f in archivos:
        d = json.loads(f.read_text(encoding="utf-8"))
        if not isinstance(d, dict):
            continue  # catalogo.json es una lista
        items = d.get("audio", []) + [a for c in d.get("chapters", []) for a in c.get("audio", [])]
        for a in items:
            if a.get("voiceSource") == "archivo" and a.get("narratorId") not in vistos and str(a.get("url", "")).startswith("http"):
                vistos[a["narratorId"]] = (a["url"], a.get("textStartSec") or 20)
    return vistos


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--solo")
    ap.add_argument("--segundos", type=float, default=20)
    args = ap.parse_args()
    SALIDA.mkdir(exist_ok=True)
    for lector, (url, inicio) in pistas().items():
        if args.solo and lector != args.solo:
            continue
        destino = SALIDA / f"{lector}.wav"
        # 1,5 MB bastan para el primer minuto a 64 kbps
        req = urllib.request.Request(url, headers={"Range": "bytes=0-1500000", "User-Agent": "Sinapse"})
        try:
            datos = urllib.request.urlopen(req, timeout=60).read()
        except Exception as e:  # archive.org cambia de servidor: reintentar suele bastar
            print(f"{lector}: no se pudo descargar ({e})")
            continue
        tmp = SALIDA / f"{lector}.tmp.mp3"
        tmp.write_bytes(datos)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(inicio + 3), "-t", str(args.segundos), "-i", str(tmp),
                        "-ac", "1", "-ar", "24000", str(destino)], check=False)
        tmp.unlink()
        print(f"{lector}: {destino.name}")


if __name__ == "__main__":
    main()
