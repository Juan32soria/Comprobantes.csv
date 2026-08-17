# Sistema de extracción de comprobantes — Guía de instalación y uso

Este sistema lee imágenes de comprobantes de pago (Nequi, Bancolombia, Daviplata), extrae el banco, número de comprobante, número de cuenta, nombre del cliente, valor y fecha del pago, y guarda todo en un archivo que se abre con Excel.

**Motor de IA:** Google Gemini Flash (gratuito, sin tarjeta de crédito).

---

## Parte 1 — Instalación (se hace UNA sola vez)

**Paso 1. Instalar Python.**
Entra a https://www.python.org/downloads/ y descarga la versión para Windows. Al instalarlo, **marca la casilla "Add Python to PATH"** antes de dar clic en "Install Now".

**Paso 2. Instalar las dependencias.**
Haz doble clic en `INSTALAR.bat` y espera a que termine.

**Paso 3. Obtener la clave de API (gratis).**
Entra a https://aistudio.google.com/apikey con tu cuenta de Google. Haz clic en **"Create API Key"** y cópiala. La clave empieza con `AIza`. No necesitas tarjeta de crédito ni cargar crédito.

**Paso 4. Guardar la clave en el sistema.**
Abre el archivo `config.txt` con el Bloc de notas, reemplaza `PEGA_AQUI_TU_CLAVE` por la clave que copiaste, y guarda. Debe quedar así:

```
API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxx
```

⚠️ Esa clave es como una contraseña: no la compartas.

---

## Parte 2 — Uso diario

1. **Guardar las imágenes** de los comprobantes en la carpeta **`entrada`** (jpg, png o webp).
2. **Doble clic en `PROCESAR.bat`.** Se abre una ventana que muestra el avance.
3. **Abrir el resultado:** `salida\comprobantes.csv` se abre con Excel.
4. Las imágenes OK pasan a **`procesados`**. Las dudosas a **`revision_manual`**.

## Límites de la versión gratuita

- **1,500 comprobantes por día** (si tienes más, el sistema procesa los primeros 1,500 y el resto queda en "entrada" para el día siguiente).
- **15 por minuto** (el sistema controla esto automáticamente con pausas).

## Si algo falla

- **"Faltan las dependencias"** → doble clic en `INSTALAR.bat`.
- **"Falta configurar la clave de API"** → revisa el Paso 4.
- **"La clave de API no es válida"** → la clave está mal copiada en `config.txt`.
- **"[ESPERA]"** → se alcanzó el límite por minuto, el sistema espera automáticamente y reintenta.
- El programa **nunca borra imágenes**: solo las mueve entre carpetas.

## Nota sobre privacidad

En la versión gratuita de Gemini, Google puede usar los datos enviados para mejorar sus productos. Si más adelante necesitas mayor privacidad, se puede migrar a una API de pago (Claude o Gemini con facturación) donde los datos no se usan para entrenamiento.
