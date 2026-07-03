import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getClientBySlug } from "@/lib/get-client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");
  const orderId = searchParams.get("order_id");
  const clientSlugParam = searchParams.get("client_slug");

  if (!sessionId && !orderId) {
    return NextResponse.json({ error: "Missing identifier" }, { status: 400 });
  }

  let clientId: string;
  if (clientSlugParam) {
    const client = await getClientBySlug(clientSlugParam);
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });
    clientId = client.id;
  } else {
    clientId = process.env.CLIENT_ID!;
  }

  let resolvedOrderId = orderId;
  if (!resolvedOrderId && sessionId) {
    const { data: payment } = await supabaseAdmin
      .from("payments")
      .select("ticket_order_id")
      .eq("stripe_session_id", sessionId)
      .eq("client_id", clientId)
      .maybeSingle();

    if (!payment) return NextResponse.json({ ready: false });
    resolvedOrderId = payment.ticket_order_id as string;
  }

  const { data: order } = await supabaseAdmin
    .from("ticket_orders")
    .select("id, quantity, total, event_id")
    .eq("id", resolvedOrderId!)
    .eq("client_id", clientId)
    .single();

  if (!order) return NextResponse.json({ ready: false });

  const { data: tickets } = await supabaseAdmin
    .from("tickets")
    .select("id, qr_code, price_paid, status")
    .eq("ticket_order_id", order.id)
    .eq("client_id", clientId);

  if (!tickets || tickets.length < order.quantity) {
    return NextResponse.json({ ready: false });
  }

  const { data: event } = await supabaseAdmin
    .from("events")
    .select("name, event_date")
    .eq("id", order.event_id)
    .single();

  return NextResponse.json({ ready: true, order, tickets, event });
}
