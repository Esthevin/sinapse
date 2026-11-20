"""Arma «El tungsteno» de César Vallejo (1931, dominio público) como novela de Sinapse, en castellano, quechua y aimara.

    python herramientas/novelas/tungsteno.py              # descarga (con caché) y escribe la novela
    python herramientas/novelas/tungsteno.py --traducir   # además traduce con NLLB lo que falte (CPU, horas)

En Wikisource la novela está transcrita página por página («Página:El tungsteno.pdf/N»), no en capítulos, así que
este script une las páginas, repara las palabras cortadas con guion al final de cada página y separa los tres
capítulos del libro (I, II, III). Como cada capítulo es largo, lo parte en tramos de unas 3000 palabras.
No hay grabación humana: en castellano se escucha con la voz del teléfono. Las traducciones son borradores de
NLLB-200 (CC BY-NC 4.0, uso no comercial) y la app lo indica hasta que las revise un hablante nativo.
"""
import json
import re
import sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
sys.path.append(str(AQUI.parent / "plan_lector"))  # traducir_nllb (al final: plan_lector también tiene un construir.py)
from construir import regenerar_indice  # noqa: E402
from wikisource import limpiar, obtener  # noqa: E402

ROOT = AQUI.parents[1]
ID = "el-tungsteno"
TRAD = AQUI / "traducciones"
TRAMO = 3000  # palabras por tramo
ROMANOS = {"I": "Primera parte", "II": "Segunda parte", "III": "Tercera parte"}


def capitulos():
    titulos = [f"Página:El tungsteno.pdf/{i}" for i in range(11, 134)]  # 11: empieza el capítulo I
    pags = obtener(titulos, cache=AQUI / ".cache")
    txt = ""
    for t in titulos:
        b = re.sub(r"<noinclude>.*?</noinclude>", "", pags.get(t, ""), flags=re.S).strip()
        b = re.sub(r"\{\{Corr\|[^|}]*\|([^}]*)\}\}", r"\1", b)
        b = re.sub(r"\{\{(?:centrar|c)\|'''([IVX]+)'''[^}]*\}\}", r"\n\nCAP \1\n\n", b)
        b = b.replace("{{np}}", "").strip()
        if txt.endswith("-") and re.match(r"[a-záéíóúñ]", b):
            txt = txt[:-1] + b  # palabra cortada entre dos páginas
        elif re.match(r"[a-záéíóúñ,;]", b):
            txt += " " + b  # el párrafo sigue en la página siguiente
        else:
            txt += "\n\n" + b
    caps, cur = [], None
    for p in limpiar(txt):
        m = re.fullmatch(r"CAP ([IVX]+)", p)
        if m:
            cur = {"n": m.group(1), "p": []}
            caps.append(cur)
        elif cur is not None:
            # Guiones de fin de línea que quedaron dentro de la página («mo- rir»).
            cur["p"].append(re.sub(r"(\w)- ([a-záéíóúñ])", r"\1\2", p))
    return caps


def tramos(caps):
    out = []
    for c in caps:
        partes, actual, n = [], [], 0
        for p in c["p"]:
            actual.append(p)
            n += len(p.split())
            if n >= TRAMO:
                partes.append(actual)
                actual, n = [], 0
        if actual:
            if partes and n < TRAMO / 3:
                partes[-1] += actual  # un resto muy corto se suma al tramo anterior
            else:
                partes.append(actual)
        for k, ps in enumerate(partes, 1):
            out.append({"title": f"{ROMANOS[c['n']]} · {k} de {len(partes)}", "es": ps})
    return out


def traducir(secs):
    sys.argv = sys.argv[:1]
    import torch
    from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
    from traducir_nllb import CODIGOS, MODELO, oraciones

    torch.set_num_threads(4)
    tok = AutoTokenizer.from_pretrained(MODELO, src_lang="spa_Latn")
    mod = AutoModelForSeq2SeqLM.from_pretrained(MODELO).eval()
    TRAD.mkdir(exist_ok=True)

    @torch.inference_mode()
    def lote(frases, destino):
        res = []
        for i in range(0, len(frases), 8):
            x = tok(frases[i:i + 8], return_tensors="pt", padding=True, truncation=True, max_length=256)
            y = mod.generate(**x, forced_bos_token_id=tok.convert_tokens_to_ids(destino),
                             max_new_tokens=min(400, int(x["input_ids"].shape[1] * 2.2) + 10), num_beams=2)
            res += tok.batch_decode(y, skip_special_tokens=True)
        return res

    for lang, code in CODIGOS.items():
        for n, s in enumerate(secs, 1):
            f = TRAD / f"{ID}-{n:02d}.{lang}.json"
            if f.exists():
                continue
            frases, idx = [], []
            for i, p in enumerate(s["es"]):
                o = oraciones(p)
                frases += o
                idx += [i] * len(o)
            out = [""] * len(s["es"])
            for i, tr in zip(idx, lote(frases, code)):
                out[i] = (out[i] + " " + tr).strip()
            titulo = lote([s["title"]], code)[0]
            f.write_text(json.dumps({"title": titulo, "paragraphs": out}, ensure_ascii=False, indent=0), encoding="utf-8")
            print(ID, n, lang, len(frases), "oraciones", flush=True)
        fm = TRAD / f"{ID}.meta.{lang}.json"
        if not fm.exists():
            fm.write_text(json.dumps({"title": lote(["El tungsteno"], code)[0], "summary": " ".join(lote(oraciones(RESUMEN), code))}, ensure_ascii=False), encoding="utf-8")


RESUMEN = ("Una empresa norteamericana llega a Quivilca, en la sierra del Cusco, a explotar las minas de tungsteno. "
           "Los indios soras pierden sus tierras, los peones son reclutados a la fuerza y las autoridades sirven a los gringos. "
           "La novela social de Vallejo sobre la explotación minera y el despertar de la conciencia.")


def main():
    secs = tramos(capitulos())
    if "--traducir" in sys.argv:
        traducir(secs)
    titulo, resumen, chapters = {"es": "El tungsteno"}, {"es": RESUMEN}, []
    for n, s in enumerate(secs, 1):
        c = {"id": f"nov-{ID}-{n:02d}", "title": {"es": s["title"]}, "paragraphs": {"es": s["es"]}, "audio": []}
        borr = []
        for lang in ("qu", "ay"):
            f = TRAD / f"{ID}-{n:02d}.{lang}.json"
            if f.exists():
                tr = json.loads(f.read_text(encoding="utf-8"))
                if len(tr["paragraphs"]) == len(s["es"]) and all(tr["paragraphs"]):
                    c["title"][lang], c["paragraphs"][lang] = tr["title"], tr["paragraphs"]
                    borr.append(lang)
        if borr:
            c["borrador"] = borr
        chapters.append(c)
    for lang in ("qu", "ay"):
        fm = TRAD / f"{ID}.meta.{lang}.json"
        if fm.exists():
            m = json.loads(fm.read_text(encoding="utf-8"))
            titulo[lang], resumen[lang] = m["title"], m["summary"]
    novela = {
        "id": ID, "revision": 1, "title": titulo, "author": "César Vallejo", "year": 1931,
        "source": "Texto de dominio público de Wikisource en español (El tungsteno, César Vallejo, 1931; edición de Cultura Universitaria, Lima).",
        "level": "secundaria", "ages": ["jovenes", "adultos"], "region": "sierra", "coverColor": "#4A4A44",
        "summary": resumen, "chapters": chapters,
    }
    out = ROOT / "src" / "content" / "novelas" / f"{ID}.json"
    out.write_text(json.dumps(novela, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    regenerar_indice()
    print(ID, len(chapters), "tramos:", [len(" ".join(c["paragraphs"]["es"]).split()) for c in chapters])


if __name__ == "__main__":
    main()
