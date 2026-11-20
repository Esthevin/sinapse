"""Agrega un cuento o documento nuevo (PDF, Word, ODT o texto) al camino de tres idiomas.

    python herramientas/plan_lector/agregar_texto.py archivo.pdf --id mi-cuento --titulo "Mi cuento" --autor "Autor" [--region costa]

Deja textos/<id>.es.json y una ficha en obras.json (resumen, glosario y preguntas por completar). Después:
    python herramientas/plan_lector/traducir_nllb.py mi-cuento          # quechua y aimara (texto)
    python herramientas/plan_lector/construir.py                         # arma la historia
    python herramientas/voces/generar_mms.py qu --historia mi-cuento --hospedar 3
    python herramientas/voces/generar_mms.py ay --historia mi-cuento --hospedar 3
Usa solo textos de dominio público o con permiso de sus autores.
"""
import argparse
import json
import re
import subprocess
import zipfile
from pathlib import Path

AQUI = Path(__file__).resolve().parent


def leer(ruta: Path) -> str:
    ext = ruta.suffix.lower()
    if ext == ".pdf":
        return subprocess.run(["pdftotext", "-layout", str(ruta), "-"], capture_output=True, text=True, check=True).stdout
    if ext in (".docx", ".odt"):
        interno = "word/document.xml" if ext == ".docx" else "content.xml"
        xml = zipfile.ZipFile(ruta).read(interno).decode("utf-8")
        xml = re.sub(r"</(w:p|text:p|text:h)>", "\n\n", xml)
        return re.sub(r"<[^>]+>", "", xml)
    return ruta.read_text(encoding="utf-8", errors="replace")


def parrafos(texto: str):
    texto = texto.replace("\r", "")
    bloques = re.split(r"\n\s*\n", texto)
    out = []
    for b in bloques:
        b = re.sub(r"-\n(?=\w)", "", b)  # palabras cortadas al final de línea
        b = re.sub(r"\s+", " ", b).strip()
        if len(b) > 1 and not re.fullmatch(r"[\dIVXLC.\- ]+", b):
            out.append(b)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("archivo", type=Path)
    ap.add_argument("--id", required=True)
    ap.add_argument("--titulo", required=True)
    ap.add_argument("--autor", required=True)
    ap.add_argument("--region", default="costa", choices=["costa", "sierra", "selva"])
    a = ap.parse_args()
    ps = parrafos(leer(a.archivo))
    (AQUI / "textos").mkdir(exist_ok=True)
    (AQUI / "textos" / f"{a.id}.es.json").write_text(json.dumps(ps, ensure_ascii=False, indent=0), encoding="utf-8")
    obras = json.loads((AQUI / "obras.json").read_text(encoding="utf-8"))
    obras.setdefault(a.id, {
        "title": a.titulo, "author": a.autor, "collection": "Cuentos", "region": a.region, "coverColor": "#33424F",
        "narrator": None, "summary": "POR COMPLETAR: dos o tres líneas sin contar el final.",
        "glossary": [], "quiz": [],
    })
    (AQUI / "obras.json").write_text(json.dumps(obras, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{a.id}: {len(ps)} párrafos, {sum(len(p.split()) for p in ps)} palabras. Completa resumen y preguntas en obras.json.")


if __name__ == "__main__":
    main()
