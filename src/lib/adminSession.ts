import jwt, { type JwtPayload } from "jsonwebtoken";
import { type NextRequest, type NextResponse } from "next/server";

export const ADMIN_COOKIE_NAME = "mini_insta_admin";
const ADMIN_TOKEN_TTL_SECONDS = 60 * 60 * 12;

interface AdminTokenPayload {
  role: "admin";
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("Missing JWT_SECRET environment variable.");
  }
  return secret;
}

export function signAdminToken(): string {
  const payload: AdminTokenPayload = { role: "admin" };
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: ADMIN_TOKEN_TTL_SECONDS,
  });
}

export function verifyAdminToken(token: string): boolean {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload | string;
    if (typeof decoded === "string") return false;
    return decoded.role === "admin";
  } catch {
    return false;
  }
}

export function getAdminTokenFromRequest(
  request: Request | NextRequest,
): string | null {
  if ("cookies" in request) {
    return request.cookies.get(ADMIN_COOKIE_NAME)?.value ?? null;
  }

  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  for (const item of cookieHeader.split(";")) {
    const [name, ...rest] = item.trim().split("=");
    if (name === ADMIN_COOKIE_NAME) {
      return decodeURIComponent(rest.join("="));
    }
  }

  return null;
}

export function setAdminCookie(
  response: NextResponse,
  token: string,
): NextResponse {
  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_TOKEN_TTL_SECONDS,
  });
  return response;
}

export function clearAdminCookie(response: NextResponse): NextResponse {
  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
