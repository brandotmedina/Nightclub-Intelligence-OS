import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getClientBySlug } from "@/lib/get-client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");
  const clientSlugParam = searchParams.get("client_slug");

  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  let clientId: string;
  if (clientSlugParam) {
    const client = await getClientBySlug(clientSlugParam);
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });
    clientId = client.id;
  } else {
    clientId = process.env.CLIENT_ID!;
  }

  // Resolve reservation via the payment record keyed on stripe_session_id
  const { data: payment } = await supabaseAdmin
    .from("payments")
    .select("reservation_id")
    .eq("stripe_session_id", sessionId)
    .eq("client_id", clientId)
    .maybeSingle();

  if (!payment?.reservation_id) {
    return NextResponse.json({ ready: false });
  }

  const { data: reservation } = await supabaseAdmin
    .from("reservations")
    .select("id, status, event_id, booth_id, fee, entries_included")
    .eq("id", payment.reservation_id)
    .eq("client_id", clientId)
    .single();

  if (!reservation) return NextResponse.json({ ready: false });

  if (reservation.status !== "confirmed") {
    return NextResponse.json({ ready: false });
  }

  const [{ data: event }, { data: booth }] = await Promise.all([
    supabaseAdmin
      .from("events")
      .select("name, event_date")
      .eq("id", reservation.event_id)
      .single(),
    supabaseAdmin
      .from("booths")
      .select("label")
      .eq("id", reservation.booth_id)
      .single(),
  ]);

  return NextResponse.json({
    ready: true,
    reservation: {
      id: reservation.id,
      status: reservation.status,
      fee: reservation.fee,
      entries_included: reservation.entries_included,
    },
    event: event ?? null,
    booth: booth ?? null,
  });
}
