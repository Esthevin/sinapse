"""Mezcla reproducible del episodio piloto Sinapse, sin modificar WAV de voces.
Usa musica/viento/aleteo de la carpeta Melodia ya preparada por el usuario.
Requiere numpy, soundfile y FFmpeg (ruta absoluta alternativa incluida).
"""
from pathlib import Path
import json, subprocess, tempfile
import numpy as np
import soundfile as sf

BASE = Path(__file__).resolve().parent
# Este script va dentro de Sinapse_Piloto_3min.
VOZ = BASE / 'salida' / 'episodio_piloto_voz.wav'
MARCAS = BASE / 'salida' / 'revision.json'
MELODIA = BASE.parents[1] / 'Sinapse_Radiodrama_Piloto' / 'Melodia'
MUSICA = MELODIA / 'musica_andina.mp3'
VIENTO = MELODIA / 'viento.mp3'
ALETEO = MELODIA / 'aleteo.wav'
FFMPEG = Path('D:/Herramientas/ffmpeg/bin/ffmpeg.exe')
SR = 44100
INTRO = 3.0
OUTRO = 4.0
SALIDA = BASE / 'salida'

def ffmpeg():
    return str(FFMPEG) if FFMPEG.is_file() else 'ffmpeg'

def convertir(origen, destino):
    subprocess.run([ffmpeg(), '-nostdin','-y','-hide_banner','-loglevel','error',
        '-i',str(origen),'-ar',str(SR),'-ac','2',str(destino)],check=True)
    a, tasa = sf.read(destino, dtype='float32',always_2d=True)
    if tasa != SR or len(a)==0: raise ValueError('Decodificacion incompleta: '+str(origen))
    return a

def lazo_suave(a,n):
    """Repite recursos con fundido breve en cada unión para suavizar saltos."""
    if len(a)>=n: return a[:n].copy()
    fade = min(int(.35*SR), len(a)//4)
    if fade<1: return np.tile(a,(int(np.ceil(n/len(a))),1))[:n]
    out=np.zeros((n,2),dtype=np.float32)
    pos=0
    while pos<n:
        if pos==0:
            k=min(len(a),n); out[:k]=a[:k]; pos=k
        else:
            overlap=min(fade,pos,len(a))
            start=pos-overlap
            k=min(len(a), n-start)
            if k<=0: break
            u=np.linspace(0,1,overlap,endpoint=True,dtype=np.float32)[:,None]
            out[start:pos]=out[start:pos]*(1-u)+a[:overlap]*u
            out[pos:start+k]=a[overlap:k]
            pos=start+k
    return out

def rampa(t,puntos):
    return np.interp(t,[x for x,y in puntos],[y for x,y in puntos]).astype('float32')

def poner(out,a,tiempo,ganancia):
    pos=max(0,round(tiempo*SR)); fin=min(len(out),pos+len(a))
    if fin>pos: out[pos:fin] += ganancia*a[:fin-pos]

def main():
    for ruta in [VOZ,MARCAS,MUSICA,VIENTO,ALETEO]:
        if not ruta.exists():
            raise FileNotFoundError(f'Falta {ruta}. Comprueba que Melodia y Sinapse_Piloto_3min estén en las carpetas indicadas en LEEME.')
    marcas=json.loads(MARCAS.read_text(encoding='utf-8'))
    voz0,sr0=sf.read(VOZ,dtype='float32',always_2d=True)
    with tempfile.TemporaryDirectory() as d:
        d=Path(d)
        voz = convertir(VOZ,d/'voz.wav') if sr0!=SR or voz0.shape[1]!=2 else voz0
        musica = convertir(MUSICA,d/'musica.wav')
        viento = convertir(VIENTO,d/'viento.wav')
        alas = convertir(ALETEO,d/'alas.wav')
    n = len(voz)+round((INTRO+OUTRO)*SR)
    dur=n/SR
    t=np.arange(n,dtype=np.float32)/SR
    out=np.zeros((n,2),dtype=np.float32)
    mus=lazo_suave(musica,n)
    amb=lazo_suave(viento,n)
    # Música: apertura, base suave por debajo del habla, outro más presente.
    mus_base=rampa(t,[(0,0),(1.3,.18),(INTRO,.065),(dur-OUTRO,.065),(dur-2,.17),(dur,0)])
    # Ducking a partir de los intervalos de voz ya identificados por el guion.
    habla=np.zeros(n,dtype=np.float32)
    for m in marcas:
        a=max(0,round((INTRO+float(m['inicio_seg'])-.18)*SR))
        b=min(n,round((INTRO+float(m['fin_seg'])+.18)*SR))
        if b>a: habla[a:b]=1.
    # Atenuar/recuperar progresivamente en ~0.35 s; cálculo compacto por fotogramas.
    step=441
    env=np.maximum.reduceat(habla,np.arange(0,n,step))
    kernel=np.ones(71,dtype=np.float32)
    env=np.convolve(env,kernel/kernel.sum(),mode='same')
    env=np.interp(np.arange(n,dtype=np.float32)/step,np.arange(len(env)),env).astype(np.float32)
    gan_mus=mus_base*(1-.55*np.clip(env,0,1))
    out += mus*gan_mus[:,None]
    gan_viento=rampa(t,[(0,0),(INTRO,.012),(dur-OUTRO,.012),(dur,0)])
    out += amb*gan_viento[:,None]
    # Efectos vinculados a los acontecimientos del guion: segmentos 4, 11 y 20.
    # Los tiempos precisos dependen de cada síntesis; la ubicación es editable.
    puntos=[(4,.12,'El cóndor desciende'),(11,.18,'El cóndor extiende las alas'),(20,.14,'El cóndor alza el vuelo')]
    posiciones=[]
    for numero,ganancia,descripcion in puntos:
        m=next((x for x in marcas if int(x['numero'])==numero),None)
        if m is None: continue
        centro=(float(m['inicio_seg'])+float(m['fin_seg']))/2
        cuando=INTRO+centro
        poner(out,alas,cuando,ganancia)
        posiciones.append({'segmento':numero,'segundo':round(cuando,2),'efecto':descripcion,'ganancia':ganancia})
    poner(out,voz,INTRO,1.0)
    peak=float(np.max(np.abs(out)))
    if peak>.94: out *= .94/peak
    SALIDA.mkdir(exist_ok=True)
    wav=SALIDA/'episodio_piloto_musicalizado.wav'
    mp3=SALIDA/'episodio_piloto_musicalizado.mp3'
    sf.write(wav,out,SR,subtype='PCM_16')
    subprocess.run([ffmpeg(),'-nostdin','-y','-hide_banner','-loglevel','error','-i',str(wav),'-codec:a','libmp3lame','-b:a','192k',str(mp3)],check=True)
    (SALIDA/'efectos_aplicados.json').write_text(json.dumps(posiciones,ensure_ascii=False,indent=2),encoding='utf-8')
    print(f'Listo: {wav.name} y {mp3.name}')
    print(f'Duracion: {dur:.2f} segundos ({dur/60:.2f} min). Pico antes de limitacion: {peak:.3f}')
    if dur < 180: print('ATENCION: menor a 3 minutos. Amplia el guion y la voz; no uses silencios para simular contenido.')
    print('Revisar sincronizacion de efectos y fidelidad de cada voz antes de entregar.')

if __name__=='__main__':
    main()
