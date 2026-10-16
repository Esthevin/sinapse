# Sinapse — Productor de radiodrama piloto

Este paquete contiene la **estructura y el guion de la escena 1**, así como un mezclador multipista funcional. **No incluye voces sintetizadas, música ni efectos licenciados**. No se presenta como un episodio completo.

## Instalación (PowerShell, Windows)

```powershell
cd D:\GitHub_Proyectos\Sinapse_TTS\Sinapse_Radiodrama_Piloto
conda activate sinapse_tts
python -m pip install numpy scipy soundfile
```

## Voces: nombres requeridos

Coloca las grabaciones en estas rutas (pueden venir de TTS autorizado o grabaciones propias):

- `voces/narrador/n01.wav`, `n02.wav`, `n03.wav`, `n04.wav`
- `voces/zorro/z01.wav`, `z02.wav`
- `voces/condor/c01.wav`, `c02.wav`

Cada WAV corresponde exactamente al texto de la intervención con el mismo ID en `guiones/zorro_condor.json`. Revisa pronunciación y derechos de uso. Para el piloto quechua, se requiere adaptación y revisión lingüística; las voces españolas aquí son solo un plan de producción.

## Recursos opcionales

- `recursos/musica/musica.wav`
- `recursos/ambientes/viento.wav`
- `recursos/efectos/aleteo.wav`

Utiliza únicamente archivos propios o con permisos de reutilización; conserva sus créditos y licencias.

## Ejecutar

```powershell
python producir_radiodrama.py
```

El programa avisa qué voces faltan y **no exporta un episodio incompleto** por defecto. Si ya tienes algunas voces y quieres inspeccionar una mezcla provisional:

```powershell
python producir_radiodrama.py --permitir-parcial
```

Salida: `producciones/episodio_001.wav` y `producciones/marcas_tiempo.json`.

## Alcance

Es una prueba de infraestructura: mezcla por intervenciones, música/ambiente opcionales con reducción de fondo durante las voces y efectos colocados al final de una intervención indicada. La mezcla aún requiere edición artística, normalización de loudness, sincronización precisa y pruebas de escucha. La licencia y fidelidad cultural del cuento experimental deben verificarse antes de distribuirlo.

## Etapa 2: generar tres voces de prueba con IA

Esta versión incorpora `generar_voces_kokoro.py`, que procesa las ocho intervenciones del JSON y produce sus archivos WAV en las carpetas que espera el mezclador. Usa **Kokoro-82M** y sus voces en español: `ef_dora` (narrador), `em_alex` (zorro), `em_santa` (cóndor). Los pesos de Kokoro están publicados bajo Apache-2.0; revisa además las licencias de música y efectos. No se garantiza interpretación emocional ni acento peruano, y este generador **no soporta quechua**.

Para no mezclar dependencias con MMS-TTS, crea un entorno independiente en Windows:

```powershell
conda create -n sinapse_radiodrama python=3.11 -y
conda activate sinapse_radiodrama
python -m pip install "kokoro>=0.9.4" soundfile numpy scipy
```

**Windows:** Kokoro utiliza eSpeak NG para la fonemización. Si no está instalado, descarga el instalador `.msi` desde https://github.com/espeak-ng/espeak-ng/releases y reinicia VS Code.

Prueba con una sola intervención:

```powershell
python generar_voces_kokoro.py --solo n01
```

Genera las ocho pistas restantes:

```powershell
python generar_voces_kokoro.py
python producir_radiodrama.py
```

Las pistas originales se conservan. Para reemplazarlas explícitamente, añade `--sobrescribir`. Si falta una pista, el mezclador informa cuál. La primera ejecución requiere Internet para descargar los pesos de Kokoro.

[No verificado] La instalación del motor y el resultado acústico no han sido ejecutados en la computadora del usuario; la compatibilidad deberá comprobarse con la prueba `--solo n01`.
