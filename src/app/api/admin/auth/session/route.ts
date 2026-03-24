import { NextRequest, NextResponse } from "next/server";
import { getAdminTokenFromRequest, verifyAdminToken } from "@/lib/adminSession";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = getAdminTokenFromRequest(request);
  if (!token || !verifyAdminToken(token)) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true }, { status: 200 });
}
