import type { Configurado } from "./tipos";
import { Chip, type Tono } from "./Chip";
import { ClaveApi } from "./ClaveApi";
import { IconoDocumento, IconoExterno, IconoSalir, Spinner } from "./Iconos";

type Props = {
  configurado: Configurado | null;
  cargando: boolean;
  errorCarga: boolean;
  sheetUrl: string | null;
  /** Clave guardada en el navegador (solo se usa si el servidor no tiene la suya). */
  claveLocal: string;
  /** True cuando ya se leyó localStorage (evita parpadeos al cargar). */
  claveLista: boolean;
  onGuardarClave: (clave: string) => void;
  onBorrarClave: () => void;
  /** Cierra la sesión (borra el token) y vuelve a la pantalla de login. */
  onCerrarSesion: () => void;
};

type EstadoChip = { tono: Tono; texto: string };

/** Chip de Google Sheets según la configuración del servidor. */
function estadoSheets({ configurado, cargando, errorCarga }: Props): EstadoChip {
  if (configurado) {
    return configurado.sheets
      ? { tono: "ok", texto: "Conectado a Google Sheets" }
      : { tono: "alerta", texto: "El administrador debe configurar Google Sheets en Vercel" };
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

function ChipEstado({
  estado,
  verificando,
  title,
}: {
  estado: EstadoChip;
  verificando: boolean;
  title: string;
}) {
  return (
    <Chip tono={estado.tono} className="px-2.5 py-1" title={title}>
      {verificando ? (
        <Spinner className="h-3 w-3" />
      ) : (
        <span aria-hidden="true" className={`h-2 w-2 rounded-full ${puntoPorTono[estado.tono]}`} />
      )}
      <span role="status">{estado.texto}</span>
    </Chip>
  );
}

export function Encabezado(props: Props) {
  const sheets = estadoSheets(props);
  const verificando = props.cargando && !props.configurado;
  // null mientras no se sepa qué tiene el servidor: entonces no se muestra nada de la clave.
  const servidorConClave = props.configurado?.gemini ?? null;

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
          {servidorConClave === true && (
            <ChipEstado
              estado={{ tono: "ok", texto: "API configurada por el administrador" }}
              verificando={false}
              title="La clave de Gemini está en las variables de entorno de Vercel"
            />
          )}
          {servidorConClave === false && props.claveLista && (
            <ClaveApi
              clave={props.claveLocal}
              onGuardar={props.onGuardarClave}
              onBorrar={props.onBorrarClave}
            />
          )}

          <ChipEstado estado={sheets} verificando={verificando} title="Estado de Google Sheets en el servidor" />

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

          <button
            type="button"
            onClick={props.onCerrarSesion}
            title="Cerrar la sesión en este navegador"
            className="inline-flex items-center gap-1.5 rounded-md border border-borde bg-superficie-2 px-3 py-1.5 text-sm font-medium text-texto transition-colors hover:border-apagado hover:bg-borde/60"
          >
            <IconoSalir />
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>
  );
}
