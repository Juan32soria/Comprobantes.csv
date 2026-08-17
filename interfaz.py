# -*- coding: utf-8 -*-
"""
Interfaz gráfica del sistema de extracción de comprobantes de pago.
==================================================================
Reutiliza la lógica de procesar_comprobantes.py (Gemini 3.6 Flash,
validaciones y CSV). Se abre con doble clic en ABRIR.bat.
"""

import os
import shutil
import sys
import threading
import time
import tkinter as tk
from tkinter import filedialog, messagebox, ttk

# Lógica compartida con el procesador de consola
from procesar_comprobantes import (
    ARCHIVO_CONFIG,
    ARCHIVO_XLSX,
    CARPETA_ENTRADA,
    CARPETA_PROCESADOS,
    CARPETA_REVISION,
    EXTENSIONES,
    MODELO,
    PAUSA_SEGUNDOS,
    abrir_libro,
    agregar_fila,
    cargar_comprobantes_existentes,
    construir_fila,
    crear_carpetas,
    extraer_datos,
    listar_imagenes,
    mover_imagen,
    preparar_imagen,
    validar,
)

try:
    from google import genai
except ImportError:
    genai = None

# ---------------------------------------------------------------------------
# Colores del tema oscuro
# ---------------------------------------------------------------------------
COLOR_FONDO = "#1e1e2e"
COLOR_PANEL = "#27273a"
COLOR_BORDE = "#3b3b52"
COLOR_TEXTO = "#e4e4ef"
COLOR_TEXTO_SUAVE = "#9a9ab0"
COLOR_ACENTO = "#e53935"
COLOR_ACENTO_HOVER = "#c62828"
COLOR_OK = "#4caf50"
COLOR_REVISAR = "#ffc107"
COLOR_ERROR = "#ef5350"
COLOR_LISTA = "#20202f"
COLOR_SELECCION = "#3d5afe"

FUENTE = ("Segoe UI", 10)
FUENTE_TITULO = ("Segoe UI", 12, "bold")
FUENTE_DATO = ("Segoe UI", 11)
FUENTE_VALOR = ("Segoe UI", 14, "bold")


def leer_api_key_gui():
    """Lee la API key desde config.txt sin imprimir en consola.
    Devuelve la clave o None si falta o no está configurada."""
    if not ARCHIVO_CONFIG.exists():
        return None
    for linea in ARCHIVO_CONFIG.read_text(encoding="utf-8-sig").splitlines():
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


class Aplicacion:
    def __init__(self, root):
        self.root = root
        self.procesando = False

        root.title("Sistema de Extracción de Comprobantes — Gemini")
        root.geometry("980x620")
        root.minsize(860, 560)
        root.configure(bg=COLOR_FONDO)

        self._configurar_estilos()
        self._construir_interfaz()
        self.refrescar_lista()

    # ------------------------------------------------------------------
    # Estilos
    # ------------------------------------------------------------------
    def _configurar_estilos(self):
        estilo = ttk.Style(self.root)
        estilo.theme_use("clam")
        estilo.configure(
            "Barra.Horizontal.TProgressbar",
            troughcolor=COLOR_PANEL,
            background=COLOR_ACENTO,
            bordercolor=COLOR_BORDE,
            lightcolor=COLOR_ACENTO,
            darkcolor=COLOR_ACENTO,
        )

    # ------------------------------------------------------------------
    # Construcción de la interfaz
    # ------------------------------------------------------------------
    def _construir_interfaz(self):
        # Encabezado
        encabezado = tk.Frame(self.root, bg=COLOR_FONDO)
        encabezado.pack(fill="x", padx=16, pady=(14, 6))
        tk.Label(
            encabezado,
            text="Sistema de Extracción de Comprobantes",
            bg=COLOR_FONDO, fg=COLOR_TEXTO, font=("Segoe UI", 16, "bold"),
        ).pack(side="left")
        tk.Label(
            encabezado,
            text=f"Motor: {MODELO}",
            bg=COLOR_FONDO, fg=COLOR_TEXTO_SUAVE, font=FUENTE,
        ).pack(side="right")

        # Contenedor central con dos paneles
        centro = tk.Frame(self.root, bg=COLOR_FONDO)
        centro.pack(fill="both", expand=True, padx=16, pady=6)
        centro.columnconfigure(0, weight=1, uniform="col")
        centro.columnconfigure(1, weight=1, uniform="col")
        centro.rowconfigure(0, weight=1)

        self._construir_panel_izquierdo(centro)
        self._construir_panel_derecho(centro)

        # Barra de progreso y estado
        pie = tk.Frame(self.root, bg=COLOR_FONDO)
        pie.pack(fill="x", padx=16, pady=(6, 4))
        self.barra = ttk.Progressbar(
            pie, style="Barra.Horizontal.TProgressbar",
            orient="horizontal", mode="determinate",
        )
        self.barra.pack(fill="x")
        self.etiqueta_estado = tk.Label(
            pie, text="Listo.", bg=COLOR_FONDO, fg=COLOR_TEXTO_SUAVE,
            font=FUENTE, anchor="w",
        )
        self.etiqueta_estado.pack(fill="x", pady=(4, 0))

        # Botonera inferior
        botonera = tk.Frame(self.root, bg=COLOR_FONDO)
        botonera.pack(fill="x", padx=16, pady=(4, 14))

        self.boton_procesar = tk.Button(
            botonera, text="PROCESAR", command=self.iniciar_procesamiento,
            bg=COLOR_ACENTO, fg="white", activebackground=COLOR_ACENTO_HOVER,
            activeforeground="white", font=("Segoe UI", 14, "bold"),
            relief="flat", cursor="hand2", padx=40, pady=10, bd=0,
        )
        self.boton_procesar.pack(side="left")

        self.boton_csv = tk.Button(
            botonera, text="Abrir Excel de resultados", command=self.abrir_csv,
            bg=COLOR_PANEL, fg=COLOR_TEXTO, activebackground=COLOR_BORDE,
            activeforeground=COLOR_TEXTO, font=FUENTE,
            relief="flat", cursor="hand2", padx=18, pady=10, bd=0,
        )
        self.boton_csv.pack(side="right")

    def _boton_secundario(self, padre, texto, comando):
        return tk.Button(
            padre, text=texto, command=comando,
            bg=COLOR_PANEL, fg=COLOR_TEXTO, activebackground=COLOR_BORDE,
            activeforeground=COLOR_TEXTO, font=FUENTE,
            relief="flat", cursor="hand2", padx=10, pady=6, bd=0,
        )

    def _construir_panel_izquierdo(self, padre):
        panel = tk.Frame(padre, bg=COLOR_PANEL, highlightbackground=COLOR_BORDE,
                         highlightthickness=1)
        panel.grid(row=0, column=0, sticky="nsew", padx=(0, 8))

        tk.Label(
            panel, text='Imágenes en "entrada"',
            bg=COLOR_PANEL, fg=COLOR_TEXTO, font=FUENTE_TITULO, anchor="w",
        ).pack(fill="x", padx=12, pady=(10, 6))

        marco_lista = tk.Frame(panel, bg=COLOR_PANEL)
        marco_lista.pack(fill="both", expand=True, padx=12)

        barra_scroll = tk.Scrollbar(marco_lista)
        barra_scroll.pack(side="right", fill="y")

        self.lista = tk.Listbox(
            marco_lista, selectmode="extended",
            bg=COLOR_LISTA, fg=COLOR_TEXTO, font=FUENTE,
            selectbackground=COLOR_SELECCION, selectforeground="white",
            relief="flat", highlightthickness=0, activestyle="none",
            yscrollcommand=barra_scroll.set,
        )
        self.lista.pack(side="left", fill="both", expand=True)
        barra_scroll.config(command=self.lista.yview)

        self.etiqueta_conteo = tk.Label(
            panel, text="", bg=COLOR_PANEL, fg=COLOR_TEXTO_SUAVE,
            font=FUENTE, anchor="w",
        )
        self.etiqueta_conteo.pack(fill="x", padx=12, pady=(4, 0))

        botones = tk.Frame(panel, bg=COLOR_PANEL)
        botones.pack(fill="x", padx=12, pady=10)
        self._boton_secundario(botones, "Agregar imágenes", self.agregar_imagenes)\
            .pack(side="left", padx=(0, 6))
        self._boton_secundario(botones, "Abrir carpeta entrada", self.abrir_entrada)\
            .pack(side="left", padx=(0, 6))
        self._boton_secundario(botones, "Quitar selección", self.quitar_seleccion)\
            .pack(side="left")

    def _construir_panel_derecho(self, padre):
        panel = tk.Frame(padre, bg=COLOR_PANEL, highlightbackground=COLOR_BORDE,
                         highlightthickness=1)
        panel.grid(row=0, column=1, sticky="nsew", padx=(8, 0))

        tk.Label(
            panel, text="Último comprobante procesado",
            bg=COLOR_PANEL, fg=COLOR_TEXTO, font=FUENTE_TITULO, anchor="w",
        ).pack(fill="x", padx=12, pady=(10, 10))

        cuerpo = tk.Frame(panel, bg=COLOR_PANEL)
        cuerpo.pack(fill="both", expand=True, padx=16)
        cuerpo.columnconfigure(1, weight=1)

        self.campos = {}
        etiquetas = [
            ("archivo", "Archivo"),
            ("banco_app", "Banco / App"),
            ("numero_comprobante", "Comprobante No."),
            ("numero_cuenta", "Cuenta"),
            ("nombre_cliente", "Cliente"),
            ("valor_pago", "Valor"),
            ("fecha_pago", "Fecha del pago"),
            ("estado", "Estado"),
        ]
        for fila, (clave, texto) in enumerate(etiquetas):
            tk.Label(
                cuerpo, text=texto + ":", bg=COLOR_PANEL, fg=COLOR_TEXTO_SUAVE,
                font=FUENTE_DATO, anchor="e",
            ).grid(row=fila, column=0, sticky="e", padx=(0, 12), pady=5)
            fuente = FUENTE_VALOR if clave in ("valor_pago", "estado") else FUENTE_DATO
            etiqueta = tk.Label(
                cuerpo, text="—", bg=COLOR_PANEL, fg=COLOR_TEXTO,
                font=fuente, anchor="w", wraplength=320, justify="left",
            )
            etiqueta.grid(row=fila, column=1, sticky="w", pady=5)
            self.campos[clave] = etiqueta

        self.etiqueta_motivos = tk.Label(
            panel, text="", bg=COLOR_PANEL, fg=COLOR_REVISAR,
            font=FUENTE, anchor="w", wraplength=420, justify="left",
        )
        self.etiqueta_motivos.pack(fill="x", padx=16, pady=(0, 12))

    # ------------------------------------------------------------------
    # Acciones del panel izquierdo
    # ------------------------------------------------------------------
    def refrescar_lista(self):
        crear_carpetas()
        self.lista.delete(0, "end")
        imagenes = listar_imagenes()
        for imagen in imagenes:
            self.lista.insert("end", " " + imagen.name)
        total = len(imagenes)
        if total == 0:
            self.etiqueta_conteo.config(text="No hay imágenes pendientes.")
        elif total == 1:
            self.etiqueta_conteo.config(text="1 imagen pendiente.")
        else:
            self.etiqueta_conteo.config(text=f"{total} imágenes pendientes.")

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
        os.startfile(str(CARPETA_ENTRADA))

    def quitar_seleccion(self):
        indices = self.lista.curselection()
        if not indices:
            messagebox.showinfo(
                "Quitar selección",
                "Primero selecciona en la lista las imágenes que quieres quitar.",
            )
            return
        nombres = [self.lista.get(i).strip() for i in indices]
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
    # Panel derecho
    # ------------------------------------------------------------------
    def mostrar_resultado(self, fila, motivos):
        self.campos["archivo"].config(text=fila["archivo_origen"] or "—")
        self.campos["banco_app"].config(text=fila["banco_app"] or "—")
        self.campos["numero_comprobante"].config(text=fila["numero_comprobante"] or "—")
        self.campos["numero_cuenta"].config(text=fila["numero_cuenta"] or "—")
        self.campos["nombre_cliente"].config(text=fila["nombre_cliente"] or "—")
        self.campos["valor_pago"].config(text=formatear_moneda(fila["valor_pago"]))
        self.campos["fecha_pago"].config(text=fila["fecha_pago"] or "—")

        estado = fila["estado"]
        color = COLOR_OK if estado == "OK" else COLOR_REVISAR
        self.campos["estado"].config(text=estado, fg=color)
        if motivos:
            self.etiqueta_motivos.config(text="Motivos: " + "; ".join(motivos))
        else:
            self.etiqueta_motivos.config(text="")

    # ------------------------------------------------------------------
    # Procesamiento
    # ------------------------------------------------------------------
    def mostrar_estado(self, texto, color=COLOR_TEXTO_SUAVE):
        self.etiqueta_estado.config(text=texto, fg=color)

    def iniciar_procesamiento(self):
        if self.procesando:
            return

        if genai is None:
            messagebox.showerror(
                "Faltan dependencias",
                "No está instalada la librería de Google Gemini.\n"
                "Solución: haz doble clic en INSTALAR.bat y espera a que termine.",
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
        self.boton_procesar.config(state="disabled", text="PROCESANDO...")
        self.barra.config(maximum=len(imagenes), value=0)
        hilo = threading.Thread(
            target=self._procesar_en_hilo, args=(clave, imagenes), daemon=True,
        )
        hilo.start()

    def _procesar_en_hilo(self, clave, imagenes):
        """Se ejecuta en un hilo aparte. Toda actualización de la interfaz
        se envía al hilo principal con root.after."""
        total = len(imagenes)
        total_ok = total_revisar = total_error = 0

        def en_ui(funcion, *args):
            self.root.after(0, funcion, *args)

        try:
            comprobantes_existentes = cargar_comprobantes_existentes()
            cliente = genai.Client(api_key=clave)
            libro, hoja = abrir_libro()

            for indice, archivo in enumerate(imagenes, start=1):
                en_ui(self.mostrar_estado,
                      f"[{indice}/{total}] Procesando {archivo.name} ...")
                try:
                    imagen_bytes = preparar_imagen(archivo)
                    datos = extraer_datos(cliente, imagen_bytes)
                    estado, motivos = validar(datos, comprobantes_existentes)
                    fila = construir_fila(archivo, datos, estado)
                    agregar_fila(hoja, fila)
                    libro.save(ARCHIVO_XLSX)

                    if fila["numero_comprobante"]:
                        comprobantes_existentes.add(fila["numero_comprobante"])

                    if estado == "OK":
                        total_ok += 1
                        mover_imagen(archivo, CARPETA_PROCESADOS)
                    else:
                        total_revisar += 1
                        mover_imagen(archivo, CARPETA_REVISION)

                    en_ui(self.mostrar_resultado, fila, motivos)

                except Exception as error:
                    error_str = str(error).lower()
                    if ("api key" in error_str or "authenticate" in error_str
                            or "permission" in error_str):
                        en_ui(self._error_api_key)
                        break
                    total_error += 1
                    en_ui(self.mostrar_estado,
                          f"Error con {archivo.name}: {error}", COLOR_ERROR)

                en_ui(self.barra.config, {"value": indice})
                en_ui(self.refrescar_lista)

                # Pausa para respetar el límite de solicitudes por minuto
                if indice < total:
                    time.sleep(PAUSA_SEGUNDOS)

        except Exception as error:
            en_ui(self.mostrar_estado, f"Error inesperado: {error}", COLOR_ERROR)

        en_ui(self._terminar, total_ok, total_revisar, total_error)

    def _error_api_key(self):
        messagebox.showerror(
            "Clave de API no válida",
            "Gemini rechazó la clave de API. Revisa config.txt.\n\n"
            "La clave se obtiene gratis en https://aistudio.google.com/apikey",
        )

    def _terminar(self, total_ok, total_revisar, total_error):
        self.procesando = False
        self.boton_procesar.config(state="normal", text="PROCESAR")
        self.refrescar_lista()
        resumen = (f"Terminado. OK: {total_ok}  |  Para revisar: {total_revisar}"
                   f"  |  Con error: {total_error}")
        self.mostrar_estado(resumen, COLOR_TEXTO)
        messagebox.showinfo(
            "Proceso terminado",
            f"Procesados correctamente (OK): {total_ok}\n"
            f"Para revisión manual: {total_revisar}\n"
            f"Con error (quedan en entrada): {total_error}\n\n"
            "Los resultados están en salida\\comprobantes.xlsx",
        )

    # ------------------------------------------------------------------
    # Excel de resultados
    # ------------------------------------------------------------------
    def abrir_csv(self):
        if not ARCHIVO_XLSX.exists():
            messagebox.showinfo(
                "Sin resultados",
                "Todavía no existe el archivo de resultados.\n"
                "Procesa al menos un comprobante primero.",
            )
            return
        try:
            os.startfile(str(ARCHIVO_XLSX))
        except OSError as error:
            messagebox.showerror("Error", f"No se pudo abrir el Excel:\n{error}")


def main():
    crear_carpetas()
    root = tk.Tk()
    Aplicacion(root)
    root.mainloop()


if __name__ == "__main__":
    main()
