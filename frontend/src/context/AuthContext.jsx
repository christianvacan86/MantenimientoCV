import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const NO_ACCESS = {
  agregar: false, guardar: false, eliminar: false,
  comentar: false, imprimir: false, cancelar: false,
};

export function AuthProvider({ children }) {
  const [state, setState] = useState({
    loading:     true,
    user:        null,
    nombre:      null,
    permissions: {},
    authError:   null,   // mensaje de error específico del backend
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let sess = params.get('sess');
    let usr  = params.get('usr');

    if (sess) sessionStorage.setItem('zml_sess', sess);
    else      sess = sessionStorage.getItem('zml_sess');

    if (usr)  sessionStorage.setItem('zml_usr', usr);
    else      usr = sessionStorage.getItem('zml_usr');

    if (params.has('sess') || params.has('usr')) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (!sess) {
      setState({ loading: false, user: null, nombre: null, permissions: {}, authError: 'NO_SESSION' });
      return;
    }

    const query = new URLSearchParams({ session_id: sess });
    if (usr) query.set('usr', usr);

    fetch(`http://localhost:8000/api/auth/verify?${query}`)
      .then(async r => {
        if (r.ok) return r.json();
        // Capturar el mensaje de error específico del backend
        const body = await r.json().catch(() => ({}));
        const err  = new Error(body.detail || 'Error de autenticación');
        err.status = r.status;
        throw err;
      })
      .then(d => setState({
        loading:     false,
        user:        d.username,
        nombre:      d.nombre,
        permissions: d.permissions || {},
        authError:   null,
      }))
      .catch(err => {
        // Limpiar sessionStorage si la sesión fue rechazada por el servidor
        if (err.status === 401 || err.status === 403) {
          sessionStorage.removeItem('zml_sess');
          sessionStorage.removeItem('zml_usr');
        }
        setState({
          loading:     false,
          user:        null,
          nombre:      null,
          permissions: {},
          authError:   err.message || 'Error de conexión con el servidor',
        });
      });
  }, []);

  const getPagePermissions = (pageCode) => {
    if (Object.keys(state.permissions).length === 0) {
      return { agregar: true, guardar: true, eliminar: true, comentar: true, imprimir: true, cancelar: true };
    }
    return state.permissions[pageCode] ?? NO_ACCESS;
  };

  const hasPageAccess = (pageCode) => {
    if (Object.keys(state.permissions).length === 0) return true;
    return pageCode in state.permissions;
  };

  const logout = () => {
    sessionStorage.removeItem('zml_sess');
    sessionStorage.removeItem('zml_usr');
    window.location.href = 'http://sistemas.zaimella.com:8090/apex/f?p=100:9999';
  };

  return (
    <AuthContext.Provider value={{ ...state, getPagePermissions, hasPageAccess, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
