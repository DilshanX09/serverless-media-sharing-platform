import { NextRequest, NextResponse } from "next/server";
import { getAdminTokenFromRequest, verifyAdminToken } from "@/lib/adminSession";

interface AdminIdentity {
  session: "password";
}

type AdminGuardResult =
  | { adminUser: AdminIdentity }
  | { response: NextResponse };

export async function requireAdmin(
  request: NextRequest,
): Promise<AdminGuardResult> {
  const token = getAdminTokenFromRequest(request);
  if (!token || !verifyAdminToken(token)) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { adminUser: { session: "password" } };
}
