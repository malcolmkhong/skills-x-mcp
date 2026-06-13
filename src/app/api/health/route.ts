import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/api-error";

export async function GET() {
  try {
    // Test database connection
    const userCount = await db.user.count();
    return NextResponse.json({
      status: "ok",
      database: "connected",
      userCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Sanitize: don't expose connection strings or internal DB details
    console.error("[Health] Database connection error:", error);
    return NextResponse.json(
      {
        status: "error",
        database: "disconnected",
        error: "Database connection failed",
      },
      { status: 500 }
    );
  }
}
