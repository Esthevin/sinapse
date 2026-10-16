"""Regenera SOLO las intervenciones del zorro en las escenas 1 y 2.
Ejecutar con conda sinapse_chatterbox. No sustituye el texto del guion.
"""
from pathlib import Path
import argparse, json, shutil
import torch, torchaudio
from chatterbox.mtl_tts import ChatterboxMultilingualTTS

BASE = Path(__file__).resolve().parent.parent
ESCENAS = [
    (BASE/'Sinapse_Radiodrama_Piloto', 'guiones/zorro_condor.json'),
    (BASE/'Sinapse_Escena_02', 'guiones/escena_02.json'),
]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--referencia', type=Path, help='WAV propio o autorizado para conservar el mismo timbre')
    ap.add_argument('--exaggeration',type=float,default=0.6)
    ap.add_argument('--cfg-weight',type=float,default=0.5)
    args=ap.parse_args()
    if args.referencia and not args.referencia.is_file():
        raise FileNotFoundError(args.referencia)
    trabajos=[]
    for root, config in ESCENAS:
        ruta=root/config
        if not ruta.is_file():raise FileNotFoundError(f'No existe guion: {ruta}')
        data=json.loads(ruta.read_text(encoding='utf-8'))
        for item in data['intervenciones']:
            if item['personaje']=='zorro':
                trabajos.append((root/'voces'/'zorro'/f"{item['id']}.wav",item['texto']))
    device='cuda' if torch.cuda.is_available() else 'cpu'
    print('Dispositivo:',device,'| frases del zorro:',len(trabajos))
    modelo=ChatterboxMultilingualTTS.from_pretrained(device=device)
    for destino,texto in trabajos:
        print('Generando:', destino.name, '|',texto)
        kwargs=dict(text=texto,language_id='es',exaggeration=args.exaggeration,cfg_weight=args.cfg_weight)
        if args.referencia: kwargs['audio_prompt_path']=str(args.referencia.resolve())
        with torch.inference_mode(): wav=modelo.generate(**kwargs)
        destino.parent.mkdir(parents=True,exist_ok=True)
        temp=destino.with_suffix('.chatterbox_tmp.wav')
        torchaudio.save(str(temp),wav.detach().cpu(),modelo.sr)
        respaldo=destino.with_suffix('.kokoro_original.wav')
        if destino.exists() and not respaldo.exists():shutil.copy2(destino,respaldo)
        temp.replace(destino)
        print('Guardado:',destino)
    print('Voces del zorro actualizadas. Revisar su pronunciación y continuidad antes de mezclar.')
if __name__=='__main__':main()
