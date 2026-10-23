"""Convierte grabaciones reales (CC0) en los bucles de assets/sonidos/.

Uso:  python herramientas/sonidos/importar_reales.py <carpeta_con_las_descargas>
Requiere numpy, soundfile e imageio-ffmpeg (pip install imageio-ffmpeg).

Cada sonido se recorta (desde `inicio` segundos, `dur` de largo), se une su final con su principio
con un fundido cruzado (para que el bucle no tenga saltos) y se iguala su volumen al de los sonidos
sintéticos que reemplaza. Las fuentes y licencias están en assets/sonidos/CREDITOS.md.
"""
import subprocess
import sys
import tempfile
from pathlib import Path

import imageio_ffmpeg
import numpy as np
import soundfile as sf

SR = 22050
FADE = 2.0
OUT = Path(__file__).resolve().parents[2] / "assets" / "sonidos"
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

# id -> (archivo dentro de la carpeta de descargas, inicio en s, duración del bucle en s)
FUENTES = {
    "lluvia": ("dl_oga/rain/1.mp3", 2.0, 14.0),
    "rio": ("dl_oga/vistula.mp3", 90.0, 14.0),
    "olas": ("dl_bsb/0267.mp3", 8.0, 14.0),
    "viento": ("dl_bsb/0595.mp3", 10.0, 14.0),
    "selva": ("dl_bsb/0100.mp3", 6.0, 14.0),
}


def decodificar(src: Path) -> np.ndarray:
    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp) / "x.wav"
        subprocess.run([FFMPEG, "-nostdin", "-y", "-loglevel", "error", "-i", str(src), "-ar", str(SR), "-ac", "1", str(wav)], check=True)
        y, _ = sf.read(wav, dtype="float32")
    return y


def bucle(y: np.ndarray, inicio: float, dur: float) -> np.ndarray:
    n, f, a = int(dur * SR), int(FADE * SR), int(inicio * SR)
    if len(y) < a + n + f:  # si la fuente es corta, arrancar antes
        a = max(0, len(y) - n - f)
    tramo = y[a : a + n + f]
    if len(tramo) < n + f:
        raise ValueError("la grabación es demasiado corta para el bucle pedido")
    t = np.linspace(0, 1, f, dtype=np.float32)
    cabeza = tramo[:f] * t + tramo[n : n + f] * (1 - t)
    return np.concatenate([cabeza, tramo[f:n]])


def rms(y):
    return float(np.sqrt(np.mean(y**2))) + 1e-9


def main():
    base = Path(sys.argv[1])
    for id_, (rel, inicio, dur) in FUENTES.items():
        objetivo = rms(decodificar(OUT / f"{id_}.mp3"))  # volumen del sonido actual
        y = bucle(decodificar(base / rel), inicio, dur)
        y = y - y.mean()
        y = y * (objetivo / rms(y))
        pico = np.abs(y).max()
        if pico > 0.95:
            y = y * (0.95 / pico)
        with tempfile.TemporaryDirectory() as tmp:
            wav = Path(tmp) / "x.wav"
            sf.write(wav, y, SR, subtype="PCM_16")
            subprocess.run([FFMPEG, "-nostdin", "-y", "-loglevel", "error", "-i", str(wav), "-codec:a", "libmp3lame", "-b:a", "64k", str(OUT / f"{id_}.mp3")], check=True)
        print(f"{id_}: {dur:.0f} s, pico {pico:.2f}")


if __name__ == "__main__":
    main()
