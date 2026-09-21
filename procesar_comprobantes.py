# -*- coding: utf-8 -*-
"""
Sistema de extracción de comprobantes de pago con IA — versión 1
=================================================================
Usa Google Gemini Flash (API gratuita, sin tarjeta de crédito).
Flujo: lee imágenes de "entrada", envía cada una a Gemini, extrae los datos
en JSON, valida, agrega la fila al archivo Excel y mueve la imagen.

El archivo Excel se guarda en la ruta indicada por la linea RUTA_EXCEL de
config.txt (por defecto salida/comprobantes.xlsx). Puede apuntar a una carpeta
de Google Drive compartida entre varios PCs: el libro se reabre en cada fila y
siempre se agrega al final (nunca se sobreescribe).

Uso normal: doble clic en PROCESAR.bat
"""

import io
import json
import os
import re
import shutil
import sys
import time
from datetime import datetime
from pathlib import Path

# ---------------------------------------------------------------------------
# Verificación de dependencias
# ---------------------------------------------------------------------------
try:
    from google import genai
    from google.genai import types
except ImportError:
    print("ERROR: Faltan las dependencias del sistema.")
    print("Solucion: haz doble clic en INSTALAR.bat y espera a que termine.")
    input("\nPresiona ENTER para cerrar...")
    sys.exit(1)

try:
    from PIL import Image
except ImportError:
    print("ERROR: Faltan las dependencias del sistema.")
    print("Solucion: haz doble clic en INSTALAR.bat y espera a que termine.")
    input("\nPresiona ENTER para cerrar...")
    sys.exit(1)

try:
    from openpyxl import Workbook, load_workbook
    from openpyxl.styles import Font, PatternFill
    from openpyxl.utils import column_index_from_string, get_column_letter
except ImportError:
    print("ERROR: Faltan las dependencias del sistema (openpyxl).")
    print("Solucion: abre una terminal y ejecuta: pip install openpyxl")
    input("\nPresiona ENTER para cerrar...")
    sys.exit(1)

# ---------------------------------------------------------------------------
# Configuración general
# ---------------------------------------------------------------------------
# Carpeta del programa. Si está empaquetado con PyInstaller (--onefile) es la
# carpeta del ejecutable; si no, la carpeta de este archivo .py.
if getattr(sys, "frozen", False):
    BASE = Path(sys.executable).resolve().parent
else:
    BASE = Path(__file__).resolve().parent
CARPETA_ENTRADA = BASE / "entrada"
CARPETA_PROCESADOS = BASE / "procesados"
CARPETA_REVISION = BASE / "revision_manual"
CARPETA_SALIDA = BASE / "salida"
ARCHIVO_CONFIG = BASE / "config.txt"

# Ruta del Excel si config.txt no define RUTA_EXCEL (relativa a BASE)
RUTA_EXCEL_POR_DEFECTO = "salida/comprobantes.xlsx"

# Modelo de Gemini Flash (gratuito, 1500 solicitudes/día, 15/minuto)
MODELO = "gemini-3.6-flash"

LADO_MAXIMO = 1568  # px en el lado más largo
EXTENSIONES = {".jpg", ".jpeg", ".png", ".webp"}

# Pausa entre solicitudes para respetar el límite de 15 por minuto
PAUSA_SEGUNDOS = 4.5

COLUMNAS = [
    "fecha_procesado",
    "archivo_origen",
    "banco_app",
    "numero_comprobante",
    "numero_cuenta_o_llave",
    "tipo_cuenta_o_llave",
    "nombre_cliente",
    "valor_pago",
    "fecha_pago",
    "estado",
]

# Nombres de columna de versiones anteriores -> nombre actual. Sirve para leer
# y migrar los Excel creados antes de Bre-B / llaves.
COLUMNAS_VIEJAS = {"numero_cuenta": "numero_cuenta_o_llave"}

PROMPT = """Analiza esta imagen de un comprobante de pago o transferencia colombiano.

CONTEXTO IMPORTANTE: Este comprobante es un pago que alguien le hizo a nuestro negocio. Necesitamos los datos de QUIEN ENVIÓ el dinero (el remitente/origen), NO de quien lo recibe (el destino somos nosotros).

Extrae los datos y responde ÚNICAMENTE con un objeto JSON válido:

{
  "banco_app": "string - la app o plataforma desde donde se hizo el pago",
  "numero_comprobante": "string alfanumérico tal como aparece, o null",
  "numero_cuenta_o_llave": "string - cuenta, celular o llave del REMITENTE tal como aparece, o null",
  "tipo_cuenta_o_llave": "string - 'Cuenta de Ahorros' | 'Cuenta Corriente' | 'Celular' | 'Llave alias' | 'Llave documento' | 'Llave correo' | 'Deposito' | 'Otro' | null",
  "nombre_cliente": "string - nombre del REMITENTE (quien envía el dinero), o null",
  "valor_pago": entero en pesos sin decimales, o null,
  "fecha_pago": "AAAA-MM-DD, o null"
}

GUÍA POR APLICACIÓN:

Bancolombia (transferencia tradicional):
- Comprobante: "Comprobante No." (solo dígitos, ej: 0000032700)
- REMITENTE: está en "Producto origen" — el nombre y la cuenta del que envía
- DESTINO (ignorar para nombre_cliente): está en "Producto destino"
- Si solo se ve el destino y no el origen, el nombre_cliente es null

Nequi:
- Comprobante: "Referencia" (alfanumérico, ej: M12170909)
- banco_app: "Nequi"
- Si aparece "Llave" con @ es una llave alias de Bre-B (ej: @Pzt579)
- El celular del remitente aparece en "¿Desde dónde se hizo el envío?"
- El nombre suele estar parcialmente oculto con asteriscos

Bre-B (Bancolombia u otra entidad):
- Comprobante: "Comprobante No." (alfanumérico, ej: TR2AgRVd5REC)
- banco_app: "Bre-B" seguido de la entidad si se identifica
- La cuenta origen puede aparecer parcialmente oculta (ej: *6318)
- Los nombres suelen estar ocultos con asteriscos (ej: Jua*** Jos***)

Bold / Bold CF:
- Comprobante: "ID de transacción" (alfanumérico, ej: QUO102IFI4)
- banco_app: "Bold"
- REMITENTE: está en "Origen" — nombre (Dueño) y cuenta (Número de cuenta)
- DESTINO (ignorar): está en "Destino"

Daviplata:
- Comprobante: "No. de aprobación" (dígitos)
- banco_app: "Daviplata"
- La cuenta suele ser un celular de 10 dígitos

PSE u otros:
- Extraer lo que sea visible siguiendo la misma lógica: datos del REMITENTE

SISTEMA DE LLAVES Bre-B EN COLOMBIA:
Las llaves son identificadores únicos para recibir/enviar dinero entre cualquier banco. Tipos:
1. Celular (10 dígitos, empieza en 3)
2. Documento de identidad (cédula)
3. Correo electrónico
4. Alias alfanumérico (empieza con @, ej: @Pzt579)
5. Código de comercio
Si aparece una llave en el comprobante, ponla en numero_cuenta_o_llave y el tipo en tipo_cuenta_o_llave.

REGLAS ESTRICTAS:
1. NUNCA inventes ni completes datos. Si un dato no es legible o no aparece, usa null.
2. numero_comprobante: puede ser numérico O alfanumérico. Transcríbelo exactamente como aparece.
3. numero_cuenta_o_llave: acepta dígitos, celulares, llaves alfanuméricas (@algo), cuentas parcialmente ocultas (*6318). Transcribe exactamente como aparece.
4. nombre_cliente: el nombre del REMITENTE. Si está oculto con asteriscos, transcríbelo así (ej: "Jua*** Jos*** Vil***"). Si solo aparece el nombre del DESTINO y no del remitente, pon null.
5. valor_pago: entero en pesos colombianos, sin puntos, comas ni $. Ejemplo: 150000.
6. fecha_pago: formato AAAA-MM-DD."""


# ---------------------------------------------------------------------------
# Errores
# ---------------------------------------------------------------------------
class ExcelBloqueadoError(Exception):
    """El archivo Excel está abierto en otro programa (PermissionError)."""

    MENSAJE = "Cierra el archivo Excel y vuelve a intentar"

    def __init__(self, ruta=None):
        self.ruta = Path(ruta) if ruta is not None else None
        super().__init__(self.MENSAJE)

    def __str__(self):
        return self.MENSAJE


# ---------------------------------------------------------------------------
# Funciones auxiliares
# ---------------------------------------------------------------------------
def leer_ruta_excel():
    """Devuelve la ruta (Path) del Excel según la línea RUTA_EXCEL= de config.txt.

    Se lee en cada llamada, así los cambios en config.txt aplican sin reiniciar.
    Si no hay config.txt, falta la línea o está vacía, usa RUTA_EXCEL_POR_DEFECTO.
    Las rutas relativas se resuelven respecto a la carpeta del programa.
    Crea las carpetas padre; si no se puede, lanza OSError con un mensaje claro.
    """
    valor = ""
    if ARCHIVO_CONFIG.exists():
        for linea in ARCHIVO_CONFIG.read_text(encoding="utf-8-sig").splitlines():
            linea = linea.strip()
            if linea.startswith("#") or "=" not in linea:
                continue
            clave, contenido = linea.split("=", 1)
            if clave.strip() == "RUTA_EXCEL":
                valor = contenido.strip().strip('"').strip("'").strip()
                break
    if not valor:
        valor = RUTA_EXCEL_POR_DEFECTO

    ruta = Path(os.path.expandvars(os.path.expanduser(valor)))
    if not ruta.is_absolute():
        ruta = BASE / ruta

    try:
        ruta.parent.mkdir(parents=True, exist_ok=True)
    except OSError as error:
        raise OSError(
            f"No se pudo crear o acceder a la carpeta del archivo Excel: {ruta.parent}\n"
            f"Ruta configurada (RUTA_EXCEL en config.txt): {ruta}\n"
            "Verifica que la ruta sea correcta y que la unidad (por ejemplo "
            f"Google Drive) este disponible. Detalle: {error}"
        ) from error
    return ruta


def leer_api_key():
    """Lee la clave de API desde config.txt."""
    if not ARCHIVO_CONFIG.exists():
        print("ERROR: No se encontro el archivo config.txt.")
        print("Debe estar en la misma carpeta que este programa.")
        return None
    for linea in ARCHIVO_CONFIG.read_text(encoding="utf-8-sig").splitlines():
        linea = linea.strip()
        if linea.startswith("#") or "=" not in linea:
            continue
        clave, valor = linea.split("=", 1)
        if clave.strip() == "API_KEY":
            valor = valor.strip()
            if not valor or "PEGA_AQUI" in valor:
                print("ERROR: Falta configurar la clave de API.")
                print("Abre config.txt con el Bloc de notas y pega tu clave")
                print("despues de API_KEY= (la clave empieza con AIza...).")
                print("Se obtiene gratis en https://aistudio.google.com/apikey")
                return None
            return valor
    print("ERROR: config.txt no contiene la linea API_KEY=.")
    return None


def crear_carpetas():
    for carpeta in (CARPETA_ENTRADA, CARPETA_PROCESADOS, CARPETA_REVISION, CARPETA_SALIDA):
        carpeta.mkdir(exist_ok=True)


def listar_imagenes():
    return sorted(
        p for p in CARPETA_ENTRADA.iterdir()
        if p.is_file() and p.suffix.lower() in EXTENSIONES
    )


def mapear_columnas(encabezados):
    """Devuelve {columna: posicion desde 0} según la fila de encabezados del Excel.

    Reconoce también los nombres viejos (COLUMNAS_VIEJAS). Las columnas que no
    estén en el encabezado no aparecen en el resultado. Si no se reconoce
    ningún encabezado, devuelve el orden de COLUMNAS.
    """
    posiciones = {}
    for indice, valor in enumerate(encabezados or ()):
        nombre = "" if valor is None else str(valor).strip().lower()
        nombre = COLUMNAS_VIEJAS.get(nombre, nombre)
        if nombre in COLUMNAS and nombre not in posiciones:
            posiciones[nombre] = indice
    if not posiciones:
        return {columna: indice for indice, columna in enumerate(COLUMNAS)}
    return posiciones


def cargar_comprobantes_existentes(ruta=None):
    """Lee el Excel existente y devuelve el conjunto de comprobantes ya registrados."""
    ruta = leer_ruta_excel() if ruta is None else Path(ruta)
    existentes = set()
    try:
        if ruta.exists():
            libro = load_workbook(ruta, read_only=True)
            try:
                hoja = libro.active
                # La columna se ubica por el nombre del encabezado, así sirve
                # para archivos con el orden de columnas viejo o nuevo.
                encabezados = next(hoja.iter_rows(max_row=1, values_only=True), ())
                indice = mapear_columnas(encabezados).get(
                    "numero_comprobante", COLUMNAS.index("numero_comprobante"))
                for fila in hoja.iter_rows(min_row=2, values_only=True):
                    if fila and len(fila) > indice and fila[indice] is not None:
                        numero = str(fila[indice]).strip()
                        if numero:
                            existentes.add(numero)
            finally:
                libro.close()
    except PermissionError as error:
        raise ExcelBloqueadoError(ruta) from error
    return existentes


# ---------------------------------------------------------------------------
# Escritura del archivo Excel
# ---------------------------------------------------------------------------
RELLENO_ENCABEZADO = PatternFill("solid", fgColor="16213E")
FUENTE_ENCABEZADO = Font(bold=True, color="FFFFFF")
RELLENO_OK = PatternFill("solid", fgColor="C8E6C9")       # verde claro
RELLENO_REVISAR = PatternFill("solid", fgColor="FFF9C4")  # amarillo claro


def _ajustar_anchos(hoja, valores):
    """Ensancha cada columna si el valor nuevo es más largo que el ancho actual.
    'valores' son pares (numero de columna desde 1, valor)."""
    for numero, valor in valores:
        letra = get_column_letter(numero)
        ancho = len(str(valor)) + 3
        actual = hoja.column_dimensions[letra].width or 0
        if ancho > actual:
            hoja.column_dimensions[letra].width = ancho


def _escribir_encabezado(hoja, numero_columna, nombre):
    """Escribe un encabezado formateado en la fila 1 y ajusta el ancho."""
    celda = hoja.cell(row=1, column=numero_columna, value=nombre)
    celda.font = FUENTE_ENCABEZADO
    celda.fill = RELLENO_ENCABEZADO
    _ajustar_anchos(hoja, [(numero_columna, nombre)])


def _escribir_encabezados(hoja):
    """Escribe en la fila 1 todos los encabezados de COLUMNAS, formateados."""
    for numero, columna in enumerate(COLUMNAS, start=1):
        _escribir_encabezado(hoja, numero, columna)


def _anchos_por_columna(hoja):
    """Devuelve {numero de columna: ancho}. Excel agrupa columnas contiguas
    del mismo ancho en un solo rango (min-max); aquí se separan."""
    anchos = {}
    for letra, dimension in hoja.column_dimensions.items():
        if dimension.width is None:
            continue
        inicio = dimension.min or column_index_from_string(letra)
        fin = min(dimension.max or inicio, hoja.max_column)
        for numero in range(inicio, fin + 1):
            anchos[numero] = dimension.width
    return anchos


def _migrar_columnas_viejas(hoja):
    """Actualiza un Excel creado con las columnas de versiones anteriores.

    Renombra los encabezados viejos (COLUMNAS_VIEJAS) e inserta la columna
    tipo_cuenta_o_llave justo después de numero_cuenta_o_llave; las filas
    viejas quedan con esa celda vacía. Si el archivo ya está al día no toca
    nada. Devuelve True si hubo cambios (se guardan junto con la fila nueva).
    """
    cambios = False
    encabezados = {}
    for celda in hoja[1]:
        nombre = "" if celda.value is None else str(celda.value).strip().lower()
        if nombre in COLUMNAS_VIEJAS:
            nombre = COLUMNAS_VIEJAS[nombre]
            celda.value = nombre
            _ajustar_anchos(hoja, [(celda.column, nombre)])
            cambios = True
        encabezados.setdefault(nombre, celda.column)

    columna_cuenta = encabezados.get("numero_cuenta_o_llave")
    if columna_cuenta is None or "tipo_cuenta_o_llave" in encabezados:
        return cambios

    # insert_cols mueve las celdas con su formato (rellenos, #,##0), pero NO
    # los anchos de columna: se guardan antes y se reubican después.
    posicion = columna_cuenta + 1
    anchos = _anchos_por_columna(hoja)
    hoja.insert_cols(posicion)
    hoja.column_dimensions.clear()
    for numero, ancho in anchos.items():
        destino = numero if numero < posicion else numero + 1
        hoja.column_dimensions[get_column_letter(destino)].width = ancho
    _escribir_encabezado(hoja, posicion, "tipo_cuenta_o_llave")
    return True


def abrir_libro(ruta=None):
    """Abre el Excel configurado, o crea un libro nuevo con los encabezados formateados.
    Si el archivo existe y tiene las columnas viejas, las migra (ver arriba)."""
    ruta = leer_ruta_excel() if ruta is None else Path(ruta)
    if ruta.exists():
        libro = load_workbook(ruta)
        hoja = libro.active
        if hoja.max_row == 1 and all(celda.value is None for celda in hoja[1]):
            _escribir_encabezados(hoja)  # hoja vacía: se le ponen los encabezados
        else:
            _migrar_columnas_viejas(hoja)
        return libro, hoja
    libro = Workbook()
    hoja = libro.active
    hoja.title = "Comprobantes"
    _escribir_encabezados(hoja)
    return libro, hoja


def agregar_fila(hoja, fila):
    """Agrega la fila (dict) al final de la hoja y aplica los formatos.

    Cada valor se escribe en la columna cuyo encabezado coincide por nombre,
    no por posición. Si al Excel le falta alguna columna, se agrega al final.
    """
    encabezados = [celda.value for celda in hoja[1]]
    posiciones = mapear_columnas(encabezados)
    for columna in COLUMNAS:
        if columna not in posiciones:
            posiciones[columna] = hoja.max_column
            _escribir_encabezado(hoja, hoja.max_column + 1, columna)

    numero_fila = hoja.max_row + 1
    valores = []
    for columna in COLUMNAS:
        numero = posiciones[columna] + 1
        celda = hoja.cell(row=numero_fila, column=numero, value=fila.get(columna, ""))
        valores.append((numero, celda.value))
        if columna == "valor_pago":
            celda.number_format = "#,##0"
        elif columna == "estado":
            celda.fill = RELLENO_OK if fila.get("estado") == "OK" else RELLENO_REVISAR

    _ajustar_anchos(hoja, valores)


def agregar_y_guardar(fila, ruta=None):
    """Agrega la fila (dict) al final del Excel y lo guarda.

    Reabre el archivo en cada llamada para no perder filas que otro PC haya
    agregado entre medio (p. ej. en una carpeta compartida de Google Drive).
    Si el archivo no existe, lo crea con encabezados. Nunca sobreescribe un
    archivo existente con un libro nuevo. PermissionError -> ExcelBloqueadoError.
    """
    ruta = leer_ruta_excel() if ruta is None else Path(ruta)
    try:
        if not ruta.exists():
            ruta.parent.mkdir(parents=True, exist_ok=True)
        libro, hoja = abrir_libro(ruta)
        try:
            agregar_fila(hoja, fila)
            libro.save(ruta)
        finally:
            libro.close()
    except PermissionError as error:
        raise ExcelBloqueadoError(ruta) from error


def preparar_imagen(ruta):
    """Abre la imagen, la convierte a RGB, la reduce a 1568px máximo.
    Devuelve los bytes JPEG y el mime type."""
    img = Image.open(ruta)
    if img.mode != "RGB":
        img = img.convert("RGB")
    if max(img.size) > LADO_MAXIMO:
        img.thumbnail((LADO_MAXIMO, LADO_MAXIMO), Image.LANCZOS)
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", quality=85)
    return buffer.getvalue()


def extraer_datos(cliente, imagen_bytes):
    """Envía la imagen a Gemini y devuelve el diccionario con los datos."""
    respuesta = cliente.models.generate_content(
        model=MODELO,
        contents=[
            types.Content(
                role="user",
                parts=[
                    types.Part.from_bytes(
                        data=imagen_bytes,
                        mime_type="image/jpeg",
                    ),
                    types.Part.from_text(text=PROMPT),
                ],
            )
        ],
        config=types.GenerateContentConfig(
            temperature=0,
            # El modelo usa tokens de razonamiento que cuentan contra este
            # límite; 600 no alcanza y la respuesta sale cortada (MAX_TOKENS).
            max_output_tokens=2000,
            response_mime_type="application/json",
        ),
    )
    texto = respuesta.text or ""
    if not texto.strip():
        raise ValueError("El modelo devolvio una respuesta vacia.")
    return parsear_json(texto)


def parsear_json(texto):
    """Extrae el objeto JSON de la respuesta, tolerando marcas de código."""
    texto = texto.strip()
    # Quitar marcas ```json ... ```
    texto = re.sub(r"^```(?:json)?\s*", "", texto)
    texto = re.sub(r"\s*```$", "", texto)
    inicio, fin = texto.find("{"), texto.rfind("}")
    if inicio == -1 or fin == -1:
        raise ValueError("La respuesta del modelo no contiene JSON.")
    return json.loads(texto[inicio : fin + 1])


def limpiar_texto(valor):
    if valor is None:
        return ""
    return str(valor).strip()


def normalizar_valor(valor):
    """Convierte el valor del pago a entero, tolerando formatos como '150.000'."""
    if valor is None:
        return None
    if isinstance(valor, (int, float)):
        return int(valor)
    digitos = re.sub(r"[^\d]", "", str(valor))
    return int(digitos) if digitos else None


def fecha_valida(texto):
    try:
        datetime.strptime(texto, "%Y-%m-%d")
        return True
    except (ValueError, TypeError):
        return False


def leer_cuenta_o_llave(datos):
    """Cuenta, celular o llave del remitente. Si el modelo devolviera todavía
    la clave vieja numero_cuenta, se usa como respaldo."""
    cuenta = limpiar_texto(datos.get("numero_cuenta_o_llave"))
    return cuenta or limpiar_texto(datos.get("numero_cuenta"))


def validar(datos, comprobantes_existentes):
    """Aplica validaciones. Devuelve (estado, lista de motivos).

    numero_comprobante puede ser alfanumérico y numero_cuenta_o_llave acepta
    dígitos, celulares, llaves (@alias, correo) y cuentas parciales (*6318):
    solo se exige que existan. tipo_cuenta_o_llave es informativo y no se valida.
    """
    motivos = []
    comprobante = limpiar_texto(datos.get("numero_comprobante"))
    cuenta = leer_cuenta_o_llave(datos)
    nombre = limpiar_texto(datos.get("nombre_cliente"))
    valor = normalizar_valor(datos.get("valor_pago"))
    fecha = limpiar_texto(datos.get("fecha_pago"))

    if not comprobante:
        motivos.append("falta el numero de comprobante")
    elif comprobante in comprobantes_existentes:
        motivos.append("comprobante ya registrado antes (posible pago duplicado)")

    if not cuenta:
        motivos.append("falta el numero de cuenta o llave")

    if not nombre:
        motivos.append("falta el nombre del cliente")
    elif "*" in nombre:
        motivos.append("nombre parcialmente oculto en el comprobante")

    if valor is None or valor <= 0:
        motivos.append("falta el valor del pago o no es valido")

    if not fecha:
        motivos.append("falta la fecha del pago")
    elif not fecha_valida(fecha):
        motivos.append("la fecha no tiene el formato esperado")

    estado = "OK" if not motivos else "REVISAR"
    return estado, motivos


def construir_fila(archivo, datos, estado):
    valor = normalizar_valor(datos.get("valor_pago"))
    return {
        "fecha_procesado": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "archivo_origen": archivo.name,
        "banco_app": limpiar_texto(datos.get("banco_app")),
        "numero_comprobante": limpiar_texto(datos.get("numero_comprobante")),
        "numero_cuenta_o_llave": leer_cuenta_o_llave(datos),
        "tipo_cuenta_o_llave": limpiar_texto(datos.get("tipo_cuenta_o_llave")),
        "nombre_cliente": limpiar_texto(datos.get("nombre_cliente")),
        "valor_pago": valor if valor is not None else "",
        "fecha_pago": limpiar_texto(datos.get("fecha_pago")),
        "estado": estado,
    }


def mover_imagen(archivo, destino_dir):
    destino = destino_dir / archivo.name
    if destino.exists():
        marca = datetime.now().strftime("%Y%m%d%H%M%S")
        destino = destino_dir / f"{archivo.stem}_{marca}{archivo.suffix}"
    shutil.move(str(archivo), str(destino))


# ---------------------------------------------------------------------------
# Programa principal
# ---------------------------------------------------------------------------
def main():
    print("=" * 58)
    print("  SISTEMA DE EXTRACCION DE COMPROBANTES — version 1")
    print("  Motor: Google Gemini Flash (gratuito)")
    print("=" * 58)
    print()

    crear_carpetas()

    try:
        ruta_excel = leer_ruta_excel()
    except OSError as error:
        print(f"ERROR: {error}")
        input("\nPresiona ENTER para cerrar...")
        return
    print(f"El Excel se guardara en: {ruta_excel}\n")

    clave = leer_api_key()
    if not clave:
        input("\nPresiona ENTER para cerrar...")
        return

    imagenes = listar_imagenes()
    if not imagenes:
        print("No hay imagenes para procesar.")
        print('Guarda los comprobantes (jpg, png o webp) en la carpeta "entrada"')
        print("y vuelve a hacer doble clic en PROCESAR.bat.")
        input("\nPresiona ENTER para cerrar...")
        return

    total = len(imagenes)
    print(f"Se encontraron {total} imagenes para procesar.\n")

    if total > 1500:
        print("ADVERTENCIA: Gemini gratis permite hasta 1,500 solicitudes por dia.")
        print(f"Tienes {total} imagenes. Se procesaran las primeras 1,500 hoy.\n")

    try:
        comprobantes_existentes = cargar_comprobantes_existentes(ruta_excel)
    except ExcelBloqueadoError as error:
        print(f"ERROR: {error}")
        print(f"Archivo: {error.ruta}")
        input("\nPresiona ENTER para cerrar...")
        return
    cliente = genai.Client(api_key=clave)

    total_ok = total_revisar = total_error = 0

    for indice, archivo in enumerate(imagenes, start=1):
        if indice > 1500:
            print(f"\nSe alcanzo el limite diario de 1,500. Continua manana.")
            break

        print(f"[{indice}/{total}] {archivo.name} ... ", end="", flush=True)
        try:
            imagen_bytes = preparar_imagen(archivo)
            datos = extraer_datos(cliente, imagen_bytes)
            estado, motivos = validar(datos, comprobantes_existentes)
            fila = construir_fila(archivo, datos, estado)
            # Se guarda antes de mover la imagen: si falla, la imagen sigue en "entrada"
            agregar_y_guardar(fila, ruta_excel)

            if fila["numero_comprobante"]:
                comprobantes_existentes.add(fila["numero_comprobante"])

            if estado == "OK":
                total_ok += 1
                mover_imagen(archivo, CARPETA_PROCESADOS)
                print("[OK]")
            else:
                total_revisar += 1
                mover_imagen(archivo, CARPETA_REVISION)
                print("[REVISAR] -> " + "; ".join(motivos))

            # Pausa para respetar límite de 15 solicitudes/minuto
            if indice < total:
                time.sleep(PAUSA_SEGUNDOS)

        except ExcelBloqueadoError as error:
            # Debe ir antes del except generico: un PermissionError contiene
            # "permission" y se confundiria con una clave de API invalida.
            total_error += 1
            print("[ERROR]")
            print(f"\n{error}")
            print(f"Archivo: {error.ruta}")
            print("La imagen se queda en 'entrada'. Se detiene el procesamiento.")
            break
        except Exception as error:
            error_str = str(error).lower()
            if "api key" in error_str or "authenticate" in error_str or "permission" in error_str:
                print("[ERROR]")
                print("\nLa clave de API no es valida. Revisa config.txt.")
                print("La clave se obtiene gratis en https://aistudio.google.com/apikey")
                break
            elif "429" in error_str or "resource" in error_str or "quota" in error_str:
                print("[ESPERA]")
                print("   Se alcanzo el limite por minuto. Esperando 60 segundos...")
                time.sleep(60)
                # Reintentar esta imagen
                try:
                    imagen_bytes = preparar_imagen(archivo)
                    datos = extraer_datos(cliente, imagen_bytes)
                    estado, motivos = validar(datos, comprobantes_existentes)
                    fila = construir_fila(archivo, datos, estado)
                    agregar_y_guardar(fila, ruta_excel)
                    if fila["numero_comprobante"]:
                        comprobantes_existentes.add(fila["numero_comprobante"])
                    if estado == "OK":
                        total_ok += 1
                        mover_imagen(archivo, CARPETA_PROCESADOS)
                        print(f"   Reintento {archivo.name} ... [OK]")
                    else:
                        total_revisar += 1
                        mover_imagen(archivo, CARPETA_REVISION)
                        print(f"   Reintento {archivo.name} ... [REVISAR]")
                except ExcelBloqueadoError as error_excel:
                    total_error += 1
                    print(f"\n{error_excel}")
                    print(f"Archivo: {error_excel.ruta}")
                    print("La imagen se queda en 'entrada'. Se detiene el procesamiento.")
                    break
                except Exception:
                    total_error += 1
                    print(f"   Reintento fallido. La imagen queda en 'entrada'.")
            else:
                total_error += 1
                print(f"[ERROR] -> {error}")
                print("   La imagen se queda en 'entrada' para reintentar luego.")

    print()
    print("-" * 58)
    print("RESUMEN")
    print(f"  Procesados correctamente (OK): {total_ok}")
    print(f"  Para revision manual:          {total_revisar}")
    print(f"  Con error (quedan en entrada): {total_error}")
    print()
    print(f"Resultados guardados en: {ruta_excel} (abrelo con Excel)")
    if total_revisar:
        print('Las imagenes dudosas estan en la carpeta "revision_manual".')
    input("\nPresiona ENTER para cerrar...")


if __name__ == "__main__":
    main()
