import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getClientBySlug } from "@/lib/get-client";

export async function POST(request: Request) {
  const { passcode, clientSlug, eventId, title, shootDate, isPublished } =
    await request.json();

  if (!passcode || passcode !== process.env.STAFF_PASSCODE) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await getClientBySlug(clientSlug ?? "midnight-club");
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const { data: album, error } = await supabaseAdmin
    .from("photo_albums")
    .insert({
      client_id: client.id,
      event_id: eventId,
      title,
      shoot_date: shootDate || null,
      is_published: !!isPublished,
    })
    .select("id")
    .single();

  if (error || !album) {
    return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 500 });
  }

  return NextResponse.json({ albumId: album.id });
}
