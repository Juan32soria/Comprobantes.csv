import type { Configurado } from "./tipos";
import { Chip, type Tono } from "./Chip";
import { IconoDocumento, IconoExterno, Spinner } from "./Iconos";

type Props = {
  configurado: Configurado | null;
  cargando: boolean;
  errorCarga: boolean;
  sheetUrl: string | null;
};

/** Texto y tono del indicador de conexión según la configuración del servidor. */
function describirEstado({ configurado, cargando, errorCarga }: Props): { tono: Tono; texto: string } {
  if (configurado) {
    if (configurado.gemini && configurado.sheets) {
      return { tono: "ok", texto: "Conectado a Google Sheets" };
    }
    if (!configurado.gemini && !configurado.sheets) {
      return { tono: "alerta", texto: "Falta clave de API y Google Sheets: el administrador debe configurarlas en Vercel" };
    }
    if (!configurado.gemini) return { tono: "alerta", texto: "El administrador debe configurar la clave de API en Vercel" };
    return { tono: "alerta", texto: "El administrador debe configurar Google Sheets en Vercel" };
  }
  if (!cargando && errorCarga) {
    return { tono: "alerta", texto: "No se pudo verificar la configuración" };
  }
  return { tono: "neutro", texto: "Verificando…" };
}

const puntoPorTono: Record<Tono, string> = {
  ok: "bg-ok",
  alerta: "bg-alerta",
  error: "bg-error",
  neutro: "bg-apagado",
  info: "bg-info",
};

export function Encabezado(props: Props) {
  const estado = describirEstado(props);
  const verificando = props.cargando && !props.configurado;

  return (
    <header className="border-b border-borde bg-superficie/60">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-acento/15 text-acento"
            aria-hidden="true"
          >
            <IconoDocumento />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight tracking-tight sm:text-xl">
              Extractor de Comprobantes
            </h1>
            <p className="text-xs text-apagado sm:text-sm">
              Bancolombia · Nequi · Daviplata · Bre-B · Bold · PSE
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Chip tono={estado.tono} className="px-2.5 py-1" title="Estado de la configuración del servidor">
            {verificando ? (
              <Spinner className="h-3 w-3" />
            ) : (
              <span aria-hidden="true" className={`h-2 w-2 rounded-full ${puntoPorTono[estado.tono]}`} />
            )}
            <span role="status">{estado.texto}</span>
          </Chip>

          {props.sheetUrl ? (
            <a
              href={props.sheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-borde bg-superficie-2 px-3 py-1.5 text-sm font-medium text-texto transition-colors hover:border-apagado hover:bg-borde/60"
            >
              <IconoExterno />
              Abrir Google Sheet
            </a>
          ) : (
            <button
              type="button"
              disabled
              title="Aún no hay una hoja de cálculo configurada"
              className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-md border border-borde px-3 py-1.5 text-sm font-medium text-apagado opacity-60"
            >
              <IconoExterno />
              Abrir Google Sheet
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
