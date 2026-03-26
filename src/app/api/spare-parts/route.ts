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

    const spareParts = await prisma.sparePart.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { workOrderUsage: true },
        },
      },
    });

    return NextResponse.json(spareParts);
  } catch (error) {
    console.error("[SPARE_PARTS_GET]", error);
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
    const { code, name, description, unit, stock, minStock, supplier, price } = body;

    if (!code || !name) {
      return NextResponse.json(
        { error: "code and name are required" },
        { status: 400 }
      );
    }

    const sparePart = await prisma.sparePart.create({
      data: {
        code,
        name,
        ...(description !== undefined && { description }),
        unit: unit ?? "unidad",
        stock: stock !== undefined ? Number(stock) : 0,
        minStock: minStock !== undefined ? Number(minStock) : 1,
        ...(supplier !== undefined && { supplier }),
        ...(price !== undefined && { price: Number(price) }),
      },
    });

    return NextResponse.json(sparePart, { status: 201 });
  } catch (error) {
    console.error("[SPARE_PARTS_POST]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
