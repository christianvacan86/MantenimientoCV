import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const machines = await prisma.machine.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { parts: true },
        },
        productionLogs: {
          orderBy: { date: "desc" },
          take: 1,
        },
      },
    });

    return NextResponse.json(machines);
  } catch (error) {
    console.error("[MACHINES_GET]", error);
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

    const role = session.user?.role;
    if (role !== "ADMIN" && role !== "PLANNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { code, name, type, brand, model, serialNumber, location, status, installDate, notes } = body;

    if (!code || !name || !type) {
      return NextResponse.json(
        { error: "code, name, and type are required" },
        { status: 400 }
      );
    }

    const machine = await prisma.machine.create({
      data: {
        code,
        name,
        type,
        brand,
        model,
        serialNumber,
        location,
        status: status ?? "OPERATIONAL",
        installDate: installDate ? new Date(installDate) : undefined,
        notes,
      },
    });

    return NextResponse.json(machine, { status: 201 });
  } catch (error) {
    console.error("[MACHINES_POST]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
