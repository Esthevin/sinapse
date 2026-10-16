"""
Narra cuentos de Sinapse con Chatterbox, con una voz distinta para el narrador y para cada personaje.

Lee el reparto que genera `npm run reparto` (quién dice cada frase), crea el audio de cada frase con la
voz de referencia que le toca, las une con pausas, calcula el segundo exacto en que empieza cada párrafo
(para que el resaltado en la app sea preciso) y deja un MP3 + un manifiesto listos para
`npm run audio:importar`.

Flujo completo (en tu computadora, con la GPU o la CPU donde tengas Chatterbox):

    npm run reparto -- --sin-audio                      # 1. detecta personajes (se guarda en ./reparto)
    # 2. revisa ./reparto/<cuento>.json y corrige quién habla si hace falta
    conda activate sinapse_chatterbox
    python narrar_cuentos.py --todas \
        --consentimiento "CONS-2026-001" \
        --licencia "Voces generadas con IA a partir de grabaciones propias autorizadas (CONS-2026-001)"
    # 3. escucha cada audio y marca lo aprobado en salida/<cuento>/revision.csv
    # 4. importa a la app:
    npm run audio:importar -- --carpeta herramientas/radiodrama/chatterbox/salida \
        --manifiesto herramientas/radiodrama/chatterbox/salida/manifiesto.json --bundle

Voces de referencia (en ./voces_referencia, NO se suben a git): solo con permiso de su titular.
    narrador.wav                      el narrador (obligatorio)
    hombre_1.wav, mujer_1.wav ...     voces para personajes masculinos / femeninos
    nino.wav, anciano.wav, anciana.wav, animal.wav, ser.wav     (opcionales, para esos tipos)
    zorro.wav, condor.wav ...         una voz propia para un personaje concreto (el nombre del personaje)
Si falta la voz que le toca a un personaje, usa la siguiente de su lista y, al final, la del narrador
(se avisa; así ese personaje sonaría igual que el narrador).

Opciones:
    --historia a,b    cuentos concretos (por defecto, los que tengan reparto en ./reparto)
    --todas           todos los que tengan reparto
    --simulado        prueba el flujo sin Chatterbox (audio con tonos suaves); no necesita torch ni GPU
    --regenerar N     (con --historia) vuelve a generar solo el segmento N (ver revision.csv)
    --salida DIR      dónde dejar los audios (por defecto ./salida)
"""
from pathlib import Path
import argparse
import csv
import json
import re
import shutil
import subprocess

import numpy as np
import soundfile as sf

BASE = Path(__file__).resolve().parent
PAUSA_FRASE = 0.30      # entre trozos de una misma intervención
PAUSA_CAMBIO = 0.18     # entre narrador y personaje dentro de un párrafo
PAUSA_PARRAFO = 0.75    # entre párrafos
MAX_TROZO = 230         # caracteres: Chatterbox rinde mejor con frases cortas
RMS_OBJETIVO = 0.07     # volumen medio parecido en todas las voces


def trozos(texto):
    """Parte un texto en grupos de frases de hasta MAX_TROZO caracteres."""
    frases = re.findall(r'[^.!?…]+[.!?…]*["”»)]*\s*', texto) or [texto]
    grupos, actual = [], ''
    for f in frases:
        f = f.strip()
        if not f:
            continue
        if actual and len(actual) + len(f) + 1 > MAX_TROZO:
            grupos.append(actual)
            actual = f
        else:
            actual = f'{actual} {f}'.strip()
    if actual:
        grupos.append(actual)
    return grupos


def normalizar(y):
    y = np.asarray(y, dtype=np.float32)
    rms = float(np.sqrt(np.mean(y ** 2))) or 1e-6
    y = y * min(RMS_OBJETIVO / rms, 4.0)
    pico = float(np.max(np.abs(y))) or 1.0
    return y * min(1.0, 0.95 / pico)


def elegir_referencia(cfg, carpeta, personaje, avisos):
    for nombre in cfg['referencias']:
        ruta = carpeta / f'{nombre}.wav'
        if ruta.is_file():
            if nombre == 'narrador' and personaje != 'narrador':
                avisos.add(f'{personaje}: no hay voz propia en voces_referencia, usa la del narrador (suena igual)')
            return ruta
    return None


def principal():
    ap = argparse.ArgumentParser(description='Narra cuentos con una voz por personaje (Chatterbox).')
    ap.add_argument('--historia')
    ap.add_argument('--todas', action='store_true')
    ap.add_argument('--reparto', type=Path, default=BASE / 'reparto')
    ap.add_argument('--referencias', type=Path, default=BASE / 'voces_referencia')
    ap.add_argument('--salida', type=Path, default=BASE / 'salida')
    ap.add_argument('--simulado', action='store_true')
    ap.add_argument('--regenerar', type=int)
    ap.add_argument('--consentimiento', default='')
    ap.add_argument('--licencia', default='')
    ap.add_argument('--narrador-nombre', default='Voces de Sinapse (IA con voces autorizadas)')
    ap.add_argument('--credito', default='Narración generada con IA (Chatterbox) a partir de voces con consentimiento de sus titulares.')
    args = ap.parse_args()

    if args.historia:
        ids = [s.strip() for s in args.historia.split(',')]
    elif args.todas:
        ids = sorted(p.stem for p in args.reparto.glob('*.json'))
    else:
        ap.error('Indica --historia id[,id] o --todas')
    if not ids:
        raise SystemExit(f'No hay reparto en {args.reparto}. Corre antes: npm run reparto -- --sin-audio')

    modelo, sr = None, 24000
    if not args.simulado:
        import torch
        from chatterbox.mtl_tts import ChatterboxMultilingualTTS
        dispositivo = 'cuda' if torch.cuda.is_available() else 'cpu'
        print('Cargando Chatterbox en', dispositivo)
        modelo = ChatterboxMultilingualTTS.from_pretrained(device=dispositivo)
        sr = modelo.sr
    if not shutil.which('ffmpeg'):
        raise SystemExit('Hace falta ffmpeg para crear el MP3.')

    args.salida.mkdir(parents=True, exist_ok=True)
    filas_manifiesto = []
    for historia in ids:
        archivo_reparto = args.reparto / f'{historia}.json'
        if not archivo_reparto.is_file():
            raise SystemExit(f'No existe {archivo_reparto}. Corre: npm run reparto -- --historia {historia}')
        datos = json.loads(archivo_reparto.read_text(encoding='utf-8'))
        carpeta = args.salida / historia
        partes = carpeta / 'segmentos'
        partes.mkdir(parents=True, exist_ok=True)
        avisos = set()
        print(f'\n== {historia}: {len(datos["paragraphs"])} párrafos ==')

        # --- generar cada segmento (se conserva lo ya generado; --regenerar N rehace solo ese) ---
        lista = []  # (indice_parrafo, personaje, texto)
        for pi, segmentos in enumerate(datos['paragraphs']):
            for seg in segmentos:
                lista.append((pi, seg['speaker'], seg['text']))
        senales = []
        for n, (pi, personaje, texto) in enumerate(lista, 1):
            ruta = partes / f'{n:03d}_p{pi + 1:02d}_{personaje}.wav'
            rehacer = args.regenerar == n
            if not ruta.exists() or rehacer:
                cfg = datos['chatterbox'].get(personaje) or datos['chatterbox']['narrador']
                if args.simulado:
                    dur = max(1.0, len(texto.split()) / 2.6)
                    t = np.arange(int(dur * sr)) / sr
                    frec = 160 + 40 * (sum(map(ord, personaje)) % 6)
                    y = (0.05 * np.sin(2 * np.pi * frec * t) * (0.6 + 0.4 * np.sin(2 * np.pi * 3 * t))).astype('float32')
                else:
                    import torch
                    ref = elegir_referencia(cfg, args.referencias, personaje, avisos)
                    if ref is None:
                        raise SystemExit(f'Falta la voz de referencia para "{personaje}" (busqué: {", ".join(cfg["referencias"])}.wav en {args.referencias})')
                    fragmentos = []
                    for k, parte in enumerate(trozos(texto)):
                        torch.manual_seed(cfg.get('semilla', 1) + n * 7 + k)
                        with torch.inference_mode():
                            a = modelo.generate(text=parte, language_id='es', audio_prompt_path=str(ref),
                                                exaggeration=cfg['exaggeration'], cfg_weight=cfg['cfg_weight'])
                        s = a.detach().float().cpu().numpy().squeeze()
                        if s.ndim != 1 or not np.isfinite(s).all():
                            raise ValueError(f'Audio inválido en el segmento {n}')
                        fragmentos += [s, np.zeros(int(PAUSA_FRASE * sr), dtype='float32')]
                    y = np.concatenate(fragmentos[:-1])
                sf.write(ruta, normalizar(y), sr, subtype='PCM_16')
                print(f'  {n:03d} [{personaje}] {len(y) / sr:.1f}s  {texto[:60]}')
            y, f = sf.read(ruta, dtype='float32')
            if y.ndim == 2:
                y = y.mean(axis=1)
            senales.append((y, f))

        # --- unir con pausas y calcular dónde empieza cada párrafo ---
        piezas, inicios, t, parrafo_actual, revision = [], [], 0.0, -1, []
        for n, ((pi, personaje, texto), (y, f)) in enumerate(zip(lista, senales), 1):
            if f != sr:
                raise ValueError(f'Frecuencia distinta en el segmento {n}; regenera el audio con el mismo modelo')
            if pi != parrafo_actual:
                if parrafo_actual >= 0:
                    piezas.append(np.zeros(int(PAUSA_PARRAFO * sr), dtype='float32'))
                    t += PAUSA_PARRAFO
                inicios.append(round(t, 2))
                parrafo_actual = pi
            else:
                piezas.append(np.zeros(int(PAUSA_CAMBIO * sr), dtype='float32'))
                t += PAUSA_CAMBIO
            revision.append({'numero': n, 'parrafo': pi + 1, 'personaje': personaje, 'inicio_seg': round(t, 2),
                             'fin_seg': round(t + len(y) / sr, 2), 'texto_esperado': texto, 'revisado': ''})
            piezas.append(y)
            t += len(y) / sr
        total = np.concatenate(piezas)
        wav = carpeta / f'{historia}.es.wav'
        mp3 = carpeta / f'{historia}.es.mp3'
        sf.write(wav, total, sr, subtype='PCM_16')
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(wav), '-ac', '1', '-b:a', '64k', str(mp3)], check=True)
        with (carpeta / 'revision.csv').open('w', encoding='utf-8-sig', newline='') as fh:
            w = csv.DictWriter(fh, fieldnames=revision[0].keys())
            w.writeheader()
            w.writerows(revision)
        dur = len(total) / sr
        print(f'  -> {mp3.name}: {dur:.1f} s · párrafos en {inicios}')
        for a in sorted(avisos):
            print('  AVISO', a)

        # Una fila por audio para npm run audio:importar (se copia el MP3 a la carpeta de salida común).
        shutil.copy(mp3, args.salida / mp3.name)
        filas_manifiesto.append({
            'archivo': mp3.name, 'historia': historia, 'lengua': 'es',
            'narrador': args.narrador_nombre, 'narrador_id': 'sinapse-voces-chatterbox', 'rol': 'locutor',
            'fuente_voz': 'ia_autorizada', 'licencia': args.licencia, 'consentimiento': args.consentimiento,
            'credito': args.credito, 'bio': 'Voces creadas con IA a partir de grabaciones de personas que dieron su consentimiento.',
            'duracion': round(dur, 2), 'parrafos': ' '.join(str(v) for v in inicios),
        })

    (args.salida / 'manifiesto.json').write_text(json.dumps(filas_manifiesto, ensure_ascii=False, indent=2), encoding='utf-8')
    faltan = [k for k in ('licencia', 'consentimiento') if not getattr(args, k)]
    print(f'\nManifiesto: {args.salida / "manifiesto.json"} ({len(filas_manifiesto)} audios)')
    if faltan:
        print(f'FALTA completar {" y ".join(faltan)} en el manifiesto antes de importar (o vuelve a correr con --{faltan[0]} "..."). Ver docs/DERECHOS_Y_ETICA.md.')
    print('ANTES de importar: escucha cada audio completo y compara con revision.csv (Chatterbox puede añadir u omitir palabras).')


if __name__ == '__main__':
    principal()
