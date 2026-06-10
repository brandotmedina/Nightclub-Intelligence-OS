import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const clientId = process.env.CLIENT_ID!;

  const { data: events } = await supabaseAdmin
    .from("events")
    .select("id, name, event_date")
    .eq("client_id", clientId)
    .order("event_date", { ascending: false })
    .limit(20);

  return NextResponse.json({ events: events ?? [] });
}
