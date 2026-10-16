"""Une las escenas 1 y 2 ya producidas; actualiza las marcas temporales."""
from pathlib import Path
import json
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly
from math import gcd
BASE=Path(__file__).resolve().parent.parent
P1=BASE/'Sinapse_Radiodrama_Piloto'/'producciones'/'episodio_001.wav'
P2=BASE/'Sinapse_Escena_02'/'producciones'/'escena_02.wav'
M1=BASE/'Sinapse_Radiodrama_Piloto'/'producciones'/'marcas_tiempo.json'
M2=BASE/'Sinapse_Escena_02'/'producciones'/'marcas_escena_02.json'
SALIDA=BASE/'Sinapse_Chatterbox'/'episodio_01_escenas_1_y_2.wav'
SR=44100

def leer(path):
    if not path.is_file():raise FileNotFoundError(f'Falta: {path}')
    y,sr=sf.read(path,dtype='float32',always_2d=True)
    if sr!=SR:
        g=gcd(sr,SR);y=resample_poly(y,SR//g,sr//g,axis=0).astype('float32')
    if y.shape[1]==1:y=np.repeat(y,2,axis=1)
    return y[:,:2]

def main():
    a,b=leer(P1),leer(P2)
    gap=int(SR*0.8)
    result=np.concatenate([a,np.zeros((gap,2),dtype='float32'),b])
    pico=float(np.max(np.abs(result)))
    if pico>0.98:result*=0.98/pico
    SALIDA.parent.mkdir(parents=True,exist_ok=True)
    sf.write(SALIDA,result,SR,subtype='PCM_16')
    marcas=[]
    for label,path,offset in [('escena_1',M1,0),('escena_2',M2,(len(a)+gap)/SR)]:
        if path.is_file():
            for item in json.loads(path.read_text(encoding='utf-8')):
                item=dict(item)
                item['escena']=label
                item['inicio_seg']=round(item['inicio_seg']+offset,3)
                item['fin_seg']=round(item['fin_seg']+offset,3)
                marcas.append(item)
        else:print('AVISO: sin marcas para',label)
    SALIDA.with_suffix('.json').write_text(json.dumps(marcas,ensure_ascii=False,indent=2),encoding='utf-8')
    print('Archivo:',SALIDA,'| duración:',round(len(result)/SR,2),'s | marcas:',len(marcas))
if __name__=='__main__':main()
