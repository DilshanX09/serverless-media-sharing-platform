import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, setAuthCookie, signAuthToken } from "@/lib/auth";

interface RegisterBody {
  email?: unknown;
  username?: unknown;
  password?: unknown;
  displayName?: unknown;
}

function parseRegisterBody(rawBody: string): RegisterBody | null {
  try {
    return JSON.parse(rawBody) as RegisterBody;
  } catch {
    return null;
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const rawBody = await request.text();
  const body = parseRegisterBody(rawBody);

  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const displayNameInput = typeof body.displayName === "string" ? body.displayName.trim() : "";

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const usernamePattern = /^[a-z0-9_.]{3,30}$/;
  if (!emailPattern.test(email)) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }
  if (!usernamePattern.test(username)) {
    return NextResponse.json(
      { error: "Username must be 3-30 chars and contain only lowercase letters, numbers, underscore, or dot" },
      { status: 400 }
    );
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { username }],
    },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json({ error: "Email or username is already in use" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const displayName = displayNameInput.length > 0 ? displayNameInput : username;

  const user = await prisma.user.create({
    data: {
      email,
      username,
      passwordHash,
      displayName,
    },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      avatarBlobUrl: true,
      createdAt: true,
    },
  });

  const token = signAuthToken({ sub: user.id, username: user.username, email: user.email });
  const response = NextResponse.json({ user }, { status: 201 });
  return setAuthCookie(response, token);
}
