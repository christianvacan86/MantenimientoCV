/**
 * SectionCard — Contenedor blanco con barra de cabecera de color.
 * Patrón recurrente en tablas, listas y paneles de esta app.
 *
 * Props:
 *   headerContent {ReactElement|string} — Contenido de la barra superior
 *   headerColor   {string}              — Color de fondo de la barra (hex). Default: brand green
 *   headerTextColor {string}            — Color del texto de la barra. Default: 'text-white'
 *   children      {ReactElement}        — Contenido interno de la card
 *   className     {string}              — Clases extra para el wrapper externo (opcional)
 *   bodyClassName {string}              — Clases extra para el cuerpo interno (opcional)
 *
 * Uso:
 *   <SectionCard
 *     headerContent={
 *       <div className="flex gap-4 ml-auto items-center">
 *         <SearchIcon fontSize="small" className="cursor-pointer" />
 *         <SyncIcon fontSize="small" className="cursor-pointer" />
 *       </div>
 *     }
 *   >
 *     <table>...</table>
 *   </SectionCard>
 */
export default function SectionCard({
  headerContent,
  headerColor = '#00a651',
  headerTextColor = 'text-white',
  children,
  className = '',
  bodyClassName = '',
}) {
  return (
    <div className={`bg-surface-card border border-ui shadow-sm flex flex-col ${className}`}>
      <div
        className={`px-4 py-1.5 flex justify-between items-center ${headerTextColor}`}
        style={{ backgroundColor: headerColor }}
      >
        {headerContent}
      </div>
      <div className={bodyClassName}>
        {children}
      </div>
    </div>
  );
}
