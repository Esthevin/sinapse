"""Sintetiza los sonidos ambientales de Sinapse (propios, sin licencias de terceros).

Uso:  python herramientas/sonidos/generar_sonidos.py
Requiere numpy y ffmpeg. Escribe assets/sonidos/<id>.mp3 (mono, 22,05 kHz, bucles de 10 s).
Son sonidos sencillos pensados como fondo suave; se pueden reemplazar por grabaciones reales
con el mismo nombre de archivo (propias o con permiso de reutilización).
"""
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

import numpy as np

SR = 22050
DUR = 10.0
N = int(SR * DUR)
OUT = Path(__file__).resolve().parents[2] / "assets" / "sonidos"
T = np.arange(N) / SR


def rng(seed):
    return np.random.default_rng(seed)


def band(x, lo, hi, soft=0.15):
    """Filtro pasabanda por FFT con bordes suaves."""
    spec = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    w = np.ones_like(f)
    if lo > 0:
        w *= 1 / (1 + np.exp(-(f - lo) / (lo * soft + 1)))
    if hi < SR / 2:
        w *= 1 / (1 + np.exp((f - hi) / (hi * soft + 1)))
    return np.fft.irfft(spec * w, len(x))


def noise(seed, lo=0, hi=SR / 2):
    return band(rng(seed).standard_normal(N), lo, hi)


def slow(seed, rate, depth=1.0, base=0.0):
    """Modulación lenta suave en [0, 1] aprox."""
    r = rng(seed)
    out = np.zeros(N)
    for k in range(4):
        out += np.sin(2 * np.pi * rate * (k + 1) * T * (0.7 + r.random() * 0.6) + r.random() * 6.28) / (k + 1)
    out = out / np.max(np.abs(out))
    return np.clip(base + depth * (out * 0.5 + 0.5), 0, 1)


def loopify(x, xf=0.6):
    n = int(SR * xf)
    y = x[:-n].copy()
    fade = np.sin(np.linspace(0, np.pi / 2, n))
    y[:n] = x[:n] * fade + x[-n:] * fade[::-1]
    return y


def norm(x, peak=0.8):
    return x / (np.max(np.abs(x)) + 1e-9) * peak


def burst(t0, length, f_lo, f_hi, seed, decay=30.0):
    """Ráfaga corta de ruido filtrado con caída exponencial, colocada en el instante t0."""
    n = int(length * SR)
    b = band(rng(seed).standard_normal(n), f_lo, f_hi) * np.exp(-decay * np.arange(n) / SR)
    sig = np.zeros(N)
    i = int(t0 * SR)
    j = min(N, i + n)
    sig[i:j] = b[: j - i]
    return sig


def chirp(t0, length, f0, f1, amp=1.0, vib=0.0, seed=0):
    n = int(length * SR)
    tt = np.arange(n) / SR
    f = np.linspace(f0, f1, n) + vib * np.sin(2 * np.pi * 28 * tt)
    ph = 2 * np.pi * np.cumsum(f) / SR
    env = np.sin(np.pi * tt / length) ** 2
    sig = np.zeros(N)
    i = int(t0 * SR)
    j = min(N, i + n)
    sig[i:j] = (np.sin(ph) * env * amp)[: j - i]
    return sig


def viento():
    a = noise(1, 80, 700) * (0.35 + 0.65 * slow(11, 0.08))
    b = noise(2, 400, 1800) * (0.1 + 0.5 * slow(12, 0.13)) * 0.5
    return a + b


def lluvia():
    base = noise(3, 1500, 9000) * 0.5 + noise(4, 300, 1200) * 0.15
    r = rng(5)
    drops = np.zeros(N)
    for t0 in r.random(160) * (DUR - 0.1):
        drops += burst(t0, 0.03, 2500, 6000, int(t0 * 1000), decay=160) * (0.3 + r.random() * 0.7)
    return base + drops * 0.6


def rio():
    a = noise(6, 300, 2500) * (0.4 + 0.6 * slow(13, 0.9))
    b = noise(7, 1200, 5000) * (0.2 + 0.5 * slow(14, 1.6)) * 0.5
    r = rng(8)
    glug = np.zeros(N)
    for t0 in r.random(26) * (DUR - 0.2):
        f = 500 + r.random() * 700
        glug += chirp(t0, 0.09, f, f * 1.6, amp=0.25)
    return a + b + glug * 0.5


def olas():
    swell = 0.1 + 0.9 * (0.5 + 0.5 * np.sin(2 * np.pi * T / 5.0 - 1.2)) ** 2
    return noise(9, 120, 1500) * swell + noise(10, 1500, 6000) * swell**3 * 0.35


def pasos():
    sig = np.zeros(N)
    for k in range(20):
        t0 = 0.15 + k * 0.5
        g = 1.0 if k % 2 == 0 else 0.8
        sig += burst(t0, 0.18, 150, 1100, 100 + k, decay=26) * g
        sig += burst(t0 + 0.01, 0.1, 1800, 5200, 200 + k, decay=48) * 0.35 * g
        sig += chirp(t0, 0.07, 95, 55, amp=0.5 * g)
    return sig


def aleteo():
    sig = np.zeros(N)
    for k in range(38):
        t0 = 0.1 + k * 0.26
        sig += burst(t0, 0.2, 60, 520, 300 + k, decay=14) * 0.9
        sig += burst(t0 + 0.02, 0.16, 500, 2200, 400 + k, decay=22) * 0.25
    return sig


def fuego():
    r = rng(15)
    rumble = noise(16, 40, 300) * 0.6 + noise(17, 300, 1100) * (0.1 + 0.2 * slow(18, 0.7))
    crack = np.zeros(N)
    for t0 in r.random(120) * (DUR - 0.1):
        crack += burst(t0, 0.02 + r.random() * 0.02, 1500, 7000, int(t0 * 777), decay=120) * (0.2 + r.random())
    return rumble + crack * 0.8


def selva():
    r = rng(19)
    hum = noise(20, 3200, 5200) * (0.15 + 0.85 * (0.5 + 0.5 * np.sin(2 * np.pi * 17 * T))) * (0.3 + 0.7 * slow(21, 0.2)) * 0.5
    base = noise(22, 200, 900) * 0.15
    birds = np.zeros(N)
    for t0 in r.random(9) * (DUR - 1.0):
        f = 1800 + r.random() * 2200
        for m in range(int(2 + r.random() * 3)):
            birds += chirp(t0 + m * 0.14, 0.11, f, f * (1.2 + r.random() * 0.5), amp=0.6, vib=60)
    return hum + base + birds * 0.7


def noche():
    r = rng(23)
    sig = noise(24, 100, 500) * 0.06
    for c in range(5):
        f = 3700 + c * 170 + r.random() * 60
        offset = r.random()
        gate = (np.sin(2 * np.pi * (11 + c) * T + offset * 6) > 0.2) * (np.sin(2 * np.pi * (0.9 + c * 0.17) * T + offset * 6) > -0.3)
        sig += np.sin(2 * np.pi * f * T) * gate * 0.22
    return sig


def golpes():
    """Dos golpes de nudillos en una puerta de madera ("tan, tan"), repetidos cada 2 s."""
    sig = np.zeros(N)
    for k in range(5):
        for j, dt in enumerate((0.15, 0.42)):
            t0 = k * 2.0 + dt
            g = 1.0 if j == 0 else 0.85
            n = int(0.22 * SR)
            tt = np.arange(n) / SR
            body = (np.sin(2 * np.pi * 190 * tt) * 0.8 + np.sin(2 * np.pi * 330 * tt) * 0.35) * np.exp(-24 * tt)
            tap = band(rng(500 + k * 2 + j).standard_normal(n), 900, 3800) * np.exp(-90 * tt)
            clip = (body + tap * 0.7) * g
            i = int(t0 * SR)
            sig[i:i + n] += clip[: N - i][: n]
    return sig


def lechuza():
    """Ulular de lechuza ("hu, hú") con noche de fondo."""
    sig = noise(30, 80, 400) * 0.05
    for k in range(3):
        t0 = 0.6 + k * 3.2
        sig += chirp(t0, 0.55, 420, 380, amp=0.9, vib=6) * 0.8
        sig += chirp(t0 + 0.75, 0.9, 390, 300, amp=1.0, vib=8)
    return sig


def _pluck(freq, dur=0.7, damp=0.996, seed=0):
    n = int(dur * SR)
    period = max(2, int(SR / freq))
    buf = rng(seed).uniform(-1, 1, period)
    out = np.zeros(n)
    for i in range(n):
        out[i] = buf[i % period]
        buf[i % period] = damp * 0.5 * (buf[i % period] + buf[(i + 1) % period])
    return out * np.exp(-3.0 * np.arange(n) / SR)


def fiesta():
    """Fiesta andina: melodía pentatónica punteada, bombo y murmullo de gente."""
    base = 220.0
    scale = [1, 6 / 5, 4 / 3, 3 / 2, 9 / 5, 2]  # pentatónica menor
    melody = [0, 2, 3, 2, 4, 3, 2, 0, 1, 2, 3, 5, 4, 3, 2, 0]
    beat = 0.3125  # 192 bpm en corcheas
    sig = np.zeros(N)
    for i, m in enumerate(melody * 2):
        t0 = i * beat
        if t0 >= DUR - 0.5:
            break
        note = _pluck(base * scale[m] * (2 if i % 8 >= 4 else 1), seed=i)
        k = int(t0 * SR)
        sig[k:k + len(note)] += note[: N - k][: len(note)] * 0.35
    for t0 in np.arange(0, DUR - 0.4, beat * 4):
        n = int(0.3 * SR)
        tt = np.arange(n) / SR
        thump = np.sin(2 * np.pi * (70 - 25 * tt / 0.3) * tt) * np.exp(-12 * tt)
        k = int(t0 * SR)
        sig[k:k + n] += thump[: N - k][: n] * 0.9
    murmur = noise(31, 250, 1600) * (0.3 + 0.7 * slow(32, 0.5)) * 0.18
    return sig + murmur


SONIDOS = {
    "viento": (viento, 0.8),
    "lluvia": (lluvia, 0.8),
    "rio": (rio, 0.8),
    "olas": (olas, 0.8),
    "pasos": (pasos, 0.85),
    "aleteo": (aleteo, 0.85),
    "fuego": (fuego, 0.8),
    "selva": (selva, 0.8),
    "noche": (noche, 0.7),
    "golpes": (golpes, 0.9),
    "lechuza": (lechuza, 0.8),
    "fiesta": (fiesta, 0.8),
}


def write_mp3(name, x):
    pcm = (np.clip(x, -1, 1) * 32767).astype("<i2")
    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp) / f"{name}.wav"
        with wave.open(str(wav), "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes(pcm.tobytes())
        subprocess.run(
            ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(wav), "-ac", "1", "-b:a", "64k", str(OUT / f"{name}.mp3")],
            check=True,
        )


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for name, (fn, peak) in SONIDOS.items():
        x = norm(loopify(fn()), peak)
        write_mp3(name, x)
        print(f"{name}.mp3  {len(x) / SR:.1f} s")
