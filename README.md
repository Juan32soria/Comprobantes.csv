# Extractor de Comprobantes de Pago

Sistema que extrae automáticamente los datos de comprobantes de pago colombianos (Bancolombia, Nequi, Daviplata) usando inteligencia artificial (Google Gemini Flash) y los organiza en un archivo Excel.

## ¿Qué hace?

Recibe imágenes de comprobantes de pago (fotos o capturas de pantalla) y extrae automáticamente:

- Banco o app de origen (Bancolombia, Nequi, Daviplata)
- Número de comprobante
- Número de cuenta
- Nombre del cliente
- Valor del pago
- Fecha del pago

Los datos se guardan en un archivo Excel con formato profesional (`salida/comprobantes.xlsx`).

## Capacidad del sistema

El sistema usa el plan gratuito de Google Gemini, con estos límites:

| Concepto | Límite / Valor |
|---|---|
| Máximo por día | 1.500 comprobantes |
| Máximo por minuto | 15 (el sistema lo controla automáticamente con pausas de 4,5 segundos) |
| Máximo por mes | ~45.000 (más que suficiente) |
| Tiempo promedio por comprobante | ~5 segundos |
| Tiempo para procesar 100 comprobantes | ~8 minutos |
| Tiempo para procesar 500 comprobantes | ~40 minutos |
| Costo | $0 (gratis) |

> **Nota:** Si procesan más de 1.500 comprobantes en un día, el sistema se detiene y las imágenes restantes quedan en la carpeta `entrada` para procesarse al día siguiente.

## Instalación (solo la primera vez)

### 🐍 Paso 1: Instalar Python

Descargar de [python.org/downloads](https://www.python.org/downloads/).

> ⚠️ **IMPORTANTE:** marcar la casilla **"Add Python to PATH"** al instalar.

### 📦 Paso 2: Instalar dependencias

Doble clic en `INSTALAR.bat` y esperar a que termine.

### 🔑 Paso 3: Obtener la clave de API (gratis, sin tarjeta de crédito)

1. Entrar a https://aistudio.google.com/apikey con una cuenta de Google (Gmail)
2. Clic en **"Create API Key"**
3. Copiar la clave (empieza con `AIza...`)

### ⚙️ Paso 4: Configurar la clave

Abrir `config.txt` con el Bloc de notas, reemplazar `PEGA_AQUI_TU_CLAVE` por la clave copiada, y guardar.

## Uso diario

Hay dos formas de usar el sistema:

### Opción A: Interfaz gráfica (recomendada) 🖥️

1. Doble clic en `ABRIR.bat`
2. Agregar imágenes con el botón **"Agregar imágenes"** o copiarlas a la carpeta `entrada`
3. Clic en **PROCESAR**
4. Clic en **"Abrir Excel"** para ver los resultados

### Opción B: Línea de comandos ⌨️

1. Copiar las imágenes a la carpeta `entrada`
2. Doble clic en `PROCESAR.bat`
3. Abrir `salida/comprobantes.xlsx` con Excel

## Estructura de carpetas

```
extractor-comprobantes/
├── ABRIR.bat                  → abre la interfaz gráfica
├── PROCESAR.bat               → procesa sin interfaz (para avanzados)
├── INSTALAR.bat               → instala dependencias (solo una vez)
├── config.txt                 → clave de API (⚠️ NO compartir)
├── entrada/                   → aquí van las imágenes nuevas
├── procesados/                → aquí se mueven las imágenes que salieron OK (automático)
├── revision_manual/           → aquí van las que necesitan revisión (automático)
└── salida/
    └── comprobantes.xlsx      → archivo Excel con todos los datos extraídos
```

## Estados de los comprobantes

| Estado | Color | Significado |
|---|---|---|
| **OK** | 🟢 Verde | Todos los datos se extrajeron correctamente |
| **REVISAR** | 🟡 Amarillo | Falta algún dato, está oculto, o el comprobante parece duplicado. Hay que verificarlo manualmente. |

## Solución de problemas

| Problema | Solución |
|---|---|
| "Faltan las dependencias" | Doble clic en `INSTALAR.bat` |
| "Falta configurar la clave de API" | Revisar `config.txt` |
| "La clave no es válida" | La clave está mal copiada o fue revocada. Generar una nueva en https://aistudio.google.com/apikey |
| La interfaz no aparece | Buscar la ventana en la barra de tareas de Windows |
| El Excel no abre / da error al guardar | Cerrar Excel antes de procesar |

## Instalar en otro computador

1. Copiar toda la carpeta al otro PC
2. Instalar Python (con **"Add Python to PATH"**)
3. Doble clic en `INSTALAR.bat`
4. La clave en `config.txt` es la misma para todos los equipos

## Nota sobre privacidad

En el plan gratuito de Gemini, Google puede usar los datos enviados para mejorar sus productos. Si se necesita mayor privacidad, se puede migrar a una API de pago donde los datos no se usan para entrenamiento.
