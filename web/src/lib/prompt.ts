// Instrucciones para Gemini. Copia exacta del PROMPT de procesar_comprobantes.py.
export const PROMPT = `Analiza esta imagen de un comprobante de pago o transferencia colombiano.

CONTEXTO: Este comprobante es un pago que un cliente le hizo a nuestro negocio. Los clientes nos envían la captura de pantalla desde SU app para demostrar que pagaron.

IMPORTANTE: Como el comprobante lo genera la app del REMITENTE (quien paga), muchas veces el nombre del remitente NO aparece (porque la app no le muestra su propio nombre). En esos casos nombre_cliente debe ser null — NUNCA pongas el nombre del destinatario como nombre_cliente.

Extrae los datos y responde ÚNICAMENTE con un objeto JSON válido:

{
  "banco_app": "string - la app o plataforma desde donde se hizo el pago",
  "numero_comprobante": "string alfanumérico tal como aparece, o null",
  "numero_cuenta_o_llave": "string - cuenta, celular o llave del REMITENTE (quien paga), o null",
  "tipo_cuenta_o_llave": "string - tipo de identificador del remitente, o null",
  "nombre_cliente": "string - nombre del REMITENTE si aparece visible, o null",
  "valor_pago": entero en pesos sin decimales, o null,
  "fecha_pago": "AAAA-MM-DD, o null"
}

GUÍA DETALLADA POR APLICACIÓN:

═══ BANCOLOMBIA (transferencia tradicional) ═══
Formato: fondo con franjas de colores, "¡Transferencia exitosa!", "Comprobante No."
- numero_comprobante: "Comprobante No." (solo dígitos, ej: 0000032700)
- banco_app: "Bancolombia"
- Tiene dos secciones: "Producto origen" (REMITENTE) y "Producto destino" (nosotros)
- nombre_cliente: el nombre que aparece en "Producto origen" (es quien envía el dinero)
- numero_cuenta_o_llave: la cuenta que aparece en "Producto origen" (ej: 244-000106-30, quitar guiones → solo dígitos)
- tipo_cuenta_o_llave: "Cuenta de Ahorros" o "Cuenta Corriente" según diga
- Si la cuenta origen aparece parcial (ej: *1151), transcribir así
- NUNCA uses los datos de "Producto destino" como nombre_cliente

═══ NEQUI ═══
Formato: fondo morado/rosado, "Envío realizado", código QR, "Referencia"
- numero_comprobante: "Referencia" (alfanumérico, ej: M12170909)
- banco_app: "Nequi"
- El comprobante lo genera QUIEN ENVÍA. Por eso:
  - "Para" = nombre del DESTINATARIO (nosotros) → NO es el cliente, IGNORAR para nombre_cliente
  - "Llave" = llave del DESTINATARIO → NO es la cuenta del cliente
  - "¿Desde dónde se hizo el envío?" = celular del REMITENTE → ESTE es numero_cuenta_o_llave
  - tipo_cuenta_o_llave: "Celular"
  - nombre_cliente: null (Nequi no muestra el nombre del remitente en el comprobante)
- "Banco destino" indica a qué banco fue (Nu = Nubank, etc.)
- "¿De dónde salió la plata?" indica el bolsillo de origen (Disponible, Metas, etc.)

═══ BRE-B (transferencia por llaves, cualquier banco) ═══
Formato: puede tener el logo "Bre-B" con franjas de colores, "¡Pago exitoso!"
- numero_comprobante: "Comprobante No." (alfanumérico, ej: TR2AgRVd5REC)
- banco_app: "Bre-B"
- "Enviado a" o "¿A quién le llegó la plata?" = DESTINATARIO (nosotros) → IGNORAR
- "Identificación" debajo del destinatario = cédula del destinatario → IGNORAR
- "¿De dónde salió?" = cuenta ORIGEN del remitente
  - Si aparece parcial (ej: *6318), transcribir así en numero_cuenta_o_llave
  - tipo_cuenta_o_llave: "Cuenta de Ahorros" o lo que diga
- nombre_cliente: null (Bre-B no muestra el nombre del remitente, solo del destinatario oculto)

═══ BOLD / BOLD CF ═══
Formato: fondo rojo/morado degradado, logo "bold", "Transferencia enviada"
- numero_comprobante: "ID de transacción" (alfanumérico, ej: QUO102IFI4)
- banco_app: "Bold"
- Tiene dos secciones: "Origen" (REMITENTE) y "Destino" (nosotros)
- nombre_cliente: "Dueño" en la sección "Origen" (ej: Santiago Salazar)
- numero_cuenta_o_llave: "Número de cuenta" en "Origen" (ej: 1700117641184)
- tipo_cuenta_o_llave: según lo que diga ("Cuenta de Ahorros", etc.) o si dice "Tipo de llave: Documento" → "Llave documento"
- NUNCA uses los datos de "Destino" como nombre_cliente

═══ DAVIPLATA ═══
Formato: fondo verde, "No. de aprobación"
- numero_comprobante: "No. de aprobación" (dígitos)
- banco_app: "Daviplata"
- El comprobante lo genera QUIEN ENVÍA:
  - El nombre del destinatario puede aparecer → NO es el cliente
  - numero_cuenta_o_llave: el celular del remitente si aparece en "Desde" o similar
  - tipo_cuenta_o_llave: "Celular"
  - nombre_cliente: null (Daviplata no muestra el nombre del remitente)

═══ PSE / OTROS ═══
- Extraer lo visible siguiendo la misma lógica: datos del REMITENTE, nunca del destinatario
- Si no se puede distinguir quién es remitente y quién destinatario, poner nombre_cliente como null

═══ SISTEMA DE LLAVES Bre-B ═══
Las llaves son alias para recibir/enviar dinero entre cualquier banco colombiano:
1. Celular (10 dígitos, empieza en 3)
2. Documento de identidad (cédula, ej: 1000579208)
3. Correo electrónico
4. Alias alfanumérico (empieza con @, ej: @Pzt579)
5. Código de comercio
Si aparece una llave del REMITENTE, ponla en numero_cuenta_o_llave. Los valores de tipo_cuenta_o_llave para llaves son: "Llave celular", "Llave documento", "Llave correo", "Llave alias", "Llave comercio"

REGLAS ESTRICTAS:
1. NUNCA inventes ni completes datos. Si no aparece, usa null.
2. NUNCA pongas el nombre del DESTINATARIO como nombre_cliente. Si solo ves el nombre del destinatario y no del remitente, nombre_cliente es null.
3. numero_comprobante: puede ser numérico O alfanumérico. Transcribir exactamente.
4. numero_cuenta_o_llave: acepta dígitos, celulares, llaves (@algo), cuentas parciales (*6318). Siempre del REMITENTE.
5. Nombres con asteriscos: transcribir tal cual (ej: "Jua*** Jos*** Vil***"). Pero solo si es del remitente.
6. valor_pago: entero sin puntos/comas/$. Ejemplo: 150000.
7. fecha_pago: AAAA-MM-DD.`;
