"""Funciones del cuaderno de Colab de Sinapse para preparar, entrenar y usar voces.

El cuaderno (Sinapse_Entrenar_Voces.ipynb) solo llama a estas funciones. Se pueden probar en una PC sin GPU
(ver las pruebas al final de docs/COLAB_VOCES.md). No hay nada aqui que clone voces sin consentimiento:
las funciones de narracion reciben una funcion `sintetizar(texto) -> onda` ya cargada por el cuaderno.
"""
from __future__ import annotations

import csv
import json
import re
import shutil
import subprocess
from pathlib import Path

import numpy as np

# Lengua de Sinapse -> codigo del modelo MMS-TTS de Meta (None = no existe modelo base).
# Los modelos MMS-TTS son CC BY-NC 4.0: lo que se afine a partir de ellos es de uso NO comercial.
MMS = {
    "es": "spa",
    "quz": "quz",
    "qu": "quz",
    "quy": "quy",
    "qwh": "qwh",
    "ay": "ayr",
    "cni": "cni",
    "agr": "agr",
    "shp": "shp",
    "mcb": "mcb",
    "jqr": None,  # no hay modelo base: solo narracion humana
}
NOMBRES = {
    "es": "Castellano", "quz": "Quechua cusqueño", "qu": "Quechua (general)", "quy": "Quechua ayacuchano",
    "qwh": "Quechua ancashino", "ay": "Aimara", "cni": "Asháninka", "agr": "Awajún", "shp": "Shipibo-Konibo",
    "mcb": "Matsigenka", "jqr": "Jaqaru",
}
MIN_SEG, MAX_SEG = 1.0, 20.0  # duracion util de cada grabacion para entrenar
MAX_CARACTERES = 170  # una frase de ~170 caracteres dura unos 10-12 s al leerla
PAUSA_FRASE, PAUSA_PARRAFO = 0.30, 0.70


# ---------------------------------------------------------------- historias y guion de grabacion
def cargar_historias(repo: Path) -> dict:
    out = {}
    for f in sorted((Path(repo) / "src" / "content" / "historias").glob("*.json")):
        s = json.loads(f.read_text(encoding="utf-8"))
        out[s["id"]] = s
    return out


def texto_de(story: dict, lengua: str):
    """Parrafos de una historia en la lengua pedida (sin caer al castellano)."""
    return story["paragraphs"].get(lengua)


def trocear(parrafo: str, maximo: int = MAX_CARACTERES) -> list[str]:
    """Parte un parrafo en frases de hasta `maximo` caracteres (corta en punto y, si hace falta, en coma)."""
    frases = [f.strip() for f in re.split(r"(?<=[.!?…])\s+", parrafo.strip()) if f.strip()]
    out = []
    for f in frases:
        while len(f) > maximo:
            corte = max(f.rfind(", ", 0, maximo), f.rfind("; ", 0, maximo), f.rfind(" ", 0, maximo))
            if corte < 40:
                corte = maximo
            out.append(f[: corte + 1].strip())
            f = f[corte + 1 :].strip()
        if f:
            out.append(f)
    return out


def hacer_guion(historias: dict, lengua: str, solo: set[str] | None = None) -> list[dict]:
    """Lista de frases para que la persona narradora las lea: una grabacion por frase (linea_0001, ...)."""
    filas, n = [], 0
    for sid, s in historias.items():
        if solo and sid not in solo:
            continue
        parrafos = texto_de(s, lengua)
        if not parrafos:
            continue
        for i, p in enumerate(parrafos):
            for fr in trocear(p):
                n += 1
                filas.append({"id": f"linea_{n:04d}", "historia": sid, "parrafo": i, "texto": fr})
    return filas


def guardar_guion(filas: list[dict], ruta: Path) -> None:
    with open(ruta, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["id", "historia", "parrafo", "texto"])
        w.writeheader()
        w.writerows(filas)


def leer_guion(ruta: Path) -> list[dict]:
    with open(ruta, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def resumen_guion(filas: list[dict]) -> str:
    chars = sum(len(f["texto"]) for f in filas)
    minutos = chars / 15 / 60  # ~15 caracteres por segundo al leer con calma
    nivel = "muy poco: sube mas historias" if len(filas) < 80 else "suficiente para una prueba" if len(filas) < 150 else "bueno"
    return f"{len(filas)} frases · unos {minutos:.0f} min de lectura · {nivel} (meta: 80 a 150 frases como minimo, mejor 30+ min)"


# ---------------------------------------------------------------- texto para el modelo
def limpiar(texto: str) -> str:
    """Deja solo lo que entienden los modelos MMS: letras en minuscula, apostrofo y guion."""
    t = texto.lower().replace("’", "'").replace("‘", "'")
    t = re.sub(r"[^a-zñáéíóúü'\- ]", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def trozos_mms(parrafo: str) -> list[str]:
    partes = re.split(r"(?<=[.!?…:;])\s+|\s+—\s*|[«»“”\"]", parrafo)
    return [p for p in (limpiar(x) for x in partes) if len(p) > 1]


# ---------------------------------------------------------------- dataset de entrenamiento
def armar_dataset(audios: Path, guion: list[dict], salida: Path, duracion=None) -> dict:
    """Une las grabaciones (linea_0001.wav / .mp3 / .m4a ...) con su texto y crea una carpeta `audiofolder`.

    Devuelve un informe: cuantas frases se usaron, cuales faltan, cuales son demasiado cortas o largas.
    `duracion(ruta) -> segundos` se puede pasar para no depender de soundfile.
    """
    import soundfile as sf

    audios, salida = Path(audios), Path(salida)
    carpeta = salida / "train"
    if salida.exists():
        shutil.rmtree(salida)
    carpeta.mkdir(parents=True)
    por_id = {}
    for f in audios.rglob("*"):
        if f.is_file() and f.suffix.lower() in {".wav", ".mp3", ".m4a", ".flac", ".ogg"}:
            por_id[f.stem.lower()] = f
    usados, faltan, cortas, largas, filas = 0, [], [], [], []
    for fila in guion:
        f = por_id.get(fila["id"].lower())
        if not f:
            faltan.append(fila["id"])
            continue
        if f.suffix.lower() == ".wav" or duracion:
            seg = duracion(f) if duracion else sf.info(str(f)).duration
        else:
            seg = None  # mp3/m4a: se mide al convertirlo
        if f.suffix.lower() != ".wav":
            destino = carpeta / f"{fila['id']}.wav"
            subprocess.run(["ffmpeg", "-nostdin", "-y", "-loglevel", "error", "-i", str(f), "-ac", "1", str(destino)], check=True)
            seg = sf.info(str(destino)).duration
        else:
            destino = carpeta / f"{fila['id']}.wav"
            shutil.copy(f, destino)
        if seg < MIN_SEG:
            cortas.append(fila["id"])
            destino.unlink()
            continue
        if seg > MAX_SEG:
            largas.append(fila["id"])
            destino.unlink()
            continue
        filas.append({"file_name": destino.name, "text": limpiar(fila["texto"])})
        usados += 1
    # Formato "audiofolder" de Hugging Face: <salida>/train/metadata.csv + los audios en la misma carpeta.
    with open(carpeta / "metadata.csv", "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["file_name", "text"])
        w.writeheader()
        w.writerows(filas)
    return {"usadas": usados, "faltan": faltan, "cortas": cortas, "largas": largas}


def caracteres_desconocidos(textos: list[str], vocabulario: set[str]) -> dict[str, int]:
    cuenta: dict[str, int] = {}
    for t in textos:
        for c in t:
            if c not in vocabulario:
                cuenta[c] = cuenta.get(c, 0) + 1
    return cuenta


def config_entrenamiento(lengua_mms: str, dataset: str, modelo_base: str, salida: str, epocas: int, lote: int, frase_prueba: str) -> dict:
    """Configuracion de ylacombe/finetune-hf-vits (basada en su ejemplo finetune_mms.json)."""
    return {
        "project_name": f"sinapse_{lengua_mms}",
        "push_to_hub": False,
        "report_to": ["tensorboard"],
        "overwrite_output_dir": True,
        "output_dir": salida,
        "dataset_name": dataset,
        "audio_column_name": "audio",
        "text_column_name": "text",
        "train_split_name": "train",
        "eval_split_name": "train",
        "full_generation_sample_text": frase_prueba,
        "max_duration_in_seconds": MAX_SEG,
        "min_duration_in_seconds": MIN_SEG,
        "max_tokens_length": 500,
        "model_name_or_path": modelo_base,
        "preprocessing_num_workers": 2,
        "do_train": True,
        "num_train_epochs": epocas,
        "gradient_accumulation_steps": 1,
        "gradient_checkpointing": False,
        "per_device_train_batch_size": lote,
        "learning_rate": 2e-5,
        "adam_beta1": 0.8,
        "adam_beta2": 0.99,
        "warmup_ratio": 0.01,
        "group_by_length": False,
        "do_eval": True,
        "eval_steps": 50,
        "per_device_eval_batch_size": lote,
        "max_eval_samples": 25,
        "do_step_schedule_per_epoch": True,
        "weight_disc": 3,
        "weight_fmaps": 1,
        "weight_gen": 1,
        "weight_kl": 1.5,
        "weight_duration": 1,
        "weight_mel": 35,
        "fp16": True,
        "seed": 456,
    }


# ---------------------------------------------------------------- narrar cuentos (cualquier motor)
def narrar_parrafos(parrafos: list[str], sintetizar, sr: int, trozos=trocear) -> tuple[np.ndarray, list[float]]:
    """Sintetiza cada frase con `sintetizar(texto) -> onda float32`, las une con pausas y devuelve
    la onda y el segundo exacto en que empieza cada parrafo (para el resaltado en la app)."""
    partes, inicios, t = [], [], 0.0
    for p in parrafos:
        inicios.append(round(t, 3))
        for fr in trozos(p):
            onda = np.asarray(sintetizar(fr), dtype="float32").reshape(-1)
            partes += [onda, np.zeros(int(PAUSA_FRASE * sr), dtype="float32")]
            t += len(onda) / sr + PAUSA_FRASE
        partes.append(np.zeros(int(PAUSA_PARRAFO * sr), dtype="float32"))
        t += PAUSA_PARRAFO
    y = np.concatenate(partes) if partes else np.zeros(1, dtype="float32")
    pico = float(np.abs(y).max()) or 1.0
    return (y * (0.9 / pico)).astype("float32"), inicios


def guardar_mp3(onda: np.ndarray, sr: int, destino: Path, kbps: int = 64) -> None:
    import soundfile as sf
    import tempfile

    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp) / "x.wav"
        sf.write(wav, onda, sr, subtype="PCM_16")
        subprocess.run(["ffmpeg", "-nostdin", "-y", "-loglevel", "error", "-i", str(wav), "-codec:a", "libmp3lame", "-b:a", f"{kbps}k", str(destino)], check=True)


def fila_manifiesto(historia: str, lengua: str, archivo: str, duracion: float, inicios: list[float], narrador: str, consentimiento: str, region: str = "sierra") -> dict:
    """Una fila para `npm run audio:importar`. La voz es de IA, entrenada con la grabacion autorizada de la persona."""
    return {
        "archivo": archivo,
        "historia": historia,
        "lengua": lengua,
        "narrador": narrador,
        "rol": "comunidad",
        "fuente_voz": "ia_autorizada",
        "licencia": f"Voz recreada con inteligencia artificial a partir de grabaciones autorizadas por {narrador} ({consentimiento}). Uso educativo en Sinapse.",
        "consentimiento": consentimiento,
        "credito": f"Voz recreada con IA, con autorización de {narrador}. Borrador pendiente de revisión por hablantes nativos.",
        "bio": f"Voz sintética entrenada con la grabación autorizada de {narrador}.",
        "region": region,
        "duracion": round(duracion, 3),
        "parrafos": ";".join(f"{x:.3f}" for x in inicios),
    }
