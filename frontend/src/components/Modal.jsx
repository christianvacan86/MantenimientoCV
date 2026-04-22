import CloseIcon from '@mui/icons-material/Close';

/**
 * Modal — Overlay modal estándar con cabecera oscura y cuerpo scrollable.
 *
 * Props:
 *   isOpen      {boolean}      — Controla visibilidad
 *   onClose     {function}     — Callback al cerrar (X o backdrop)
 *   title       {string}       — Título principal en la cabecera
 *   subtitle    {string}       — Subtítulo / código en la cabecera (opcional)
 *   size        {string}       — 'sm' | 'md' | 'lg' | 'xl' — ancho máximo. Default: 'lg'
 *   headerColor {string}       — Color de fondo de la cabecera (hex). Default: '#051C2C'
 *   children    {ReactElement} — Contenido del cuerpo del modal
 *
 * Uso:
 *   <Modal
 *     isOpen={isModalOpen}
 *     onClose={() => setIsModalOpen(false)}
 *     title="Crear Activo"
 *     subtitle="Formulario de registro"
 *   >
 *     <form>...</form>
 *   </Modal>
 */

const sizeClasses = {
  sm: 'max-w-lg',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
};

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  size = 'lg',
  headerColor = '#051C2C',
  children,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`bg-surface-card rounded-sm shadow-xl w-full ${sizeClasses[size]} overflow-hidden flex flex-col max-h-[90vh]`}>
        {/* Cabecera */}
        <div
          className="px-4 py-3 flex justify-between items-center shrink-0"
          style={{ backgroundColor: headerColor }}
        >
          <div className="flex items-end gap-3">
            <h2 className="font-bold text-[18px] tracking-wide text-white">{title}</h2>
            {subtitle && (
              <span className="font-mono text-[14px] text-white/70">{subtitle}</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-red-400 transition-colors"
            aria-label="Cerrar"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Cuerpo scrollable */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
