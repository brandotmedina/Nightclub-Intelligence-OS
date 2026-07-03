import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getClientBySlug } from "@/lib/get-client";

export const dynamic = "force-dynamic";

// Integer-cents math — club nets $50 after Stripe fees (no tax on VIP)
// base=5000, total=ceil((5000+30)/(1-0.029))=5181, fee=181
const BASE_CENTS = 5000;
const TOTAL_CENTS = 5181;
const FEE_CENTS = 181; // TOTAL_CENTS - BASE_CENTS

export async function POST(request: Request) {
  const { reservationId, clientSlug } = await request.json();
  const origin =
    request.headers.get("origin") ?? process.env.NEXT_PUBLIC_BASE_URL!;

  let clientId: string;
  if (clientSlug) {
    const client = await getClientBySlug(clientSlug);
    if (!client) return NextResponse.json({ error: "client_not_found" }, { status: 404 });
    clientId = client.id;
  } else {
    clientId = process.env.CLIENT_ID!;
  }

  const eventsBase = clientSlug ? `/${clientSlug}/events` : "/events";

  // Load reservation — must be held and not expired
  const { data: reservation, error: resErr } = await supabaseAdmin
    .from("reservations")
    .select(
      "id, event_id, booth_id, customer_id, status, hold_expires_at"
    )
    .eq("id", reservationId)
    .eq("client_id", clientId)
    .single();

  if (resErr || !reservation) {
    return NextResponse.json({ error: "reservation_not_found" }, { status: 404 });
  }

  if (reservation.status !== "held") {
    return NextResponse.json({ error: "hold_expired" }, { status: 410 });
  }

  if (
    !reservation.hold_expires_at ||
    new Date(reservation.hold_expires_at) <= new Date()
  ) {
    return NextResponse.json({ error: "hold_expired" }, { status: 410 });
  }

  // Load event (name for line item + vip_enabled gate) and booth label
  const [{ data: event }, { data: booth }] = await Promise.all([
    supabaseAdmin
      .from("events")
      .select("name, vip_enabled")
      .eq("id", reservation.event_id)
      .eq("client_id", clientId)
      .single(),
    supabaseAdmin
      .from("booths")
      .select("label, booking_mode")
      .eq("id", reservation.booth_id)
      .eq("client_id", clientId)
      .single(),
  ]);

  if (!event?.vip_enabled) {
    return NextResponse.json({ error: "vip_not_enabled" }, { status: 403 });
  }

  if (!booth || booth.booking_mode !== "online") {
    return NextResponse.json({ error: "booth_not_bookable" }, { status: 403 });
  }

  const eventName = event.name ?? "Event";
  const boothLabel = booth.label ?? "Booth";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: BASE_CENTS,
          product_data: {
            name: `VIP Booth Reservation — ${eventName}, ${boothLabel}`,
          },
        },
        quantity: 1,
      },
      {
        price_data: {
          currency: "usd",
          unit_amount: FEE_CENTS,
          product_data: { name: "Processing Fee" },
        },
        quantity: 1,
      },
    ],
    // METADATA KEY: "vip_reservation_id" — must match exactly in webhook
    metadata: {
      vip_reservation_id: reservationId,
      client_id: clientId,
    },
    success_url: `${origin}${eventsBase}/${reservation.event_id}/vip/confirmed?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}${eventsBase}/${reservation.event_id}/vip`,
  });

  return NextResponse.json({ url: session.url });
}
