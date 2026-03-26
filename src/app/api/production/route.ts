import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const machineId = searchParams.get("machineId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const logs = await prisma.productionLog.findMany({
      where: {
        ...(machineId && { machineId }),
        ...(from || to
          ? {
              date: {
                ...(from && { gte: new Date(from) }),
                ...(to && { lte: new Date(to) }),
              },
            }
          : {}),
      },
      orderBy: { date: "desc" },
      include: {
        machine: { select: { id: true, name: true, code: true } },
      },
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("[PRODUCTION_GET]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { machineId, date, quantity, shift, operator, notes } = body;

    if (!machineId || !date || quantity === undefined) {
      return NextResponse.json(
        { error: "machineId, date, and quantity are required" },
        { status: 400 }
      );
    }

    // Create the production log
    const log = await prisma.productionLog.create({
      data: {
        machineId,
        date: new Date(date),
        quantity: Number(quantity),
        shift,
        operator,
        notes,
      },
      include: {
        machine: { select: { id: true, name: true, code: true } },
      },
    });

    // Find all parts for this machine with PRODUCTION_COUNT activities
    const machineParts = await prisma.machinePart.findMany({
      where: { machineId },
      include: {
        maintenanceActivities: {
          where: { frequencyType: "PRODUCTION_COUNT" },
          include: { usageTracker: true },
        },
      },
    });

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const plannedDate = new Date(todayStart.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Find first PLANNER user for auto-created plans
    let plannerUser: { id: string } | null = null;

    for (const part of machineParts) {
      for (const activity of part.maintenanceActivities) {
        const currentUsage = (activity.usageTracker?.currentUsage ?? 0) + Number(quantity);

        // Upsert the ActivityUsageTracker
        await prisma.activityUsageTracker.upsert({
          where: { activityId: activity.id },
          update: { currentUsage },
          create: {
            activityId: activity.id,
            currentUsage,
          },
        });

        // Check if threshold is reached and no SCHEDULED plan exists
        if (currentUsage >= activity.frequencyValue) {
          const existingScheduledPlan = await prisma.maintenancePlan.findFirst({
            where: {
              activityId: activity.id,
              status: "SCHEDULED",
            },
          });

          if (!existingScheduledPlan) {
            // Lazy-load the planner user once
            if (!plannerUser) {
              plannerUser = await prisma.user.findFirst({
                where: { role: "PLANNER", active: true },
                select: { id: true },
              });
            }

            if (plannerUser) {
              await prisma.maintenancePlan.create({
                data: {
                  activityId: activity.id,
                  plannedDate,
                  status: "SCHEDULED",
                  plannedById: plannerUser.id,
                  triggerUsage: currentUsage,
                  notes: `Auto-created: usage threshold reached (${currentUsage}/${activity.frequencyValue})`,
                },
              });
            }
          }
        }
      }
    }

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    console.error("[PRODUCTION_POST]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
