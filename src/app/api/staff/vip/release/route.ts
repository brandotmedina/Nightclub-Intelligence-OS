import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const REASONS = ["no_show", "cancelled"] as const;

export async function POST(request: Request) {
  const { passcode, reservationId, reason } = await request.json();

  if (!passcode || passcode !== process.env.STAFF_PASSCODE) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!REASONS.includes(reason)) {
    return NextResponse.json({ error: "invalid_reason" }, { status: 400 });
  }

  const clientId = process.env.CLIENT_ID!;

  // Frees the booth: the one_active_booth_per_event index only covers held/confirmed.
  // Never touches Stripe or payments.
  const { data, error } = await supabaseAdmin
    .from("reservations")
    .update({
      status: "released",
      released_at: new Date().toISOString(),
      release_reason: reason,
    })
    .eq("id", reservationId)
    .eq("client_id", clientId)
    .eq("status", "confirmed")
    .select("id");

  if (error) {
    console.error("VIP release failed", error);
    return NextResponse.json({ error: "release_error" }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: "not_releasable" }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}
