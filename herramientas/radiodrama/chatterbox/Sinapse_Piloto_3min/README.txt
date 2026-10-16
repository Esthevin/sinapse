SINAPSE — PILOTO DE 3 MINUTOS

1. Copiar la carpeta Sinapse_Piloto_3min dentro de:
   D:\GitHub_Proyectos\Sinapse_TTS\Sinapse_Chatterbox

2. Las tres voces deben estar aquí:
   D:\GitHub_Proyectos\Sinapse_TTS\Sinapse_Chatterbox\voces_referencia\narrador.wav
   ...\zorro.wav
   ...\condor.wav
   Todas con permiso de sus titulares para síntesis de voz.

3. En PowerShell:
   cd D:\GitHub_Proyectos\Sinapse_TTS\Sinapse_Chatterbox\Sinapse_Piloto_3min
   conda activate sinapse_chatterbox
   python generar_episodio.py

4. Escuchar salida\episodio_piloto_voz.wav.
   Revisar salida\revision.csv y los segmentos individuales.
   Si por ejemplo el segmento 8 añade palabras:
      python generar_episodio.py --regenerar 8
   Si modificas manualmente WAV en segmentos:
      python generar_episodio.py --unir

5. IMPORTANTE:
   Duración >= 180 segundos se comprueba al finalizar, no se presupone.
   Si es menor: ampliar el guion y generar intervenciones adicionales.
   Música y efectos no se incluyen todavía. Incorporar después de revisar todas las voces.
   El cuento es una historia piloto original de prueba, NO versión tradicional certificada.
