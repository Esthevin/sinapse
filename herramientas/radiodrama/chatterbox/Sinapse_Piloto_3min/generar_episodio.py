from pathlib import Path
import argparse, json, csv
import numpy as np
import soundfile as sf
import torch
from chatterbox.mtl_tts import ChatterboxMultilingualTTS

BASE = Path(__file__).resolve().parent
REFERENCIAS = BASE.parent / 'voces_referencia'  # Instalar carpeta piloto dentro de Sinapse_Chatterbox
if not REFERENCIAS.exists():
    REFERENCIAS = BASE / 'voces_referencia'
SALIDA = BASE / 'salida'
PARTES = SALIDA / 'segmentos'
PARTES.mkdir(parents=True, exist_ok=True)
CONFIG = {'narrador': .45, 'zorro': .60, 'condor': .55}

def principal():
    ap = argparse.ArgumentParser()
    ap.add_argument('--regenerar', type=int, help='Número de segmento que debe regenerarse')
    ap.add_argument('--unir', action='store_true', help='Solo unir los WAV existentes')
    args = ap.parse_args()
    guion = json.loads((BASE / 'episodio.json').read_text(encoding='utf-8'))['intervenciones']
    if not args.unir:
        for personaje in CONFIG:
            p = REFERENCIAS / (personaje + '.wav')
            if not p.exists():
                raise FileNotFoundError(f'Falta la referencia autorizada: {p}')
        dispositivo = 'cuda' if torch.cuda.is_available() else 'cpu'
        print('Cargando modelo en', dispositivo)
        modelo = ChatterboxMultilingualTTS.from_pretrained(device=dispositivo)
        for i, item in enumerate(guion, 1):
            ruta = PARTES / f'{i:02d}_{item["personaje"]}.wav'
            if args.regenerar and args.regenerar != i:
                continue
            if ruta.exists() and not args.regenerar:
                print(f'Conservado: {ruta.name}')
                continue
            print(f'Generando {i}/{len(guion)} - {item["personaje"]}')
            with torch.inference_mode():
                a = modelo.generate(
                    text=item['texto'], language_id='es',
                    audio_prompt_path=str(REFERENCIAS / f'{item["personaje"]}.wav'),
                    exaggeration=CONFIG[item['personaje']], cfg_weight=.3,
                )
            señal = a.detach().float().cpu().numpy().squeeze()
            if señal.ndim != 1 or not np.isfinite(señal).all():
                raise ValueError('Audio inválido')
            sf.write(ruta, señal, modelo.sr)
            print('  ', ruta.name, f'{len(señal)/modelo.sr:.1f}s')
    partes, marcadores, sr, instante = [], [], None, 0.0
    for i, item in enumerate(guion, 1):
        ruta = PARTES / f'{i:02d}_{item["personaje"]}.wav'
        if not ruta.exists():
            raise FileNotFoundError(f'Falta el segmento {i}: {ruta}')
        y, actual_sr = sf.read(ruta, dtype='float32')
        if y.ndim == 2:
            y = y.mean(axis=1)
        if sr is None:
            sr = actual_sr
        if actual_sr != sr:
            raise ValueError(f'Muestreo diferente en {ruta}. Convierte los WAV a una frecuencia común.')
        duracion = len(y)/sr
        marcadores.append({'numero': i, 'personaje': item['personaje'], 'inicio_seg': round(instante, 3), 'fin_seg': round(instante + duracion,3), 'texto_esperado': item['texto'], 'revisado': False})
        partes.append(y)
        instante += duracion
        pausa = float(item.get('pausa', .4))
        partes.append(np.zeros(round(pausa*sr), dtype='float32'))
        instante += pausa
    out = np.concatenate(partes)
    sf.write(SALIDA / 'episodio_piloto_voz.wav', out, sr, subtype='PCM_16')
    (SALIDA / 'revision.json').write_text(json.dumps(marcadores, ensure_ascii=False, indent=2), encoding='utf-8')
    with (SALIDA/'revision.csv').open('w', encoding='utf-8-sig', newline='') as f:
        w = csv.DictWriter(f, fieldnames=marcadores[0].keys())
        w.writeheader(); w.writerows(marcadores)
    total = len(out)/sr
    print(f'\nDURACIÓN: {total:.2f}s ({total/60:.2f} min)')
    print('Archivo:', SALIDA / 'episodio_piloto_voz.wav')
    if total < 180:
        print('ATENCIÓN: todavía no llega a 3 minutos; ampliar guion con contenido, NO agregar silencio para simular duración.')
    else:
        print('Cumple duración mínima técnica de 3 minutos. Aún requiere revisión de fidelidad textual.')

if __name__ == '__main__':
    principal()
