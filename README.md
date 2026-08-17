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

Todo queda guardado en un **archivo Excel con formato profesional**: `salida/comprobantes.xlsx` — con colores según el estado de cada comprobante y detección de pagos duplicados.

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

### 1️⃣ Instalar Python

> 🐍 Descargar de [python.org/downloads](https://www.python.org/downloads/) e instalar.
>
> ⚠️ **MUY IMPORTANTE:** antes de dar clic en "Install Now", marcar la casilla **"Add Python to PATH"**.

### 2️⃣ Instalar las dependencias

> 📦 Doble clic en **`INSTALAR.bat`** y esperar a que termine. Solo se hace una vez.

### 3️⃣ Obtener la clave de API (gratis, sin tarjeta de crédito)

> 🔑 1. Entrar a **https://aistudio.google.com/apikey** con una cuenta de Google (Gmail)
> 2. Clic en **"Create API Key"**
> 3. Copiar la clave (empieza con `AIza...`)

### 4️⃣ Configurar la clave

> ⚙️ Abrir **`config.txt`** con el Bloc de notas, reemplazar `PEGA_AQUI_TU_CLAVE` por la clave copiada, y **guardar**.
>
> 🔒 Esa clave es como una contraseña: **no compartirla** con nadie.

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
> 3️⃣ Abrir **`salida/comprobantes.xlsx`** con Excel

---

## 📁 Estructura de carpetas

```
extractor-comprobantes/
├── ABRIR.bat              → 🖥️ abre la interfaz gráfica
├── PROCESAR.bat           → ⌨️ procesa desde la terminal (avanzados)
├── INSTALAR.bat           → 📦 instala dependencias (solo una vez)
├── config.txt             → 🔑 clave de API (⚠️ NO compartir)
├── entrada/               → 📥 aquí van las imágenes nuevas
├── procesados/            → ✅ imágenes que salieron OK (se mueven solas)
├── revision_manual/       → ⚠️ imágenes que necesitan revisión (se mueven solas)
└── salida/
    └── comprobantes.xlsx  → 📊 Excel con todos los datos extraídos
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
| 📊 El Excel no abre o da error al guardar | Cerrar Excel antes de procesar |

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
