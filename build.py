# -*- coding: utf-8 -*-
"""
Compila la interfaz gráfica en un solo ejecutable con PyInstaller.

Uso:  python build.py      (o doble clic en build.bat)

Resultado:  dist/Extractor Comprobantes.exe

Si no existe icon.ico lo genera con make_icon.py. Requiere tener instalado
PyInstaller y las dependencias del proyecto:
    pip install pyinstaller google-genai pillow openpyxl customtkinter
Opcional (cámara web, se incluye en el .exe solo si está instalado):
    pip install opencv-python
"""

import os
import subprocess
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent
NOMBRE = "Extractor Comprobantes"
SCRIPT = BASE / "interfaz.py"
ICONO = BASE / "icon.ico"
DIST = BASE / "dist"
EXE = DIST / (NOMBRE + (".exe" if sys.platform.startswith("win") else ""))

# Paquetes cuyos datos y submódulos deben incluirse completos
COLLECT_ALL = [
    "google.genai",
    "customtkinter",
]

# Módulos que PyInstaller no detecta solo (imports dinámicos u opcionales)
HIDDEN_IMPORTS = [
    "procesar_comprobantes",
    "PIL.Image",
    "PIL.ImageDraw",
    "PIL.ImageFont",
    "PIL._tkinter_finder",
    "openpyxl",
    "openpyxl.styles",
    "openpyxl.utils",
    "tkinter",
    "tkinter.filedialog",
    "tkinter.messagebox",
]

# --- OpenCV (cv2) y la cámara web -------------------------------------------
# interfaz.py importa cv2 de forma opcional (dentro de funciones, con
# try/except) para capturar comprobantes con la cámara. Decisión:
#   * Si opencv-python ESTÁ instalado en el entorno donde se compila, se
#     incluye en el .exe (hidden import + hook oficial hook-cv2.py de
#     pyinstaller-hooks-contrib). Sube el tamaño del .exe unos 40-60 MB, pero
#     la cámara es funcionalidad pedida y en un PC sin Python el usuario no
#     puede "instalar opencv-python" a posteriori: o va dentro del .exe o no
#     hay cámara.
#   * Si NO está instalado, el build sigue (la app funciona sin cámara) pero
#     se avisa claramente, porque el .exe resultante mostrará "instala
#     opencv-python" al pulsar el botón de cámara y eso no tiene solución en
#     el PC del usuario final. Para incluir la cámara:  pip install opencv-python
OPENCV_HIDDEN_IMPORTS = ["cv2", "numpy"]


def opencv_instalado():
    """True si cv2 se puede importar en este entorno (y por tanto se empaqueta)."""
    try:
        import cv2  # noqa: F401
    except Exception:
        return False
    return True


def asegurar_icono():
    """Genera icon.ico si no existe."""
    if ICONO.is_file():
        return
    print("icon.ico no existe, generandolo con make_icon.py ...")
    sys.path.insert(0, str(BASE))
    from make_icon import generar_icono
    generar_icono(ICONO)
    print(f"Icono generado: {ICONO}")


def construir_comando():
    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--noconfirm",
        "--clean",
        "--onefile",
        "--windowed",
        "--name", NOMBRE,
        "--icon", str(ICONO),
        "--distpath", str(DIST),
        "--workpath", str(BASE / "build"),
        "--specpath", str(BASE),
        "--paths", str(BASE),
    ]
    for paquete in COLLECT_ALL:
        cmd += ["--collect-all", paquete]
    hidden = list(HIDDEN_IMPORTS)
    if opencv_instalado():
        hidden += OPENCV_HIDDEN_IMPORTS
    for modulo in hidden:
        cmd += ["--hidden-import", modulo]
    cmd.append(str(SCRIPT))
    return cmd


def main():
    os.chdir(BASE)

    if not SCRIPT.is_file():
        print(f"ERROR: no se encuentra {SCRIPT}")
        return 1

    try:
        import PyInstaller  # noqa: F401
    except ImportError:
        print("ERROR: PyInstaller no esta instalado. Ejecuta:  pip install pyinstaller")
        return 1

    asegurar_icono()

    if opencv_instalado():
        print("OpenCV (cv2) detectado: se incluye en el .exe (camara web activa).")
    else:
        print("AVISO: opencv-python NO esta instalado en este entorno.")
        print("       El .exe se generara SIN soporte de camara web y el usuario final")
        print("       no podra anadirlo despues. Para incluirla:  pip install opencv-python")
    print()

    cmd = construir_comando()
    print("Ejecutando PyInstaller:")
    print("  " + subprocess.list2cmdline(cmd))
    print()

    resultado = subprocess.run(cmd, cwd=str(BASE))
    if resultado.returncode != 0:
        print()
        print(f"ERROR: PyInstaller termino con codigo {resultado.returncode}")
        return resultado.returncode

    if not EXE.is_file():
        print(f"ERROR: PyInstaller termino pero no se encuentra {EXE}")
        return 1

    tamano_mb = EXE.stat().st_size / (1024 * 1024)
    print()
    print("=" * 60)
    print(f"Build OK: {EXE}")
    print(f"Tamano:   {tamano_mb:.1f} MB")
    print("=" * 60)
    return 0


if __name__ == "__main__":
    sys.exit(main())
