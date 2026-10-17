"use client";

import { useCallback, useRef, useState } from "react";
import type {
  ArchivoEnCola,
  EstadoArchivo,
  Progreso,
  RespuestaProcesar,
  Resultado,
  Resumen,
} from "./tipos";
import { fetchAutenticado } from "./fetchAutenticado";
import { HEADER_CLAVE } from "./useClaveApi";

/** Pausa tras cada imagen procesada con éxito, para no agotar la cuota por minuto de Gemini. */
const PAUSA_ENTRE_IMAGENES_MS = 5000;

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function generarId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Clave para evitar duplicados en la cola. */
function huella(f: File): string {
  return `${f.name}|${f.size}|${f.lastModified}`;
}

function esRespuesta(valor: unknown): valor is RespuestaProcesar {
  return typeof valor === "object" && valor !== null && "ok" in valor;
}

/**
 * Envía UNA imagen a POST /api/procesar y traduce cualquier fallo a un Resultado.
 * Siempre va con el token de sesión (Authorization: Bearer). Si hay clave guardada
 * en el navegador se manda además en el header x-gemini-key; el servidor la ignora
 * cuando tiene su propia GEMINI_API_KEY.
 * Ante un 401 se llama a `alNoAutorizado` y el resultado es "Sesión expirada".
 */
async function enviarArchivo(
  archivo: ArchivoEnCola,
  claveApi: string,
  token: string,
  alNoAutorizado?: () => void,
): Promise<Resultado> {
  const base = { id: archivo.id, archivo: archivo.file.name };
  const formData = new FormData();
  formData.append("archivo", archivo.file);
  const headers: HeadersInit = claveApi ? { [HEADER_CLAVE]: claveApi } : {};

  let res: Response;
  try {
    res = await fetchAutenticado(
      "/api/procesar",
      { method: "POST", body: formData, headers },
      token,
      alNoAutorizado,
    );
  } catch {
    return { ...base, tipo: "error", error: "No se pudo conectar con el servidor." };
  }
  if (res.status === 401) {
    return { ...base, tipo: "error", error: "Sesión expirada. Vuelve a iniciar sesión." };
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return { ...base, tipo: "error", error: `Respuesta inválida del servidor (HTTP ${res.status}).` };
  }

  if (!esRespuesta(json)) {
    return { ...base, tipo: "error", error: `Respuesta inesperada del servidor (HTTP ${res.status}).` };
  }
  if (!json.ok) {
    return { ...base, tipo: "error", error: json.error || `Error del servidor (HTTP ${res.status}).` };
  }
  return {
    ...base,
    tipo: "exito",
    datos: json.datos,
    motivos: Array.isArray(json.motivos) ? json.motivos : [],
    advertencia: json.advertencia,
  };
}

/**
 * Maneja la cola de archivos y el envío secuencial al API.
 * `claveApi` es la clave guardada en el navegador ("" si no hay).
 * `token` es el JWT de la sesión; si el servidor responde 401 se detiene el lote
 * (los archivos restantes quedan pendientes) y se llama a `alNoAutorizado`.
 */
export function useProcesador(
  alTerminar?: () => void,
  claveApi = "",
  token = "",
  alNoAutorizado?: () => void,
) {
  const [archivos, setArchivos] = useState<ArchivoEnCola[]>([]);
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [progreso, setProgreso] = useState<Progreso | null>(null);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [procesando, setProcesando] = useState(false);
  // Pedido de detener: se muestra "Deteniendo…" hasta que acabe la imagen en curso.
  const [deteniendo, setDeteniendo] = useState(false);
  // Flag de cancelación: se consulta antes de cada imagen; nunca corta una a la mitad.
  const cancelarRef = useRef(false);

  const agregar = useCallback((nuevos: File[]) => {
    setArchivos((prev) => {
      const existentes = new Set(prev.map((a) => huella(a.file)));
      const agregados: ArchivoEnCola[] = [];
      for (const f of nuevos) {
        const h = huella(f);
        if (existentes.has(h)) continue;
        existentes.add(h);
        agregados.push({ id: generarId(), file: f, estado: "pendiente" });
      }
      return agregados.length > 0 ? [...prev, ...agregados] : prev;
    });
  }, []);

  const quitar = useCallback((id: string) => {
    setArchivos((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const limpiar = useCallback(() => {
    setArchivos([]);
    setResultados([]);
    setResumen(null);
    setProgreso(null);
  }, []);

  const actualizarEstado = useCallback((id: string, estado: EstadoArchivo, mensaje?: string) => {
    setArchivos((prev) => prev.map((a) => (a.id === id ? { ...a, estado, mensaje } : a)));
  }, []);

  const procesar = useCallback(async () => {
    if (procesando) return;
    const pendientes = archivos.filter((a) => a.estado === "pendiente");
    if (pendientes.length === 0) return;

    setProcesando(true);
    setResumen(null);
    cancelarRef.current = false;
    setDeteniendo(false);
    const conteo: Resumen = {
      total: pendientes.length,
      ok: 0,
      revisar: 0,
      error: 0,
      procesados: 0,
      detenido: false,
    };

    // Si la sesión venció a mitad del lote, se corta como si el usuario hubiera pedido
    // detener (para no disparar decenas de peticiones fallidas) y se cierra la sesión.
    const sesionVencida = () => {
      cancelarRef.current = true;
      alNoAutorizado?.();
    };

    // Secuencial a propósito: la capa gratuita de Gemini limita las peticiones por minuto.
    for (let i = 0; i < pendientes.length; i++) {
      // Si el usuario pidió detener, los archivos restantes quedan "pendiente" para después.
      if (cancelarRef.current) {
        conteo.detenido = true;
        break;
      }
      const actual = pendientes[i];
      setProgreso({ indice: i + 1, total: pendientes.length, nombre: actual.file.name });
      actualizarEstado(actual.id, "procesando");

      const resultado = await enviarArchivo(actual, claveApi, token, sesionVencida);

      if (resultado.tipo === "exito") {
        const esOk = resultado.datos.estado === "OK";
        if (esOk) conteo.ok++;
        else conteo.revisar++;
        actualizarEstado(actual.id, esOk ? "ok" : "revisar");
      } else {
        conteo.error++;
        actualizarEstado(actual.id, "error", resultado.error);
      }
      conteo.procesados++;
      setResultados((prev) => [resultado, ...prev]);

      // Tras un éxito, esperar antes de la siguiente imagen (no después de la última
      // ni si el usuario pidió detener).
      const quedanMas = i < pendientes.length - 1;
      if (resultado.tipo === "exito" && quedanMas && !cancelarRef.current) {
        await esperar(PAUSA_ENTRE_IMAGENES_MS);
      }
    }

    setProgreso(null);
    setResumen(conteo);
    setProcesando(false);
    setDeteniendo(false);
    cancelarRef.current = false;
    alTerminar?.();
  }, [archivos, procesando, actualizarEstado, alTerminar, claveApi, token, alNoAutorizado]);

  /** Pide detener el lote. La imagen en curso termina y se guarda; el resto queda pendiente. */
  const detener = useCallback(() => {
    if (!procesando) return;
    cancelarRef.current = true;
    setDeteniendo(true);
  }, [procesando]);

  const hayPendientes = archivos.some((a) => a.estado === "pendiente");

  return {
    archivos,
    resultados,
    progreso,
    resumen,
    procesando,
    deteniendo,
    hayPendientes,
    agregar,
    quitar,
    limpiar,
    procesar,
    detener,
  };
}
