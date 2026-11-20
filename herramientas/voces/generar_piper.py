"""Narra en castellano, con Piper (voz abierta, sin cuenta ni clave), las historias que no tienen ninguna voz en español.

    python herramientas/voces/generar_piper.py [--historia id,id] [--force]
Requiere: pip install piper-tts imageio-ffmpeg numpy soundfile  (el modelo se baja de Hugging Face la primera vez)

- Voz: es_MX «claude» (calidad alta, licencia Apache 2.0). Es una voz generada, genérica: no imita a nadie.
- Cada párrafo se sintetiza por separado y se mide su duración: el resaltado coincide con lo que se escucha.
- Si una historia ya tiene grabación humana o voz de Azure en castellano, no se toca: la app prefiere esas voces.
- Los audios largos van a docs/audio (se publican con la web y la app los baja, url «site:»).
"""
import argparse
import json
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path

import imageio_ffmpeg
import numpy as np
import soundfile as sf
from piper import PiperVoice

ROOT = Path(__file__).resolve().parents[2]
HISTORIAS = ROOT / "src" / "content" / "historias"
DOCS_AUDIO = ROOT / "docs" / "audio"
NARRADORES = ROOT / "src" / "content" / "narradores.json"
CACHE = Path(__file__).resolve().parent / ".modelos"
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
VOZ = "es/es_MX/claude/high/es_MX-claude-high"
NARRADOR = "voz-piper-es"
PAUSA_PARRAFO = 0.7


def modelo():
    CACHE.mkdir(exist_ok=True)
    base = f"https://huggingface.co/rhasspy/piper-voices/resolve/main/{VOZ}"
    onnx = CACHE / (Path(VOZ).name + ".onnx")
    for ext in (".onnx", ".onnx.json"):
        f = CACHE / (Path(VOZ).name + ext)
        if not f.exists():
            urllib.request.urlretrieve(base + ext, f)
    return PiperVoice.load(str(onnx))


def asegurar_narrador():
    lista = json.loads(NARRADORES.read_text(encoding="utf-8"))
    if any(n["id"] == NARRADOR for n in lista):
        return
    lista.append({
        "id": NARRADOR,
        "name": "Luz",
        "role": "voz_sintetica",
        "bio": "Voz de Sinapse para leer en castellano las historias que aún no tienen narrador.",
        "languages": ["es"],
        "credit": "Creada con Piper (voz es_MX «claude», licencia Apache 2.0). Se reemplaza por una voz humana en cuanto haya narrador.",
    })
    NARRADORES.write_text(json.dumps(lista, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--historia")
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()
    solo = set(a.historia.split(",")) if a.historia else None
    voz = modelo()
    asegurar_narrador()
    DOCS_AUDIO.mkdir(parents=True, exist_ok=True)
    for ruta in sorted(HISTORIAS.glob("*.json")):
        s = json.loads(ruta.read_text(encoding="utf-8"))
        ps = s["paragraphs"].get("es")
        if not ps or (solo and s["id"] not in solo):
            continue
        otras = [x for x in s["audio"] if x["lang"] == "es" and x["narratorId"] != NARRADOR]
        if otras or (not a.force and any(x["narratorId"] == NARRADOR for x in s["audio"])):
            continue
        trozos, inicios, t, sr = [], [], 0.0, 22050
        for p in ps:
            inicios.append(round(t, 3))
            for c in voz.synthesize(p):
                sr = c.sample_rate
                trozos.append(c.audio_float_array)
                t += len(c.audio_float_array) / sr
            trozos.append(np.zeros(int(PAUSA_PARRAFO * sr), dtype="float32"))
            t += PAUSA_PARRAFO
        y = np.concatenate(trozos)
        y = y * (0.9 / (float(np.abs(y).max()) or 1.0))
        salida = DOCS_AUDIO / f"{s['id']}.es.mp3"
        with tempfile.TemporaryDirectory() as tmp:
            wav = Path(tmp) / "x.wav"
            sf.write(wav, y, sr, subtype="PCM_16")
            subprocess.run([FFMPEG, "-nostdin", "-y", "-loglevel", "error", "-i", str(wav), "-codec:a", "libmp3lame", "-ac", "1", "-b:a", "48k", str(salida)], check=True)
        s["audio"] = [x for x in s["audio"] if x["narratorId"] != NARRADOR]
        s["audio"].append({
            "lang": "es",
            "narratorId": NARRADOR,
            "voiceSource": "sintetica",
            "url": f"site:{salida.name}",
            "license": "Creada con Piper (voz es_MX «claude», licencia Apache 2.0).",
            "durationSec": round(len(y) / sr, 3),
            "paragraphStartsSec": inicios,
        })
        ruta.write_text(json.dumps(s, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"  ✓ {s['id']}: {len(y) / sr:.0f} s, {len(ps)} párrafos", flush=True)


if __name__ == "__main__":
    sys.exit(main())
