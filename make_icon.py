# -*- coding: utf-8 -*-
"""
Genera icon.ico para el ejecutable "Extractor Comprobantes".

Dibuja un cuadrado azul oscuro (#1E3A5F) con esquinas redondeadas y las
letras "EC" en blanco centradas, en varios tamaños (16 a 256 px) dentro de
un mismo archivo .ico. Requiere Pillow.

Uso:  python make_icon.py            -> crea icon.ico junto a este archivo
"""

import os
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

BASE = Path(__file__).resolve().parent
RUTA_ICONO = BASE / "icon.ico"

COLOR_FONDO = "#1E3A5F"
COLOR_TEXTO = "#FFFFFF"
TEXTO = "EC"
TAMANOS = [16, 32, 48, 64, 128, 256]

# Fuentes TrueType de Windows (en orden de preferencia). Si ninguna existe
# se usa la fuente por defecto de PIL.
FUENTES_CANDIDATAS = [
    r"C:\Windows\Fonts\arialbd.ttf",
    r"C:\Windows\Fonts\segoeuib.ttf",
    r"C:\Windows\Fonts\arial.ttf",
]


def _buscar_fuente_ttf():
    """Devuelve la ruta de la primera fuente TrueType disponible o None."""
    for ruta in FUENTES_CANDIDATAS:
        if os.path.isfile(ruta):
            return ruta
    return None


def _cargar_fuente(ruta_ttf, tamano_px):
    """Carga la fuente al tamaño indicado con fallback a la fuente por defecto."""
    if ruta_ttf:
        try:
            return ImageFont.truetype(ruta_ttf, tamano_px)
        except OSError:
            pass
    try:
        # Pillow >= 10.1 permite escalar la fuente por defecto
        return ImageFont.load_default(size=tamano_px)
    except TypeError:
        return ImageFont.load_default()


def _medir_texto(draw, texto, fuente):
    """Devuelve (ancho, alto, offset_x, offset_y) del texto con esa fuente."""
    izq, arr, der, aba = draw.textbbox((0, 0), texto, font=fuente)
    return der - izq, aba - arr, izq, arr


def dibujar_icono(tamano, ruta_ttf=None):
    """Dibuja una imagen RGBA cuadrada de `tamano` px con el logo EC."""
    # Se dibuja a 4x y se reduce con antialiasing para bordes suaves
    escala = 4
    lado = tamano * escala
    img = Image.new("RGBA", (lado, lado), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    radio = int(lado * 0.22)
    draw.rounded_rectangle((0, 0, lado - 1, lado - 1), radius=radio, fill=COLOR_FONDO)

    # Ajustar el tamaño de fuente para que el texto ocupe ~70% del ancho
    objetivo = lado * 0.70
    tam_fuente = int(lado * 0.6)
    fuente = _cargar_fuente(ruta_ttf, tam_fuente)
    ancho, alto, _, _ = _medir_texto(draw, TEXTO, fuente)
    if ruta_ttf and ancho > 0:
        tam_fuente = max(4, int(tam_fuente * objetivo / ancho))
        fuente = _cargar_fuente(ruta_ttf, tam_fuente)
    ancho, alto, off_x, off_y = _medir_texto(draw, TEXTO, fuente)

    x = (lado - ancho) / 2 - off_x
    y = (lado - alto) / 2 - off_y
    draw.text((x, y), TEXTO, font=fuente, fill=COLOR_TEXTO)

    return img.resize((tamano, tamano), Image.LANCZOS)


def generar_icono(ruta_salida=RUTA_ICONO):
    """Genera el archivo .ico con todos los tamaños y devuelve su ruta."""
    ruta_salida = Path(ruta_salida)
    ruta_ttf = _buscar_fuente_ttf()
    imagenes = [dibujar_icono(t, ruta_ttf) for t in TAMANOS]
    # La imagen más grande se guarda primero; Pillow añade el resto en sizes
    imagenes[-1].save(
        ruta_salida,
        format="ICO",
        sizes=[(t, t) for t in TAMANOS],
        append_images=imagenes[:-1],
    )
    return ruta_salida


if __name__ == "__main__":
    salida = generar_icono()
    fuente = _buscar_fuente_ttf() or "fuente por defecto de PIL"
    print(f"Icono generado: {salida}  (fuente: {fuente})")
    sys.exit(0)
