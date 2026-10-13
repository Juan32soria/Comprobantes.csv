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

/** Envía UNA imagen a POST /api/procesar y traduce cualquier fallo a un Resultado. */
async function enviarArchivo(archivo: ArchivoEnCola): Promise<Resultado> {
  const base = { id: archivo.id, archivo: archivo.file.name };
  const formData = new FormData();
  formData.append("archivo", archivo.file);

  let res: Response;
  try {
    res = await fetch("/api/procesar", { method: "POST", body: formData });
  } catch {
    return { ...base, tipo: "error", error: "No se pudo conectar con el servidor." };
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

/** Maneja la cola de archivos y el envío secuencial al API. */
export function useProcesador(alTerminar?: () => void) {
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

      const resultado = await enviarArchivo(actual);

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
    }

    setProgreso(null);
    setResumen(conteo);
    setProcesando(false);
    setDeteniendo(false);
    cancelarRef.current = false;
    alTerminar?.();
  }, [archivos, procesando, actualizarEstado, alTerminar]);

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
