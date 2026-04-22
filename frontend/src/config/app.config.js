// ============================================================
// CONFIGURACIÓN DE APLICACIÓN
// Para reutilizar en una nueva app, solo cambiar estos valores.
// ============================================================

const config = {
  // Código del módulo en T_ADMI_MODULO (define qué permisos se cargan del SSO)
  moduleCode: 'MTTO',

  // Nombre que aparece en el header y en mensajes de la app
  appName: 'Mantenimiento Zaimella',

  // URL del portal centralizado APEX (destino del logout y acceso denegado)
  portalUrl: 'http://sistemas.zaimella.com:8090/apex/f?p=100:9999',

  // Base URL del backend — se puede sobreescribir con variable de entorno Vite
  apiBase: import.meta.env.VITE_API_BASE || 'http://localhost:8000',
};

export default config;
