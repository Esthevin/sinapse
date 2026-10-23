"""Narra historias en lenguas originarias con Meta MMS-TTS (voz sintetica, BORRADOR).

Uso:  python herramientas/voces/generar_mms.py <lengua> [--historia id,id] [--force]
      (lengua: una de las de MODELOS; ver abajo)
Requiere: pip install torch transformers scipy soundfile numpy imageio-ffmpeg

- Lee paragraphs[<lengua>] de cada historia, sintetiza cada frase y cada parrafo, mide el segundo exacto
  en que empieza cada parrafo y guarda assets/audio/<id>.<lengua>.mp3 + la entrada "audio" en el JSON.
- LICENCIA: los modelos MMS-TTS de Meta son CC BY-NC 4.0 (solo uso NO comercial). Sirven para pilotos
  educativos sin fines de lucro. No se debe vender una app que los incluya sin otra licencia.
- Es una voz SINTETICA y el texto es un BORRADOR: la app lo indica. Cuando haya narradores nativos, la app
  prefiere siempre su grabacion (prioridad de voces).
- Despues ejecuta:  node scripts/generar-voces-peruanas.mjs --solo-mapa   y   npm run validar
"""
import argparse
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import imageio_ffmpeg
import numpy as np
import soundfile as sf
import torch
from transformers import AutoTokenizer, VitsModel

ROOT = Path(__file__).resolve().parents[2]
HISTORIAS = ROOT / "src" / "content" / "historias"
AUDIO = ROOT / "assets" / "audio"
NARRADORES = ROOT / "src" / "content" / "narradores.json"
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

# lengua de Sinapse -> (modelo de Hugging Face, id del perfil de narrador)
MODELOS = {
    "quz": ("facebook/mms-tts-quz", "voz-mms-quz", "Quechua cusqueño"),
    "quy": ("facebook/mms-tts-quy", "voz-mms-quy", "Quechua ayacuchano"),
}
PAUSA_FRASE = 0.30
PAUSA_PARRAFO = 0.70


def limpiar(texto: str) -> str:
    """Deja solo lo que entiende el modelo: letras en minuscula, ' y -."""
    t = texto.lower().replace("’", "'").replace("‘", "'")
    t = re.sub(r"[^a-zñáéíóúü'\- ]", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def frases(parrafo: str):
    partes = re.split(r"(?<=[.!?…:;])\s+|\s+—\s*|[«»“”\"]", parrafo)
    return [p for p in (limpiar(x) for x in partes) if len(p) > 1]


def sintetizar(modelo, tok, texto):
    entrada = tok(texto, return_tensors="pt")
    with torch.no_grad():
        onda = modelo(**entrada).waveform[0].float().numpy()
    return onda


def asegurar_narrador(id_, lengua, nombre, modelo_hf):
    lista = json.loads(NARRADORES.read_text(encoding="utf-8"))
    if any(n["id"] == id_ for n in lista):
        return
    lista.append({
        "id": id_,
        "name": f"Voz sintética MMS ({nombre})",
        "role": "voz_sintetica",
        "bio": f"Voz generada por inteligencia artificial (Meta MMS-TTS, {modelo_hf}). No es una persona: es un borrador mientras se consiguen narradores nativos.",
        "languages": [lengua],
        "region": "sierra",
        "credit": "Voz sintética de Meta MMS-TTS (CC BY-NC 4.0, uso no comercial). Borrador pendiente de revisión por hablantes nativos; se reemplaza por una voz humana en cuanto haya narrador.",
    })
    NARRADORES.write_text(json.dumps(lista, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("lengua", choices=sorted(MODELOS))
    ap.add_argument("--historia", help="ids separados por coma")
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()
    modelo_hf, narrador_id, nombre = MODELOS[a.lengua]
    solo = set(a.historia.split(",")) if a.historia else None

    print("Cargando", modelo_hf)
    torch.manual_seed(0)
    tok = AutoTokenizer.from_pretrained(modelo_hf)
    modelo = VitsModel.from_pretrained(modelo_hf).eval()
    sr = modelo.config.sampling_rate
    asegurar_narrador(narrador_id, a.lengua, nombre, modelo_hf)
    AUDIO.mkdir(parents=True, exist_ok=True)

    for ruta in sorted(HISTORIAS.glob("*.json")):
        s = json.loads(ruta.read_text(encoding="utf-8"))
        parrafos = s["paragraphs"].get(a.lengua)
        if not parrafos or (solo and s["id"] not in solo):
            continue
        ya = any(x["lang"] == a.lengua and x["voiceSource"] == "sintetica" for x in s["audio"])
        if ya and not a.force:
            print(f"  = {s['id']}: ya tiene audio (usa --force)")
            continue
        trozos, inicios, t = [], [], 0.0
        for p in parrafos:
            inicios.append(round(t, 3))
            for i, f in enumerate(frases(p)):
                onda = sintetizar(modelo, tok, f)
                trozos.append(onda)
                trozos.append(np.zeros(int(PAUSA_FRASE * sr), dtype="float32"))
                t += len(onda) / sr + PAUSA_FRASE
            trozos.append(np.zeros(int(PAUSA_PARRAFO * sr), dtype="float32"))
            t += PAUSA_PARRAFO
        y = np.concatenate(trozos)
        pico = float(np.abs(y).max()) or 1.0
        y = y * (0.9 / pico)
        with tempfile.TemporaryDirectory() as tmp:
            wav = Path(tmp) / "x.wav"
            sf.write(wav, y, sr, subtype="PCM_16")
            salida = AUDIO / f"{s['id']}.{a.lengua}.mp3"
            subprocess.run([FFMPEG, "-nostdin", "-y", "-loglevel", "error", "-i", str(wav), "-codec:a", "libmp3lame", "-b:a", "64k", str(salida)], check=True)
        s["audio"] = [x for x in s["audio"] if not (x["lang"] == a.lengua and x["voiceSource"] == "sintetica")]
        s["audio"].append({
            "lang": a.lengua,
            "narratorId": narrador_id,
            "voiceSource": "sintetica",
            "url": f"bundle:{salida.name}",
            "license": f"Voz sintética Meta MMS-TTS ({modelo_hf}), licencia CC BY-NC 4.0: solo uso no comercial. Borrador: texto y voz sin revisión de hablantes nativos.",
            "durationSec": round(len(y) / sr, 3),
            "paragraphStartsSec": inicios,
        })
        ruta.write_text(json.dumps(s, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"  ✓ {s['id']}: {len(y)/sr:.0f} s, {len(parrafos)} párrafos")


if __name__ == "__main__":
    sys.exit(main())
