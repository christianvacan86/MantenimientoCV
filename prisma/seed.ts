import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function daysFromNow(n: number) {
  const d = new Date(); d.setDate(d.getDate() + n); d.setHours(9, 0, 0, 0); return d;
}
function daysAgo(n: number) { return daysFromNow(-n); }

async function main() {
  console.log("📅 Seed Parte 5: Planes de mantenimiento y Órdenes de Trabajo\n");

  const planner   = await prisma.user.findUniqueOrThrow({ where: { email: "planificador@zaimella.com" } });
  const tecnico1  = await prisma.user.findUniqueOrThrow({ where: { email: "tecnico@zaimella.com" } });
  const tecnico2  = await prisma.user.findUniqueOrThrow({ where: { email: "tecnico2@zaimella.com" } });
  const supervisor = await prisma.user.findUniqueOrThrow({ where: { email: "supervisor@zaimella.com" } });

  const mp1 = await prisma.machine.findUniqueOrThrow({ where: { code: "MP-L01" } });

  const act = async (code: string) =>
    prisma.maintenanceActivity.findFirstOrThrow({ where: { code, part: { machineId: mp1.id } } });

  let otCounter = 1000;
  function nextOT() { return `OT-${++otCounter}`; }

  // Helper crear plan + OT
  async function createPlanAndOT(opts: {
    actCode: string; plannedDate: Date; planStatus: string; otStatus: string;
    priority: string; techId?: string; supId?: string;
    techNotes?: string; supNotes?: string;
    startedAt?: Date; completedAt?: Date; approvedAt?: Date; rejectedAt?: Date;
    checklist?: string[]; spareParts?: {code:string; qty:number; used?:number}[];
  }) {
    const activity = await act(opts.actCode);
    const spareLinks = await prisma.activitySparePart.findMany({ where: { activityId: activity.id }, include: { sparePart: true } });

    const plan = await prisma.maintenancePlan.create({
      data: {
        activityId: activity.id,
        plannedDate: opts.plannedDate,
        status: opts.planStatus,
        plannedById: planner.id,
        notes: `Plan automático por uso acumulado`,
        triggerUsage: Math.round(activity.frequencyValue * 0.95),
      },
    });

    const ot = await prisma.workOrder.create({
      data: {
        code: nextOT(),
        planId: plan.id,
        title: activity.name,
        type: activity.type,
        status: opts.otStatus,
        priority: opts.priority,
        technicianId: opts.techId ?? null,
        supervisorId: opts.supId ?? null,
        assignedAt: opts.techId ? daysAgo(5) : null,
        startedAt: opts.startedAt ?? null,
        completedAt: opts.completedAt ?? null,
        approvedAt: opts.approvedAt ?? null,
        rejectedAt: opts.rejectedAt ?? null,
        technicianNotes: opts.techNotes ?? null,
        supervisorNotes: opts.supNotes ?? null,
      },
    });

    // Checklist
    const steps = opts.checklist ?? [
      "Asegurar bloqueo LOTO de la máquina",
      "Verificar EPPs y herramientas necesarias",
      activity.description ?? "Ejecutar actividad de mantenimiento",
      "Registrar parámetros y observaciones",
      "Limpiar área de trabajo y retirar herramientas",
      "Retirar bloqueo LOTO y verificar operación",
    ];
    for (let i = 0; i < steps.length; i++) {
      const isDone = ["COMPLETED_PENDING_APPROVAL","APPROVED"].includes(opts.otStatus);
      await prisma.workOrderChecklist.create({
        data: { workOrderId: ot.id, step: i + 1, description: steps[i], completed: isDone, completedAt: isDone ? opts.completedAt ?? daysAgo(1) : null },
      });
    }

    // Repuestos de la OT (tomados de los links de actividad)
    for (const link of spareLinks) {
      const custom = opts.spareParts?.find(sp => sp.code === link.sparePart.code);
      await prisma.workOrderSparePart.create({
        data: { workOrderId: ot.id, sparePartId: link.sparePartId, quantityPlanned: custom?.qty ?? link.quantity, quantityUsed: custom?.used ?? null },
      });
    }

    return { plan, ot };
  }

  // ── 1. OTs HISTÓRICAS APROBADAS (hace 30-10 días) ─────────────
  console.log("📝 Creando órdenes históricas aprobadas...");
  await createPlanAndOT({ actCode:"ACT-S4-02-A", plannedDate:daysAgo(28), planStatus:"COMPLETED", otStatus:"APPROVED", priority:"HIGH", techId:tecnico1.id, supId:supervisor.id, startedAt:daysAgo(28), completedAt:daysAgo(27), approvedAt:daysAgo(27), techNotes:"Limpieza ultrasónica realizada. Boquillas en perfecto estado. Se detectó una boquilla con orificio parcialmente obstruido, se procedió a desobstrucción.", supNotes:"Trabajo ejecutado correctamente. Aprobado.", spareParts:[{code:"REP-006",qty:2,used:1},{code:"REP-007",qty:4,used:2}] });
  await createPlanAndOT({ actCode:"ACT-S9-01-A", plannedDate:daysAgo(22), planStatus:"COMPLETED", otStatus:"APPROVED", priority:"MEDIUM", techId:tecnico2.id, supId:supervisor.id, startedAt:daysAgo(22), completedAt:daysAgo(22), approvedAt:daysAgo(21), techNotes:"Elementos filtrantes reemplazados. Se encontró uno con obstrucción severa en zona del tambor formador.", supNotes:"OK. Aprobado.", spareParts:[{code:"REP-015",qty:4,used:4}] });
  await createPlanAndOT({ actCode:"ACT-S1-01-A", plannedDate:daysAgo(18), planStatus:"COMPLETED", otStatus:"APPROVED", priority:"MEDIUM", techId:tecnico1.id, supId:supervisor.id, startedAt:daysAgo(18), completedAt:daysAgo(18), approvedAt:daysAgo(17), techNotes:"Lubricación completada. Rodamientos en buen estado. Temperatura de operación normal.", supNotes:"Aprobado.", spareParts:[{code:"REP-011",qty:1,used:1}] });
  await createPlanAndOT({ actCode:"ACT-S8-02-B", plannedDate:daysAgo(15), planStatus:"COMPLETED", otStatus:"APPROVED", priority:"LOW", techId:tecnico2.id, supId:supervisor.id, startedAt:daysAgo(15), completedAt:daysAgo(15), approvedAt:daysAgo(14), techNotes:"Inspección sin novedades. Niveles de aceite correctos.", supNotes:"Aprobado." });
  await createPlanAndOT({ actCode:"ACT-S2-02-B", plannedDate:daysAgo(12), planStatus:"COMPLETED", otStatus:"APPROVED", priority:"HIGH", techId:tecnico1.id, supId:supervisor.id, startedAt:daysAgo(12), completedAt:daysAgo(12), approvedAt:daysAgo(11), techNotes:"Limpieza profunda del dosificador SAP. Se retiró acumulación de SAP hidratado en paredes de tolva.", supNotes:"Trabajo bien ejecutado. Aprobado." });
  console.log("  ✅ 5 OTs aprobadas históricas");

  // ── 2. OT RECHAZADA ────────────────────────────────────────────
  console.log("📝 Creando OT rechazada...");
  await createPlanAndOT({ actCode:"ACT-S5-01-A", plannedDate:daysAgo(8), planStatus:"SCHEDULED", otStatus:"REJECTED", priority:"HIGH", techId:tecnico2.id, supId:supervisor.id, startedAt:daysAgo(8), completedAt:daysAgo(7), rejectedAt:daysAgo(7), techNotes:"Inspección realizada.", supNotes:"Rechazado: El checklist está incompleto. No se registraron los valores de desgaste medidos. Favor reiniciar y documentar correctamente.", spareParts:[{code:"REP-005",qty:1}] });
  console.log("  ✅ 1 OT rechazada");

  // ── 3. OT PENDIENTE DE APROBACIÓN ─────────────────────────────
  console.log("📝 Creando OT pendiente de aprobación...");
  await createPlanAndOT({ actCode:"ACT-S2-03-A", plannedDate:daysAgo(3), planStatus:"IN_PROGRESS", otStatus:"COMPLETED_PENDING_APPROVAL", priority:"HIGH", techId:tecnico1.id, supId:supervisor.id, startedAt:daysAgo(3), completedAt:daysAgo(1), techNotes:"Limpieza de moldes completada. Se encontraron depósitos de pulpa en 3 moldes. Todos limpios y verificados. Mallas en buen estado.", spareParts:[{code:"REP-017",qty:1,used:0}] });
  console.log("  ✅ 1 OT pendiente de aprobación");

  // ── 4. OTs EN PROGRESO ─────────────────────────────────────────
  console.log("📝 Creando OTs en progreso...");
  await createPlanAndOT({ actCode:"ACT-S4-01-A", plannedDate:daysAgo(2), planStatus:"IN_PROGRESS", otStatus:"IN_PROGRESS", priority:"HIGH", techId:tecnico2.id, supId:supervisor.id, startedAt:daysAgo(1), spareParts:[{code:"REP-007",qty:2},{code:"REP-019",qty:1}] });
  await createPlanAndOT({ actCode:"ACT-S1-01-B", plannedDate:daysAgo(1), planStatus:"IN_PROGRESS", otStatus:"IN_PROGRESS", priority:"CRITICAL", techId:tecnico1.id, supId:supervisor.id, startedAt:daysAgo(1) });
  console.log("  ✅ 2 OTs en progreso");

  // ── 5. OTs ASIGNADAS (por iniciar) ────────────────────────────
  console.log("📝 Creando OTs asignadas...");
  await createPlanAndOT({ actCode:"ACT-S4-02-B", plannedDate:daysFromNow(1), planStatus:"SCHEDULED", otStatus:"ASSIGNED", priority:"HIGH", techId:tecnico1.id, supId:supervisor.id, spareParts:[{code:"REP-007",qty:4}] });
  await createPlanAndOT({ actCode:"ACT-S9-02-A", plannedDate:daysFromNow(2), planStatus:"SCHEDULED", otStatus:"ASSIGNED", priority:"MEDIUM", techId:tecnico2.id, supId:supervisor.id });
  console.log("  ✅ 2 OTs asignadas");

  // ── 6. OTs PENDIENTES (sin asignar) ───────────────────────────
  console.log("📝 Creando OTs pendientes...");
  await createPlanAndOT({ actCode:"ACT-S1-04-A", plannedDate:daysFromNow(3), planStatus:"SCHEDULED", otStatus:"PENDING", priority:"MEDIUM" });
  await createPlanAndOT({ actCode:"ACT-S5-01-A", plannedDate:daysFromNow(5), planStatus:"SCHEDULED", otStatus:"PENDING", priority:"HIGH" });
  await createPlanAndOT({ actCode:"ACT-S8-03-A", plannedDate:daysFromNow(7), planStatus:"SCHEDULED", otStatus:"PENDING", priority:"MEDIUM" });
  await createPlanAndOT({ actCode:"ACT-S2-02-A", plannedDate:daysFromNow(10), planStatus:"SCHEDULED", otStatus:"PENDING", priority:"MEDIUM" });
  await createPlanAndOT({ actCode:"ACT-S10-04-A", plannedDate:daysFromNow(4), planStatus:"SCHEDULED", otStatus:"PENDING", priority:"LOW" });
  console.log("  ✅ 5 OTs pendientes");

  // ── 7. PLANES VENCIDOS ────────────────────────────────────────
  console.log("📝 Creando planes vencidos...");
  const act8 = await act("ACT-S2-01-A");
  await prisma.maintenancePlan.create({ data: { activityId: act8.id, plannedDate: daysAgo(5), status: "OVERDUE", plannedById: planner.id, notes: "VENCIDO - Requiere atención inmediata", triggerUsage: 380000 } });
  const act9 = await act("ACT-S4-02-A");
  await prisma.maintenancePlan.create({ data: { activityId: act9.id, plannedDate: daysAgo(3), status: "OVERDUE", plannedById: planner.id, notes: "VENCIDO - Boquillas requieren limpieza urgente", triggerUsage: 98000 } });
  console.log("  ✅ 2 planes vencidos (sin OT asignada)");

  const total = await prisma.workOrder.count();
  const totalPlans = await prisma.maintenancePlan.count();
  console.log(`\n✅ Seed Parte 5 completado.`);
  console.log(`   Total órdenes de trabajo: ${total}`);
  console.log(`   Total planes de mantenimiento: ${totalPlans}\n`);
}

main()
  .catch((e) => { console.error("❌ Error:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
