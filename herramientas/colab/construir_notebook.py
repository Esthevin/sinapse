"""Genera Sinapse_Entrenar_Voces.ipynb (para Google Colab). Uso: python herramientas/colab/construir_notebook.py

Se arma desde aqui para poder revisar la sintaxis de cada celda antes de publicarlo.
"""
import ast
import json
import re
from pathlib import Path

AQUI = Path(__file__).resolve().parent
cells = []


def md(texto):
    cells.append({"cell_type": "markdown", "metadata": {}, "source": texto.strip("\n").splitlines(keepends=True)})


def code(texto):
    cells.append({"cell_type": "code", "metadata": {}, "execution_count": None, "outputs": [], "source": texto.strip("\n").splitlines(keepends=True)})


md("""
# Sinapse · Voces para todas las lenguas

Este cuaderno prepara, **entrena** y usa voces para las historias de Sinapse. Se ejecuta en Google Colab con una GPU gratuita (*Entorno de ejecución → Cambiar tipo → GPU T4*).

| Lengua | Qué hace este cuaderno | Voz base |
|---|---|---|
| Castellano | **A)** afina el modelo MMS-TTS `spa` con la voz de una persona **o** **B)** clona su voz sin entrenar (Chatterbox) | MMS-TTS `spa` / Chatterbox |
| Quechua cusqueño, ayacuchano y ancashino | Afina MMS-TTS `quz`, `quy`, `qwh` | MMS-TTS (Meta) |
| Aimara, asháninka, awajún, shipibo-konibo, matsigenka | Afina MMS-TTS `ayr`, `cni`, `agr`, `shp`, `mcb` | MMS-TTS (Meta) |
| Jaqaru | **No hay modelo base.** Solo narración humana | — |

## Cómo funciona (y qué NO hace)

- **Afinar** (*fine-tuning*) toma un modelo de voz que ya habla la lengua y lo ajusta con las grabaciones de **una** persona. Con 80 a 150 frases (unos 10 a 20 minutos) ya se nota; con 30+ minutos mejora mucho.
- **No inventa texto ni traduce.** Lee los textos que ya están en las historias. Si una lengua no tiene texto en `src/content/historias/`, primero hay que traducirlo (ver `herramientas/traducciones/pendientes/`).
- **Clonar** (Chatterbox) solo existe para castellano y otras lenguas grandes; no entiende quechua, aimara ni las amazónicas.

## Reglas obligatorias

1. **Solo con consentimiento escrito** de la persona cuya voz se entrena. Debes anotar su referencia (ej. `CONS-2026-014`). Sin ella el cuaderno se detiene. El documento firmado **nunca** se sube a GitHub: se guarda en una carpeta segura del equipo.
2. **La voz resultante es de IA.** En la app siempre se muestra como "voz recreada con IA, con autorización" y la grabación humana directa tiene prioridad.
3. **Licencias:** los modelos MMS-TTS de Meta son **CC BY-NC 4.0** (uso no comercial); lo que afines a partir de ellos hereda esa restricción. Chatterbox es MIT. El código de afinado (`ylacombe/finetune-hf-vits`) es MIT.
4. Todo audio generado es un **borrador**: escúchalo completo antes de publicarlo (los modelos pueden comerse o inventar sonidos).
""")

md("## 1. Datos de la voz")
code('''
#@title Completa estos datos y ejecuta { run: "auto" }
LENGUA = "quz" #@param ["es", "quz", "quy", "qwh", "ay", "cni", "agr", "shp", "mcb"]
MODO = "afinar_mms" #@param ["afinar_mms", "clonar_chatterbox"]
NARRADOR = "" #@param {type:"string"}
CONSENTIMIENTO_REF = "" #@param {type:"string"}
REGION = "sierra" #@param ["costa", "sierra", "selva"]
EPOCAS = 200 #@param {type:"integer"}
LOTE = 16 #@param {type:"integer"}
HISTORIAS = "" #@param {type:"string"}
#@markdown `HISTORIAS`: ids separados por coma (ej. `naylamp,yacumama`). Vacío = todas las que tengan texto en la lengua.

if not NARRADOR.strip() or not CONSENTIMIENTO_REF.strip():
    raise SystemExit("Falta el nombre de la persona narradora y/o la referencia de su consentimiento firmado. No se puede continuar sin ellas.")
if MODO == "clonar_chatterbox" and LENGUA != "es":
    raise SystemExit("Chatterbox solo sirve para castellano. Para las demás lenguas usa MODO = afinar_mms.")
SOLO = {h.strip() for h in HISTORIAS.split(",") if h.strip()} or None
print(f"Lengua: {LENGUA} · modo: {MODO} · narrador/a: {NARRADOR} · consentimiento: {CONSENTIMIENTO_REF}")
''')

md("## 2. Preparar el entorno")
code('''
import os, sys, subprocess
from pathlib import Path

import torch
print("GPU:", torch.cuda.get_device_name(0) if torch.cuda.is_available() else "NO HAY GPU: activa una en Entorno de ejecución")

from google.colab import drive
drive.mount("/content/drive")
BASE = Path(f"/content/drive/MyDrive/Sinapse_Voces/{LENGUA}")
for sub in ("grabaciones", "salida", "modelo"):
    (BASE / sub).mkdir(parents=True, exist_ok=True)

if not Path("/content/sinapse").exists():
    subprocess.run(["git", "clone", "--depth", "1", "https://github.com/Esthevin/sinapse", "/content/sinapse"], check=True)
sys.path.insert(0, "/content/sinapse/herramientas/colab")
import sinapse_voces as sv

historias = sv.cargar_historias(Path("/content/sinapse"))
print(f"{len(historias)} historias cargadas desde GitHub. Carpeta de trabajo (Drive): {BASE}")
''')
code('''
#@title Instalar dependencias (1 a 3 min)
import subprocess
if MODO == "afinar_mms":
    # Versiones fijadas: ylacombe/finetune-hf-vits no se actualiza desde 2024. Si alguna falla, borra el "==x.y" y reintenta.
    subprocess.run("pip -q install transformers==4.44.2 'datasets[audio]==2.21.0' accelerate==0.34.2 soundfile Cython tensorboard", shell=True, check=True)
else:
    subprocess.run("pip -q install chatterbox-tts soundfile", shell=True, check=True)
print("Listo. Si cambias de MODO, reinicia el entorno (Entorno de ejecución → Reiniciar) y vuelve a ejecutar desde el paso 1.")
''')

md("""
## 3. El guion de grabación

El cuaderno corta los textos de las historias en **frases cortas** (menos de 170 caracteres, 5 a 12 segundos al leerlas). La persona narradora lee **cada frase** y graba un audio con el nombre de su `id` (`linea_0001.wav`, `linea_0002.wav`…). Así cada audio tiene su texto exacto, y no hay que alinear nada a mano.

**Cómo grabar bien (esto pesa más que cualquier ajuste):**
- Un lugar silencioso, sin eco ni ruido de fondo. Teléfono a un palmo de la boca. Sin música.
- **Una sola persona**, siempre con el mismo micrófono y el mismo tono. Lee con naturalidad, como contando.
- Una frase por archivo, de 2 a 15 segundos. Si te equivocas, repite el archivo completo.
- Formatos: WAV, MP3 o M4A (cualquier teléfono sirve).
""")
code('''
filas = sv.hacer_guion(historias, LENGUA, SOLO)
if not filas:
    raise SystemExit(f"No hay textos en {LENGUA} en las historias. Traduce primero (herramientas/traducciones/pendientes/{LENGUA}.json) o sube tu propio guion con columnas id,texto.")
sv.guardar_guion(filas, BASE / "guion.csv")
print(sv.resumen_guion(filas))
print("Guion guardado en Drive:", BASE / "guion.csv")
for f in filas[:5]:
    print(" ", f["id"], "·", f["texto"])
from google.colab import files
files.download(str(BASE / "guion.csv"))
''')

md("""
## 4. Subir las grabaciones

Copia los audios (`linea_0001.wav`, …) a la carpeta **`Sinapse_Voces/<lengua>/grabaciones`** de tu Google Drive (o ejecuta la celda siguiente y sube un `.zip`). No importa que falten algunas frases.
""")
code('''
import zipfile, shutil
grab = BASE / "grabaciones"
if not any(grab.rglob("*.*")):
    from google.colab import files
    print("La carpeta está vacía. Sube un .zip con las grabaciones:")
    subidos = files.upload()
    for nombre in subidos:
        if nombre.lower().endswith(".zip"):
            zipfile.ZipFile(nombre).extractall(grab)
        else:
            shutil.move(nombre, grab / nombre)

guion = sv.leer_guion(BASE / "guion.csv")
informe = sv.armar_dataset(grab, guion, Path("/content/dataset"))
print(f"Frases con audio válido: {informe['usadas']} de {len(guion)}")
print(f"  sin audio: {len(informe['faltan'])} · muy cortas (<{sv.MIN_SEG}s): {len(informe['cortas'])} · muy largas (>{sv.MAX_SEG}s): {len(informe['largas'])}")
if informe["usadas"] < 80:
    print("⚠ Con menos de 80 frases el resultado suele ser flojo. Graba más.")
''')
code('''
# Comprueba que el modelo base entiende todas las letras del texto (si no, esas letras se pierden).
if MODO == "afinar_mms":
    from transformers import AutoTokenizer
    MMSCODE = sv.MMS[LENGUA]
    tok_base = AutoTokenizer.from_pretrained(f"facebook/mms-tts-{MMSCODE}")
    textos = [f["text"] for f in __import__("csv").DictReader(open("/content/dataset/train/metadata.csv", encoding="utf-8"))]
    raros = sv.caracteres_desconocidos(textos, set(tok_base.get_vocab().keys()))
    print("Letras que el modelo no conoce:", raros or "ninguna")
''')

md("""
## 5A. Afinar el modelo (modo `afinar_mms`)

Usa [`ylacombe/finetune-hf-vits`](https://github.com/ylacombe/finetune-hf-vits) (MIT). Con 100 frases tarda unos 20 a 40 minutos en una T4. El avance se guarda en tu Drive, así que si Colab se corta no empiezas de cero.
""")
code('''
if MODO != "afinar_mms":
    print("Saltar: este paso es solo para MODO = afinar_mms")
else:
    import json, subprocess
    MMSCODE = sv.MMS[LENGUA]
    def sh(cmd, cwd=None):
        print("$", cmd)
        subprocess.run(cmd, shell=True, check=True, cwd=cwd)

    if not Path("/content/ft").exists():
        sh("git clone -q https://github.com/ylacombe/finetune-hf-vits /content/ft")
    sh("pip -q install -r /content/ft/requirements.txt")
    sh("mkdir -p monotonic_align && python setup.py build_ext --inplace", cwd="/content/ft/monotonic_align")
    BASE_MODELO = f"/content/base_{MMSCODE}"
    sh(f"python convert_original_discriminator_checkpoint.py --language_code {MMSCODE} --pytorch_dump_folder_path {BASE_MODELO}", cwd="/content/ft")

    OUT = BASE / "modelo"
    prueba = textos[0] if "textos" in globals() and textos else "hola"
    cfg = sv.config_entrenamiento(MMSCODE, "/content/dataset", BASE_MODELO, str(OUT), EPOCAS, LOTE, prueba)
    Path("/content/ft/config_sinapse.json").write_text(json.dumps(cfg, indent=2), encoding="utf-8")
    sh("accelerate launch run_vits_finetuning.py /content/ft/config_sinapse.json", cwd="/content/ft")
    print("Modelo afinado guardado en", OUT)
''')

md("## 5B. Probar la voz afinada")
code('''
if MODO != "afinar_mms":
    print("Saltar: este paso es solo para MODO = afinar_mms")
else:
    import numpy as np, IPython.display as ipd
    from transformers import VitsModel, AutoTokenizer
    dev = "cuda" if torch.cuda.is_available() else "cpu"
    MMSCODE = sv.MMS[LENGUA]
    def cargar(ruta_modelo, ruta_tok=None):
        m = VitsModel.from_pretrained(ruta_modelo).to(dev).eval()
        try:
            t = AutoTokenizer.from_pretrained(ruta_tok or ruta_modelo)
        except Exception:
            t = AutoTokenizer.from_pretrained(f"facebook/mms-tts-{MMSCODE}")
        return m, t
    def hablar(m, t, texto):
        ids = t(sv.limpiar(texto), return_tensors="pt").to(dev)
        with torch.no_grad():
            return m(**ids).waveform[0].float().cpu().numpy()

    base_m, base_t = cargar(f"facebook/mms-tts-{MMSCODE}")
    afin_m, afin_t = cargar(str(BASE / "modelo"))
    frase = next((f["texto"] for f in filas), "Hola") if "filas" in globals() else "Hola"
    print("Frase:", frase)
    print("Modelo base (voz genérica):"); ipd.display(ipd.Audio(hablar(base_m, base_t, frase), rate=base_m.config.sampling_rate))
    print("Modelo afinado (tu narrador/a):"); ipd.display(ipd.Audio(hablar(afin_m, afin_t, frase), rate=afin_m.config.sampling_rate))
''')

md("""
## 5C. Clonar sin entrenar (modo `clonar_chatterbox`, solo castellano)

Chatterbox imita una voz a partir de **una grabación de referencia** de 10 a 30 segundos: una sola persona, nítida, sin música. **Solo con permiso de quien habla.**
""")
code('''
if MODO != "clonar_chatterbox":
    print("Saltar: este paso es solo para MODO = clonar_chatterbox")
else:
    from google.colab import files
    print("Sube la grabación de referencia (WAV, 10 a 30 s, una sola voz):")
    sub = files.upload()
    REFERENCIA = str(BASE / "referencia.wav")
    shutil.move(next(iter(sub)), REFERENCIA)
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS
    cb = ChatterboxMultilingualTTS.from_pretrained(device="cuda" if torch.cuda.is_available() else "cpu")
    print("Chatterbox listo. Frecuencia:", cb.sr)
''')

md("## 6. Generar los cuentos")
code('''
import numpy as np
dev = "cuda" if torch.cuda.is_available() else "cpu"

if MODO == "afinar_mms":
    sr = afin_m.config.sampling_rate
    sintetizar = lambda texto: hablar(afin_m, afin_t, texto)
    trozos = sv.trozos_mms
else:
    sr = cb.sr
    def sintetizar(texto):
        with torch.inference_mode():
            a = cb.generate(text=texto, language_id="es", audio_prompt_path=REFERENCIA, exaggeration=0.5, cfg_weight=0.3)
        return a.detach().float().cpu().numpy().squeeze()
    trozos = sv.trocear

SALIDA = BASE / "salida"
manifiesto = []
for sid, s in historias.items():
    if SOLO and sid not in SOLO:
        continue
    parrafos = sv.texto_de(s, LENGUA)
    if not parrafos:
        continue
    print("♪", sid, f"({len(parrafos)} párrafos)")
    onda, inicios = sv.narrar_parrafos(parrafos, sintetizar, sr, trozos)
    archivo = f"{sid}.{LENGUA}.mp3"
    sv.guardar_mp3(onda, sr, SALIDA / archivo)
    manifiesto.append(sv.fila_manifiesto(sid, LENGUA, archivo, len(onda) / sr, inicios, NARRADOR, CONSENTIMIENTO_REF, REGION))
    print(f"   {len(onda)/sr:.0f} s")

import json
(SALIDA / "manifiesto.json").write_text(json.dumps(manifiesto, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"\\n{len(manifiesto)} audios en {SALIDA}")
''')
code('''
#@title Descargar los audios y el manifiesto (.zip)
import shutil
from google.colab import files
zip_path = shutil.make_archive(f"/content/sinapse_voces_{LENGUA}", "zip", BASE / "salida")
files.download(zip_path)
''')

md("""
## 7. Llevar las voces a Sinapse

1. Descomprime el `.zip` en una carpeta del proyecto, por ejemplo `./voces_quz`.
2. **Escucha cada audio completo.** Revisa que diga exactamente lo del texto, sin palabras de más ni de menos.
3. Ensayo sin escribir nada:
   ```bash
   npm run audio:importar -- --carpeta ./voces_quz --manifiesto ./voces_quz/manifiesto.json --dry-run
   ```
4. Importar de verdad (quita `--dry-run`; agrega `--bundle` si deben ir dentro de la app) y luego `npm run validar`.
5. El importador se niega a publicar si falta el consentimiento o si la licencia no dice que la voz es de IA.

La voz queda como **"recreada con IA, con autorización"**. Cuando la persona grabe a mano las historias, la app prefiere su grabación.

### Si algo falla
| Problema | Qué hacer |
|---|---|
| `No hay GPU` | Entorno de ejecución → Cambiar tipo → T4. |
| Falla al instalar versiones | Quita el `==x.y` de la celda de instalación y reintenta. |
| La voz suena a la base, no a la persona | Faltan frases o hay ruido: graba más (30+ min) y sube las `EPOCAS` a 300. |
| Se "comen" palabras | Es normal en TTS: regenera esa historia o parte la frase más corta. |
| Letras desconocidas | El texto usa signos que el modelo no tiene: se pierden al hablar; ajusta la ortografía. |
""")

# ---- validar sintaxis de las celdas de codigo (ignora lineas con magics)
for i, c in enumerate(cells):
    if c["cell_type"] != "code":
        continue
    fuente = "".join(c["source"])
    limpio = re.sub(r"^\s*[!%].*$", "pass", fuente, flags=re.M)
    try:
        ast.parse(limpio)
    except SyntaxError as e:
        raise SystemExit(f"Sintaxis incorrecta en la celda {i}: {e}")

nb = {
    "cells": cells,
    "metadata": {
        "colab": {"provenance": [], "gpuType": "T4"},
        "kernelspec": {"display_name": "Python 3", "name": "python3"},
        "accelerator": "GPU",
    },
    "nbformat": 4,
    "nbformat_minor": 5,
}
destino = AQUI / "Sinapse_Entrenar_Voces.ipynb"
destino.write_text(json.dumps(nb, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"{sum(c['cell_type']=='code' for c in cells)} celdas de codigo, {sum(c['cell_type']=='markdown' for c in cells)} de texto -> {destino.name}")
