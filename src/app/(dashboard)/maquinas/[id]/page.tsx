"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  cn,
  STATUS_LABELS,
  STATUS_COLORS,
  MACHINE_TYPE_LABELS,
  ACTIVITY_TYPE_LABELS,
} from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UsageTracker {
  id: string;
  currentUsage: number;
  lastResetDate: string;
}

interface MaintenanceActivity {
  id: string;
  name: string;
  type: string;
  frequencyType: string; // PRODUCTION_COUNT | CALENDAR_DAYS
  frequencyValue: number;
  estimatedHours?: number | null;
  usageTracker?: UsageTracker | null;
}

interface MachinePart {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  maintenanceActivities: MaintenanceActivity[];
  children: MachinePart[];
}

interface MachineDetail {
  id: string;
  code: string;
  name: string;
  type: string;
  status: string;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  location?: string | null;
  notes?: string | null;
  parts: MachinePart[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getProgressColor(pct: number): string {
  if (pct >= 90) return "bg-red-500";
  if (pct >= 70) return "bg-yellow-400";
  return "bg-[#00A651]";
}

function getProgressTrackColor(pct: number): string {
  if (pct >= 90) return "bg-red-100";
  if (pct >= 70) return "bg-yellow-100";
  return "bg-green-100";
}

function flattenActivities(
  parts: MachinePart[]
): { part: MachinePart; activity: MaintenanceActivity }[] {
  const result: { part: MachinePart; activity: MaintenanceActivity }[] = [];
  function walk(part: MachinePart) {
    for (const act of part.maintenanceActivities) {
      result.push({ part, activity: act });
    }
    for (const child of part.children) {
      walk(child);
    }
  }
  for (const part of parts) {
    walk(part);
  }
  return result;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoItem({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-700">{value}</p>
    </div>
  );
}

function PartNode({
  part,
  depth,
}: {
  part: MachinePart;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = part.children.length > 0;
  const hasActivities = part.maintenanceActivities.length > 0;

  return (
    <div className={cn("border-l-2 border-gray-100", depth > 0 && "ml-4 pl-3")}>
      <div
        className={cn(
          "flex items-start gap-2 py-2 px-3 rounded-lg",
          depth === 0 ? "bg-gray-50" : "hover:bg-gray-50"
        )}
      >
        {hasChildren && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-0.5 flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-[#0071CE] hover:bg-blue-50 transition-colors"
          >
            <svg
              className={cn("w-3.5 h-3.5 transition-transform", expanded && "rotate-90")}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
        {!hasChildren && <div className="w-5 flex-shrink-0" />}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-semibold text-gray-400">{part.code}</span>
            <span className="text-sm font-semibold text-gray-800">{part.name}</span>
            {hasActivities && (
              <span className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                {part.maintenanceActivities.length} actividad{part.maintenanceActivities.length !== 1 ? "es" : ""}
              </span>
            )}
          </div>
          {part.description && (
            <p className="text-xs text-gray-400 mt-0.5">{part.description}</p>
          )}
        </div>
      </div>

      {hasChildren && expanded && (
        <div className="mt-1 space-y-1">
          {part.children.map((child) => (
            <PartNode key={child.id} part={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MachineDetailPage() {
  const params = useParams<{ id: string }>();
  const [machine, setMachine] = useState<MachineDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"estructura" | "actividades">("estructura");

  useEffect(() => {
    if (!params?.id) return;
    async function fetchMachine() {
      try {
        const res = await fetch(`/api/machines/${params.id}`);
        if (!res.ok) {
          if (res.status === 404) throw new Error("Máquina no encontrada");
          throw new Error("Error al cargar la máquina");
        }
        const data: MachineDetail = await res.json();
        setMachine(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    }
    fetchMachine();
  }, [params?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div
            className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-3"
            style={{ borderColor: "#003087", borderTopColor: "transparent" }}
          />
          <p className="text-sm text-gray-500">Cargando máquina...</p>
        </div>
      </div>
    );
  }

  if (error || !machine) {
    return (
      <div className="space-y-4">
        <Link
          href="/maquinas"
          className="inline-flex items-center gap-1.5 text-sm text-[#0071CE] hover:text-[#003087] font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver a Máquinas
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center max-w-sm mx-auto">
          <p className="text-red-600 font-medium">{error ?? "Máquina no encontrada"}</p>
        </div>
      </div>
    );
  }

  const allActivities = flattenActivities(machine.parts);

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        href="/maquinas"
        className="inline-flex items-center gap-1.5 text-sm text-[#0071CE] hover:text-[#003087] font-medium transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Volver a Máquinas
      </Link>

      {/* Machine Header Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-[#003087]">{machine.name}</h1>
              <span
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-semibold",
                  STATUS_COLORS[machine.status] ?? "bg-gray-100 text-gray-600"
                )}
              >
                {STATUS_LABELS[machine.status] ?? machine.status}
              </span>
            </div>
            <p className="text-sm font-mono font-semibold text-gray-400 mt-1">{machine.code}</p>
          </div>
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-[#003087]/10 text-[#003087]">
            {MACHINE_TYPE_LABELS[machine.type] ?? machine.type}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-gray-100">
          <InfoItem label="Marca" value={machine.brand} />
          <InfoItem label="Modelo" value={machine.model} />
          <InfoItem label="N° de Serie" value={machine.serialNumber} />
          <InfoItem label="Ubicación" value={machine.location} />
        </div>

        {machine.notes && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-1">Notas</p>
            <p className="text-sm text-gray-600">{machine.notes}</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div>
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab("estructura")}
            className={cn(
              "px-5 py-3 text-sm font-semibold border-b-2 transition-colors -mb-px",
              activeTab === "estructura"
                ? "border-[#0071CE] text-[#0071CE]"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            Estructura
          </button>
          <button
            onClick={() => setActiveTab("actividades")}
            className={cn(
              "px-5 py-3 text-sm font-semibold border-b-2 transition-colors -mb-px",
              activeTab === "actividades"
                ? "border-[#0071CE] text-[#0071CE]"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            Actividades de Mantenimiento
            {allActivities.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                {allActivities.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-5">
          {activeTab === "estructura" && (
            <StructureTab parts={machine.parts} />
          )}
          {activeTab === "actividades" && (
            <ActivitiesTab activities={allActivities} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Structure Tab ────────────────────────────────────────────────────────────

function StructureTab({ parts }: { parts: MachinePart[] }) {
  if (parts.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center text-gray-400">
        <svg className="w-10 h-10 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
        <p className="text-sm">Esta máquina no tiene partes registradas.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <h2 className="text-base font-semibold text-[#003087] mb-4">
        Estructura de Partes ({parts.length} nivel{parts.length !== 1 ? "es" : ""} raíz)
      </h2>
      <div className="space-y-2">
        {parts.map((part) => (
          <PartNode key={part.id} part={part} depth={0} />
        ))}
      </div>
    </div>
  );
}

// ─── Activities Tab ───────────────────────────────────────────────────────────

function ActivitiesTab({
  activities,
}: {
  activities: { part: MachinePart; activity: MaintenanceActivity }[];
}) {
  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center text-gray-400">
        <svg className="w-10 h-10 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p className="text-sm">No hay actividades de mantenimiento registradas.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <th className="px-4 py-3">Parte</th>
              <th className="px-4 py-3">Actividad</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Frecuencia</th>
              <th className="px-4 py-3">Uso Actual</th>
              <th className="px-4 py-3 min-w-[140px]">Progreso</th>
              <th className="px-4 py-3 text-right">Horas Est.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {activities.map(({ part, activity }) => {
              const currentUsage = activity.usageTracker?.currentUsage ?? 0;
              const pct = activity.frequencyValue > 0
                ? Math.min(Math.round((currentUsage / activity.frequencyValue) * 100), 100)
                : 0;
              const unit =
                activity.frequencyType === "PRODUCTION_COUNT" ? "pañales" : "días";

              return (
                <tr key={activity.id} className="hover:bg-gray-50 transition-colors">
                  {/* Parte */}
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-800 truncate max-w-[120px]">{part.name}</p>
                      <p className="text-xs font-mono text-gray-400">{part.code}</p>
                    </div>
                  </td>

                  {/* Actividad */}
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800 max-w-[160px] truncate">{activity.name}</p>
                  </td>

                  {/* Tipo */}
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 whitespace-nowrap">
                      {ACTIVITY_TYPE_LABELS[activity.type] ?? activity.type}
                    </span>
                  </td>

                  {/* Frecuencia */}
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                    {activity.frequencyValue.toLocaleString("es-EC")} {unit}
                  </td>

                  {/* Uso Actual */}
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                    {currentUsage.toLocaleString("es-EC")} {unit}
                  </td>

                  {/* Progress Bar */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={cn("flex-1 h-2 rounded-full overflow-hidden min-w-[80px]", getProgressTrackColor(pct))}>
                        <div
                          className={cn("h-full rounded-full transition-all duration-300", getProgressColor(pct))}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span
                        className={cn(
                          "text-xs font-semibold w-9 text-right flex-shrink-0",
                          pct >= 90 ? "text-red-600" : pct >= 70 ? "text-yellow-600" : "text-[#00A651]"
                        )}
                      >
                        {pct}%
                      </span>
                    </div>
                  </td>

                  {/* Horas Est. */}
                  <td className="px-4 py-3 text-right text-gray-600 whitespace-nowrap">
                    {activity.estimatedHours != null
                      ? `${activity.estimatedHours} h`
                      : <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
