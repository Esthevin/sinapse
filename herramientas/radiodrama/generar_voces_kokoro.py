"""Genera las ocho intervenciones del piloto usando Kokoro-82M en español.
Requiere: pip install kokoro soundfile numpy; espeak-ng instalado en Windows.
No clona voces, no promete control emocional; genera un WAV por intervención.
"""
from __future__ import annotations
import argparse
import json
from pathlib import Path
import sys
import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parent
VOICES = {'narrador': 'ef_dora', 'zorro': 'em_alex', 'condor': 'em_santa'}


def generate(config: Path, overwrite: bool, selected: str | None):
    try:
        from kokoro import KPipeline
    except ImportError as exc:
        raise SystemExit('Falta kokoro. Instala con: python -m pip install kokoro soundfile numpy') from exc
    cfg = json.loads(config.read_text(encoding='utf-8'))
    pipeline = KPipeline(lang_code='e')
    count = 0
    for item in cfg['intervenciones']:
        if selected and item['id'] != selected:
            continue
        role, id_ = item['personaje'], item['id']
        if role not in VOICES:
            raise ValueError(f'Personaje sin voz configurada: {role}')
        outfile = ROOT / 'voces' / role / f'{id_}.wav'
        outfile.parent.mkdir(parents=True, exist_ok=True)
        if outfile.exists() and not overwrite:
            print('Omitido (ya existe):', outfile.relative_to(ROOT))
            continue
        text = item['texto'].strip()
        if not text:
            raise ValueError(f'Intervención {id_} sin texto')
        print(f'Generando {id_} | {role} | {VOICES[role]}')
        chunks = []
        # Kokoro devuelve segmentos; concatenar sin ralentizar ni alterar el pitch.
        for _graphemes, _phonemes, audio in pipeline(text, voice=VOICES[role], speed=1.0, split_pattern=r'\n+'):
            a = np.asarray(audio, dtype=np.float32).reshape(-1)
            if len(a):
                chunks.append(a)
        if not chunks:
            raise RuntimeError(f'El modelo no generó audio para {id_}')
        samples = np.concatenate(chunks)
        sf.write(outfile, samples, 24000, subtype='PCM_16')
        print(f'  {outfile.relative_to(ROOT)} — {len(samples)/24000:.2f}s')
        count += 1
    print(f'Finalizado: {count} archivos generados.')


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--config', default='guiones/zorro_condor.json')
    p.add_argument('--sobrescribir', action='store_true')
    p.add_argument('--solo', help='Solo una intervención, p. ej. n01')
    a = p.parse_args()
    generate(ROOT / a.config, a.sobrescribir, a.solo)
