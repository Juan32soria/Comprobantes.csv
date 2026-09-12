# -*- coding: utf-8 -*-
"""
Interfaz gráfica del sistema de extracción de comprobantes de pago.
==================================================================
Reutiliza la lógica de procesar_comprobantes.py (Gemini Flash, validaciones
y escritura del archivo Excel .xlsx). La ruta del Excel se toma de la línea
RUTA_EXCEL de config.txt (puede ser una carpeta de Google Drive).

Construida con customtkinter. Se abre con doble clic en ABRIR.bat
(Windows) o ABRIR.command (macOS).
"""

import os
import shutil
import subprocess
import sys
import threading
import time
from tkinter import filedialog, messagebox

import customtkinter as ctk

# Lógica compartida con el procesador de consola
from procesar_comprobantes import (
    ARCHIVO_CONFIG,
    CARPETA_ENTRADA,
    CARPETA_PROCESADOS,
    CARPETA_REVISION,
    EXTENSIONES,
    MODELO,
    PAUSA_SEGUNDOS,
    ExcelBloqueadoError,
    agregar_y_guardar,
    cargar_comprobantes_existentes,
    construir_fila,
    crear_carpetas,
    extraer_datos,
    leer_ruta_excel,
    listar_imagenes,
    mover_imagen,
    preparar_imagen,
    validar,
)

try:
    from google import genai
except ImportError:
    genai = None

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    Image = None

# ---------------------------------------------------------------------------
# Apariencia
# ---------------------------------------------------------------------------
ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")

COLOR_FONDO = "#0f1117"
COLOR_PANEL = "#171a23"
COLOR_TARJETA = "#212532"
COLOR_TARJETA_HOVER = "#2a2f3e"
COLOR_BORDE = "#2c3140"
COLOR_TEXTO = "#f5f6fa"
COLOR_TEXTO_SUAVE = "#8b90a0"
COLOR_ACENTO = "#e94560"
COLOR_ACENTO_HOVER = "#c23650"
COLOR_DESHABILITADO = "#3a3f4d"
COLOR_OK = "#22c55e"
COLOR_REVISAR = "#facc15"
COLOR_ERROR = "#ef4444"
COLOR_SELECCION = "#253562"
COLOR_SELECCION_BORDE = "#3b82f6"

INTERVALO_REFRESCO_MS = 3000   # refresco del estado de la API key y de la lista
LARGO_MAXIMO_NOMBRE = 46       # caracteres visibles del nombre en la lista


# ---------------------------------------------------------------------------
# Utilidades
# ---------------------------------------------------------------------------
def leer_api_key_gui():
    """Lee la API key desde config.txt sin imprimir en consola.
    Devuelve la clave o None si falta o no está configurada."""
    if not ARCHIVO_CONFIG.exists():
        return None
    try:
        contenido = ARCHIVO_CONFIG.read_text(encoding="utf-8-sig")
    except OSError:
        return None
    for linea in contenido.splitlines():
        linea = linea.strip()
        if linea.startswith("#") or "=" not in linea:
            continue
        clave, valor = linea.split("=", 1)
        if clave.strip() == "API_KEY":
            valor = valor.strip()
            if not valor or "PEGA_AQUI" in valor:
                return None
            return valor
    return None


def formatear_moneda(valor):
    """Formatea un entero como moneda colombiana: $ 150.000"""
    if valor in (None, ""):
        return "—"
    try:
        return "$ " + f"{int(valor):,}".replace(",", ".")
    except (ValueError, TypeError):
        return str(valor)


def tamano_legible(num_bytes):
    """Convierte un tamaño en bytes a texto: 850 B, 245 KB, 1,4 MB."""
    if num_bytes < 1024:
        return f"{num_bytes} B"
    if num_bytes < 1024 * 1024:
        return f"{num_bytes / 1024:.0f} KB"
    return f"{num_bytes / (1024 * 1024):.1f} MB".replace(".", ",")


def acortar(texto, largo=LARGO_MAXIMO_NOMBRE):
    return texto if len(texto) <= largo else texto[: largo - 1] + "…"


def acortar_centro(texto, largo=80):
    """Acorta un texto largo (p. ej. una ruta) dejando el inicio y el final."""
    if len(texto) <= largo:
        return texto
    mitad = (largo - 1) // 2
    return texto[:mitad] + "…" + texto[-mitad:]


# Fuentes de emoji a color por sistema (ruta, tamaño en que se dibujan)
FUENTES_EMOJI = [
    (os.path.join(os.environ.get("WINDIR", r"C:\Windows"), "Fonts", "seguiemj.ttf"), 64),
    ("/System/Library/Fonts/Apple Color Emoji.ttc", 160),
    ("/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf", 109),
    ("/usr/share/fonts/noto/NotoColorEmoji.ttf", 109),
]
_iconos_emoji = {}


def icono_emoji(emoji, lado=18):
    """Dibuja un emoji a color como CTkImage (Tk los muestra pequeños y sin color).
    Devuelve None si no hay Pillow o fuente de emoji; entonces se usa texto."""
    if emoji in _iconos_emoji:
        return _iconos_emoji[emoji]
    icono = None
    if Image is not None:
        for ruta_fuente, tamano in FUENTES_EMOJI:
            if not os.path.exists(ruta_fuente):
                continue
            try:
                fuente = ImageFont.truetype(ruta_fuente, tamano)
                lienzo = Image.new("RGBA", (tamano * 2, tamano * 2), (0, 0, 0, 0))
                ImageDraw.Draw(lienzo).text((tamano // 2, tamano // 2), emoji,
                                            font=fuente, embedded_color=True)
                caja = lienzo.getbbox()
                if not caja:
                    continue
                recorte = lienzo.crop(caja)
                medida = max(recorte.size)
                cuadro = Image.new("RGBA", (medida, medida), (0, 0, 0, 0))
                cuadro.paste(recorte, ((medida - recorte.width) // 2,
                                       (medida - recorte.height) // 2))
                cuadro = cuadro.resize((lado * 2, lado * 2), Image.LANCZOS)
                icono = ctk.CTkImage(light_image=cuadro, dark_image=cuadro,
                                     size=(lado, lado))
                break
            except Exception:
                continue
    _iconos_emoji[emoji] = icono
    return icono


def abrir_en_sistema(ruta):
    """Abre un archivo o carpeta con la aplicación predeterminada del sistema."""
    if sys.platform.startswith("win"):
        os.startfile(str(ruta))
    elif sys.platform == "darwin":
        subprocess.Popen(["open", str(ruta)])
    else:
        subprocess.Popen(["xdg-open", str(ruta)])


# ---------------------------------------------------------------------------
# Ventana principal
# ---------------------------------------------------------------------------
class Aplicacion(ctk.CTk):
    CAMPOS = [
        ("banco_app", "BANCO / APP"),
        ("numero_comprobante", "COMPROBANTE"),
        ("numero_cuenta", "CUENTA"),
        ("nombre_cliente", "NOMBRE"),
        ("valor_pago", "VALOR"),
        ("fecha_pago", "FECHA DEL PAGO"),
    ]

    def __init__(self):
        super().__init__()
        self.procesando = False
        self.filas = {}             # nombre de archivo -> widgets de la fila
        self.seleccionados = set()  # nombres seleccionados en la lista
        self.resumen = {"total": 0, "ok": 0, "revision": 0, "errores": 0}

        self.title("Extractor de Comprobantes")
        self.geometry("1100x720")
        self.minsize(1000, 660)
        self.configure(fg_color=COLOR_FONDO)

        self.fuente_titulo = ctk.CTkFont(size=26, weight="bold")
        self.fuente_seccion = ctk.CTkFont(size=16, weight="bold")
        self.fuente_normal = ctk.CTkFont(size=13)
        self.fuente_pequena = ctk.CTkFont(size=11)
        self.fuente_etiqueta = ctk.CTkFont(size=10, weight="bold")
        self.fuente_valor = ctk.CTkFont(size=18, weight="bold")
        self.fuente_boton = ctk.CTkFont(size=13, weight="bold")
        self.fuente_procesar = ctk.CTkFont(size=18, weight="bold")
        self.fuente_contador = ctk.CTkFont(size=22, weight="bold")

        self.grid_columnconfigure(0, weight=1, uniform="paneles")
        self.grid_columnconfigure(1, weight=1, uniform="paneles")
        self.grid_rowconfigure(1, weight=1)

        self._construir_encabezado()
        self._construir_panel_izquierdo()
        self._construir_panel_derecho()
        self._construir_progreso()
        self._construir_acciones()

        self.refrescar_lista()
        self.actualizar_estado_api()
        self._actualizar_ruta_excel()
        self.after(INTERVALO_REFRESCO_MS, self._refresco_periodico)

    # ------------------------------------------------------------------
    # Construcción de la interfaz
    # ------------------------------------------------------------------
    def _construir_encabezado(self):
        encabezado = ctk.CTkFrame(self, fg_color="transparent")
        encabezado.grid(row=0, column=0, columnspan=2, sticky="ew",
                        padx=24, pady=(18, 10))
        encabezado.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(
            encabezado, text="Extractor de Comprobantes",
            font=self.fuente_titulo, text_color=COLOR_TEXTO, anchor="w",
        ).grid(row=0, column=0, sticky="w")
        self.etiqueta_subtitulo = ctk.CTkLabel(
            encabezado, text=f"Modelo: {MODELO}",
            font=self.fuente_pequena, text_color=COLOR_TEXTO_SUAVE, anchor="w",
        )
        self.etiqueta_subtitulo.grid(row=1, column=0, sticky="w")

        pastilla = ctk.CTkFrame(encabezado, fg_color=COLOR_PANEL, corner_radius=18,
                                border_width=1, border_color=COLOR_BORDE)
        pastilla.grid(row=0, column=1, rowspan=2, sticky="e")
        self.punto_api = ctk.CTkLabel(pastilla, text="●", font=ctk.CTkFont(size=16),
                                      text_color=COLOR_TEXTO_SUAVE)
        self.punto_api.grid(row=0, column=0, padx=(14, 6), pady=6)
        self.texto_api = ctk.CTkLabel(pastilla, text="Verificando API key...",
                                      font=self.fuente_boton, text_color=COLOR_TEXTO)
        self.texto_api.grid(row=0, column=1, padx=(0, 16), pady=6)

    def _boton_secundario(self, padre, emoji, texto, comando, **opciones):
        icono = icono_emoji(emoji)
        valores = dict(
            text=texto, command=comando, font=self.fuente_normal,
            fg_color=COLOR_TARJETA, hover_color=COLOR_TARJETA_HOVER,
            text_color=COLOR_TEXTO, corner_radius=10, height=38,
            border_width=1, border_color=COLOR_BORDE,
        )
        if icono is not None:
            valores.update(image=icono, compound="left")
        else:
            valores["text"] = f"{emoji} {texto}"
        valores.update(opciones)
        return ctk.CTkButton(padre, **valores)

    def _construir_panel_izquierdo(self):
        panel = ctk.CTkFrame(self, fg_color=COLOR_PANEL, corner_radius=16,
                             border_width=1, border_color=COLOR_BORDE)
        panel.grid(row=1, column=0, sticky="nsew", padx=(24, 8), pady=8)
        panel.grid_columnconfigure(0, weight=1)
        panel.grid_rowconfigure(1, weight=1)

        cabecera = ctk.CTkFrame(panel, fg_color="transparent")
        cabecera.grid(row=0, column=0, sticky="ew", padx=16, pady=(14, 8))
        cabecera.grid_columnconfigure(0, weight=1)
        ctk.CTkLabel(cabecera, text="Imágenes pendientes", font=self.fuente_seccion,
                     text_color=COLOR_TEXTO, anchor="w").grid(row=0, column=0, sticky="w")
        self.etiqueta_conteo = ctk.CTkLabel(
            cabecera, text="0", font=self.fuente_boton, text_color=COLOR_TEXTO,
            fg_color=COLOR_ACENTO, corner_radius=10, width=34, height=24,
        )
        self.etiqueta_conteo.grid(row=0, column=1, sticky="e")
        self.etiqueta_ayuda_lista = ctk.CTkLabel(
            cabecera, text="Haz clic en las filas para seleccionarlas",
            font=self.fuente_pequena, text_color=COLOR_TEXTO_SUAVE, anchor="w",
        )
        self.etiqueta_ayuda_lista.grid(row=1, column=0, columnspan=2, sticky="w")

        self.lista = ctk.CTkScrollableFrame(
            panel, fg_color=COLOR_FONDO, corner_radius=12,
            scrollbar_button_color=COLOR_BORDE,
            scrollbar_button_hover_color=COLOR_TARJETA_HOVER,
        )
        self.lista.grid(row=1, column=0, sticky="nsew", padx=16)
        self.lista.grid_columnconfigure(0, weight=1)

        self.etiqueta_vacia = ctk.CTkLabel(
            self.lista,
            text='No hay imágenes pendientes.\n\nUsa "Agregar imágenes" o guarda\n'
                 'los comprobantes en la carpeta "entrada".',
            font=self.fuente_normal, text_color=COLOR_TEXTO_SUAVE, justify="center",
        )

        botones = ctk.CTkFrame(panel, fg_color="transparent")
        botones.grid(row=2, column=0, sticky="ew", padx=16, pady=14)
        for columna in range(3):
            botones.grid_columnconfigure(columna, weight=1, uniform="botones")
        self._boton_secundario(botones, "➕", "Agregar imágenes", self.agregar_imagenes)\
            .grid(row=0, column=0, sticky="ew", padx=(0, 4))
        self._boton_secundario(botones, "📂", "Abrir carpeta", self.abrir_entrada)\
            .grid(row=0, column=1, sticky="ew", padx=4)
        self._boton_secundario(botones, "🗑", "Quitar selección", self.quitar_seleccion,
                               hover_color="#4a2530")\
            .grid(row=0, column=2, sticky="ew", padx=(4, 0))

    def _construir_panel_derecho(self):
        panel = ctk.CTkFrame(self, fg_color=COLOR_PANEL, corner_radius=16,
                             border_width=1, border_color=COLOR_BORDE)
        panel.grid(row=1, column=1, sticky="nsew", padx=(8, 24), pady=8)
        panel.grid_columnconfigure(0, weight=1)

        cabecera = ctk.CTkFrame(panel, fg_color="transparent")
        cabecera.grid(row=0, column=0, sticky="ew", padx=16, pady=(14, 8))
        cabecera.grid_columnconfigure(0, weight=1)
        ctk.CTkLabel(cabecera, text="Último comprobante", font=self.fuente_seccion,
                     text_color=COLOR_TEXTO, anchor="w").grid(row=0, column=0, sticky="w")
        self.etiqueta_archivo = ctk.CTkLabel(
            cabecera, text="Aún no se ha procesado ningún comprobante",
            font=self.fuente_pequena, text_color=COLOR_TEXTO_SUAVE, anchor="w",
        )
        self.etiqueta_archivo.grid(row=1, column=0, sticky="w")
        self.badge_estado = ctk.CTkLabel(
            cabecera, text="SIN DATOS", font=self.fuente_boton,
            text_color=COLOR_TEXTO_SUAVE, fg_color=COLOR_TARJETA,
            corner_radius=14, width=110, height=32,
        )
        self.badge_estado.grid(row=0, column=1, rowspan=2, sticky="e")

        tarjetas = ctk.CTkFrame(panel, fg_color="transparent")
        tarjetas.grid(row=1, column=0, sticky="nsew", padx=10)
        tarjetas.grid_columnconfigure((0, 1), weight=1, uniform="tarjetas")

        self.campos = {}
        for indice, (clave, titulo) in enumerate(self.CAMPOS):
            tarjeta = ctk.CTkFrame(tarjetas, fg_color=COLOR_TARJETA, corner_radius=12)
            tarjeta.grid(row=indice // 2, column=indice % 2, sticky="nsew", padx=6, pady=6)
            tarjeta.grid_columnconfigure(0, weight=1)
            ctk.CTkLabel(tarjeta, text=titulo, font=self.fuente_etiqueta,
                         text_color=COLOR_TEXTO_SUAVE, anchor="w", height=16)\
                .grid(row=0, column=0, sticky="w", padx=14, pady=(10, 0))
            valor = ctk.CTkLabel(tarjeta, text="—", font=self.fuente_valor,
                                 text_color=COLOR_TEXTO, anchor="w", justify="left")
            valor.grid(row=1, column=0, sticky="w", padx=14, pady=(0, 10))
            tarjeta.bind("<Configure>",
                         lambda evento, etiqueta=valor: self._ajustar_ajuste(evento, etiqueta))
            self.campos[clave] = valor

        self.marco_motivos = ctk.CTkFrame(panel, fg_color="#2b2614", corner_radius=12,
                                          border_width=1, border_color="#5c4f16")
        self.marco_motivos.grid(row=2, column=0, sticky="ew", padx=16, pady=(6, 14))
        self.marco_motivos.grid_columnconfigure(0, weight=1)
        self.etiqueta_motivos = ctk.CTkLabel(
            self.marco_motivos, text="", font=self.fuente_normal,
            text_color=COLOR_REVISAR, anchor="w", justify="left",
        )
        self.etiqueta_motivos.grid(row=0, column=0, sticky="ew", padx=14, pady=10)
        self.marco_motivos.bind(
            "<Configure>",
            lambda evento: self._ajustar_ajuste(evento, self.etiqueta_motivos))
        self.marco_motivos.grid_remove()

    def _ajustar_ajuste(self, evento, etiqueta):
        """Ajusta el wraplength de una etiqueta al ancho de su tarjeta."""
        escala = ctk.ScalingTracker.get_widget_scaling(self)
        ancho = max(80, int(evento.width / escala) - 32)
        etiqueta.configure(wraplength=ancho)

    def _construir_progreso(self):
        marco = ctk.CTkFrame(self, fg_color="transparent")
        marco.grid(row=2, column=0, columnspan=2, sticky="ew", padx=24, pady=(8, 0))
        marco.grid_columnconfigure(0, weight=1)

        self.barra = ctk.CTkProgressBar(marco, height=12, corner_radius=6,
                                        fg_color=COLOR_TARJETA, progress_color=COLOR_ACENTO)
        self.barra.grid(row=0, column=0, sticky="ew")
        self.barra.set(0)
        self.etiqueta_porcentaje = ctk.CTkLabel(marco, text="0 %", width=56, anchor="e",
                                                font=self.fuente_boton,
                                                text_color=COLOR_TEXTO)
        self.etiqueta_porcentaje.grid(row=0, column=1, padx=(12, 0))
        self.etiqueta_estado = ctk.CTkLabel(marco, text="Listo.", anchor="w",
                                            font=self.fuente_normal,
                                            text_color=COLOR_TEXTO_SUAVE)
        self.etiqueta_estado.grid(row=1, column=0, columnspan=2, sticky="ew", pady=(2, 0))

    def _construir_acciones(self):
        marco = ctk.CTkFrame(self, fg_color="transparent")
        marco.grid(row=3, column=0, columnspan=2, sticky="ew", padx=24, pady=(6, 20))
        marco.grid_columnconfigure(2, weight=1)

        self.boton_procesar = ctk.CTkButton(
            marco, text="PROCESAR", command=self.iniciar_procesamiento,
            font=self.fuente_procesar, width=220, height=58, corner_radius=29,
            fg_color=COLOR_ACENTO, hover_color=COLOR_ACENTO_HOVER,
            text_color="white", text_color_disabled="#aeb2bf",
        )
        self.boton_procesar.grid(row=0, column=0, sticky="w")

        self._boton_secundario(
            marco, "📊", "Abrir Excel", self.abrir_excel,
            width=170, height=58, corner_radius=29, font=self.fuente_boton,
        ).grid(row=0, column=1, sticky="w", padx=(12, 0))

        resumen = ctk.CTkFrame(marco, fg_color="transparent")
        resumen.grid(row=0, column=3, sticky="e")
        self.contadores = {}
        definicion = [
            ("total", "Procesados", COLOR_TEXTO),
            ("ok", "OK", COLOR_OK),
            ("revision", "Revisión", COLOR_REVISAR),
            ("errores", "Errores", COLOR_ERROR),
        ]
        for columna, (clave, titulo, color) in enumerate(definicion):
            tarjeta = ctk.CTkFrame(resumen, fg_color=COLOR_PANEL, corner_radius=12,
                                   border_width=1, border_color=COLOR_BORDE,
                                   width=100, height=58)
            tarjeta.grid(row=0, column=columna, padx=(8, 0))
            tarjeta.grid_propagate(False)
            tarjeta.grid_columnconfigure(0, weight=1)
            numero = ctk.CTkLabel(tarjeta, text="0", font=self.fuente_contador,
                                  text_color=color, height=26)
            numero.grid(row=0, column=0, pady=(6, 0))
            ctk.CTkLabel(tarjeta, text=titulo, font=self.fuente_pequena,
                         text_color=COLOR_TEXTO_SUAVE, height=16)\
                .grid(row=1, column=0, pady=(0, 6))
            self.contadores[clave] = numero
        ctk.CTkLabel(resumen, text="Acumulado de esta sesión", font=self.fuente_pequena,
                     text_color=COLOR_TEXTO_SUAVE, height=14)\
            .grid(row=1, column=0, columnspan=4, sticky="e", pady=(4, 0))

    # ------------------------------------------------------------------
    # Encabezado: estado de la API key y ruta del Excel
    # ------------------------------------------------------------------
    def actualizar_estado_api(self):
        if leer_api_key_gui():
            self.punto_api.configure(text_color=COLOR_OK)
            self.texto_api.configure(text="API key configurada")
        else:
            self.punto_api.configure(text_color=COLOR_ERROR)
            self.texto_api.configure(text="Falta API key")

    def _actualizar_ruta_excel(self):
        try:
            ruta = leer_ruta_excel()
            texto = f"Modelo: {MODELO}   ·   Excel: {acortar_centro(str(ruta))}"
        except OSError:
            texto = f"Modelo: {MODELO}   ·   Excel: carpeta no disponible (revisa RUTA_EXCEL)"
        self.etiqueta_subtitulo.configure(text=texto)

    def _refresco_periodico(self):
        try:
            self.actualizar_estado_api()
            if not self.procesando:
                self.refrescar_lista()
        finally:
            self.after(INTERVALO_REFRESCO_MS, self._refresco_periodico)

    # ------------------------------------------------------------------
    # Lista de imágenes pendientes
    # ------------------------------------------------------------------
    def refrescar_lista(self):
        crear_carpetas()
        imagenes = listar_imagenes()
        nombres = [imagen.name for imagen in imagenes]
        presentes = set(nombres)

        # Quitar filas de archivos que ya no están
        for nombre in list(self.filas):
            if nombre not in presentes:
                self.filas.pop(nombre)["marco"].destroy()
                self.seleccionados.discard(nombre)

        # Crear las nuevas, actualizar tamaños y reordenar
        for posicion, imagen in enumerate(imagenes):
            try:
                tamano = tamano_legible(imagen.stat().st_size)
            except OSError:
                tamano = "—"
            fila = self.filas.get(imagen.name)
            if fila is None:
                fila = self._crear_fila(imagen.name, tamano)
                self.filas[imagen.name] = fila
            elif fila["tamano"].cget("text") != tamano:
                fila["tamano"].configure(text=tamano)
            fila["marco"].grid(row=posicion, column=0, sticky="ew", padx=4, pady=3)

        total = len(nombres)
        if total == 0:
            self.etiqueta_vacia.grid(row=0, column=0, pady=40)
        else:
            self.etiqueta_vacia.grid_remove()
        self.etiqueta_conteo.configure(text=str(total))
        self._actualizar_ayuda_lista()

    def _crear_fila(self, nombre, tamano):
        marco = ctk.CTkFrame(self.lista, fg_color=COLOR_TARJETA, corner_radius=10,
                             border_width=1, border_color=COLOR_TARJETA, height=40)
        marco.grid_columnconfigure(1, weight=1)
        variable = ctk.BooleanVar(value=False)
        casilla = ctk.CTkCheckBox(
            marco, text="", variable=variable, width=22,
            checkbox_width=18, checkbox_height=18, corner_radius=5,
            border_color=COLOR_TEXTO_SUAVE, fg_color=COLOR_SELECCION_BORDE,
            command=lambda: self._sincronizar_fila(nombre),
        )
        casilla.grid(row=0, column=0, padx=(10, 4), pady=8)
        etiqueta = ctk.CTkLabel(marco, text=acortar(nombre), font=self.fuente_normal,
                                text_color=COLOR_TEXTO, anchor="w")
        etiqueta.grid(row=0, column=1, sticky="ew")
        etiqueta_tamano = ctk.CTkLabel(marco, text=tamano, font=self.fuente_pequena,
                                       text_color=COLOR_TEXTO_SUAVE, anchor="e")
        etiqueta_tamano.grid(row=0, column=2, padx=(8, 12))

        for widget in (marco, etiqueta, etiqueta_tamano):
            widget.bind("<Button-1>", lambda _evento: self._alternar_fila(nombre))
            widget.configure(cursor="hand2")
        return {"marco": marco, "variable": variable, "tamano": etiqueta_tamano}

    def _alternar_fila(self, nombre):
        fila = self.filas.get(nombre)
        if fila is None:
            return
        fila["variable"].set(not fila["variable"].get())
        self._sincronizar_fila(nombre)

    def _sincronizar_fila(self, nombre):
        fila = self.filas.get(nombre)
        if fila is None:
            return
        if fila["variable"].get():
            self.seleccionados.add(nombre)
            fila["marco"].configure(fg_color=COLOR_SELECCION,
                                    border_color=COLOR_SELECCION_BORDE)
        else:
            self.seleccionados.discard(nombre)
            fila["marco"].configure(fg_color=COLOR_TARJETA, border_color=COLOR_TARJETA)
        self._actualizar_ayuda_lista()

    def _actualizar_ayuda_lista(self):
        if self.seleccionados:
            cantidad = len(self.seleccionados)
            texto = "1 seleccionada" if cantidad == 1 else f"{cantidad} seleccionadas"
            self.etiqueta_ayuda_lista.configure(text=texto, text_color=COLOR_SELECCION_BORDE)
        else:
            self.etiqueta_ayuda_lista.configure(
                text="Haz clic en las filas para seleccionarlas",
                text_color=COLOR_TEXTO_SUAVE)

    def agregar_imagenes(self):
        rutas = filedialog.askopenfilenames(
            title="Selecciona los comprobantes",
            filetypes=[
                ("Imágenes", "*.jpg *.jpeg *.png *.webp"),
                ("Todos los archivos", "*.*"),
            ],
        )
        if not rutas:
            return
        crear_carpetas()
        copiadas = 0
        for ruta in rutas:
            if os.path.splitext(ruta)[1].lower() not in EXTENSIONES:
                continue
            try:
                shutil.copy2(ruta, CARPETA_ENTRADA / os.path.basename(ruta))
                copiadas += 1
            except OSError as error:
                messagebox.showerror(
                    "Error al copiar",
                    f"No se pudo copiar {os.path.basename(ruta)}:\n{error}",
                )
        self.refrescar_lista()
        if copiadas:
            self.mostrar_estado(f"Se agregaron {copiadas} imágenes a la carpeta entrada.")

    def abrir_entrada(self):
        crear_carpetas()
        try:
            abrir_en_sistema(CARPETA_ENTRADA)
        except OSError as error:
            messagebox.showerror("Error", f"No se pudo abrir la carpeta:\n{error}")

    def quitar_seleccion(self):
        if self.procesando:
            messagebox.showinfo("Quitar selección",
                                "Espera a que termine el procesamiento.")
            return
        nombres = sorted(self.seleccionados)
        if not nombres:
            messagebox.showinfo(
                "Quitar selección",
                "Primero selecciona en la lista las imágenes que quieres quitar.",
            )
            return
        if not messagebox.askyesno(
            "Confirmar",
            f"¿Eliminar {len(nombres)} imagen(es) de la carpeta entrada?\n"
            "Esta acción no se puede deshacer.",
        ):
            return
        for nombre in nombres:
            try:
                (CARPETA_ENTRADA / nombre).unlink(missing_ok=True)
            except OSError as error:
                messagebox.showerror("Error", f"No se pudo eliminar {nombre}:\n{error}")
        self.refrescar_lista()
        self.mostrar_estado(f"Se quitaron {len(nombres)} imágenes.")

    # ------------------------------------------------------------------
    # Panel derecho y pie
    # ------------------------------------------------------------------
    def mostrar_resultado(self, fila, motivos):
        self.etiqueta_archivo.configure(text=f"Archivo: {fila['archivo_origen'] or '—'}")
        for clave, _titulo in self.CAMPOS:
            if clave == "valor_pago":
                texto = formatear_moneda(fila["valor_pago"])
            else:
                texto = fila[clave] or "—"
            self.campos[clave].configure(text=texto)

        if fila["estado"] == "OK":
            self.badge_estado.configure(text="✔  OK", fg_color=COLOR_OK,
                                        text_color="#06240f")
        else:
            self.badge_estado.configure(text="⚠  REVISAR", fg_color=COLOR_REVISAR,
                                        text_color="#2b2200")

        if motivos:
            self.etiqueta_motivos.configure(
                text="Motivos:\n" + "\n".join(f"•  {motivo}" for motivo in motivos))
            self.marco_motivos.grid()
        else:
            self.etiqueta_motivos.configure(text="")
            self.marco_motivos.grid_remove()

    def mostrar_estado(self, texto, color=COLOR_TEXTO_SUAVE):
        self.etiqueta_estado.configure(text=texto, text_color=color)

    def actualizar_progreso(self, hechos, total):
        fraccion = hechos / total if total else 0
        self.barra.set(fraccion)
        self.etiqueta_porcentaje.configure(text=f"{round(fraccion * 100)} %")

    def sumar_resumen(self, clave):
        self.resumen[clave] += 1
        self.resumen["total"] += 1
        for nombre, etiqueta in self.contadores.items():
            etiqueta.configure(text=str(self.resumen[nombre]))

    def _poner_boton_procesando(self, activo):
        if activo:
            self.boton_procesar.configure(state="disabled", text="Procesando...",
                                          fg_color=COLOR_DESHABILITADO)
        else:
            self.boton_procesar.configure(state="normal", text="PROCESAR",
                                          fg_color=COLOR_ACENTO)

    # ------------------------------------------------------------------
    # Procesamiento
    # ------------------------------------------------------------------
    def iniciar_procesamiento(self):
        if self.procesando:
            return

        self.actualizar_estado_api()

        if genai is None:
            messagebox.showerror(
                "Faltan dependencias",
                "No está instalada la librería de Google Gemini.\n"
                "Solución: haz doble clic en INSTALAR.bat (o INSTALAR.command en Mac) "
                "y espera a que termine.",
            )
            return

        clave = leer_api_key_gui()
        if not clave:
            messagebox.showerror(
                "Falta la clave de API",
                "No se encontró una clave de API válida en config.txt.\n\n"
                "Cómo obtenerla (es gratis y no pide tarjeta):\n"
                "1. Entra a https://aistudio.google.com/apikey\n"
                "2. Inicia sesión con tu cuenta de Google.\n"
                "3. Pulsa \"Create API key\" y copia la clave (empieza con AIza...).\n"
                "4. Abre config.txt con el Bloc de notas y pégala después de API_KEY=\n"
                "5. Guarda el archivo y vuelve a pulsar PROCESAR.",
            )
            return

        imagenes = listar_imagenes()
        if not imagenes:
            messagebox.showinfo(
                "Sin imágenes",
                'No hay imágenes para procesar.\n\nUsa "Agregar imágenes" o guarda '
                'los comprobantes (jpg, png o webp) en la carpeta "entrada".',
            )
            return

        self.procesando = True
        self._poner_boton_procesando(True)
        self.actualizar_progreso(0, len(imagenes))
        self.mostrar_estado(f"Preparando {len(imagenes)} imágenes...")
        hilo = threading.Thread(
            target=self._procesar_en_hilo, args=(clave, imagenes), daemon=True,
        )
        hilo.start()

    def _procesar_en_hilo(self, clave, imagenes):
        """Se ejecuta en un hilo aparte. Toda actualización de la interfaz
        se envía al hilo principal con self.after."""
        total = len(imagenes)
        total_ok = total_revisar = total_error = 0
        ruta = None
        aviso = None  # (título, mensaje) de un error que detuvo el proceso

        def en_ui(funcion, *args):
            self.after(0, funcion, *args)

        try:
            ruta = leer_ruta_excel()
            comprobantes_existentes = cargar_comprobantes_existentes(ruta)
            cliente = genai.Client(api_key=clave)

            for indice, archivo in enumerate(imagenes, start=1):
                en_ui(self.mostrar_estado,
                      f"[{indice}/{total}] Procesando {archivo.name} ...")
                try:
                    imagen_bytes = preparar_imagen(archivo)
                    datos = extraer_datos(cliente, imagen_bytes)
                    estado, motivos = validar(datos, comprobantes_existentes)
                    fila = construir_fila(archivo, datos, estado)

                    # Primero se guarda en Excel; si falla, la imagen queda en entrada
                    agregar_y_guardar(fila, ruta)

                    if fila["numero_comprobante"]:
                        comprobantes_existentes.add(fila["numero_comprobante"])

                    if estado == "OK":
                        total_ok += 1
                        destino, clave_resumen = CARPETA_PROCESADOS, "ok"
                    else:
                        total_revisar += 1
                        destino, clave_resumen = CARPETA_REVISION, "revision"

                    en_ui(self.mostrar_resultado, fila, motivos)
                    en_ui(self.sumar_resumen, clave_resumen)

                    try:
                        mover_imagen(archivo, destino)
                    except OSError as error:
                        en_ui(self.mostrar_estado,
                              f"{archivo.name} se guardó en el Excel, pero no se pudo "
                              f"mover la imagen: {error}", COLOR_REVISAR)

                except ExcelBloqueadoError as error:
                    aviso = self._aviso_excel_bloqueado(error, ruta)
                    break

                except Exception as error:
                    error_str = str(error).lower()
                    # Un PermissionError del sistema (OSError) no es un problema de API key
                    if not isinstance(error, OSError) and (
                            "api key" in error_str or "authenticate" in error_str
                            or "permission" in error_str):
                        aviso = (
                            "Clave de API no válida",
                            "Gemini rechazó la clave de API. Revisa config.txt.\n\n"
                            "La clave se obtiene gratis en "
                            "https://aistudio.google.com/apikey",
                        )
                        break
                    total_error += 1
                    en_ui(self.sumar_resumen, "errores")
                    en_ui(self.mostrar_estado,
                          f"Error con {archivo.name}: {error}", COLOR_ERROR)

                en_ui(self.actualizar_progreso, indice, total)
                en_ui(self.refrescar_lista)

                # Pausa para respetar el límite de solicitudes por minuto
                if indice < total:
                    time.sleep(PAUSA_SEGUNDOS)

        except ExcelBloqueadoError as error:
            aviso = self._aviso_excel_bloqueado(error, ruta)
        except OSError as error:
            aviso = (
                "No se puede acceder al Excel",
                "No se pudo acceder a la carpeta del archivo Excel.\n"
                "Revisa la línea RUTA_EXCEL de config.txt y que la unidad "
                "(por ejemplo Google Drive) esté disponible.\n\n"
                f"Detalle: {error}",
            )
        except Exception as error:
            aviso = ("Error inesperado", f"Ocurrió un error inesperado:\n{error}")

        en_ui(self._terminar, total_ok, total_revisar, total_error, ruta, aviso)

    @staticmethod
    def _aviso_excel_bloqueado(error, ruta):
        ruta_excel = getattr(error, "ruta", None) or ruta
        mensaje = "Cierra el archivo Excel y vuelve a intentar"
        if ruta_excel:
            mensaje += f"\n\nArchivo: {ruta_excel}"
        return ("Excel abierto", mensaje)

    def _terminar(self, total_ok, total_revisar, total_error, ruta, aviso=None):
        self.procesando = False
        self._poner_boton_procesando(False)
        self.refrescar_lista()
        self.actualizar_estado_api()

        resumen = (f"OK: {total_ok}   |   Para revisar: {total_revisar}"
                   f"   |   Con error: {total_error}")
        if aviso:
            titulo, mensaje = aviso
            self.mostrar_estado(f"Detenido: {titulo}.   {resumen}", COLOR_ERROR)
            messagebox.showerror(titulo, mensaje)
            return

        self.mostrar_estado(f"Terminado.   {resumen}", COLOR_TEXTO)
        destino = f"Los resultados están en:\n{ruta}" if ruta else ""
        messagebox.showinfo(
            "Proceso terminado",
            f"Procesados correctamente (OK): {total_ok}\n"
            f"Para revisión manual: {total_revisar}\n"
            f"Con error (quedan en entrada): {total_error}\n\n"
            f"{destino}",
        )

    # ------------------------------------------------------------------
    # Excel de resultados
    # ------------------------------------------------------------------
    def abrir_excel(self):
        try:
            ruta = leer_ruta_excel()
        except OSError as error:
            messagebox.showerror("No se puede acceder al Excel", str(error))
            return
        if not ruta.exists():
            messagebox.showinfo(
                "Sin resultados",
                "Todavía no existe el archivo de resultados.\n"
                "Procesa al menos un comprobante primero.\n\n"
                f"Ruta configurada: {ruta}",
            )
            return
        try:
            abrir_en_sistema(ruta)
        except OSError as error:
            messagebox.showerror("Error", f"No se pudo abrir el Excel:\n{error}")


def main():
    crear_carpetas()
    app = Aplicacion()
    app.mainloop()


if __name__ == "__main__":
    main()
