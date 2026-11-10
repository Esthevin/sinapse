"""Arma una novela de Sinapse (src/content/novelas/<id>.json) con texto de dominio público y voz humana de LibriVox.

Uso:  python herramientas/novelas/construir.py herramientas/novelas/configs/maria.json

El JSON de configuración dice de dónde sale el texto (Wikisource o Project Gutenberg), qué audio de LibriVox
(archive.org) acompaña a cada capítulo y quién narra. El script descarga el texto y las duraciones, parte cada capítulo
en párrafos y escribe el archivo que lee la app. No descarga audio: la app lo escucha por internet desde archive.org
(igual que los cuentos con voz humana que ya tiene) y el resaltado se reparte por la longitud de cada párrafo.

Derechos: solo textos de dominio público y grabaciones de LibriVox (dominio público). Revisa cada obra antes de agregarla.
"""
import json
import re
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from wikisource import limpiar, obtener  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / "herramientas" / "novelas" / ".cache"


def http(url):
    req = urllib.request.Request(url, headers={"User-Agent": "SinapseBot/1.0 (https://github.com/Esthevin/sinapse)"})
    with urllib.request.urlopen(req, timeout=90) as r:
        return r.read()


def segundos(v):
    if v is None:
        return None
    s = str(v)
    if ":" in s:
        n = 0.0
        for parte in s.split(":"):
            n = n * 60 + float(parte)
        return n
    return float(s)


def texto_gutenberg(cfg):
    f = CACHE / f"gutenberg_{cfg['id']}.txt"
    CACHE.mkdir(parents=True, exist_ok=True)
    if not f.exists():
        f.write_bytes(http(cfg["text"]["url"]))
    t = f.read_text(encoding="utf-8")
    t = t.split("*** START OF", 1)[-1].split("***", 1)[-1].split("*** END OF", 1)[0]
    secciones = {}
    marcas = cfg["text"]["sections"]  # [{key, start}] en orden; cada sección llega hasta el inicio de la siguiente
    pos = []
    for m in marcas:
        mm = re.search(m["start"], t, flags=re.M)
        if not mm:
            raise SystemExit(f"No encuentro el inicio de la sección {m['key']}: {m['start']}")
        pos.append(mm.start())
    for i, m in enumerate(marcas):
        trozo = t[pos[i]: pos[i + 1] if i + 1 < len(pos) else len(t)]
        trozo = re.sub(r"[{}]", "", trozo)  # marcas de interpolaciones de la edición de Alcalá
        paras = [re.sub(r"\s*\n\s*", " ", p).strip() for p in re.split(r"\n\s*\n", trozo)]
        secciones[m["key"]] = [p for p in paras if p]
    return secciones


def texto_wikisource(cfg):
    pages = cfg["text"]["pages"]  # {clave: título de página}
    textos = obtener(list(pages.values()), cache=CACHE / f"wikisource_{cfg['id']}")
    secciones = {k: limpiar(textos[t]) for k, t in pages.items()}
    # "split": {clave: expresión}: la página se parte en secciones <clave>-1, <clave>-2… cada vez que un párrafo
    # coincide con la expresión (por ejemplo "^Capítulo [IVXLC]+$"); el título queda como primer párrafo.
    for clave, patron in cfg["text"].get("split", {}).items():
        actual, n, empezo = [], 0, False
        for par in secciones[clave]:
            if re.match(patron, par):
                if actual:
                    n += 1
                    secciones[f"{clave}-{n}"] = actual
                actual, empezo = [], True
            if empezo:  # lo que hay antes del primer título (como «Primera Parte») no es un capítulo
                actual.append(par)
        if actual:
            secciones[f"{clave}-{n + 1}"] = actual
    return secciones


def regenerar_indice():
    """Lista liviana de novelas (catalogo.json) y archivo con un require por novela (cargadores.ts).

    La app muestra las novelas con el catálogo y solo carga el texto de una novela cuando alguien la abre.
    """
    carpeta = ROOT / "src" / "content" / "novelas"
    metas, ids = [], []
    for f in sorted(carpeta.glob("*.json")):
        if f.name == "catalogo.json":
            continue
        n = json.loads(f.read_text(encoding="utf-8"))
        ids.append(n["id"])
        horas = sum(c["audio"][0]["durationSec"] for c in n["chapters"] if c["audio"])
        if not horas:  # sin grabación: se estima la lectura a unas 140 palabras por minuto
            horas = sum(len(p.split()) for c in n["chapters"] for p in c["paragraphs"]["es"]) / 140 * 60
        metas.append({k: n[k] for k in ("id", "title", "author", "year", "level", "ages", "region", "coverColor", "summary")} | {"chapters": len(n["chapters"]), "minutes": round(horas / 60)})
    (carpeta / "catalogo.json").write_text(json.dumps(metas, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    lineas = "\n".join(f"  '{i}': () => require('./novelas/{i}.json')," for i in ids)
    (ROOT / "src" / "content" / "novelas-cargadores.ts").write_text(
        "/**\n * ARCHIVO GENERADO por herramientas/novelas/construir.py: no editar a mano.\n * Un require por novela; el texto solo se carga cuando alguien abre esa novela.\n */\n"
        f"export const NOVEL_LOADERS: Record<string, () => unknown> = {{\n{lineas}\n}};\n",
        encoding="utf-8",
    )


def main(ruta):
    cfg = json.loads(Path(ruta).read_text(encoding="utf-8"))
    secciones = texto_gutenberg(cfg) if cfg["text"]["kind"] == "gutenberg" else texto_wikisource(cfg)

    # Una novela sin grabación (cfg["audio"] ausente) se lee con la voz del teléfono.
    if "audio" in cfg:
        meta = json.loads(http(f"https://archive.org/metadata/{cfg['audio']['archive']}"))
        largos = {f["name"]: segundos(f.get("length")) for f in meta["files"] if f["name"].endswith("_64kb.mp3")}
    else:
        largos = {}

    if cfg["chapters"] == "__auto__":
        # Un capítulo por cada sección partida de las páginas con "split", en orden; «partes» da el nombre de cada parte.
        auto = [{"title": "Proemio", "sections": ["proemio"]}] if "proemio" in secciones else []
        for clave in cfg["text"]["split"]:
            k = 1
            while f"{clave}-{k}" in secciones:
                titulo = secciones[f"{clave}-{k}"][0]
                if len(secciones[f"{clave}-{k}"]) < 2:  # un título suelto (sin texto) no es un capítulo
                    k += 1
                    continue
                auto.append({"title": f"{cfg['partes'][clave]} · {titulo}", "sections": [f"{clave}-{k}"]})
                k += 1
        cfg["chapters"] = auto
    capitulos = []
    for n, c in enumerate(cfg["chapters"], 1):
        paras = []
        for clave in c["sections"]:
            if clave not in secciones or not secciones[clave]:
                raise SystemExit(f"Falta el texto de la sección {clave} (capítulo {n})")
            paras += secciones[clave]
        nombre = c.get("file")
        if nombre and nombre not in largos:
            raise SystemExit(f"El audio {nombre} no está en archive.org/{cfg['audio']['archive']}")
        dur = round(largos[nombre]) if nombre else 0
        capitulos.append(
            {
                "id": f"nov-{cfg['id']}-{n:02d}",
                "title": {"es": c["title"]},
                "paragraphs": {"es": paras},
                "audio": [] if not nombre else [
                    {
                        "lang": "es",
                        "narratorId": cfg["audio"]["narrator"]["id"],
                        "voiceSource": "archivo",
                        "url": f"https://archive.org/download/{cfg['audio']['archive']}/{nombre}",
                        "license": cfg["audio"]["license"],
                        "durationSec": dur,
                        # Igual que los cuentos con voz humana: se salta la presentación y el cierre de LibriVox.
                        "textStartSec": cfg["audio"].get("textStartSec", 22),
                        "textEndSec": dur - cfg["audio"].get("textEndMargin", 8),
                    }
                ],
            }
        )

    novela = {
        "id": cfg["id"],
        "revision": 1,
        "title": {"es": cfg["title"]},
        "author": cfg["author"],
        "year": cfg.get("year"),
        "source": cfg["source"],
        "level": cfg.get("level", "secundaria"),
        "ages": cfg["ages"],
        "region": cfg["region"],
        "coverColor": cfg["coverColor"],
        "summary": {"es": cfg["summary"]},
        "chapters": capitulos,
    }
    out = ROOT / "src" / "content" / "novelas" / f"{cfg['id']}.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(novela, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    # Perfil del narrador (voz voluntaria de LibriVox) si aún no existe.
    nar = cfg.get("audio", {}).get("narrator")
    ruta_n = ROOT / "src" / "content" / "narradores.json"
    lista = json.loads(ruta_n.read_text(encoding="utf-8"))
    if nar and not any(x["id"] == nar["id"] for x in lista):
        lista.append(
            {
                "id": nar["id"],
                "name": nar["name"],
                "role": "voluntario",
                "bio": "Voz voluntaria de LibriVox, proyecto que graba libros de dominio público con voluntarios de todo el mundo.",
                "languages": ["es"],
                "credit": "Grabación de dominio público donada a LibriVox (librivox.org).",
            }
        )
        ruta_n.write_text(json.dumps(lista, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    regenerar_indice()

    total = sum(len(c["paragraphs"]["es"]) for c in capitulos)
    chars = sum(len(p) for c in capitulos for p in c["paragraphs"]["es"])
    horas = sum(c["audio"][0]["durationSec"] for c in capitulos if c["audio"]) / 3600
    print(f"{cfg['title']}: {len(capitulos)} capítulos, {total} párrafos, {chars:,} caracteres, {horas:.1f} h de audio -> {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main(sys.argv[1])
