import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const sevenDaysFromNow = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Machine counts
    const [totalMachines, operationalMachines, machinesInMaintenance] = await Promise.all([
      prisma.machine.count(),
      prisma.machine.count({ where: { status: "OPERATIONAL" } }),
      prisma.machine.count({ where: { status: "MAINTENANCE" } }),
    ]);

    // Work order counts
    const [pendingWorkOrders, pendingApproval, completedThisMonth] = await Promise.all([
      prisma.workOrder.count({
        where: { status: { in: ["PENDING", "ASSIGNED", "IN_PROGRESS"] } },
      }),
      prisma.workOrder.count({
        where: { status: "COMPLETED_PENDING_APPROVAL" },
      }),
      prisma.workOrder.count({
        where: {
          status: "APPROVED",
          approvedAt: { gte: monthStart, lt: monthEnd },
        },
      }),
    ]);

    // Overdue plans
    const overdueWorkOrders = await prisma.maintenancePlan.count({
      where: {
        OR: [
          { status: "OVERDUE" },
          {
            status: "SCHEDULED",
            plannedDate: { lt: todayStart },
          },
        ],
      },
    });

    // Today's production: sum all productionLogs with today's date
    const todayProductionAgg = await prisma.productionLog.aggregate({
      _sum: { quantity: true },
      where: {
        date: { gte: todayStart, lt: todayEnd },
      },
    });
    const todayProduction = todayProductionAgg._sum.quantity ?? 0;

    // Recent work orders (last 5)
    const recentWorkOrders = await prisma.workOrder.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        plan: {
          include: {
            activity: {
              include: {
                part: {
                  include: {
                    machine: true,
                  },
                },
              },
            },
          },
        },
        technician: { select: { id: true, name: true, email: true, role: true } },
        supervisor: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    // Production last 7 days
    const productionLast7Days: { date: string; quantity: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(todayStart.getTime() - i * 24 * 60 * 60 * 1000);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const agg = await prisma.productionLog.aggregate({
        _sum: { quantity: true },
        where: { date: { gte: dayStart, lt: dayEnd } },
      });
      productionLast7Days.push({
        date: dayStart.toISOString().split("T")[0],
        quantity: agg._sum.quantity ?? 0,
      });
    }

    // Upcoming plans (next 7 days, SCHEDULED)
    const upcomingPlans = await prisma.maintenancePlan.findMany({
      where: {
        status: "SCHEDULED",
        plannedDate: { gte: todayStart, lt: sevenDaysFromNow },
      },
      orderBy: { plannedDate: "asc" },
      include: {
        activity: {
          include: {
            part: {
              include: {
                machine: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      totalMachines,
      operationalMachines,
      machinesInMaintenance,
      pendingWorkOrders,
      overdueWorkOrders,
      completedThisMonth,
      pendingApproval,
      todayProduction,
      recentWorkOrders,
      productionLast7Days,
      upcomingPlans,
    });
  } catch (error) {
    console.error("[DASHBOARD_GET]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
