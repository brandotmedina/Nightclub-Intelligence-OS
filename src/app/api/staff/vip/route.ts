import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const COMP_PHONE = "+10000000000";

export async function POST(request: Request) {
  const { passcode, eventId } = await request.json();

  if (!passcode || passcode !== process.env.STAFF_PASSCODE) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientId = process.env.CLIENT_ID!;

  const { data: event } = await supabaseAdmin
    .from("events")
    .select("id, name, event_date, bottle_minimum")
    .eq("id", eventId)
    .eq("client_id", clientId)
    .maybeSingle();

  if (!event) {
    return NextResponse.json({ error: "event_not_found" }, { status: 404 });
  }

  const [{ data: areas }, { data: booths }, { data: reservationRows }] =
    await Promise.all([
      supabaseAdmin
        .from("venue_areas")
        .select("id, name, is_bookable")
        .eq("client_id", clientId)
        .order("name"),
      supabaseAdmin
        .from("booths")
        .select("id, area_id, label, booking_mode")
        .eq("client_id", clientId)
        .order("label"),
      supabaseAdmin
        .from("reservations")
        .select(
          "id, booth_id, customer_id, booth_under_name, entries_included, fee, checked_in_at"
        )
        .eq("client_id", clientId)
        .eq("event_id", eventId)
        .eq("status", "confirmed"),
    ]);

  const rows = reservationRows ?? [];
  const customerIds = [
    ...new Set(rows.map((r) => r.customer_id as string).filter(Boolean)),
  ];

  const { data: customers } = customerIds.length
    ? await supabaseAdmin
        .from("customers")
        .select("id, full_name, phone")
        .eq("client_id", clientId)
        .in("id", customerIds)
    : { data: [] as { id: string; full_name: string | null; phone: string | null }[] };

  const customerById = new Map(
    (customers ?? []).map((c) => [c.id as string, c])
  );

  const reservations = rows.map((r) => {
    const c = customerById.get(r.customer_id as string);
    const phone = (c?.phone ?? null) as string | null;
    return {
      id: r.id as string,
      booth_id: r.booth_id as string,
      booth_under_name: (r.booth_under_name ?? null) as string | null,
      entries_included: (r.entries_included ?? null) as number | null,
      fee: (r.fee ?? null) as number | null,
      checked_in_at: (r.checked_in_at ?? null) as string | null,
      customer: {
        full_name: (c?.full_name ?? null) as string | null,
        phone,
      },
      is_comp: phone === COMP_PHONE,
    };
  });

  return NextResponse.json({
    event,
    areas: areas ?? [],
    booths: booths ?? [],
    reservations,
  });
}
