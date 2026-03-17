import bcrypt from "bcrypt";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { type NextResponse, type NextRequest } from "next/server";

export const AUTH_COOKIE_NAME = "mini_insta_auth";
export const AUTH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

export interface AuthTokenPayload {
  sub: string;
  username: string;
  email: string;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("Missing JWT_SECRET environment variable.");
  }
  return secret;
}

export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, 12);
}

export async function verifyPassword(plainPassword: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, hash);
}

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: AUTH_TOKEN_TTL_SECONDS });
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload | string;
    if (typeof decoded === "string") {
      return null;
    }

    const subject = decoded.sub;
    const username = decoded.username;
    const email = decoded.email;

    if (typeof subject !== "string" || typeof username !== "string" || typeof email !== "string") {
      return null;
    }

    return {
      sub: subject,
      username,
      email,
    };
  } catch {
    return null;
  }
}

function parseCookieHeader(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(";").reduce<Record<string, string>>((acc, cookiePart) => {
    const [rawName, ...rawValueParts] = cookiePart.trim().split("=");
    if (!rawName || rawValueParts.length === 0) {
      return acc;
    }

    acc[rawName] = decodeURIComponent(rawValueParts.join("="));
    return acc;
  }, {});
}

export function getAuthTokenFromRequest(request: Request | NextRequest): string | null {
  if ("cookies" in request) {
    const cookieValue = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    return cookieValue ?? null;
  }

  const parsedCookies = parseCookieHeader(request.headers.get("cookie"));
  return parsedCookies[AUTH_COOKIE_NAME] ?? null;
}

export function setAuthCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: AUTH_TOKEN_TTL_SECONDS,
  });

  return response;
}

export function clearAuthCookie(response: NextResponse): NextResponse {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
