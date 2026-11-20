"""Traduce al quechua (qu, variedad sureña/ayacuchana de NLLB) y al aimara (ay) los textos de ./textos.

    python herramientas/plan_lector/traducir_nllb.py id1,id2,...      (sin ids: todas las de obras.json)
    python herramientas/plan_lector/traducir_nllb.py --reparar [ids]  (vuelve a traducir solo los párrafos dañados)

Usa NLLB-200 de Meta (facebook/nllb-200-distilled-600M, licencia CC BY-NC 4.0, uso no comercial), corre en CPU.
Traduce oración por oración y conserva los párrafos, para que el resaltado coincida con el original.
También traduce el título y el resumen (textos/<id>.meta.json). Si un archivo ya existe, no lo repite.
Las traducciones son BORRADORES automáticos: la app lo indica hasta que las revise un hablante nativo.

Control de calidad: con oraciones largas, NLLB a veces entra en bucle y repite una palabra decenas de veces
(«chaymantaqa, chaymantaqa, …»). Para evitarlo: se prohíbe repetir trigramas, se penaliza la repetición, las
oraciones largas se parten por comas o punto y coma, y cada resultado se revisa con `danado()`; si sale mal,
se vuelve a traducir en trozos más chicos y, como último recurso, se recortan las repeticiones.
"""
import json
import re
import sys
import time
from pathlib import Path

AQUI = Path(__file__).resolve().parent
T = AQUI / "textos"
CODIGOS = {"qu": "quy_Latn", "ay": "ayr_Latn"}
MODELO = "facebook/nllb-200-distilled-600M"
MAX_PALABRAS = 22  # más largo que esto, se parte por comas antes de traducir


def oraciones(p):
    s = re.split(r"(?<=[.!?…»])\s+(?=[«¿¡—–\"A-ZÁÉÍÓÚÑ])", p)
    out = []
    for x in s:
        out += re.split(r"(?<=;)\s+", x) if len(x) > 350 else [x]
    return [x for x in out if x.strip()]


def trozos(frase, maximo=MAX_PALABRAS):
    """Parte una oración larga por ; : y comas, juntando pedazos hasta ~maximo palabras."""
    if len(frase.split()) <= maximo:
        return [frase]
    piezas = re.split(r"(?<=[,;:])\s+", frase)
    out, actual = [], ""
    for p in piezas:
        if actual and len((actual + " " + p).split()) > maximo:
            out.append(actual)
            actual = p
        else:
            actual = (actual + " " + p).strip()
    if actual:
        out.append(actual)
    return out


def palabras(t):
    return re.findall(r"[\wñÑ'’]+", t.lower())


def danado(trad, fuente=None):
    """True si la traducción repite un n-grama 3+ veces seguidas o es desproporcionadamente larga."""
    w = palabras(trad)
    for n in (1, 2, 3):
        for i in range(len(w) - 3 * n + 1):
            g = w[i:i + n]
            if w[i + n:i + 2 * n] == g and w[i + 2 * n:i + 3 * n] == g:
                # «chay chay» puede ser legítimo; tres veces seguidas no.
                return True
    if fuente is not None and len(trad) > 2.0 * len(fuente) + 40:
        return True
    return False


def recortar(trad):
    """Último recurso: deja una sola copia de cada n-grama repetido seguido."""
    toks = trad.split()
    cambio = True
    while cambio:
        cambio = False
        for n in (3, 2, 1):
            i = 0
            while i + 2 * n <= len(toks):
                a = [re.sub(r"\W", "", x.lower()) for x in toks[i:i + n]]
                b = [re.sub(r"\W", "", x.lower()) for x in toks[i + n:i + 2 * n]]
                if a == b and any(a):
                    del toks[i + n:i + 2 * n]
                    cambio = True
                else:
                    i += 1
    return " ".join(toks)


class Traductor:
    def __init__(self):
        import torch
        from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

        torch.set_num_threads(4)
        self.torch = torch
        self.tok = AutoTokenizer.from_pretrained(MODELO, src_lang="spa_Latn")
        self.mod = AutoModelForSeq2SeqLM.from_pretrained(MODELO).eval()

    def _generar(self, frases, destino):
        res = []
        with self.torch.inference_mode():
            for i in range(0, len(frases), 8):
                x = self.tok(frases[i:i + 8], return_tensors="pt", padding=True, truncation=True, max_length=256)
                y = self.mod.generate(
                    **x, forced_bos_token_id=self.tok.convert_tokens_to_ids(destino),
                    max_new_tokens=min(300, int(x["input_ids"].shape[1] * 1.8) + 8), num_beams=3,
                    no_repeat_ngram_size=3, repetition_penalty=1.2,
                )
                res += self.tok.batch_decode(y, skip_special_tokens=True)
        return res

    def frases(self, frases, destino):
        """Traduce una lista de oraciones; cada una se parte si es larga y se revisa al final."""
        piezas, idx = [], []
        for k, f in enumerate(frases):
            for t in trozos(f):
                piezas.append(t)
                idx.append(k)
        trad = self._generar(piezas, destino)
        for j, (p, t) in enumerate(zip(piezas, trad)):
            if danado(t, p):
                # Segundo intento: trozos más chicos; si sigue mal, se recorta la repetición.
                sub = trozos(p, 10)
                if len(sub) > 1:
                    t = " ".join(self._generar(sub, destino))
                trad[j] = recortar(t) if danado(t, p) else t
        out = [""] * len(frases)
        for k, t in zip(idx, trad):
            out[k] = (out[k] + " " + t).strip()
        return out

    def parrafos(self, parrafos, destino):
        frases, idx = [], []
        for i, p in enumerate(parrafos):
            o = oraciones(p)
            frases += o
            idx += [i] * len(o)
        out = [""] * len(parrafos)
        for i, tr in zip(idx, self.frases(frases, destino)):
            out[i] = (out[i] + " " + tr).strip()
        return out


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    reparar = "--reparar" in sys.argv
    obras = json.loads((AQUI / "obras.json").read_text(encoding="utf-8"))
    ids = args[0].split(",") if args else list(obras)
    tr = Traductor()

    for k in ids:
        es = json.loads((T / f"{k}.es.json").read_text(encoding="utf-8"))
        for lang, code in CODIGOS.items():
            f = T / f"{k}.{lang}.json"
            t0 = time.time()
            if f.exists():
                if not reparar:
                    continue
                actual = json.loads(f.read_text(encoding="utf-8"))
                malos = [i for i, (a, b) in enumerate(zip(actual, es)) if danado(a, b)] if len(actual) == len(es) else list(range(len(es)))
                if not malos:
                    continue
                nuevos = tr.parrafos([es[i] for i in malos], code)
                if len(actual) != len(es):
                    actual = [""] * len(es)
                for i, t in zip(malos, nuevos):
                    actual[i] = t
                out = actual
                print(k, lang, "reparados", len(malos), "párrafos", round(time.time() - t0), "s", flush=True)
            else:
                out = tr.parrafos(es, code)
                print(k, lang, len(es), "párrafos", round(time.time() - t0), "s", flush=True)
            f.write_text(json.dumps(out, ensure_ascii=False, indent=0), encoding="utf-8")
        fm = T / f"{k}.meta.json"
        meta = json.loads(fm.read_text(encoding="utf-8")) if fm.exists() else None
        if k in obras and (meta is None or (reparar and any(danado(v) for d in meta.values() for v in d.values()))):
            o = obras[k]
            meta = {"title": {}, "summary": {}}
            for lang, code in CODIGOS.items():
                meta["title"][lang] = tr.frases([o["title"]], code)[0]
                meta["summary"][lang] = " ".join(tr.frases(oraciones(o["summary"]), code))
            fm.write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
