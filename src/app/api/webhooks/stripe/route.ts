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

    // Idempotency guard — the Stripe session id lives on the payments table,
    // so we check there to see if we already handled this session.
    const { data: alreadyProcessed } = await supabaseAdmin
      .from("payments")
      .select("id")
      .eq("stripe_session_id", session.id)
      .maybeSingle();
    if (alreadyProcessed) return new Response("ok", { status: 200 });

    const meta = session.metadata!;
    const clientId = meta.client_id;

    // ── VIP booth reservation payment ─────────────────────────────────────
    // Detected by presence of "vip_reservation_id" in metadata.
    // Ticket sessions never carry this key; VIP sessions always do.
    if (meta.vip_reservation_id) {
      const reservationId = meta.vip_reservation_id;
      const totalAmount = (session.amount_total ?? 0) / 100;

      // Load reservation to get customer_id, event_id, booth_id
      const { data: reservation } = await supabaseAdmin
        .from("reservations")
        .select("id, customer_id, event_id, booth_id, status")
        .eq("id", reservationId)
        .eq("client_id", clientId)
        .single();

      if (!reservation) {
        console.error("VIP webhook: reservation not found", reservationId);
        return new Response("ok", { status: 200 }); // non-fatal: return 200
      }

      // b. Double-book re-check: confirm no OTHER confirmed reservation for this booth+event
      const { data: conflict } = await supabaseAdmin
        .from("reservations")
        .select("id")
        .eq("client_id", clientId)
        .eq("event_id", reservation.event_id)
        .eq("booth_id", reservation.booth_id)
        .eq("status", "confirmed")
        .neq("id", reservationId)
        .maybeSingle();

      if (conflict) {
        // Another reservation already confirmed this booth — never double-book.
        // Mark for manual refund so staff can action it; still return 200 to Stripe.
        console.error(
          "VIP double-book detected: reservation",
          reservationId,
          "conflicts with confirmed reservation",
          conflict.id,
          "— marking payment_refund_due"
        );
        await supabaseAdmin
          .from("reservations")
          .update({ status: "payment_refund_due" })
          .eq("id", reservationId);
      } else {
        // Booth is still ours — confirm it
        const { error: confirmErr } = await supabaseAdmin
          .from("reservations")
          .update({ status: "confirmed" })
          .eq("id", reservationId);

        if (confirmErr) {
          console.error("VIP reservation confirm failed", confirmErr);
          return new Response("Reservation confirm error", { status: 500 });
        }
      }

      // c. Record payment (fatal: stripe_session_id is our idempotency key)
      const { error: vipPayErr } = await supabaseAdmin.from("payments").insert({
        client_id: clientId,
        customer_id: reservation.customer_id,
        reservation_id: reservationId,
        stripe_session_id: session.id,
        amount: totalAmount,
        currency: "usd",
        status: "succeeded",
      });

      if (vipPayErr) {
        console.error("VIP payment record failed", vipPayErr);
        return new Response("Payment error", { status: 500 });
      }

      // d. Fire-and-forget staff alert via N8N (must be last; never blocks the 200)
      const alertUrl = process.env.N8N_VIP_ALERT_URL;
      if (!alertUrl) {
        console.log("skipping VIP staff alert: N8N_VIP_ALERT_URL not set");
      } else {
        try {
          const [{ data: customer }, { data: booth }, { data: eventRow }] =
            await Promise.all([
              supabaseAdmin
                .from("customers")
                .select("full_name, phone")
                .eq("id", reservation.customer_id)
                .eq("client_id", clientId)
                .single(),
              supabaseAdmin
                .from("booths")
                .select("label")
                .eq("id", reservation.booth_id)
                .eq("client_id", clientId)
                .single(),
              supabaseAdmin
                .from("events")
                .select("name, event_date")
                .eq("id", reservation.event_id)
                .eq("client_id", clientId)
                .single(),
            ]);

          const payload = {
            type: "vip_confirmed",
            client_id: clientId,
            reservation_id: reservationId,
            customer_name: customer?.full_name ?? null,
            customer_phone: customer?.phone ?? null,
            booth_label: booth?.label ?? null,
            event_name: eventRow?.name ?? null,
            event_date: eventRow?.event_date ?? null,
            amount: totalAmount,
          };

          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          try {
            await fetch(alertUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
              signal: controller.signal,
            });
          } finally {
            clearTimeout(timeout);
          }
        } catch (alertErr) {
          console.error("VIP staff alert failed (non-fatal):", alertErr);
        }
      }

      return new Response("ok", { status: 200 });
    }
    // ── End VIP branch ─────────────────────────────────────────────────────
    const eventId = meta.event_id;
    const qty = parseInt(meta.quantity);
    const pricePerTicket = parseFloat(meta.price_per_ticket);
    const totalAmount = (session.amount_total ?? 0) / 100;
    const taxAmount = parseInt(meta.tax_cents ?? "0") / 100;
    const feeAmount = parseInt(meta.fee_cents ?? "0") / 100;

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
          full_name: meta.customer_name,
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
        quantity: qty,
        total: totalAmount,
        tax: taxAmount,
        fee: feeAmount,
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

    // 4. Record payment. This row also carries the Stripe session id, which is
    // our idempotency + lookup key, so a failure here is fatal (Stripe will retry).
    const { error: payErr } = await supabaseAdmin.from("payments").insert({
      client_id: clientId,
      customer_id: customerId,
      ticket_order_id: order.id,
      stripe_session_id: session.id,
      amount: totalAmount,
      currency: "usd",
      status: "succeeded",
    });

    if (payErr) {
      console.error("Payment record failed", payErr);
      return new Response("Payment error", { status: 500 });
    }
  }

  return new Response("ok", { status: 200 });
}
