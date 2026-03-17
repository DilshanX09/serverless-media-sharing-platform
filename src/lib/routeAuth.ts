import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookie, getAuthTokenFromRequest, verifyAuthToken, type AuthTokenPayload } from "@/lib/auth";

type AuthGuardResult = { user: AuthTokenPayload } | { response: NextResponse };

export function requireAuth(request: NextRequest): AuthGuardResult {
  const token = getAuthTokenFromRequest(request);
  if (!token) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const payload = verifyAuthToken(token);
  if (!payload) {
    const response = NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    return { response: clearAuthCookie(response) };
  }

  return { user: payload };
}
