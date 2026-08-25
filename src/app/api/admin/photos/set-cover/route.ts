import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getClientBySlug } from "@/lib/get-client";

export async function POST(request: Request) {
  const { passcode, albumId, photoId, clientSlug } = await request.json();

  if (!passcode || passcode !== process.env.STAFF_PASSCODE) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!albumId || !photoId) {
    return NextResponse.json({ error: "albumId and photoId required" }, { status: 400 });
  }

  const client = await getClientBySlug(clientSlug ?? "midnight-club");
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  // Validate: photo must belong to this album and client
  const { data: photo } = await supabaseAdmin
    .from("photos")
    .select("id")
    .eq("id", photoId)
    .eq("album_id", albumId)
    .eq("client_id", client.id)
    .single();

  if (!photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  const { error: updateErr } = await supabaseAdmin
    .from("photo_albums")
    .update({ cover_photo_id: photoId })
    .eq("id", albumId)
    .eq("client_id", client.id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
