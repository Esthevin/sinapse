"""Mide dónde empieza y dónde termina el texto en las grabaciones de LibriVox y lo guarda en los JSON.

Cada archivo de LibriVox empieza con una presentación («Esta es una grabación de LibriVox… dominio público… narrado por…»)
y termina con un cierre («Fin de…»). La app salta ese tramo con `textStartSec` y `textEndSec`. Las presentaciones no son
iguales en todos los archivos, así que se miden con reconocimiento de voz (Vosk, modelo pequeño en español): se reconocen
las primeras palabras del audio y se busca dónde empiezan las del texto; con el final, igual. Solo se baja el principio
(~1 MB) y el final (~1 MB) de cada MP3.

Preparación (una vez):
    pip install vosk                      # si falla por "srt": pip install srt  (o  pip install --no-deps vosk cffi tqdm requests websockets)
    descarga https://alphacephei.com/vosk/models/vosk-model-small-es-0.42.zip y descomprímelo
    (también hace falta ffmpeg)

Uso:
    python herramientas/novelas/recortes.py --modelo <carpeta-del-modelo> --cuentos     # cuentos con voz humana
    python herramientas/novelas/recortes.py --modelo <carpeta-del-modelo> --novelas     # novelas
Escribe textStartSec / textEndSec en los JSON. Si no encuentra el texto en el audio, deja el valor anterior y lo avisa.
"""
import difflib
import json
import re
import subprocess
import sys
import tempfile
import unicodedata
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
UA = {"User-Agent": "SinapseBot/1.0 (https://github.com/Esthevin/sinapse)"}
INICIO_BYTES = 750_000   # ~94 s a 64 kbps
FINAL_BYTES = 800_000    # ~100 s
BPS = 64_000 / 8
VENTANA_INICIO = 75      # segundos de audio que se reconocen al principio
VENTANA_FINAL = 95


def norm(s):
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.findall(r"[a-z0-9ñ]+", s)


def pedir(url, rango, intentos=10):
    """Pide un trozo del MP3. archive.org reparte las descargas entre varios servidores; si uno falla, se reintenta."""
    ultimo = None
    for _ in range(intentos):
        try:
            req = urllib.request.Request(url, headers={**UA, "Range": rango})
            with urllib.request.urlopen(req, timeout=120) as r:
                total = None
                cr = r.headers.get("Content-Range")
                if cr and "/" in cr:
                    total = int(cr.rsplit("/", 1)[1])
                return r.read(), total
        except Exception as e:  # servidor caído, red, proxy…
            ultimo = e
    raise ultimo


def reconocer(modelo, datos, segundos, desde=0.0):
    """Palabras reconocidas [(palabra, inicio, fin)] con tiempos desde el inicio del trozo, sumando `desde`."""
    from vosk import KaldiRecognizer, SetLogLevel

    SetLogLevel(-1)
    with tempfile.NamedTemporaryFile(suffix=".mp3") as f:
        f.write(datos)
        f.flush()
        pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", f.name, "-t", str(segundos), "-ar", "16000", "-ac", "1", "-f", "s16le", "-"], capture_output=True).stdout
    rec = KaldiRecognizer(modelo, 16000)
    rec.SetWords(True)
    out = []
    for i in range(0, len(pcm), 16000):
        if rec.AcceptWaveform(pcm[i:i + 16000]):
            out += json.loads(rec.Result()).get("result", [])
    out += json.loads(rec.FinalResult()).get("result", [])
    return [(w["word"], w["start"] + desde, w["end"] + desde) for w in out]


def buscar(palabras, objetivo, desde_seg=0.0, ultimo=False, minimo=0.72):
    """Índice de la mejor coincidencia de `objetivo` (lista de palabras) dentro de las palabras reconocidas, o None."""
    n = len(objetivo)
    if n == 0 or len(palabras) < n:
        return None
    meta = " ".join(objetivo)
    mejores = []
    for i in range(len(palabras) - n + 1):
        if palabras[i][1] < desde_seg:
            continue
        r = difflib.SequenceMatcher(None, " ".join(p[0] for p in palabras[i:i + n]), meta).ratio()
        if r >= minimo:
            mejores.append((i, r))
    if not mejores:
        return None
    return mejores[-1][0] if ultimo else mejores[0][0]


def medir(modelo, url, parrafos, duracion=None):
    """(textStartSec, textEndSec) de una grabación según el texto que lee. Cada valor puede ser None si no se encontró."""
    ini, total = pedir(url, f"bytes=0-{INICIO_BYTES - 1}")
    pal = reconocer(modelo, ini, VENTANA_INICIO)
    # Tras la presentación («…dominio público») viene el título o el texto: se busca desde el primer «público».
    pub = next((p[2] for p in pal if p[0] in ("publico", "público")), 0.0)
    start = None
    # 1) el primer párrafo (o el título, si es corto); 2) el primer párrafo largo.
    candidatos = [(0, parrafos[0])]
    largo = next(((i, p) for i, p in enumerate(parrafos) if len(norm(p)) >= 6), None)
    if largo and largo[0] != 0:
        candidatos.append(largo)
    for idx, par in candidatos:
        w = norm(par)
        n = min(5 if len(w) >= 5 else len(w), 5)
        if n < 2:
            continue
        i = buscar([(norm(p[0])[0] if norm(p[0]) else p[0], p[1], p[2]) for p in pal], w[:n], pub)
        if i is not None:
            t = pal[i][1]
            # Si fue el párrafo largo y antes había un título corto, el título se dice un poco antes.
            start = round(max(0.0, t - (2.0 if idx != 0 else 0.1)), 1)
            break
    end = None
    if total and parrafos:
        dur = duracion or total / BPS
        fin, _ = pedir(url, f"bytes={max(0, total - FINAL_BYTES)}-{total - 1}")
        t0 = dur - len(fin) / BPS
        pal_f = reconocer(modelo, fin, VENTANA_FINAL, t0)
        w = norm(parrafos[-1])
        n = min(5, len(w))
        if n >= 2:
            i = buscar([(norm(p[0])[0] if norm(p[0]) else p[0], p[1], p[2]) for p in pal_f], w[-n:], 0.0, ultimo=True)
            if i is not None:
                end = round(pal_f[i + n - 1][2] + 0.4, 1)
    return start, end


def main():
    args = sys.argv[1:]
    if "--modelo" not in args or not any(a in args for a in ("--cuentos", "--novelas")):
        print(__doc__)
        return
    from vosk import Model

    modelo = Model(args[args.index("--modelo") + 1])
    novelas = "--novelas" in args
    carpeta = ROOT / "src" / "content" / ("novelas" if novelas else "historias")
    solo = args[args.index("--solo") + 1].split(",") if "--solo" in args else None
    for f in sorted(carpeta.glob("*.json")):
        if f.name == "catalogo.json" or (solo and f.stem not in solo):
            continue
        d = json.loads(f.read_text(encoding="utf-8"))
        items = []  # (pista, párrafos)
        if novelas:
            for c in d["chapters"]:
                items += [(a, c["paragraphs"]["es"]) for a in c.get("audio", []) if a["url"].startswith("https://archive.org")]
        else:
            items = [(a, d["paragraphs"]["es"]) for a in d.get("audio", []) if a.get("voiceSource") == "archivo" and a["url"].startswith("https://archive.org")]
        if not items:
            continue
        print(f.stem)
        for a, par in items:
            nombre = a["url"].rsplit("/", 1)[-1]
            # --pendientes: salta lo ya medido (valores distintos de los predeterminados 22 s / duración - 8 s).
            if "--pendientes" in args and a.get("textStartSec", 22) != 22 and a.get("textEndSec") != (a.get("durationSec") or 0) - 8:
                continue
            try:
                st, en = medir(modelo, a["url"], par, a.get("durationSec"))
            except Exception as e:
                print(f"  ! {nombre}: {e}")
                continue
            dur = a.get("durationSec")
            if st is not None:
                a["textStartSec"] = st
            if en is not None and (not dur or en <= dur + 1):
                a["textEndSec"] = min(en, dur) if dur else en
            aviso = "" if st is not None and en is not None else "  (revisar a mano: no se encontró " + ("el inicio" if st is None else "el final") + ")"
            print(f"  {nombre[:46]:46} inicio {st}  fin {en}  de {dur}{aviso}", flush=True)
            # Se guarda después de cada archivo: si se corta la conexión, lo medido no se pierde.
            f.write_text(json.dumps(d, ensure_ascii=False, indent=1 if novelas else 2) + "\n", encoding="utf-8")
        f.write_text(json.dumps(d, ensure_ascii=False, indent=1 if novelas else 2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
