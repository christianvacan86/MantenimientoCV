"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Credenciales incorrectas. Verifique su email y contraseña.");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: "linear-gradient(135deg, #003087 0%, #0071CE 100%)" }}>
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 text-white">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-2xl shadow-xl mb-6">
            <svg viewBox="0 0 80 80" className="w-16 h-16" fill="none">
              <rect width="80" height="80" rx="16" fill="#003087"/>
              <path d="M20 55 L20 30 Q20 25 25 25 L35 25 Q40 25 40 30 L40 55" stroke="white" strokeWidth="4" fill="none" strokeLinecap="round"/>
              <path d="M40 40 L55 40 Q60 40 60 45 L60 55" stroke="#00A651" strokeWidth="4" fill="none" strokeLinecap="round"/>
              <circle cx="52" cy="32" r="8" fill="#0071CE" stroke="white" strokeWidth="2"/>
              <path d="M49 32 L51.5 34.5 L56 30" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-4xl font-bold mb-2">Zaimella</h1>
          <p className="text-xl text-blue-200">Sistema de Gestión de Mantenimiento</p>
        </div>
        <div className="max-w-sm space-y-4 text-blue-100">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
            </div>
            <p>Mantenimiento preventivo basado en producción de pañales</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
            </div>
            <p>Calendario de planificación con órdenes de trabajo automáticas</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
            </div>
            <p>Control de repuestos y checklist de actividades técnicas</p>
          </div>
        </div>
      </div>

      {/* Right panel - Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8 lg:hidden">
            <h1 className="text-2xl font-bold text-primary-500">Zaimella</h1>
            <p className="text-gray-500 text-sm">Sistema de Mantenimiento</p>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-1">Bienvenido</h2>
          <p className="text-gray-500 mb-8">Ingrese sus credenciales para continuar</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="usuario@zaimella.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-lg text-white font-semibold transition-all"
              style={{ background: loading ? "#94a3b8" : "linear-gradient(90deg, #003087 0%, #0071CE 100%)" }}
            >
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>

          <div className="mt-8 p-4 bg-gray-50 rounded-lg text-xs text-gray-500">
            <p className="font-semibold mb-2 text-gray-600">Usuarios de prueba:</p>
            <div className="space-y-1">
              <p><span className="font-medium">Admin:</span> admin@zaimella.com / admin123</p>
              <p><span className="font-medium">Planificador:</span> planificador@zaimella.com / plan123</p>
              <p><span className="font-medium">Técnico:</span> tecnico@zaimella.com / tec123</p>
              <p><span className="font-medium">Supervisor:</span> supervisor@zaimella.com / sup123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
