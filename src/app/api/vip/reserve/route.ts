import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const HOLD_MINUTES = 10;
const BOOTH_FEE = 50;

export async function POST(request: Request) {
  const { eventId, boothId, name, phone, email, bottleAck } =
    await request.json();

  // a. Require bottle minimum acknowledgement
  if (!bottleAck) {
    return NextResponse.json(
      { error: "bottle_ack_required" },
      { status: 400 }
    );
  }

  const clientId = process.env.CLIENT_ID!;

  // Gate: reject if VIP is not enabled for this event
  const { data: eventCheck } = await supabaseAdmin
    .from("events")
    .select("vip_enabled")
    .eq("id", eventId)
    .eq("client_id", clientId)
    .single();

  if (!eventCheck?.vip_enabled) {
    return NextResponse.json({ error: "vip_not_enabled" }, { status: 403 });
  }

  // b. Find-or-create customer by phone (same pattern as ticket checkout flow)
  const { data: existingCustomer } = await supabaseAdmin
    .from("customers")
    .select("id")
    .eq("client_id", clientId)
    .eq("phone", phone)
    .maybeSingle();

  let customerId: string;
  if (existingCustomer) {
    customerId = existingCustomer.id as string;
  } else {
    const { data: newCustomer, error: custErr } = await supabaseAdmin
      .from("customers")
      .insert({ client_id: clientId, full_name: name, phone, email })
      .select("id")
      .single();

    if (custErr || !newCustomer) {
      console.error("Customer upsert failed", custErr);
      return NextResponse.json(
        { error: "customer_error" },
        { status: 500 }
      );
    }
    customerId = newCustomer.id as string;
  }

  // c. Expire any stale held rows for this booth+event (frees the partial unique index)
  await supabaseAdmin
    .from("reservations")
    .update({ status: "expired" })
    .eq("client_id", clientId)
    .eq("event_id", eventId)
    .eq("booth_id", boothId)
    .eq("status", "held")
    .lt("hold_expires_at", new Date().toISOString());

  // d. INSERT the new hold
  const holdExpiresAt = new Date(
    Date.now() + HOLD_MINUTES * 60 * 1000
  ).toISOString();

  const { data: reservation, error: insertErr } = await supabaseAdmin
    .from("reservations")
    .insert({
      client_id: clientId,
      event_id: eventId,
      booth_id: boothId,
      customer_id: customerId,
      fee: BOOTH_FEE,
      entries_included: 8,
      bottle_min_ack: true,
      status: "held",
      hold_expires_at: holdExpiresAt,
    })
    .select("id")
    .single();

  if (insertErr) {
    // e. Unique violation (23505) on one_active_booth_per_event → booth just taken
    if (
      (insertErr as unknown as { code?: string }).code === "23505"
    ) {
      return NextResponse.json({ error: "booth_taken" }, { status: 409 });
    }
    console.error("Reservation insert failed", insertErr);
    return NextResponse.json({ error: "reserve_error" }, { status: 500 });
  }

  // f. Success
  return NextResponse.json({
    reservationId: reservation.id,
    holdExpiresAt,
  });
}
