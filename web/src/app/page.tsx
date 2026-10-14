"use client";

import { Acciones } from "@/components/Acciones";
import { BarraProgreso } from "@/components/BarraProgreso";
import { Encabezado } from "@/components/Encabezado";
import { ListaArchivos } from "@/components/ListaArchivos";
import { PanelResultados } from "@/components/PanelResultados";
import { TablaHistorial } from "@/components/TablaHistorial";
import { ZonaCarga } from "@/components/ZonaCarga";
import { useClaveApi } from "@/components/useClaveApi";
import { useHistorial } from "@/components/useHistorial";
import { useProcesador } from "@/components/useProcesador";

export default function Pagina() {
  const historial = useHistorial(20);
  // Clave de Gemini guardada en el navegador; solo cuenta si el servidor no tiene la suya.
  const claveApi = useClaveApi();
  // Al terminar cada lote se refresca el historial.
  const proc = useProcesador(historial.recargar, claveApi.clave);

  return (
    <>
      <Encabezado
        configurado={historial.datos?.configurado ?? null}
        cargando={historial.cargando}
        errorCarga={historial.error !== null}
        sheetUrl={historial.datos?.sheetUrl ?? null}
        claveLocal={claveApi.clave}
        claveLista={claveApi.lista}
        onGuardarClave={claveApi.guardar}
        onBorrarClave={claveApi.borrar}
      />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
        <ZonaCarga onArchivos={proc.agregar} deshabilitado={proc.procesando} />

        <ListaArchivos archivos={proc.archivos} onQuitar={proc.quitar} procesando={proc.procesando} />

        <Acciones
          procesando={proc.procesando}
          deteniendo={proc.deteniendo}
          hayPendientes={proc.hayPendientes}
          hayAlgo={proc.archivos.length > 0 || proc.resultados.length > 0}
          onProcesar={() => void proc.procesar()}
          onDetener={proc.detener}
          onLimpiar={proc.limpiar}
        />

        <BarraProgreso progreso={proc.progreso} resumen={proc.resumen} />

        <PanelResultados resultados={proc.resultados} />

        <TablaHistorial
          filas={historial.datos?.filas ?? []}
          total={historial.datos?.total ?? null}
          cargando={historial.cargando}
          error={historial.error}
          onActualizar={() => void historial.recargar()}
        />
      </main>

      <footer className="border-t border-borde px-4 py-4 text-center text-xs text-apagado">
        Los datos se guardan automáticamente en Google Sheets.
      </footer>
    </>
  );
}
