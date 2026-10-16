# Sinapse: narrador y cóndor con Chatterbox

Esta prueba genera voces candidatas para **las escenas 1 y 2**, sin alterar el zorro expresivo, ni los WAV de Kokoro ya guardados. **No se garantiza un acento peruano**: el modelo puede añadir/omitir palabras o producir giros no deseados.

## Instalación

Extraer `generar_narrador_condor.py` en:

`D:\GitHub_Proyectos\Sinapse_TTS\Sinapse_Chatterbox\`

La estructura esperada es que `Sinapse_Chatterbox`, `Sinapse_Radiodrama_Piloto` y `Sinapse_Escena_02` sean carpetas hermanas. Ejecuta:

```powershell
cd D:\GitHub_Proyectos\Sinapse_TTS\Sinapse_Chatterbox
conda activate sinapse_chatterbox
python generar_narrador_condor.py
```

Para probar solo una intervención antes de generar todas:

```powershell
python generar_narrador_condor.py --solo n01
```

Puedes dar referencias **propias o autorizadas** a cada personaje para intentar mantener un timbre consistente:

```powershell
python generar_narrador_condor.py --ref-narrador voces_referencia\narrador.wav --ref-condor voces_referencia\condor.wav
```

Sin referencias, Chatterbox puede generar voces demasiado parecidas entre sí o inconsistentes entre líneas. `exaggeration` del narrador = 0.45 y del cóndor = 0.55; la velocidad no se modifica después de la generación.

## Revisión obligatoria

Las tomas nuevas están en `candidatos_otras_voces/escena_01/` y `candidatos_otras_voces/escena_02/`. En `revision_voces.csv` aparece el texto original junto a cada archivo. Escucha **completo** cada WAV y comprueba:

- Que diga exactamente las palabras del guion, sin añadir ni omitir ninguna.
- Que no aparezcan muletillas o modismos ajenos al español peruano.
- Que mantenga el mismo personaje/timbre y una actuación entendible.
- Que no haya cortes, pronunciaciones raras o frases incompletas.

Marca `APROBADO` únicamente en las tomas que satisfagan estos criterios. Para una línea defectuosa, repite usando `--solo IDENTIFICADOR --semilla 5678`, o conserva la versión Kokoro original. Los audios nuevos **no se copian ni sustituyen automáticamente** en las carpetas de las escenas para evitar integrar palabras inventadas. Tras escuchar, copia manualmente cada WAV aprobado a su carpeta de destino, haciendo una copia del anterior, por ejemplo:

`Sinapse_Radiodrama_Piloto/voces/narrador/n01.wav` o `Sinapse_Escena_02/voces/condor/s2_c01.wav`.

Después vuelve a ejecutar `producir_radiodrama.py` en cada escena y `unir_escenas.py` en `Sinapse_Chatterbox`, tal como hiciste con el zorro expresivo. **La música añadida en `Melodia` no aparece automáticamente** si faltan recursos en los guiones.

El guion es una ficción piloto; no se ha verificado como adaptación de un relato tradicional concreto.
