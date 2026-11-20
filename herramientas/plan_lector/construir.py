"""Arma las historias del plan lector de secundaria a partir de obras.json y de los textos en ./textos.

    python herramientas/plan_lector/construir.py

- textos/<id>.es.json   párrafos originales (Wikisource, dominio público)
- textos/<id>.qu.json   traducción al quechua (NLLB-200, borrador)      opcional
- textos/<id>.ay.json   traducción al aimara (NLLB-200, borrador)       opcional
- textos/<id>.meta.json título y resumen traducidos                       opcional
El audio en castellano es la grabación de LibriVox ya recortada en docs/audio/<id>.es.mp3 (url "site:").
Conserva los audios en quechua y aimara que ya tenga el JSON (los agrega generar_mms.py).
"""
import json
import subprocess
from pathlib import Path

AQUI = Path(__file__).resolve().parent
ROOT = AQUI.parents[1]
HIST = ROOT / "src" / "content" / "historias"
DOCS_AUDIO = ROOT / "docs" / "audio"


def duracion(ruta):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(ruta)], capture_output=True, text=True).stdout
    return round(float(out), 1)


def main():
    obras = json.loads((AQUI / "obras.json").read_text(encoding="utf-8"))
    cuest = json.loads((AQUI / "cuestionarios.json").read_text(encoding="utf-8")) if (AQUI / "cuestionarios.json").exists() else {}
    for id_, o in obras.items():
        t = AQUI / "textos"
        es = json.loads((t / f"{id_}.es.json").read_text(encoding="utf-8"))
        paragraphs = {"es": es}
        borrador = []
        for lang in ("qu", "ay"):
            f = t / f"{id_}.{lang}.json"
            if f.exists():
                tr = json.loads(f.read_text(encoding="utf-8"))
                if len(tr) == len(es) and all(tr):
                    paragraphs[lang] = tr
                    borrador.append(lang)
        meta = json.loads((t / f"{id_}.meta.json").read_text(encoding="utf-8")) if (t / f"{id_}.meta.json").exists() else {}
        destino = HIST / f"{id_}.json"
        previo = json.loads(destino.read_text(encoding="utf-8")) if destino.exists() else {}
        audio = [a for a in previo.get("audio", []) if a["lang"] != "es"]
        mp3 = DOCS_AUDIO / f"{id_}.es.mp3"
        if o.get("narrator") and mp3.exists():
            audio.insert(0, {
                "lang": "es",
                "narratorId": o["narrator"],
                "voiceSource": "archivo",
                "url": f"site:{mp3.name}",
                "license": f"Dominio público — LibriVox ({o['librivox']})",
                "durationSec": duracion(mp3),
            })
        s = {
            "id": id_,
            "revision": previo.get("revision", 1),
            "title": {"es": o["title"], **meta.get("title", {})},
            "author": o["author"],
            "source": o.get("source") or (f"Texto original de {o['author']}, de dominio público, según Wikisource en español."
            + (" Grabación de dominio público de LibriVox." if o.get("narrator") else "")),
            "collection": o["collection"],
            "original": o.get("original", True),
            "region": o["region"],
            "ages": ["jovenes", "adultos"],
            "coverColor": o["coverColor"],
            "summary": {"es": o["summary"], **meta.get("summary", {})},
            "paragraphs": paragraphs,
            **({"borrador": borrador} if borrador else {}),
            "audio": audio,
            "glossary": o["glossary"],
            "quiz": cuest.get(id_, {}).get("quiz", o["quiz"]),
            **({"reflexion": cuest[id_]["reflexion"]} if cuest.get(id_, {}).get("reflexion") else {}),
        }
        destino.write_text(json.dumps(s, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"{id_}: {len(es)} párrafos · traducciones {borrador or 'ninguna'} · audios {[a['lang'] for a in audio]}")


if __name__ == "__main__":
    main()
