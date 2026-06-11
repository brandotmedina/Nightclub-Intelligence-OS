import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  const { passcode, customerId, eventId, all } = await request.json();

  if (!passcode || passcode !== process.env.STAFF_PASSCODE) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientId = process.env.CLIENT_ID!;

  // Resolve order IDs for this customer + event
  const { data: orders } = await supabaseAdmin
    .from("ticket_orders")
    .select("id")
    .eq("customer_id", customerId)
    .eq("event_id", eventId)
    .eq("client_id", clientId);

  if (!orders || orders.length === 0) {
    return NextResponse.json({ checkedIn: 0, remaining: 0 });
  }

  const orderIds = orders.map((o) => o.id as string);

  // Find all valid (unchecked) tickets
  const { data: validTickets } = await supabaseAdmin
    .from("tickets")
    .select("id")
    .in("ticket_order_id", orderIds)
    .eq("client_id", clientId)
    .eq("status", "valid");

  if (!validTickets || validTickets.length === 0) {
    return NextResponse.json({ checkedIn: 0, remaining: 0 });
  }

  const toCheckIn = all ? validTickets : [validTickets[0]];
  const idsToUpdate = toCheckIn.map((t) => t.id as string);
  const now = new Date().toISOString();

  await supabaseAdmin
    .from("tickets")
    .update({ status: "used", checked_in_at: now })
    .in("id", idsToUpdate);

  const remaining = validTickets.length - toCheckIn.length;
  return NextResponse.json({ checkedIn: toCheckIn.length, remaining });
}
