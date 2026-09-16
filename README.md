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

Hay **dos formas** de tener el sistema funcionando, según el computador:

| Caso | ¿Qué se necesita? | ¿Cómo? |
|---|---|---|
| 👔 **PC del administrador (con Python)** | Python + el código fuente | Seguir los pasos de abajo (Windows o Mac) |
| 👥 **PC del equipo (solo el .exe)** | Nada — ni Python ni instalación | Ver [🖥️ Instalar en un PC sin Python](#%EF%B8%8F-instalar-en-un-pc-sin-python) |

> 💡 **Recomendado:** el administrador instala Python **una sola vez** en su PC, [compila el .exe](#-compilar-el-exe-solo-para-el-administrador) y copia la carpeta **`Extractor Comprobantes`** a cada PC del equipo. Los demás no tienen que instalar nada.

### 👔 PC del administrador (con Python)

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

> ⚙️ **Ya no hace falta editar archivos a mano.** Al abrir la app por primera vez (doble clic en **`ABRIR.bat`**) aparece una **pantalla de bienvenida** que pide la clave de API y, opcionalmente, la carpeta donde guardar el Excel. Pegar la clave, clic en **Guardar** y listo: la app crea `config.txt` sola.
>
> 🔁 Para cambiar la clave o la ruta del Excel más adelante, usar el botón **⚙️ Configuración** dentro de la app.
>
> 📝 **Alternativa manual:** hacer una copia de **`config.ejemplo.txt`**, renombrarla a `config.txt`, abrirla con el Bloc de notas, reemplazar `PEGA_AQUI_TU_CLAVE` por la clave copiada y **guardar**.
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
> 4️⃣ Obtener la API key gratis en [aistudio.google.com/apikey](https://aistudio.google.com/apikey). Al abrir la app por primera vez la pide en la pantalla de bienvenida (o copiar `config.ejemplo.txt` como `config.txt` y pegarla ahí a mano)
>
> 5️⃣ Para uso diario: doble clic en **`ABRIR.command`** (interfaz gráfica) o **`PROCESAR.command`** (terminal)

> 💡 **Nota:** en la primera ejecución Mac puede pedir autorización. Ir a **Configuración > Privacidad y Seguridad** > permitir la ejecución.

---

## 🖥️ Instalar en un PC sin Python

Para los computadores del equipo **no hay que instalar nada**: ni Python, ni dependencias, ni editar archivos.

> 1️⃣ Copiar la carpeta **`Extractor Comprobantes`** (la genera el administrador, ver [🔨 Compilar el .exe](#-compilar-el-exe-solo-para-el-administrador)) al otro PC — memoria USB, Google Drive, WhatsApp... Trae el `.exe`, `config.txt` y las carpetas de trabajo (`entrada`, `procesados`, `revision_manual`, `salida`).
>
> 2️⃣ Doble clic en **`Extractor Comprobantes.exe`**
>
> 3️⃣ Pegar la **clave de API** cuando la pida la pantalla de bienvenida (la misma clave sirve para todos los equipos)
>
> 4️⃣ Agregar comprobantes y clic en **PROCESAR**

> 🛡️ **Windows SmartScreen** puede mostrar un aviso azul la primera vez ("Windows protegió su PC"). Es normal porque el programa no está firmado: clic en **"Más información"** y luego en **"Ejecutar de todas formas"**. Solo pasa la primera vez.

> 💡 Dentro de la carpeta hay un **`LEEME.txt`** con estos mismos 3 pasos.

---

## 🔨 Compilar el .exe (solo para el administrador)

Se hace **desde un PC con Python** (el del administrador). Genera un ejecutable único que ya trae todo adentro.

> 1️⃣ Tener instaladas las dependencias normales (**`INSTALAR.bat`**) y además las de compilación:
>
> ```
> pip install pyinstaller opencv-python
> ```
>
> 💡 `opencv-python` es lo que permite **Usar cámara**. Si no está instalado al compilar, el `.exe` sale **sin cámara** y no se puede agregar después en el PC del equipo (`build.py` avisa si falta).
>
> 2️⃣ Doble clic en **`empaquetador.bat`** y esperar unos minutos (es normal que tarde y muestre mucho texto)
>
> 3️⃣ Al terminar aparece la carpeta **`Extractor Comprobantes`** lista para copiar a cada PC del equipo:
>
> ```
> Extractor Comprobantes/
> ├── Extractor Comprobantes.exe   → 🖥️ la app completa (~90 MB)
> ├── config.txt                   → 📝 plantilla vacía (la app pide la clave al abrir)
> ├── LEEME.txt                    → 📄 los 3 pasos para el usuario
> └── entrada/  procesados/  revision_manual/  salida/
> ```

> 🔧 **Detalles técnicos:**
> - **`build.bat`** (o `python build.py`) solo compila el `.exe` en la carpeta `dist/`, sin armar la carpeta para copiar.
> - **`icon.ico`** (el ícono del programa) se genera solo con **`make_icon.py`** la primera vez, si no existe.
> - `dist/`, `build/`, `*.spec`, `icon.ico` y `Extractor Comprobantes/` están en `.gitignore`: no se suben al repositorio.

---

## 📱 Uso diario

### 🖥️ Opción A: Interfaz gráfica (recomendada)

> 1️⃣ Doble clic en **`ABRIR.bat`** (o en **`Extractor Comprobantes.exe`** en los PCs sin Python)
>
> 2️⃣ Agregar comprobantes de cualquiera de estas formas:
>
> - ➕ **"Agregar imágenes"** → elegir una o varias fotos
> - 🗂 **"Agregar carpeta"** → toma todas las imágenes de una carpeta
> - 📷 **"Usar cámara"** → fotografiar el comprobante con la cámara web
> - 📥 o copiarlas directamente a la carpeta `entrada`
>
> 3️⃣ Clic en el botón rojo **PROCESAR**
>
> 4️⃣ Clic en **"Abrir Excel"** para ver los resultados

> 🧭 **Otras funciones de la ventana:**
> - 📋 **Historial**: muestra los **últimos 20 comprobantes** del Excel. **Doble clic** en una fila abre la imagen original.
> - 🔢 Contador **"Total procesados hoy | Total general"**.
> - ⚙️ **Configuración**: cambiar la clave de API o la ruta del Excel sin tocar archivos.
> - ❗ Si algo falla, la app lo explica en una ventana en español.

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
├── interfaz.py            → 🐍 la interfaz gráfica (código fuente)
├── procesar_comprobantes.py → 🐍 el motor que lee los comprobantes con Gemini
├── config.ejemplo.txt     → 📝 plantilla de config.txt
├── config.txt             → 🔑 clave de API y ruta del Excel (⚠️ NO compartir)
├── empaquetador.bat       → 🔨 compila el .exe y arma la carpeta "Extractor Comprobantes"
├── build.bat / build.py   → 🔨 solo compila el .exe en dist/ (usa PyInstaller)
├── make_icon.py           → 🎨 genera icon.ico (solo si no existe)
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
| 🔑 "Falta configurar la clave de API" | Pegarla en la pantalla de bienvenida o con el botón **⚙️ Configuración** (Paso 4 de la instalación) |
| 🛡️ Windows dice "protegió su PC" al abrir el .exe | Clic en **"Más información"** > **"Ejecutar de todas formas"** (solo la primera vez) |
| 📷 "Usar cámara" dice que falta opencv | El `.exe` se compiló sin `opencv-python`. El administrador debe hacer `pip install opencv-python` y volver a compilar |
| 🚫 "La clave no es válida" | La clave está mal copiada o fue revocada. Generar una nueva en [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| 🪟 La interfaz no aparece | Buscar la ventana en la barra de tareas de Windows |
| 📊 "Cierra el archivo Excel y vuelve a intentar" | Cerrar el Excel y volver a procesar (la imagen sigue en `entrada`) |
| 📂 "No se pudo crear o acceder a la carpeta del archivo Excel" | Revisar `RUTA_EXCEL` en `config.txt` y que Google Drive esté abierto |

---

## 💻 Instalar en otro computador

Hay dos vías, según lo que se quiera en el otro PC:

### 👥 Vía A: solo el .exe (recomendada para el equipo)

> Copiar la carpeta **`Extractor Comprobantes`** y abrir el `.exe`. No hay que instalar nada. Pasos completos en [🖥️ Instalar en un PC sin Python](#%EF%B8%8F-instalar-en-un-pc-sin-python).

### 👔 Vía B: con Python (para quien vaya a modificar o compilar)

> 1️⃣ Copiar **toda la carpeta del proyecto** al otro PC (memoria USB, WhatsApp, correo...) o clonar el repositorio
>
> 2️⃣ Instalar Python (marcando **"Add Python to PATH"**)
>
> 3️⃣ Doble clic en **`INSTALAR.bat`**
>
> 4️⃣ Abrir **`ABRIR.bat`** y pegar la clave de API en la pantalla de bienvenida

> 🔑 La clave de API es **la misma para todos los equipos**.

---

## 🔐 Nota sobre privacidad

En el **plan gratuito** de Gemini, Google puede usar los datos enviados para mejorar sus productos. Si se necesita mayor privacidad, se puede migrar a una **API de pago**, donde los datos **no se usan para entrenamiento**.
