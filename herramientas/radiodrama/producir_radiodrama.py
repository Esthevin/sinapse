"""Mezcla un radiodrama a partir de pistas de voz previamente generadas.
Requiere numpy y soundfile. Nunca inventa una voz ausente.
"""
import argparse
import json
from pathlib import Path
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly
from math import gcd

ROOT = Path(__file__).resolve().parent

def load(path: Path, sr: int) -> np.ndarray:
    signal, source_sr = sf.read(path, always_2d=True, dtype='float32')
    if source_sr != sr:
        g = gcd(source_sr, sr)
        signal = resample_poly(signal, sr // g, source_sr // g, axis=0).astype('float32')
    if signal.shape[1] == 1:
        signal = np.repeat(signal, 2, axis=1)
    elif signal.shape[1] > 2:
        signal = signal[:, :2]
    return signal

def fit_loop(src, size):
    if len(src) == 0: return np.zeros((size, 2), np.float32)
    return np.tile(src, (int(np.ceil(size / len(src))), 1))[:size]

def main(config_file: Path, strict: bool):
    cfg = json.loads(config_file.read_text(encoding='utf-8'))
    sr = int(cfg.get('sample_rate', 44100))
    pause = int(float(cfg.get('pausa_entre_intervenciones', 0.45)) * sr)
    cursor = int(float(cfg.get('intro_seg', 2)) * sr)
    clips = []
    marks = []
    missing = []
    for item in cfg['intervenciones']:
        path = ROOT / 'voces' / item['personaje'] / (item['id'] + '.wav')
        if not path.is_file():
            missing.append(str(path.relative_to(ROOT)))
            continue
        voice = load(path, sr)
        marks.append({'id': item['id'], 'personaje': item['personaje'], 'inicio_seg': round(cursor/sr,3), 'fin_seg':round((cursor+len(voice))/sr,3), 'texto':item['texto']})
        clips.append((cursor, voice))
        cursor += len(voice) + pause
    if missing:
        print('Faltan grabaciones de voz:')
        for p in missing: print(' -', p)
        if strict or not clips:
            print('Genera o graba estos WAV antes de producir el episodio.')
            return 1
        print('AVISO: mezcla parcial; no es el episodio completo.')
    total = cursor + int(float(cfg.get('outro_seg', 2.5))*sr)
    result = np.zeros((total, 2), np.float32)
    voice_mask = np.zeros(total, np.float32)
    for start, clip in clips:
        end = min(total, start+len(clip))
        result[start:end] += clip[:end-start]
        voice_mask[start:end] = 1
    for key in ('musica','ambiente'):
        spec = cfg.get(key) or {}
        path = ROOT / spec.get('archivo','') if spec.get('archivo') else None
        if path and path.is_file():
            sound = fit_loop(load(path,sr),total)
            envelope = np.where(voice_mask>0, 0.35, 1.0)
            result += sound * envelope[:,None] * float(spec.get('ganancia',0.1))
        elif path:
            print(f'Aviso: pista {key} ausente: {path}')
    for fx in cfg.get('efectos',[]):
        path = ROOT / fx['archivo']
        if not path.is_file():
            print('Aviso: efecto ausente:',path)
            continue
        ref = next((m for m in marks if m['id']==fx['despues_de']),None)
        if ref is None: continue
        position=int(ref['fin_seg']*sr)
        effect=load(path,sr)*float(fx.get('ganancia',0.18))
        end=min(total,position+len(effect))
        result[position:end]+=effect[:end-position]
    peak=float(np.max(np.abs(result))) if result.size else 0
    if peak > 0.98: result *= 0.98/peak
    output = ROOT/'producciones'/'episodio_001.wav'
    output.parent.mkdir(parents=True, exist_ok=True)
    sf.write(output, result, sr, subtype='PCM_16')
    (ROOT/'producciones'/'marcas_tiempo.json').write_text(json.dumps(marks,ensure_ascii=False,indent=2),encoding='utf-8')
    print('Exportado:', output)
    print('Duración:',round(len(result)/sr,2),'segundos. Clips:',len(clips),'de',len(cfg['intervenciones']))
    return 0

if __name__=='__main__':
    ap=argparse.ArgumentParser()
    ap.add_argument('config', nargs='?', default='guiones/zorro_condor.json')
    ap.add_argument('--permitir-parcial',action='store_true',help='Mezclar solo voces disponibles')
    args=ap.parse_args()
    raise SystemExit(main(ROOT/args.config,not args.permitir_parcial))
