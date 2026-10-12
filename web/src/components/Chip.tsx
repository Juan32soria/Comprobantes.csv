import type { ReactNode } from "react";
import type { Estado, EstadoArchivo } from "./tipos";
import { Spinner } from "./Iconos";

export type Tono = "ok" | "alerta" | "error" | "neutro" | "info";

const clasesPorTono: Record<Tono, string> = {
  ok: "bg-ok/15 text-ok border-ok/40",
  alerta: "bg-alerta/15 text-alerta border-alerta/40",
  error: "bg-error/15 text-error border-error/40",
  neutro: "bg-superficie-2 text-apagado border-borde",
  info: "bg-info/15 text-info border-info/40",
};

type PropsChip = {
  tono: Tono;
  children: ReactNode;
  className?: string;
  title?: string;
};

/** Píldora pequeña con texto (nunca solo color). */
export function Chip({ tono, children, className = "", title }: PropsChip) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${clasesPorTono[tono]} ${className}`}
    >
      {children}
    </span>
  );
}

/** Píldora de estado OK / REVISAR. */
export function ChipEstado({ estado, className = "" }: { estado: Estado; className?: string }) {
  const esOk = estado === "OK";
  return (
    <Chip tono={esOk ? "ok" : "alerta"} className={className}>
      <span aria-hidden="true">{esOk ? "✓" : "!"}</span>
      {estado}
    </Chip>
  );
}

const textoEstadoArchivo: Record<EstadoArchivo, { tono: Tono; texto: string }> = {
  pendiente: { tono: "neutro", texto: "Pendiente" },
  procesando: { tono: "info", texto: "Procesando" },
  ok: { tono: "ok", texto: "OK" },
  revisar: { tono: "alerta", texto: "REVISAR" },
  error: { tono: "error", texto: "Error" },
};

/** Chip de estado de un archivo en la cola. */
export function ChipArchivo({ estado, className = "" }: { estado: EstadoArchivo; className?: string }) {
  const { tono, texto } = textoEstadoArchivo[estado];
  return (
    <Chip tono={tono} className={className}>
      {estado === "procesando" && <Spinner className="h-3 w-3" />}
      {texto}
    </Chip>
  );
}
