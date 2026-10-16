# Sinapse: escenas 1 y 2 con zorro expresivo

Descomprime el contenido del ZIP directamente en `D:\GitHub_Proyectos\Sinapse_TTS\Sinapse_Chatterbox` (no dentro de otra subcarpeta). El programa busca como hermanas las carpetas `Sinapse_Radiodrama_Piloto`, `Sinapse_Escena_02` y `Sinapse_Chatterbox`.

## 1. Regenerar solo las voces del zorro

```powershell
cd D:\GitHub_Proyectos\Sinapse_TTS\Sinapse_Chatterbox
conda activate sinapse_chatterbox
python generar_zorro_expresivo.py
```

`exaggeration=0.6` reproduce el ajuste **expresiva** que elegiste; no reutiliza el archivo `zorro_expresiva.wav` como voz de referencia. Para mantener mejor el timbre entre frases puedes probar `--referencia ".\voces_referencia\zorro.wav"` con un audio propio/autorizado. Esa referencia debe ser una muestra de voz clara; evalúa su efecto real en español.

El programa conserva el WAV de Kokoro, si existe, como `.kokoro_original.wav`. Escucha los nuevos WAV de ambos directorios `voces/zorro`.

## 2. Volver a producir la escena 1 y la escena 2

```powershell
conda activate sinapse_radiodrama
cd D:\GitHub_Proyectos\Sinapse_TTS\Sinapse_Radiodrama_Piloto
python producir_radiodrama.py
cd D:\GitHub_Proyectos\Sinapse_TTS\Sinapse_Escena_02
python producir_radiodrama.py guiones/escena_02.json
```

El mezclador solo incluirá música, ambiente y efectos si esos recursos existen con los nombres configurados en cada JSON. La carpeta `Melodia` anterior **no se incorpora automáticamente** en esta nueva producción: los WAV referidos en los guiones deben copiarse en las carpetas de `recursos` correspondientes.

## 3. Unir escenas y marcas de tiempo

```powershell
conda activate sinapse_radiodrama
cd D:\GitHub_Proyectos\Sinapse_TTS\Sinapse_Chatterbox
python unir_escenas.py
```

Salida: `episodio_01_escenas_1_y_2.wav` y `.json` (marcas de las dos escenas).

La escena 1 y la 2 se concatenan con 0.8 segundos de silencio. Los WAV originales no se modifican. El resultado es un episodio de prueba, no una adaptación tradicional verificada.
