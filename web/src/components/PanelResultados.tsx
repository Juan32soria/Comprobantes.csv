import type { Fila, Resultado } from "./tipos";
import { ChipEstado } from "./Chip";
import { formatearPesos, oGuion } from "./formato";

type Props = { resultados: Resultado[] };

function Campo({ etiqueta, valor, mono = false }: { etiqueta: string; valor: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wide text-apagado">{etiqueta}</dt>
      <dd className={`truncate text-sm ${mono ? "font-mono" : ""}`} title={valor}>
        {valor}
      </dd>
    </div>
  );
}

function TarjetaExito({
  archivo,
  datos,
  motivos,
  advertencia,
}: {
  archivo: string;
  datos: Fila;
  motivos: string[];
  advertencia?: string;
}) {
  return (
    <li className="rounded-lg border border-borde bg-superficie p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="truncate text-xs text-apagado" title={archivo}>
          {archivo}
        </p>
        <ChipEstado estado={datos.estado} />
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
        <Campo etiqueta="Banco / App" valor={oGuion(datos.banco_app)} />
        <Campo etiqueta="Comprobante" valor={oGuion(datos.numero_comprobante)} mono />
        <Campo etiqueta="Cuenta / Llave" valor={oGuion(datos.numero_cuenta_o_llave)} mono />
        <Campo etiqueta="Tipo" valor={oGuion(datos.tipo_cuenta_o_llave)} />
        <Campo etiqueta="Nombre" valor={oGuion(datos.nombre_cliente)} />
        <div className="min-w-0">
          <dt className="text-[11px] uppercase tracking-wide text-apagado">Valor</dt>
          <dd className="text-base font-semibold tabular-nums">{formatearPesos(datos.valor_pago)}</dd>
        </div>
        <Campo etiqueta="Fecha de pago" valor={oGuion(datos.fecha_pago)} />
      </dl>
      {motivos.length > 0 && (
        <ul className="mt-3 list-disc space-y-0.5 pl-5 text-xs text-alerta">
          {motivos.map((m, i) => (
            <li key={i}>{m}</li>
          ))}
        </ul>
      )}
      {advertencia && (
        <p className="mt-3 rounded-md border border-alerta/40 bg-alerta/10 px-3 py-2 text-xs text-alerta">
          {advertencia}
        </p>
      )}
    </li>
  );
}

function TarjetaError({ archivo, error }: { archivo: string; error: string }) {
  return (
    <li className="rounded-lg border border-error/60 bg-error/5 p-4">
      <div className="mb-1 flex items-start justify-between gap-3">
        <p className="truncate text-xs text-apagado" title={archivo}>
          {archivo}
        </p>
        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-error/40 bg-error/15 px-2 py-0.5 text-xs font-medium text-error">
          <span aria-hidden="true">×</span> Error
        </span>
      </div>
      <p className="text-sm text-error">{error}</p>
    </li>
  );
}

/** Tarjetas con cada comprobante procesado en este lote, el más reciente primero. */
export function PanelResultados({ resultados }: Props) {
  if (resultados.length === 0) return null;

  return (
    <section aria-label="Resultados">
      <h2 className="mb-2 text-sm font-medium text-apagado">
        Resultados <span className="font-normal">({resultados.length})</span>
      </h2>
      <ul className="space-y-3">
        {resultados.map((r) =>
          r.tipo === "exito" ? (
            <TarjetaExito
              key={r.id}
              archivo={r.archivo}
              datos={r.datos}
              motivos={r.motivos}
              advertencia={r.advertencia}
            />
          ) : (
            <TarjetaError key={r.id} archivo={r.archivo} error={r.error} />
          ),
        )}
      </ul>
    </section>
  );
}
