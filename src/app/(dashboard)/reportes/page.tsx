"use client";
import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { formatNumber, STATUS_LABELS } from "@/lib/utils";

export default function ReportesPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard").then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading || !data) {
    return <div className="flex items-center justify-center py-20 text-gray-400">Cargando reportes...</div>;
  }

  const pieData = [
    { name: "Aprobadas", value: data.completedThisMonth, color: "#00A651" },
    { name: "Pendientes", value: data.pendingWorkOrders, color: "#0071CE" },
    { name: "Pend. Aprobación", value: data.pendingApproval, color: "#8B5CF6" },
    { name: "Vencidas", value: data.overdueWorkOrders, color: "#EF4444" },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Reportes y Analítica</h1>
        <p className="text-sm text-gray-500">Indicadores de gestión de mantenimiento</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "OT Aprobadas (mes)", value: data.completedThisMonth, color: "#00A651" },
          { label: "OT Pendientes", value: data.pendingWorkOrders, color: "#0071CE" },
          { label: "Pend. Aprobación", value: data.pendingApproval, color: "#8B5CF6" },
          { label: "OT Vencidas", value: data.overdueWorkOrders, color: "#EF4444" },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">{k.label}</p>
            <p className="text-3xl font-bold mt-1" style={{ color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Production Chart */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-4">Producción Últimos 7 Días</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.productionLast7Days} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <Tooltip formatter={(v: number) => [formatNumber(v) + " uds", "Producción"]} />
              <Bar dataKey="quantity" fill="#003087" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* OT Status Pie */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-4">Estado de Órdenes de Trabajo</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                  paddingAngle={3} dataKey="value">
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v: number) => [v + " órdenes"]} />
                <Legend iconType="circle" iconSize={10} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-gray-400 text-sm">No hay datos</div>
          )}
        </div>
      </div>

      {/* Upcoming Plans */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-800 mb-4">Próximas Actividades (7 días)</h3>
        {data.upcomingPlans.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No hay actividades programadas en los próximos 7 días</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left pb-3 font-semibold text-gray-600">Fecha</th>
                  <th className="text-left pb-3 font-semibold text-gray-600">Máquina</th>
                  <th className="text-left pb-3 font-semibold text-gray-600">Actividad</th>
                  <th className="text-left pb-3 font-semibold text-gray-600">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.upcomingPlans.map((p: any) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="py-2.5 font-medium text-gray-700">
                      {new Date(p.plannedDate).toLocaleDateString("es-EC", { day: "2-digit", month: "2-digit" })}
                    </td>
                    <td className="py-2.5 text-gray-600">{p.activity.part.machine.code}</td>
                    <td className="py-2.5 text-gray-700">{p.activity.name}</td>
                    <td className="py-2.5">
                      <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{STATUS_LABELS[p.status]}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
