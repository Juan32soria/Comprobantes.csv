"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Configurado, Fila, RespuestaHistorial } from "./tipos";

export type DatosHistorial = {
  filas: Fila[];
  total: number;
  sheetUrl: string | null;
  configurado: Configurado;
};

/** Carga GET /api/historial y permite recargarlo bajo demanda. */
export function useHistorial(limite = 20) {
  const [datos, setDatos] = useState<DatosHistorial | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Descarta respuestas de peticiones antiguas si llegan después de una más nueva.
  const peticionRef = useRef(0);

  const recargar = useCallback(async () => {
    const numero = ++peticionRef.current;
    setCargando(true);
    try {
      const res = await fetch(`/api/historial?limite=${limite}`, { cache: "no-store" });
      const json = (await res.json()) as RespuestaHistorial;
      if (numero !== peticionRef.current) return;
      if (!json.ok) {
        setError(json.error || "No se pudo cargar el historial.");
        return;
      }
      setDatos({
        filas: json.filas,
        total: json.total,
        sheetUrl: json.sheetUrl,
        configurado: json.configurado,
      });
      setError(null);
    } catch {
      if (numero !== peticionRef.current) return;
      setError("No se pudo conectar con el servidor.");
    } finally {
      if (numero === peticionRef.current) setCargando(false);
    }
  }, [limite]);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  return { datos, cargando, error, recargar };
}
