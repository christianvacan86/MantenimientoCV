import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const plan = await prisma.maintenancePlan.findUnique({
      where: { id: params.id },
      include: {
        activity: {
          include: {
            part: {
              include: { machine: true },
            },
            spareParts: {
              include: { sparePart: true },
            },
            usageTracker: true,
          },
        },
        plannedBy: { select: { id: true, name: true, email: true, role: true } },
        workOrder: {
          include: {
            technician: { select: { id: true, name: true, email: true, role: true } },
            supervisor: { select: { id: true, name: true, email: true, role: true } },
            checklistItems: true,
            spareParts: { include: { sparePart: true } },
          },
        },
      },
    });

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    return NextResponse.json(plan);
  } catch (error) {
    console.error("[PLAN_GET]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { plannedDate, status, notes } = body;

    const plan = await prisma.maintenancePlan.update({
      where: { id: params.id },
      data: {
        ...(plannedDate !== undefined && { plannedDate: new Date(plannedDate) }),
        ...(status !== undefined && { status }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        activity: {
          include: {
            part: { include: { machine: true } },
          },
        },
        plannedBy: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    return NextResponse.json(plan);
  } catch (error) {
    console.error("[PLAN_PUT]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
