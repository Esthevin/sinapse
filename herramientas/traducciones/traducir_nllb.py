"""Traduce historias del castellano a una lengua originaria con Meta NLLB-200 (BORRADOR automático).

Uso:
    python herramientas/traducciones/traducir_nllb.py quy --historia id1,id2 --salida lote.json
    python herramientas/traducciones/traducir_nllb.py quy --historia id1 --simulado     # prueba el flujo, sin modelo

Escribe un JSON con la forma que entiende `node scripts/aplicar-traducciones.mjs`:
    { "<id>": { "title": "...", "summary": "...", "paragraphs": ["...", ...] } }
con EXACTAMENTE los mismos párrafos que el castellano (la lectura sincronizada lo exige).

Requiere: pip install torch transformers sentencepiece
El modelo (facebook/nllb-200-distilled-600M, ~2.5 GB) se descarga la primera vez.

Importante
- NLLB cubre quechua AYACUCHANO/Chanka (quy_Latn) y aimara central (ayr_Latn). No existe quechua cusqueño (quz):
  el ayacuchano se entiende en buena parte del Cusco, pero NO es lo mismo; por eso el resultado es un BORRADOR.
- La traducción automática al quechua comete errores de vocabulario, ortografía y gramática. Pasa siempre por una
  persona hablante antes de dar el texto por bueno (el resto de la herramienta lo marca como borrador en la app).
- LICENCIA: NLLB-200 es CC BY-NC 4.0 (solo uso no comercial), igual que las voces MMS que se usan después.
"""
import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HISTORIAS = ROOT / "src" / "content" / "historias"
MODELO = "facebook/nllb-200-distilled-600M"
CODIGOS = {"quy": "quy_Latn", "ay": "ayr_Latn", "ayr": "ayr_Latn"}
MAX_CARACTERES = 350  # NLLB traduce mejor frases cortas: se parte el párrafo y se vuelve a unir


def trozos(parrafo: str):
    """Parte un párrafo en frases (o grupos de frases cortas) para traducirlas por separado."""
    frases = [f.strip() for f in re.split(r"(?<=[.!?…])\s+", parrafo.strip()) if f.strip()]
    grupos, actual = [], ""
    for f in frases:
        if actual and len(actual) + len(f) + 1 > MAX_CARACTERES:
            grupos.append(actual)
            actual = f
        else:
            actual = f"{actual} {f}".strip()
    if actual:
        grupos.append(actual)
    return grupos or [parrafo]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("lengua", choices=sorted(CODIGOS))
    ap.add_argument("--historia", required=True, help="ids separados por coma")
    ap.add_argument("--salida", type=Path, default=ROOT / "produccion" / "traducciones" / "lote.json")
    ap.add_argument("--simulado", action="store_true", help="no usa el modelo: marca cada texto con [simulado]")
    a = ap.parse_args()

    ids = [i.strip() for i in a.historia.split(",") if i.strip()]
    historias = {}
    for i in ids:
        ruta = HISTORIAS / f"{i}.json"
        if not ruta.exists():
            sys.exit(f"No existe la historia {i}")
        historias[i] = json.loads(ruta.read_text(encoding="utf-8"))

    if a.simulado:
        def traducir(textos):
            return [f"[simulado {a.lengua}] {t}" for t in textos]
    else:
        import torch
        from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

        print("Cargando", MODELO)
        tok = AutoTokenizer.from_pretrained(MODELO, src_lang="spa_Latn")
        modelo = AutoModelForSeq2SeqLM.from_pretrained(MODELO).eval()
        destino = tok.convert_tokens_to_ids(CODIGOS[a.lengua])

        def traducir(textos):
            salida = []
            for k in range(0, len(textos), 8):
                lote = textos[k:k + 8]
                entrada = tok(lote, return_tensors="pt", padding=True, truncation=True, max_length=400)
                with torch.no_grad():
                    gen = modelo.generate(**entrada, forced_bos_token_id=destino, num_beams=4, max_new_tokens=400)
                salida += tok.batch_decode(gen, skip_special_tokens=True)
            return salida

    resultado = {"_nota": f"BORRADOR automático ({a.lengua}, Meta NLLB-200, CC BY-NC). Sin revisión de hablantes nativos: puede tener errores."}
    for i, s in historias.items():
        print(f"  {i}: {len(s['paragraphs']['es'])} párrafos")
        partes, cuenta = [], []
        for p in s["paragraphs"]["es"]:
            t = trozos(p)
            partes += t
            cuenta.append(len(t))
        hecho = traducir(partes + [s["title"]["es"], s["summary"]["es"]])
        titulo, resumen, hecho = hecho[-2], hecho[-1], hecho[:-2]
        parrafos, k = [], 0
        for n in cuenta:
            parrafos.append(" ".join(hecho[k:k + n]).strip())
            k += n
        resultado[i] = {"title": titulo, "summary": resumen, "paragraphs": parrafos}

    a.salida.parent.mkdir(parents=True, exist_ok=True)
    a.salida.write_text(json.dumps(resultado, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Traducciones guardadas en", a.salida)


if __name__ == "__main__":
    main()
