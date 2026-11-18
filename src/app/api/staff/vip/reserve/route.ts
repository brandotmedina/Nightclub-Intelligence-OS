import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isPastEvent } from "@/lib/event-date";

export const dynamic = "force-dynamic";

const TYPES = ["manual", "comp"] as const;
type ReserveType = (typeof TYPES)[number];

/** Strip non-digits; drop a leading US "1" from 11 digits; must end as 10 digits. */
function normalizePhone(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  return digits.length === 10 ? digits : null;
}

function isUniqueViolation(err: unknown): boolean {
  return (err as { code?: string } | null)?.code === "23505";
}

export async function POST(request: Request) {
  const { passcode, eventId, boothId, guestName, phone, underName, type } =
    await request.json();

  if (!passcode || passcode !== process.env.STAFF_PASSCODE) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const name = typeof guestName === "string" ? guestName.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "guest_name_required" }, { status: 400 });
  }
  if (!TYPES.includes(type)) {
    return NextResponse.json({ error: "invalid_type" }, { status: 400 });
  }
  const normPhone = normalizePhone(phone);
  if (!normPhone) {
    return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
  }
  const reserveType = type as ReserveType;

  const clientId = process.env.CLIENT_ID!;

  // Event + booth must belong to this client
  const [{ data: event }, { data: booth }] = await Promise.all([
    supabaseAdmin
      .from("events")
      .select("id, event_date")
      .eq("id", eventId)
      .eq("client_id", clientId)
      .maybeSingle(),
    supabaseAdmin
      .from("booths")
      .select("id")
      .eq("id", boothId)
      .eq("client_id", clientId)
      .maybeSingle(),
  ]);

  if (!event) {
    return NextResponse.json({ error: "event_not_found" }, { status: 404 });
  }
  if (!booth) {
    return NextResponse.json({ error: "booth_not_found" }, { status: 404 });
  }
  if (isPastEvent(event.event_date as string)) {
    return NextResponse.json({ error: "event_ended" }, { status: 400 });
  }

  // Customer: find by (client_id, phone); create if missing; fill a null name only
  async function findCustomer() {
    return supabaseAdmin
      .from("customers")
      .select("id, full_name")
      .eq("client_id", clientId)
      .eq("phone", normPhone)
      .maybeSingle();
  }

  let { data: customer } = await findCustomer();

  if (!customer) {
    const { data: inserted, error: insErr } = await supabaseAdmin
      .from("customers")
      .insert({ client_id: clientId, phone: normPhone, full_name: name })
      .select("id, full_name")
      .single();

    if (insErr) {
      if (!isUniqueViolation(insErr)) {
        console.error("Staff VIP customer insert failed", insErr);
        return NextResponse.json({ error: "customer_error" }, { status: 500 });
      }
      ({ data: customer } = await findCustomer()); // lost a race — re-select
    } else {
      customer = inserted;
    }
  }

  if (!customer) {
    return NextResponse.json({ error: "customer_error" }, { status: 500 });
  }

  if (!customer.full_name) {
    await supabaseAdmin
      .from("customers")
      .update({ full_name: name })
      .eq("id", customer.id)
      .eq("client_id", clientId)
      .is("full_name", null);
  }

  // Expire stale holds for this booth+event (same as /api/vip/reserve)
  await supabaseAdmin
    .from("reservations")
    .update({ status: "expired" })
    .eq("client_id", clientId)
    .eq("event_id", eventId)
    .eq("booth_id", boothId)
    .eq("status", "held")
    .lt("hold_expires_at", new Date().toISOString());

  const under = typeof underName === "string" ? underName.trim() : "";

  const { data: reservation, error: resErr } = await supabaseAdmin
    .from("reservations")
    .insert({
      client_id: clientId,
      event_id: eventId,
      booth_id: boothId,
      customer_id: customer.id,
      status: "confirmed",
      source: reserveType,
      booth_under_name: under || name,
      hold_expires_at: null,
      ...(reserveType === "comp" ? { fee: 0 } : {}),
    })
    .select("id")
    .single();

  if (resErr) {
    if (isUniqueViolation(resErr)) {
      return NextResponse.json({ error: "booth_taken" }, { status: 409 });
    }
    console.error("Staff VIP reservation insert failed", resErr);
    return NextResponse.json({ error: "reserve_error" }, { status: 500 });
  }

  return NextResponse.json({ id: reservation.id });
}
