import { NextRequest, NextResponse } from "next/server";
import { clearAdminCookie } from "@/lib/adminSession";

export async function POST(_request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.json({ ok: true }, { status: 200 });
  return clearAdminCookie(response);
}
