import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return new Response(`Webhook signature failed: ${err}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // Idempotency guard — if we already handled this session, acknowledge and exit
    const { data: alreadyProcessed } = await supabaseAdmin
      .from("ticket_orders")
      .select("id")
      .eq("stripe_session_id", session.id)
      .maybeSingle();
    if (alreadyProcessed) return new Response("ok", { status: 200 });

    const meta = session.metadata!;
    const clientId = meta.client_id;
    const eventId = parseInt(meta.event_id);
    const qty = parseInt(meta.quantity);
    const pricePerTicket = parseFloat(meta.price_per_ticket);
    const totalAmount = (session.amount_total ?? 0) / 100;

    // 1. Upsert customer
    let customerId: string;
    const { data: existingCustomer } = await supabaseAdmin
      .from("customers")
      .select("id")
      .eq("client_id", clientId)
      .eq("phone", meta.customer_phone)
      .maybeSingle();

    if (existingCustomer) {
      customerId = existingCustomer.id as string;
    } else {
      const { data: newCustomer, error: custErr } = await supabaseAdmin
        .from("customers")
        .insert({
          client_id: clientId,
          name: meta.customer_name,
          phone: meta.customer_phone,
          email: meta.customer_email,
        })
        .select("id")
        .single();

      if (custErr || !newCustomer) {
        console.error("Customer insert failed", custErr);
        return new Response("Customer error", { status: 500 });
      }
      customerId = newCustomer.id as string;
    }

    // 2. Create ticket order
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("ticket_orders")
      .insert({
        client_id: clientId,
        event_id: eventId,
        customer_id: customerId,
        stripe_session_id: session.id,
        quantity: qty,
        total_amount: totalAmount,
        status: "paid",
      })
      .select("id")
      .single();

    if (orderErr || !order) {
      console.error("Order insert failed", orderErr);
      return new Response("Order error", { status: 500 });
    }

    // 3. Create one ticket row per ticket purchased
    const { error: tickErr } = await supabaseAdmin.from("tickets").insert(
      Array.from({ length: qty }, () => ({
        client_id: clientId,
        ticket_order_id: order.id,
        event_id: eventId,
        qr_code: crypto.randomUUID(),
        price_paid: pricePerTicket,
        status: "valid",
      }))
    );

    if (tickErr) {
      console.error("Ticket insert failed", tickErr);
      return new Response("Ticket error", { status: 500 });
    }

    // 4. Record payment (non-fatal if this fails — tickets are already created)
    const { error: payErr } = await supabaseAdmin.from("payments").insert({
      client_id: clientId,
      ticket_order_id: order.id,
      stripe_payment_intent_id: session.payment_intent as string,
      amount: totalAmount,
      currency: "usd",
      status: "succeeded",
    });

    if (payErr) {
      console.error("Payment record failed (non-fatal)", payErr);
    }
  }

  return new Response("ok", { status: 200 });
}
