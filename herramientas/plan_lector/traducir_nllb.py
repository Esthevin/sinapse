"""Traduce al quechua (qu, variedad sureña/ayacuchana de NLLB) y al aimara (ay) los textos de ./textos.

    python herramientas/plan_lector/traducir_nllb.py id1,id2,...      (sin ids: todas las de obras.json)

Usa NLLB-200 de Meta (facebook/nllb-200-distilled-600M, licencia CC BY-NC 4.0, uso no comercial), corre en CPU.
Traduce oración por oración y conserva los párrafos, para que el resaltado coincida con el original.
También traduce el título y el resumen (textos/<id>.meta.json). Si un archivo ya existe, no lo repite.
Las traducciones son BORRADORES automáticos: la app lo indica hasta que las revise un hablante nativo.
"""
import json
import re
import sys
import time
from pathlib import Path

import torch
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

AQUI = Path(__file__).resolve().parent
T = AQUI / "textos"
CODIGOS = {"qu": "quy_Latn", "ay": "ayr_Latn"}
MODELO = "facebook/nllb-200-distilled-600M"


def oraciones(p):
    s = re.split(r"(?<=[.!?…»])\s+(?=[«¿¡—–\"A-ZÁÉÍÓÚÑ])", p)
    out = []
    for x in s:
        out += re.split(r"(?<=;)\s+", x) if len(x) > 350 else [x]
    return [x for x in out if x.strip()]


def main():
    torch.set_num_threads(4)
    obras = json.loads((AQUI / "obras.json").read_text(encoding="utf-8"))
    ids = sys.argv[1].split(",") if len(sys.argv) > 1 else list(obras)
    tok = AutoTokenizer.from_pretrained(MODELO, src_lang="spa_Latn")
    mod = AutoModelForSeq2SeqLM.from_pretrained(MODELO).eval()

    @torch.inference_mode()
    def traducir(frases, destino):
        res = []
        for i in range(0, len(frases), 8):
            x = tok(frases[i:i + 8], return_tensors="pt", padding=True, truncation=True, max_length=256)
            y = mod.generate(**x, forced_bos_token_id=tok.convert_tokens_to_ids(destino),
                             max_new_tokens=min(400, int(x["input_ids"].shape[1] * 2.2) + 10), num_beams=2)
            res += tok.batch_decode(y, skip_special_tokens=True)
        return res

    for k in ids:
        es = json.loads((T / f"{k}.es.json").read_text(encoding="utf-8"))
        for lang, code in CODIGOS.items():
            f = T / f"{k}.{lang}.json"
            if f.exists():
                continue
            t0 = time.time()
            frases, idx = [], []
            for i, p in enumerate(es):
                o = oraciones(p)
                frases += o
                idx += [i] * len(o)
            out = [""] * len(es)
            for i, tr in zip(idx, traducir(frases, code)):
                out[i] = (out[i] + " " + tr).strip()
            f.write_text(json.dumps(out, ensure_ascii=False, indent=0), encoding="utf-8")
            print(k, lang, len(frases), "oraciones", round(time.time() - t0), "s", flush=True)
        fm = T / f"{k}.meta.json"
        if not fm.exists() and k in obras:
            o = obras[k]
            meta = {"title": {}, "summary": {}}
            for lang, code in CODIGOS.items():
                tit, res = traducir([o["title"]], code)[0], " ".join(traducir(oraciones(o["summary"]), code))
                meta["title"][lang], meta["summary"][lang] = tit, res
            fm.write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
