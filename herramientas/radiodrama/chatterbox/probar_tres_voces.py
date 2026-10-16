
from pathlib import Path
import torch
import torchaudio
from chatterbox.mtl_tts import ChatterboxMultilingualTTS

BASE = Path(__file__).resolve().parent
REFERENCIAS = BASE / "voces_referencia"
SALIDA = BASE / "audios_generados" / "tres_voces"
SALIDA.mkdir(parents=True, exist_ok=True)

PERSONAJES = {
    "narrador": {
        "texto": (
            "Hace mucho tiempo, entre las montañas de los Andes, "
            "vivía un pequeño zorro que soñaba con volar."
        ),
        "exaggeration": 0.45,
    },
    "zorro": {
        "texto": (
            "¡Amigo cóndor! ¡Quiero volar como tú! "
            "¿Crees que algún día podré conocer el cielo?"
        ),
        "exaggeration": 0.60,
    },
    "condor": {
        "texto": (
            "Pequeño amigo, el cielo es hermoso, "
            "pero también tiene sus peligros. "
            "Debes aprender a conocer el viento."
        ),
        "exaggeration": 0.55,
    },
}

for nombre in PERSONAJES:
    ruta = REFERENCIAS / f"{nombre}.wav"
    if not ruta.is_file():
        raise FileNotFoundError(f"Falta: {ruta}")

device = "cuda" if torch.cuda.is_available() else "cpu"
print("Dispositivo:", device)
print("Cargando Chatterbox...")

modelo = ChatterboxMultilingualTTS.from_pretrained(
    device=device
)

for nombre, datos in PERSONAJES.items():
    print(f"Generando personaje: {nombre}")

    with torch.inference_mode():
        audio = modelo.generate(
            text=datos["texto"],
            language_id="es",
            audio_prompt_path=str(
                REFERENCIAS / f"{nombre}.wav"
            ),
            exaggeration=datos["exaggeration"],
            cfg_weight=0.3,
        )

    if audio.ndim == 1:
        audio = audio.unsqueeze(0)

    destino = SALIDA / f"{nombre}_prueba.wav"

    torchaudio.save(
        str(destino),
        audio.detach().cpu(),
        modelo.sr
    )

    print("Guardado:", destino)

print("Tres pruebas generadas.")
