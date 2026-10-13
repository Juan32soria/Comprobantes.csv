import type { Progreso, Resumen } from "./tipos";
import { acortarNombre } from "./formato";

type Props = {
  progreso: Progreso | null;
  resumen: Resumen | null;
};

function plural(n: number, singular: string, pluralTexto: string): string {
  return `${n} ${n === 1 ? singular : pluralTexto}`;
}

/** Barra durante el lote y línea de resumen al terminar. */
export function BarraProgreso({ progreso, resumen }: Props) {
  if (progreso) {
    const completados = progreso.indice - 1;
    const porcentaje = Math.round((completados / progreso.total) * 100);
    return (
      <section
        aria-label="Progreso del procesamiento"
        className="rounded-lg border border-borde bg-superficie p-4"
      >
        <div className="mb-2 flex items-center justify-between gap-3 text-sm">
          <p className="truncate" aria-live="polite">
            Procesando {progreso.indice} de {progreso.total}
            <span className="text-apagado"> · {acortarNombre(progreso.nombre, 40)}</span>
          </p>
          <span className="shrink-0 font-mono text-xs text-apagado">{porcentaje}%</span>
        </div>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={porcentaje}
          className="h-2 w-full overflow-hidden rounded-full bg-superficie-2"
        >
          <div
            className="h-full rounded-full bg-acento transition-[width] duration-300"
            style={{ width: `${Math.max(porcentaje, 3)}%` }}
          />
        </div>
      </section>
    );
  }

  if (resumen) {
    return (
      <p
        role="status"
        className={`rounded-lg border bg-superficie px-4 py-3 text-sm ${
          resumen.detenido ? "border-alerta/50" : "border-borde"
        }`}
      >
        {resumen.detenido && (
          <span className="mb-1 block font-medium text-alerta">
            Proceso detenido. {resumen.procesados} de {resumen.total}{" "}
            {resumen.total === 1 ? "comprobante procesado" : "comprobantes procesados"}. Puedes
            continuar después.
          </span>
        )}
        <span className="font-medium">{plural(resumen.procesados, "procesado", "procesados")}</span>
        <span className="text-apagado"> · </span>
        <span className="text-ok">{resumen.ok} OK</span>
        <span className="text-apagado"> · </span>
        <span className="text-alerta">{resumen.revisar} REVISAR</span>
        <span className="text-apagado"> · </span>
        <span className={resumen.error > 0 ? "text-error" : "text-apagado"}>
          {plural(resumen.error, "error", "errores")}
        </span>
      </p>
    );
  }

  return null;
}
