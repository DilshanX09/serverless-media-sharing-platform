import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setAuthCookie, signAuthToken, verifyPassword } from "@/lib/auth";
import { withCacheHeaders, cacheHeaders } from "@/lib/cacheHeaders";

interface LoginBody {
  email?: unknown;
  password?: unknown;
}

function parseLoginBody(rawBody: string): LoginBody | null {
  try {
    return JSON.parse(rawBody) as LoginBody;
  } catch {
    return null;
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const rawBody = await request.text();
  const body = parseLoginBody(rawBody);

  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      avatarBlobUrl: true,
      createdAt: true,
      passwordHash: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const isValidPassword = await verifyPassword(password, user.passwordHash);
  if (!isValidPassword) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = signAuthToken({ sub: user.id, username: user.username, email: user.email });
  const response = NextResponse.json(
    {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatarBlobUrl: user.avatarBlobUrl,
        createdAt: user.createdAt,
      },
    },
    { status: 200 }
  );

  // Never cache auth responses
  withCacheHeaders(response, cacheHeaders.auth);

  return setAuthCookie(response, token);
}
