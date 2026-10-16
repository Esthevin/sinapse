
from pathlib import Path
import torch
import torchaudio

from chatterbox.mtl_tts import ChatterboxMultilingualTTS

# ==========================================
# CONFIGURACIÓN
# ==========================================

BASE = Path(__file__).resolve().parent

CARPETA_REFERENCIAS = BASE / "voces_referencia"
CARPETA_SALIDA = BASE / "audios_generados"

CARPETA_SALIDA.mkdir(parents=True, exist_ok=True)

VOZ_REFERENCIA = CARPETA_REFERENCIAS / "narrador.wav"
ARCHIVO_SALIDA = CARPETA_SALIDA / "narrador_clonado.wav"

# Texto de prueba: escena 1 de Sinapse

TEXTO = (
    "Hace mucho tiempo, entre las montañas de los Andes, "
    "vivía un pequeño zorro que soñaba con alcanzar el cielo. "
    "Cada mañana cruzaba los cerros, avanzaba entre las rocas "
    "y observaba cómo el sol iluminaba los valles. "

    "Cierto día, mientras descansaba cerca de un riachuelo, "
    "escuchó el sonido de unas enormes alas. "
    "Al levantar la cabeza, descubrió a un majestuoso cóndor "
    "que descendía lentamente desde las alturas. "

    "El zorro sintió una enorme emoción. "
    "Su corazón comenzó a latir con fuerza. "
    "Quizás aquel encuentro sería el comienzo "
    "de una aventura extraordinaria. "

    "Pero había algo que todavía desconocía: "
    "el cielo, aunque parecía tranquilo y hermoso, "
    "escondía grandes peligros."
)


# Parámetros de Chatterbox
IDIOMA = "es"
EXPRESIVIDAD = 0.45
CFG_WEIGHT = 0.5

# ==========================================
# COMPROBAR REFERENCIA
# ==========================================

if not VOZ_REFERENCIA.is_file():
    raise FileNotFoundError(
        f"No encuentro la grabación: {VOZ_REFERENCIA}"
    )

informacion = torchaudio.info(str(VOZ_REFERENCIA))

print("Referencia:", VOZ_REFERENCIA)
print("Duración:", round(
    informacion.num_frames / informacion.sample_rate, 2
), "segundos")
print("Muestreo:", informacion.sample_rate, "Hz")
print("Canales:", informacion.num_channels)

# ==========================================
# SELECCIONAR DISPOSITIVO
# ==========================================

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

print("Dispositivo:", DEVICE)

# ==========================================
# CARGAR MODELO
# ==========================================

print("Cargando Chatterbox Multilingual...")

modelo = ChatterboxMultilingualTTS.from_pretrained(
    device=DEVICE
)

# ==========================================
# GENERAR AUDIO
# ==========================================

print("Generando voz del narrador...")

with torch.inference_mode():
    audio = modelo.generate(
        text=TEXTO,
        language_id=IDIOMA,
        audio_prompt_path=str(VOZ_REFERENCIA),
        exaggeration=EXPRESIVIDAD,
        cfg_weight=CFG_WEIGHT,
    )

# ==========================================
# GUARDAR RESULTADO
# ==========================================

audio = audio.detach().cpu()

if audio.ndim == 1:
    audio = audio.unsqueeze(0)

torchaudio.save(
    str(ARCHIVO_SALIDA),
    audio,
    modelo.sr
)

duracion = audio.shape[-1] / modelo.sr

print("----------------------------------")
print("Audio generado correctamente")
print("Archivo:", ARCHIVO_SALIDA)
print("Duración:", round(duracion, 2), "segundos")
print("Frecuencia:", modelo.sr, "Hz")
print("----------------------------------")
