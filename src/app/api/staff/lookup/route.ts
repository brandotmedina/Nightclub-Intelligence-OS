import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  const { passcode, eventId, query } = await request.json();

  if (!passcode || passcode !== process.env.STAFF_PASSCODE) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = (query ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const clientId = process.env.CLIENT_ID!;

  // Find customers matching the name or phone query
  const { data: customers } = await supabaseAdmin
    .from("customers")
    .select("id, full_name, phone")
    .eq("client_id", clientId)
    .or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`)
    .limit(10);

  if (!customers || customers.length === 0) {
    return NextResponse.json({ results: [] });
  }

  // For each customer, get their ticket counts for the selected event
  const rows = await Promise.all(
    customers.map(async (customer) => {
      const { data: orders } = await supabaseAdmin
        .from("ticket_orders")
        .select("id")
        .eq("customer_id", customer.id)
        .eq("event_id", eventId)
        .eq("client_id", clientId);

      if (!orders || orders.length === 0) return null;

      const orderIds = orders.map((o) => o.id as string);

      const { data: tickets } = await supabaseAdmin
        .from("tickets")
        .select("id, status")
        .in("ticket_order_id", orderIds)
        .eq("client_id", clientId);

      if (!tickets || tickets.length === 0) return null;

      const total = tickets.length;
      const used = tickets.filter((t) => t.status === "used").length;
      const remaining = tickets.filter((t) => t.status === "valid").length;

      return {
        customerId: customer.id as string,
        fullName: customer.full_name as string,
        phone: (customer.phone ?? "") as string,
        total,
        used,
        remaining,
      };
    })
  );

  const results = rows.filter((r): r is NonNullable<typeof r> => r !== null);
  return NextResponse.json({ results });
}
