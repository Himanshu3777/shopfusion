import { NextResponse } from "next/server";

// Temporary debug endpoint — reports only whether secrets exist, never values.
export async function GET() {
  return NextResponse.json({
    authSecretSet: !!process.env.AUTH_SECRET,
    authSecretLength: process.env.AUTH_SECRET?.length ?? 0,
    databaseUrlSet: !!process.env.DATABASE_URL,
    vercelEnv: !!process.env.VERCEL,
    nodeEnv: process.env.NODE_ENV ?? null,
  });
}
