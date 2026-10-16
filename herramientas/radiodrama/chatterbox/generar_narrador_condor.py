"""Genera tomas candidatas de narrador y cóndor para dos escenas, sin sobrescribir originales.
Uso: python generar_narrador_condor.py [--solo s2_c01] [--semilla 123]
Revisión editorial antes de sustituir tomas: véase README.
"""
import argparse
import csv
import json
from pathlib import Path

import torch
import torchaudio
from chatterbox.mtl_tts import ChatterboxMultilingualTTS

BASE = Path(__file__).resolve().parent.parent
ESCENAS = [
    (BASE / 'Sinapse_Radiodrama_Piloto', 'guiones/zorro_condor.json', 'escena_01'),
    (BASE / 'Sinapse_Escena_02', 'guiones/escena_02.json', 'escena_02'),
]
PERFILES = {
    'narrador': {'exaggeration': 0.45, 'cfg_weight': 0.5},
    'condor': {'exaggeration': 0.55, 'cfg_weight': 0.5},
}

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--solo', default=None, help='ID de una intervención, ej. s2_c01')
    p.add_argument('--semilla', type=int, default=1234)
    p.add_argument('--ref-narrador', type=Path, default=None, help='WAV de voz propia/autorizada para narrador')
    p.add_argument('--ref-condor', type=Path, default=None, help='WAV de voz propia/autorizada para cóndor')
    args = p.parse_args()
    referencias = {'narrador': args.ref_narrador, 'condor': args.ref_condor}
    for personaje, referencia in referencias.items():
        if referencia and not referencia.is_file():
            p.error(f'No existe referencia para {personaje}: {referencia}')
    tareas = []
    for root, relative, etiqueta in ESCENAS:
        ruta = root / relative
        if not ruta.is_file():
            raise FileNotFoundError(f'Falta guion: {ruta}')
        guion = json.loads(ruta.read_text(encoding='utf-8'))
        for entry in guion['intervenciones']:
            if entry['personaje'] not in PERFILES or (args.solo and args.solo != entry['id']):
                continue
            tareas.append((etiqueta, entry))
    if not tareas:
        raise ValueError('No hay intervenciones seleccionadas. Revisa --solo.')
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    print(f'Cargando Chatterbox en {device} para {len(tareas)} intervenciones...')
    model = ChatterboxMultilingualTTS.from_pretrained(device=device)
    output = BASE / 'Sinapse_Chatterbox' / 'candidatos_otras_voces'
    output.mkdir(parents=True, exist_ok=True)
    rows = []
    for i, (scene, entry) in enumerate(tareas):
        character = entry['personaje']
        text = entry['texto']  # conservar exactamente el guion original
        opt = PERFILES[character].copy()
        ref = referencias[character]
        if ref:
            opt['audio_prompt_path'] = str(ref.resolve())
        torch.manual_seed(args.semilla + i)
        print(f'Generando {scene}/{character}/{entry["id"]}: {text}')
        with torch.inference_mode():
            wav = model.generate(text=text, language_id='es', **opt)
        folder = output / scene / character
        folder.mkdir(parents=True, exist_ok=True)
        destination = folder / (entry['id'] + '.wav')
        torchaudio.save(str(destination), wav.detach().cpu(), model.sr)
        rows.append({'escena': scene, 'personaje': character, 'id': entry['id'],
                     'texto_esperado': text, 'archivo_candidato': str(destination),
                     'revision': 'PENDIENTE', 'observaciones': ''})
    review = output / 'revision_voces.csv'
    # No pisar revisiones existentes: generar una nueva planilla si ya existe.
    if review.exists():
        suffix = 2
        while (output / f'revision_voces_{suffix}.csv').exists(): suffix += 1
        review = output / f'revision_voces_{suffix}.csv'
    with review.open('w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()), delimiter=';')
        writer.writeheader()
        writer.writerows(rows)
    print(f'Listo: {len(rows)} tomas candidatas. Hoja de revisión: {review}')
    print('Escucha cada WAV y compara palabra por palabra. No se reemplazaron los originales.')

if __name__ == '__main__':
    main()
