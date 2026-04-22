/**
 * PageHeader — Cabecera estándar de página.
 *
 * Props:
 *   title      {string}      — Título principal
 *   subtitle   {string}      — Subtítulo / descripción (opcional)
 *   right      {ReactElement} — Slot derecho: botón, badge, etc. (opcional)
 *
 * Uso:
 *   <PageHeader
 *     title="Panel de Control"
 *     subtitle="Resumen Operativo Corporativo"
 *     right={<span className="text-[12px] bg-white border px-3 py-1.5 shadow-sm rounded text-gray-500 font-bold">
 *       {new Date().toLocaleTimeString()}
 *     </span>}
 *   />
 */
export default function PageHeader({ title, subtitle, right }) {
  return (
    <div className="flex justify-between items-end px-1 mt-2 mb-2">
      <div>
        <h1 className="text-[26px] font-bold text-ink-soft tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-gray-500 font-medium text-[13px]">{subtitle}</p>
        )}
      </div>
      {right && <div>{right}</div>}
    </div>
  );
}
