import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { passcode } = await request.json();

  if (!passcode || passcode !== process.env.STAFF_PASSCODE) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientId = process.env.CLIENT_ID!;
  const today = new Date().toISOString().split("T")[0]; // UTC date

  const { data: events, error } = await supabaseAdmin
    .from("events")
    .select("id, name, event_date")
    .eq("client_id", clientId)
    .gte("event_date", today)
    .order("event_date", { ascending: true });

  if (error) {
    console.error("Staff VIP events load failed", error);
    return NextResponse.json({ error: "events_error" }, { status: 500 });
  }

  return NextResponse.json({ events: events ?? [] });
}
