import type { ReactNode } from "react";
import type { Fila } from "./tipos";
import { ChipEstado } from "./Chip";
import { IconoRefrescar, Spinner } from "./Iconos";
import { acortarNombre, formatearPesos, oGuion } from "./formato";

type Props = {
  filas: Fila[];
  total: number | null;
  cargando: boolean;
  error: string | null;
  onActualizar: () => void;
};

const COLUMNAS = [
  "Fecha proc.",
  "Archivo",
  "Banco/App",
  "Comprobante",
  "Cuenta/Llave",
  "Nombre",
  "Valor",
  "Fecha pago",
  "Estado",
] as const;

function Celda({ children, mono = false, className = "" }: { children: ReactNode; mono?: boolean; className?: string }) {
  return (
    <td className={`max-w-48 truncate px-3 py-2 align-middle ${mono ? "font-mono text-xs" : ""} ${className}`}>
      {children}
    </td>
  );
}

function Tabla({ filas }: { filas: Fila[] }) {
  return (
    <div className="hidden overflow-x-auto sm:block">
      <table className="w-full min-w-[56rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-borde bg-superficie-2/60 text-left text-[11px] uppercase tracking-wide text-apagado">
            {COLUMNAS.map((c) => (
              <th key={c} scope="col" className="px-3 py-2 font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => (
            <tr key={`${f.fecha_procesado}-${f.archivo_origen}-${i}`} className="border-b border-borde/60 last:border-b-0 hover:bg-superficie-2/40">
              <Celda mono>{oGuion(f.fecha_procesado)}</Celda>
              <Celda>
                <span title={f.archivo_origen}>{acortarNombre(oGuion(f.archivo_origen), 22)}</span>
              </Celda>
              <Celda>{oGuion(f.banco_app)}</Celda>
              <Celda mono>{oGuion(f.numero_comprobante)}</Celda>
              <Celda mono>{oGuion(f.numero_cuenta_o_llave)}</Celda>
              <Celda>
                <span title={f.nombre_cliente}>{oGuion(f.nombre_cliente)}</span>
              </Celda>
              <Celda className="whitespace-nowrap text-right font-medium tabular-nums">{formatearPesos(f.valor_pago)}</Celda>
              <Celda mono>{oGuion(f.fecha_pago)}</Celda>
              <Celda>
                <ChipEstado estado={f.estado} />
              </Celda>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Versión apilada para pantallas pequeñas. */
function Tarjetas({ filas }: { filas: Fila[] }) {
  return (
    <ul className="divide-y divide-borde/60 sm:hidden">
      {filas.map((f, i) => (
        <li key={`${f.fecha_procesado}-${f.archivo_origen}-${i}`} className="space-y-1.5 px-4 py-3 text-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-medium">{oGuion(f.nombre_cliente)}</p>
              <p className="truncate text-xs text-apagado">
                {oGuion(f.banco_app)} · <span className="font-mono">{oGuion(f.numero_comprobante)}</span>
              </p>
            </div>
            <ChipEstado estado={f.estado} />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-base font-semibold tabular-nums">{formatearPesos(f.valor_pago)}</span>
            <span className="font-mono text-xs text-apagado">{oGuion(f.fecha_pago)}</span>
          </div>
          <p className="truncate font-mono text-xs text-apagado">{oGuion(f.numero_cuenta_o_llave)}</p>
          <p className="truncate text-[11px] text-apagado" title={f.archivo_origen}>
            {oGuion(f.archivo_origen)} · {oGuion(f.fecha_procesado)}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function TablaHistorial({ filas, total, cargando, error, onActualizar }: Props) {
  const vacio = !cargando && !error && filas.length === 0;

  return (
    <section aria-label="Historial" className="overflow-hidden rounded-lg border border-borde bg-superficie">
      <div className="flex items-center justify-between gap-3 border-b border-borde px-4 py-3">
        <h2 className="text-sm font-medium">
          Historial
          {total !== null && (
            <span className="ml-2 text-xs font-normal text-apagado">
              últimos {Math.min(filas.length, 20)} de {total}
            </span>
          )}
        </h2>
        <button
          type="button"
          onClick={onActualizar}
          disabled={cargando}
          className="inline-flex items-center gap-1.5 rounded-md border border-borde bg-superficie-2 px-3 py-1.5 text-xs font-medium transition-colors hover:border-apagado hover:bg-borde/60 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {cargando ? <Spinner className="h-3.5 w-3.5" /> : <IconoRefrescar className="h-3.5 w-3.5" />}
          Actualizar
        </button>
      </div>

      {error && (
        <div className="px-4 py-6 text-center text-sm">
          <p className="text-error">{error}</p>
          <button
            type="button"
            onClick={onActualizar}
            className="mt-2 text-xs text-apagado underline underline-offset-2 hover:text-texto"
          >
            Reintentar
          </button>
        </div>
      )}

      {!error && cargando && filas.length === 0 && (
        <p className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-apagado">
          <Spinner /> Cargando historial…
        </p>
      )}

      {vacio && (
        <div className="px-4 py-10 text-center">
          <p className="text-sm font-medium">Aún no hay comprobantes procesados</p>
          <p className="mt-1 text-xs text-apagado">
            Los comprobantes que proceses aparecerán aquí y en tu Google Sheet.
          </p>
        </div>
      )}

      {!error && filas.length > 0 && (
        <>
          <Tabla filas={filas} />
          <Tarjetas filas={filas} />
        </>
      )}
    </section>
  );
}
