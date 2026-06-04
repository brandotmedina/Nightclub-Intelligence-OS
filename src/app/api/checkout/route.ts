import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { eventId, quantity, customerName, customerPhone, customerEmail } =
    await request.json();

  const clientId = process.env.CLIENT_ID!;
  const origin =
    request.headers.get("origin") ?? process.env.NEXT_PUBLIC_BASE_URL!;

  const { data: event, error } = await supabaseAdmin
    .from("events")
    .select("id, name, price")
    .eq("id", eventId)
    .eq("client_id", clientId)
    .single();

  if (error || !event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // ── Free event: skip Stripe, create records directly ─────────────────
  if (event.price === 0) {
    const customerId = await upsertCustomer(
      clientId,
      customerName,
      customerPhone,
      customerEmail
    );
    if (!customerId)
      return NextResponse.json(
        { error: "Could not save customer" },
        { status: 500 }
      );

    const { data: order, error: orderErr } = await supabaseAdmin
      .from("ticket_orders")
      .insert({
        client_id: clientId,
        event_id: eventId,
        customer_id: customerId,
        stripe_session_id: null,
        quantity,
        total_amount: 0,
        status: "paid",
      })
      .select("id")
      .single();

    if (orderErr || !order)
      return NextResponse.json(
        { error: "Could not create order" },
        { status: 500 }
      );

    const { error: tickErr } = await supabaseAdmin.from("tickets").insert(
      Array.from({ length: quantity }, () => ({
        client_id: clientId,
        ticket_order_id: order.id,
        event_id: eventId,
        qr_code: crypto.randomUUID(),
        price_paid: 0,
        status: "valid",
      }))
    );

    if (tickErr)
      return NextResponse.json(
        { error: "Could not create tickets" },
        { status: 500 }
      );

    return NextResponse.json({
      url: `${origin}/events/${eventId}/success?order_id=${order.id}`,
    });
  }

  // ── Paid event: Stripe Checkout ───────────────────────────────────────
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: Math.round(event.price * 100),
          product_data: { name: `${event.name} — Ticket` },
        },
        quantity,
      },
    ],
    metadata: {
      event_id: String(eventId),
      client_id: clientId,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail,
      quantity: String(quantity),
      price_per_ticket: String(event.price),
    },
    success_url: `${origin}/events/${eventId}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/events/${eventId}`,
  });

  return NextResponse.json({ url: session.url });
}

async function upsertCustomer(
  clientId: string,
  name: string,
  phone: string,
  email: string
): Promise<string | null> {
  const { data: existing } = await supabaseAdmin
    .from("customers")
    .select("id")
    .eq("client_id", clientId)
    .eq("phone", phone)
    .maybeSingle();

  if (existing) return existing.id as string;

  const { data: created, error } = await supabaseAdmin
    .from("customers")
    .insert({ client_id: clientId, name, phone, email })
    .select("id")
    .single();

  if (error || !created) return null;
  return created.id as string;
}
