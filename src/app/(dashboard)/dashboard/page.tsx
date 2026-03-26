"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  cn,
  formatDate,
  formatNumber,
  STATUS_LABELS,
  STATUS_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
} from "@/lib/utils";

interface DashboardData {
  totalMachines: number;
  operationalMachines: number;
  machinesInMaintenance: number;
  pendingWorkOrders: number;
  overdueWorkOrders: number;
  completedThisMonth: number;
  pendingApproval: number;
  todayProduction: number;
  recentWorkOrders: RecentWorkOrder[];
  productionLast7Days: { date: string; quantity: number }[];
  upcomingPlans: UpcomingPlan[];
}

interface RecentWorkOrder {
  id: string;
  code: string;
  title: string;
  status: string;
  priority: string;
  technician?: { id: string; name: string; email: string; role: string } | null;
}

interface UpcomingPlan {
  id: string;
  plannedDate: string;
  status: string;
  activity: {
    id: string;
    name: string;
    part: {
      id: string;
      name: string;
      machine: { id: string; name: string };
    };
  };
}

function KpiCard({
  title,
  value,
  sub,
  iconBg,
  icon,
}: {
  title: string;
  value: string | number;
  sub?: string;
  iconBg: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4 border border-gray-100">
      <div
        className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0",
          iconBg
        )}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 mb-0.5 truncate">{title}</p>
        <p className="text-2xl font-bold text-gray-800 leading-none">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = new Date();
  const todayStr = today.toLocaleDateString("es-EC", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const todayStrCapitalized = todayStr.charAt(0).toUpperCase() + todayStr.slice(1);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch("/api/dashboard");
        if (!res.ok) throw new Error("Error al cargar el dashboard");
        const json: DashboardData = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const chartData =
    data?.productionLast7Days.map((d) => {
      const dt = new Date(d.date + "T00:00:00");
      const dd = String(dt.getDate()).padStart(2, "0");
      const mm = String(dt.getMonth() + 1).padStart(2, "0");
      return { date: `${dd}/${mm}`, quantity: d.quantity };
    }) ?? [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div
            className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-3"
            style={{ borderColor: "#003087", borderTopColor: "transparent" }}
          />
          <p className="text-sm text-gray-500">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center max-w-sm">
          <p className="text-red-600 font-medium">Error al cargar</p>
          <p className="text-red-400 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#003087]">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">{todayStrCapitalized}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* 1. Máquinas Operativas */}
        <KpiCard
          title="Máquinas Operativas"
          value={`${data?.operationalMachines ?? 0}/${data?.totalMachines ?? 0}`}
          iconBg="bg-green-100"
          icon={
            <svg className="w-6 h-6 text-[#00A651]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
            </svg>
          }
        />
        {/* 2. OT Pendientes */}
        <KpiCard
          title="OT Pendientes"
          value={data?.pendingWorkOrders ?? 0}
          iconBg="bg-blue-100"
          icon={
            <svg className="w-6 h-6 text-[#0071CE]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
        {/* 3. Pendiente Aprobación */}
        <KpiCard
          title="Pendiente Aprobación"
          value={data?.pendingApproval ?? 0}
          iconBg="bg-purple-100"
          icon={
            <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        {/* 4. OT Vencidas */}
        <KpiCard
          title="OT Vencidas"
          value={data?.overdueWorkOrders ?? 0}
          iconBg="bg-red-100"
          icon={
            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />
        {/* 5. Producción Hoy */}
        <KpiCard
          title="Producción Hoy"
          value={formatNumber(data?.todayProduction ?? 0)}
          sub="pañales"
          iconBg="bg-green-100"
          icon={
            <svg className="w-6 h-6 text-[#00A651]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
        {/* 6. Completadas este Mes */}
        <KpiCard
          title="Completadas este Mes"
          value={data?.completedThisMonth ?? 0}
          iconBg="bg-blue-100"
          icon={
            <svg className="w-6 h-6 text-[#0071CE]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Production Chart */}
      <div className="bg-white rounded-xl shadow p-5 border border-gray-100">
        <h2 className="text-base font-semibold text-[#003087] mb-4">
          Producción Últimos 7 Días
        </h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 12, fill: "#6b7280" }}
              axisLine={false}
              tickLine={false}
              width={64}
              tickFormatter={(v: number) => formatNumber(v)}
            />
            <Tooltip
              formatter={(value: number) => [formatNumber(value), "Pañales"]}
              labelStyle={{ color: "#374151" }}
              contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: 13 }}
            />
            <Bar dataKey="quantity" fill="#0071CE" radius={[4, 4, 0, 0]} maxBarSize={56} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Work Orders */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-base font-semibold text-[#003087] mb-4">Órdenes Recientes</h2>
          {!data?.recentWorkOrders.length ? (
            <p className="text-sm text-gray-400 text-center py-6">No hay órdenes recientes</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                    <th className="pb-2 font-medium pr-3">Código</th>
                    <th className="pb-2 font-medium pr-3">Título</th>
                    <th className="pb-2 font-medium pr-3">Estado</th>
                    <th className="pb-2 font-medium pr-3">Prioridad</th>
                    <th className="pb-2 font-medium">Técnico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.recentWorkOrders.map((wo) => (
                    <tr key={wo.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-2.5 pr-3 font-mono text-xs text-gray-500 whitespace-nowrap">{wo.code}</td>
                      <td className="py-2.5 pr-3 font-medium text-gray-800 max-w-[130px] truncate">{wo.title}</td>
                      <td className="py-2.5 pr-3 whitespace-nowrap">
                        <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", STATUS_COLORS[wo.status] ?? "bg-gray-100 text-gray-600")}>
                          {STATUS_LABELS[wo.status] ?? wo.status}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 whitespace-nowrap">
                        <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", PRIORITY_COLORS[wo.priority] ?? "bg-gray-100 text-gray-600")}>
                          {PRIORITY_LABELS[wo.priority] ?? wo.priority}
                        </span>
                      </td>
                      <td className="py-2.5 text-xs text-gray-500 truncate max-w-[100px]">
                        {wo.technician?.name ?? <span className="text-gray-300 italic">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Upcoming Plans */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-base font-semibold text-[#003087] mb-4">Próximas Actividades</h2>
          {!data?.upcomingPlans.length ? (
            <p className="text-sm text-gray-400 text-center py-6">No hay actividades próximas</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {data.upcomingPlans.map((plan) => (
                <li key={plan.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {plan.activity?.name ?? "—"}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {plan.activity?.part?.machine?.name ?? "—"}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatDate(plan.plannedDate)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium",
                      STATUS_COLORS[plan.status] ?? "bg-gray-100 text-gray-600"
                    )}
                  >
                    {STATUS_LABELS[plan.status] ?? plan.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
