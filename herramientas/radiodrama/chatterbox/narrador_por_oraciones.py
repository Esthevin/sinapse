
from pathlib import Path
import json

import numpy as np
import soundfile as sf
import torch

from chatterbox.mtl_tts import ChatterboxMultilingualTTS

# RUTAS
BASE = Path(__file__).resolve().parent
REFERENCIA = BASE / "voces_referencia" / "narrador.wav"
SALIDA = BASE / "audios_generados" / "narrador_segmentado"

SALIDA.mkdir(parents=True, exist_ok=True)

# TEXTO: conservar las oraciones originales
ORACIONES = [
    "Hace mucho tiempo, entre las montañas de los Andes, vivía un pequeño zorro que soñaba con alcanzar el cielo.",
    "Cada mañana cruzaba los cerros, avanzaba entre las rocas y observaba cómo el sol iluminaba los valles.",
    "Cierto día, mientras descansaba cerca de un riachuelo, escuchó el sonido de unas enormes alas.",
    "Al levantar la cabeza, descubrió a un majestuoso cóndor que descendía lentamente desde las alturas.",
    "El zorro sintió una enorme emoción.",
    "Su corazón comenzó a latir con fuerza.",
    "Quizás aquel encuentro sería el comienzo de una aventura extraordinaria.",
    "Pero había algo que todavía desconocía: el cielo, aunque parecía tranquilo y hermoso, escondía grandes peligros."
]

EXPRESIVIDAD = 0.45
CFG_WEIGHT = 0.3
PAUSA_SEG = 0.35

if not REFERENCIA.is_file():
    raise FileNotFoundError(
        f"No encuentro la voz: {REFERENCIA}"
    )

device = "cuda" if torch.cuda.is_available() else "cpu"
print("Dispositivo:", device)

print("Cargando Chatterbox...")
modelo = ChatterboxMultilingualTTS.from_pretrained(
    device=device
)

sr = modelo.sr

# GENERAR CADA ORACIÓN
for i, texto in enumerate(ORACIONES, start=1):

    archivo = SALIDA / f"oracion_{i:02d}.wav"

    if archivo.exists():
        print(f"Conservando oración {i:02d}")
        continue

    print(f"Generando oración {i:02d}: {texto}")

    with torch.inference_mode():
        audio = modelo.generate(
            text=texto,
            language_id="es",
            audio_prompt_path=str(REFERENCIA),
            exaggeration=EXPRESIVIDAD,
            cfg_weight=CFG_WEIGHT,
        )

    señal = audio.detach().cpu().numpy().squeeze()
    señal = np.asarray(señal, dtype=np.float32)

    if not np.isfinite(señal).all():
        raise ValueError(f"Audio inválido en oración {i}")

    sf.write(archivo, señal, sr, subtype="PCM_16")
    print(f"Guardado: {archivo.name}")

# UNIR LAS ORACIONES
fragmentos = []

for i in range(1, len(ORACIONES) + 1):
    archivo = SALIDA / f"oracion_{i:02d}.wav"
    señal, frecuencia = sf.read(
        archivo, dtype="float32"
    )

    if frecuencia != sr:
        raise ValueError("Frecuencias incompatibles")

    if señal.ndim == 2:
        señal = señal.mean(axis=1)

    fragmentos.append(señal)

    if i < len(ORACIONES):
        pausa = np.zeros(
            int(PAUSA_SEG * sr),
            dtype=np.float32
        )
        fragmentos.append(pausa)

resultado = np.concatenate(fragmentos)

archivo_final = SALIDA / "narrador_completo.wav"

sf.write(
    archivo_final,
    resultado,
    sr,
    subtype="PCM_16"
)

# GUARDAR TEXTO EXACTO PARA REVISIÓN
manifiesto = [
    {
        "numero": i,
        "archivo": f"oracion_{i:02d}.wav",
        "texto_esperado": texto,
        "revision": "pendiente"
    }
    for i, texto in enumerate(ORACIONES, start=1)
]

with open(
    SALIDA / "revision.json",
    "w",
    encoding="utf-8"
) as f:
    json.dump(
        manifiesto,
        f,
        ensure_ascii=False,
        indent=2
    )

print("\nNarración generada:")
print(archivo_final)
print("Duración:", round(len(resultado) / sr, 2), "s")
print("Revisión pendiente de las 8 oraciones.")
