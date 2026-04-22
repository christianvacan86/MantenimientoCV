import React from 'react';

/**
 * KPICard — Tarjeta de indicador clave de rendimiento.
 *
 * Props:
 *   label      {string}      — Etiqueta superior (ej. "Activos Registrados")
 *   value      {string|number} — Valor principal a mostrar
 *   icon       {ReactElement} — Ícono de MUI
 *   accentColor {string}     — Color del borde izquierdo y del ícono (hex o clase Tailwind)
 *                              Defaults: '#00a651' (brand green)
 *   iconBg     {string}      — Clase Tailwind para el fondo del ícono (ej. 'bg-brand-light')
 *   iconColor  {string}      — Clase Tailwind para el color del ícono (ej. 'text-brand')
 *
 * Uso:
 *   <KPICard
 *     label="Activos Registrados"
 *     value={42}
 *     icon={<FactoryIcon />}
 *     accentColor="#00a651"
 *     iconBg="bg-brand-light"
 *     iconColor="text-brand"
 *   />
 */
export default function KPICard({
  label,
  value,
  icon,
  accentColor = '#00a651',
  iconBg = 'bg-brand-light',
  iconColor = 'text-brand',
}) {
  return (
    <div
      className="bg-surface-card border border-ui p-4 flex items-center justify-between rounded shadow-sm border-l-4"
      style={{ borderLeftColor: accentColor }}
    >
      <div>
        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
          {label}
        </div>
        <div className="text-[28px] font-bold text-ink leading-none">{value}</div>
      </div>
      <div className={`${iconBg} ${iconColor} p-3 rounded-full`}>
        {React.cloneElement(icon, { fontSize: 'medium' })}
      </div>
    </div>
  );
}
