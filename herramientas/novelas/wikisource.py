"""Descarga páginas de Wikisource en español (dominio público) y las limpia a párrafos de texto.

Uso (desde Python):
    from wikisource import obtener, limpiar
    textos = obtener(["María (Isaacs)/I", "María (Isaacs)/II"])   # {titulo: wikitexto}
    parrafos = limpiar(textos["María (Isaacs)/I"])                # ["Capítulo I", "Era yo niño aún ...", ...]

Buen uso de la API de Wikimedia: User-Agent con contacto, pocas peticiones (hasta 20 páginas por pedido),
pausas y reintentos cuando responde 429. Guarda lo descargado en una carpeta de caché para no repetirlo.
"""
import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

API = "https://es.wikisource.org/w/api.php"
UA = "SinapseBot/1.0 (https://github.com/Esthevin/sinapse; app educativa; contacto en el repositorio)"


def _get(params, intentos=6):
    url = API + "?" + urllib.parse.urlencode(params)
    espera = 4
    for n in range(intentos):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=60) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as e:  # 429, red, JSON inválido…
            if n == intentos - 1:
                raise
            time.sleep(espera)
            espera = min(espera * 2, 60)


def obtener(titulos, cache=None, lote=15):
    """Devuelve {titulo: wikitexto}. Usa `cache` (carpeta) para no volver a pedir lo ya descargado."""
    cache = Path(cache) if cache else None
    if cache:
        cache.mkdir(parents=True, exist_ok=True)
    out, faltan = {}, []
    for t in titulos:
        f = cache / (re.sub(r"[^\w-]+", "_", t) + ".json") if cache else None
        if f and f.exists():
            out[t] = json.loads(f.read_text(encoding="utf-8"))["texto"]
        else:
            faltan.append(t)
    for i in range(0, len(faltan), lote):
        grupo = faltan[i:i + lote]
        d = _get({"action": "query", "titles": "|".join(grupo), "prop": "revisions", "rvprop": "content", "rvslots": "main", "format": "json", "formatversion": "2", "redirects": "1"})
        for p in d["query"]["pages"]:
            if "revisions" not in p:
                continue
            texto = p["revisions"][0]["slots"]["main"]["content"]
            # La API puede devolver el título normalizado/redirigido: se busca el pedido que corresponde.
            pedido = next((t for t in grupo if t == p["title"]), p["title"])
            out[pedido] = texto
            if cache:
                (cache / (re.sub(r"[^\w-]+", "_", pedido) + ".json")).write_text(json.dumps({"titulo": pedido, "texto": texto}, ensure_ascii=False), encoding="utf-8")
        time.sleep(3)
    return out


def limpiar(wikitexto):
    """Wikitexto → lista de párrafos de texto plano (los títulos t2/t3 quedan como párrafos cortos)."""
    t = wikitexto
    t = re.sub(r"<!--.*?-->", "", t, flags=re.S)
    t = re.sub(r"<ref[^>]*>.*?</ref>", "", t, flags=re.S)
    t = re.sub(r"<ref[^>/]*/>", "", t)
    # Encabezado y otras plantillas de navegación (pueden anidar enlaces con llaves).
    t = re.sub(r"\{\{\s*[Ee]ncabezado.*?\}\}\s*\n", "", t, flags=re.S)
    t = re.sub(r"\{\{\s*t[0-9]?\s*\|\s*([^{}]*?)\s*\}\}", r"\n\n\1\n\n", t)
    for _ in range(4):  # plantillas restantes, de dentro hacia fuera
        t = re.sub(r"\{\{[^{}]*\}\}", "", t)
    t = re.sub(r"\[\[(?:Archivo|File|Imagen|Image):[^\]]*\]\]", "", t)
    t = re.sub(r"\[\[[^\]|]*\|([^\]]*)\]\]", r"\1", t)
    t = re.sub(r"\[\[([^\]]*)\]\]", r"\1", t)
    t = re.sub(r"\[https?://\S+\s+([^\]]*)\]", r"\1", t)
    t = re.sub(r"'{2,5}", "", t)
    t = re.sub(r"^=+\s*(.*?)\s*=+\s*$", r"\1", t, flags=re.M)
    t = re.sub(r"</?(?:poem|center|small|big|div|span|br|p|sup|sub|section)[^>]*>", "\n", t)
    t = re.sub(r"<[^>]+>", "", t)
    t = t.replace("&nbsp;", " ").replace("&amp;", "&").replace("&quot;", '"').replace("&lt;", "<").replace("&gt;", ">")
    partes = re.split(r"\n\s*\n", t)
    out = []
    for p in partes:
        p = re.sub(r"\s*\n\s*", " ", p).strip()
        p = re.sub(r"\s{2,}", " ", p)
        # Fuera categorías y enlaces a otros idiomas ("eo:Maria/Ĉapitro II").
        if re.match(r"^(Categor[ií]a|Category):", p) or re.match(r"^[a-z]{2,3}(-[a-z]+)?:\S", p):
            continue
        if p and re.search(r"[A-Za-zÁÉÍÓÚáéíóúñÑ]", p):
            out.append(p)
    return out
