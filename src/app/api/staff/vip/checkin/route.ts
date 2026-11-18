import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  const { passcode, reservationId, undo } = await request.json();

  if (!passcode || passcode !== process.env.STAFF_PASSCODE) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientId = process.env.CLIENT_ID!;
  const checkedInAt = undo ? null : new Date().toISOString();

  // Status stays 'confirmed' — only checked_in_at changes.
  const { data, error } = await supabaseAdmin
    .from("reservations")
    .update({ checked_in_at: checkedInAt })
    .eq("id", reservationId)
    .eq("client_id", clientId)
    .eq("status", "confirmed")
    .select("checked_in_at");

  if (error) {
    console.error("VIP check-in failed", error);
    return NextResponse.json({ error: "checkin_error" }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: "reservation_not_found" }, { status: 404 });
  }

  return NextResponse.json({ checked_in_at: data[0].checked_in_at ?? null });
}
