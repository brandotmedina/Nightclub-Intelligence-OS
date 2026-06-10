import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  const { passcode, qrCode, eventId } = await request.json();

  if (!passcode || passcode !== process.env.STAFF_PASSCODE) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientId = process.env.CLIENT_ID!;

  const { data: ticket } = await supabaseAdmin
    .from("tickets")
    .select("id, status, event_id, checked_in_at")
    .eq("qr_code", qrCode)
    .eq("client_id", clientId)
    .maybeSingle();

  if (!ticket) {
    return NextResponse.json({ status: "not_found" });
  }

  if (ticket.event_id !== eventId) {
    return NextResponse.json({ status: "wrong_event" });
  }

  if (ticket.status === "used") {
    return NextResponse.json({
      status: "already_used",
      checkedInAt: ticket.checked_in_at,
    });
  }

  await supabaseAdmin
    .from("tickets")
    .update({ status: "used", checked_in_at: new Date().toISOString() })
    .eq("id", ticket.id);

  return NextResponse.json({ status: "valid" });
}
