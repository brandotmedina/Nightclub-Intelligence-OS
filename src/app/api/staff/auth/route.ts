import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { passcode } = await request.json();
  if (!passcode || passcode !== process.env.STAFF_PASSCODE) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
