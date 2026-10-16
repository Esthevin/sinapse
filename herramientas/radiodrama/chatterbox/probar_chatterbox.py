
import torch
import torchaudio
from pathlib import Path
from chatterbox.mtl_tts import ChatterboxMultilingualTTS

SALIDA = Path("audios_generados")
SALIDA.mkdir(exist_ok=True)

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

print("Dispositivo:", DEVICE)
print("Cargando Chatterbox Multilingual...")

modelo = ChatterboxMultilingualTTS.from_pretrained(
    device=DEVICE
)

texto = (
    "¡Quiero volar como tú! "
    "¡Quiero conocer el mundo desde las alturas!"
)

pruebas = {
    "natural": 0.3,
    "expresiva": 0.6,
    "muy_expresiva": 0.8,
}

for nombre, exageracion in pruebas.items():
    print(f"Generando: {nombre}")

    audio = modelo.generate(
        text=texto,
        language_id="es",
        exaggeration=exageracion,
        cfg_weight=0.5,
    )

    ruta = SALIDA / f"zorro_{nombre}.wav"

    torchaudio.save(
        str(ruta),
        audio.cpu(),
        modelo.sr
    )

    print("Guardado:", ruta)

print("Pruebas finalizadas.")
