<div align="center">

# 🧾 Extractor de Comprobantes de Pago

### Convierte fotos de comprobantes en un Excel organizado, automáticamente y gratis

![Python](https://img.shields.io/badge/Python-3.8+-blue)
![Gemini](https://img.shields.io/badge/AI-Gemini_Flash-orange)
![Costo](https://img.shields.io/badge/Costo-Gratis-green)
![Plataforma](https://img.shields.io/badge/Plataforma-Windows-lightgrey)
![Idioma](https://img.shields.io/badge/Idioma-Español-red)

</div>

---

## 🤔 ¿Qué hace este sistema?

Recibe **imágenes de comprobantes de pago colombianos** (fotos o capturas de pantalla de **Bancolombia, Nequi y Daviplata**) y usa inteligencia artificial (Google Gemini Flash) para extraer automáticamente:

| Dato | Ejemplo |
|---|---|
| 🏦 Banco o app | Bancolombia |
| 🔢 Número de comprobante | 154145150 |
| 💳 Número de cuenta | 2440010654 |
| 👤 Nombre del cliente | Julio Hernandez |
| 💰 Valor del pago | $30.000 |
| 📅 Fecha del pago | 2026-08-15 |

Todo queda guardado en un **archivo Excel con formato profesional** (por defecto `salida/comprobantes.xlsx`, la ruta se puede cambiar en `config.txt`) — con colores según el estado de cada comprobante y detección de pagos duplicados.

---

## 📊 Capacidad del sistema

Funciona con el **plan gratuito** de Google Gemini:

| Concepto | Límite / Valor |
|---|---|
| 📆 Máximo por día | **1.500 comprobantes** |
| ⏱️ Máximo por minuto | **15** (el sistema lo controla solo, con pausas de 4,5 segundos) |
| 🗓️ Máximo por mes | **~45.000** (más que suficiente) |
| ⚡ Tiempo por comprobante | ~5 segundos |
| 🕐 100 comprobantes | ~8 minutos |
| 🕒 500 comprobantes | ~40 minutos |
| 💵 Costo | **$0 — gratis** |

> 💡 **Nota:** Si procesan más de 1.500 comprobantes en un día, el sistema se detiene y las imágenes restantes quedan en la carpeta `entrada` para procesarse al día siguiente.

---

## 🛠️ Instalación (solo la primera vez)

### 🪟 En Windows

#### 1️⃣ Instalar Python

> 🐍 Descargar de [python.org/downloads](https://www.python.org/downloads/) e instalar.
>
> ⚠️ **MUY IMPORTANTE:** antes de dar clic en "Install Now", marcar la casilla **"Add Python to PATH"**.

#### 2️⃣ Instalar las dependencias

> 📦 Doble clic en **`INSTALAR.bat`** y esperar a que termine. Solo se hace una vez.

#### 3️⃣ Obtener la clave de API (gratis, sin tarjeta de crédito)

> 🔑 1. Entrar a **https://aistudio.google.com/apikey** con una cuenta de Google (Gmail)
> 2. Clic en **"Create API Key"**
> 3. Copiar la clave (empieza con `AIza...`)

#### 4️⃣ Configurar la clave

> ⚙️ Si no existe **`config.txt`**, hacer una copia de **`config.ejemplo.txt`** y renombrarla a `config.txt`.
>
> Abrir **`config.txt`** con el Bloc de notas, reemplazar `PEGA_AQUI_TU_CLAVE` por la clave copiada, y **guardar**.
>
> 📂 La línea `RUTA_EXCEL` indica dónde se guarda el Excel (por defecto `salida/comprobantes.xlsx`). Ver [Compartir el Excel entre varios PCs con Google Drive](#-compartir-el-excel-entre-varios-pcs-con-google-drive).
>
> 🔒 Esa clave es como una contraseña: **no compartirla** con nadie.

### 🍎 En Mac (macOS)

Mac ya trae Python instalado. Si no lo tiene, se descarga de [python.org/downloads](https://www.python.org/downloads/).

> 1️⃣ Descargar o clonar el repositorio
>
> 2️⃣ Abrir **Terminal**, navegar a la carpeta del proyecto y ejecutar: `chmod +x *.sh *.command`
>
> 3️⃣ Doble clic en **`INSTALAR.command`** (o ejecutar `./INSTALAR.sh` en Terminal)
>
> 4️⃣ Copiar `config.ejemplo.txt` como `config.txt` (`cp config.ejemplo.txt config.txt`), obtener la API key gratis en [aistudio.google.com/apikey](https://aistudio.google.com/apikey) y pegarla en `config.txt`
>
> 5️⃣ Para uso diario: doble clic en **`ABRIR.command`** (interfaz gráfica) o **`PROCESAR.command`** (terminal)

> 💡 **Nota:** en la primera ejecución Mac puede pedir autorización. Ir a **Configuración > Privacidad y Seguridad** > permitir la ejecución.

---

## 📱 Uso diario

### 🖥️ Opción A: Interfaz gráfica (recomendada)

> 1️⃣ Doble clic en **`ABRIR.bat`**
>
> 2️⃣ Agregar imágenes con el botón **"Agregar imágenes"** (o copiarlas a la carpeta `entrada`)
>
> 3️⃣ Clic en el botón rojo **PROCESAR**
>
> 4️⃣ Clic en **"Abrir Excel"** para ver los resultados

### ⌨️ Opción B: Terminal (para avanzados)

> 1️⃣ Copiar las imágenes a la carpeta **`entrada`**
>
> 2️⃣ Doble clic en **`PROCESAR.bat`**
>
> 3️⃣ Abrir **`salida/comprobantes.xlsx`** con Excel (o la ruta configurada en `RUTA_EXCEL`)

---

## 📂 Compartir el Excel entre varios PCs con Google Drive

Varios computadores pueden guardar sus comprobantes en **el mismo Excel** usando una carpeta compartida de Google Drive:

> 1️⃣ Instalar **Google Drive para escritorio**: [google.com/intl/es/drive/download](https://www.google.com/intl/es/drive/download/)
>
> 2️⃣ Crear una carpeta en Google Drive (ej: **`Comprobantes`**) y **compartirla** con los demás usuarios
>
> 3️⃣ Abrir **`config.txt`** y cambiar `RUTA_EXCEL` por la ruta local de esa carpeta de Google Drive:
>
> 🪟 Windows: `RUTA_EXCEL=G:\Mi unidad\Comprobantes\comprobantes.xlsx`
>
> 🍎 Mac: `RUTA_EXCEL=/Users/tunombre/Google Drive/Mi unidad/Comprobantes/comprobantes.xlsx`
>
> 4️⃣ Listo — todos los PCs que apunten a la misma carpeta ven **el mismo Excel actualizado**. Cada comprobante se **agrega al final**, nunca se sobreescribe.

> ⚠️ **Importante:** no abrir el Excel mientras se está procesando. Si está abierto, el programa avisa **"Cierra el archivo Excel y vuelve a intentar"** y la imagen se queda en la carpeta `entrada` para reintentar.

---

## 📁 Estructura de carpetas

```
extractor-comprobantes/
├── ABRIR.bat              → 🖥️ abre la interfaz gráfica
├── PROCESAR.bat           → ⌨️ procesa desde la terminal (avanzados)
├── INSTALAR.bat           → 📦 instala dependencias (solo una vez)
├── config.ejemplo.txt     → 📝 plantilla de config.txt
├── config.txt             → 🔑 clave de API y ruta del Excel (⚠️ NO compartir)
├── entrada/               → 📥 aquí van las imágenes nuevas
├── procesados/            → ✅ imágenes que salieron OK (se mueven solas)
├── revision_manual/       → ⚠️ imágenes que necesitan revisión (se mueven solas)
└── salida/
    └── comprobantes.xlsx  → 📊 Excel con todos los datos extraídos (ruta por defecto)
```

---

## 🚦 Estados de los comprobantes

| Estado | Color | ¿Qué significa? |
|---|---|---|
| **OK** | 🟢 Verde | Todos los datos se extrajeron correctamente. No hay que hacer nada. |
| **REVISAR** | 🟡 Amarillo | Falta algún dato, está oculto en la imagen, o el comprobante parece **duplicado**. Hay que verificarlo manualmente. |

---

## 🆘 Solución de problemas

| Problema | Solución |
|---|---|
| ❌ "Faltan las dependencias" | Doble clic en `INSTALAR.bat` |
| 🔑 "Falta configurar la clave de API" | Revisar `config.txt` (Paso 4 de la instalación) |
| 🚫 "La clave no es válida" | La clave está mal copiada o fue revocada. Generar una nueva en [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| 🪟 La interfaz no aparece | Buscar la ventana en la barra de tareas de Windows |
| 📊 "Cierra el archivo Excel y vuelve a intentar" | Cerrar el Excel y volver a procesar (la imagen sigue en `entrada`) |
| 📂 "No se pudo crear o acceder a la carpeta del archivo Excel" | Revisar `RUTA_EXCEL` en `config.txt` y que Google Drive esté abierto |

---

## 💻 Instalar en otro computador

> 1️⃣ Copiar **toda la carpeta** al otro PC (memoria USB, WhatsApp, correo...)
>
> 2️⃣ Instalar Python (marcando **"Add Python to PATH"**)
>
> 3️⃣ Doble clic en **`INSTALAR.bat`**
>
> 4️⃣ Listo — la clave en `config.txt` es la misma para todos los equipos

---

## 🔐 Nota sobre privacidad

En el **plan gratuito** de Gemini, Google puede usar los datos enviados para mejorar sus productos. Si se necesita mayor privacidad, se puede migrar a una **API de pago**, donde los datos **no se usan para entrenamiento**.
