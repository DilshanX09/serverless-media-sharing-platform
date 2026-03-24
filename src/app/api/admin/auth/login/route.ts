import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { setAdminCookie, signAdminToken } from "@/lib/adminSession";

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const panelPassword = process.env.ADMIN_PANEL_PASSWORD;
  if (!panelPassword) {
    return NextResponse.json(
      {
        error: "Admin panel password is not configured.",
        message: "Set ADMIN_PANEL_PASSWORD in your environment.",
      },
      { status: 500 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    password?: string;
  };

  if (!body.password) {
    return NextResponse.json(
      { error: "password is required" },
      { status: 400 },
    );
  }

  if (!safeEqual(body.password, panelPassword)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const token = signAdminToken();
  const response = NextResponse.json({ ok: true }, { status: 200 });
  return setAdminCookie(response, token);
}
