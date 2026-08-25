import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getClientBySlug } from "@/lib/get-client";

const STORAGE_MARKER = "/storage/v1/object/public/Photos/";

export async function POST(request: Request) {
  const { passcode, photoId, clientSlug } = await request.json();

  if (!passcode || passcode !== process.env.STAFF_PASSCODE) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!photoId) {
    return NextResponse.json({ error: "photoId required" }, { status: 400 });
  }

  const client = await getClientBySlug(clientSlug ?? "midnight-club");
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  // Step 1 — fetch URLs (also confirms row belongs to this client)
  const { data: photo } = await supabaseAdmin
    .from("photos")
    .select("thumbnail_url, full_url")
    .eq("id", photoId)
    .eq("client_id", client.id)
    .single();

  if (!photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  // Step 2 — delete the row (ON DELETE SET NULL handles cover_photo_id FK)
  const { error: deleteErr } = await supabaseAdmin
    .from("photos")
    .delete()
    .eq("id", photoId)
    .eq("client_id", client.id);

  if (deleteErr) {
    return NextResponse.json({ error: deleteErr.message }, { status: 500 });
  }

  // Step 3 — remove storage objects (best-effort; orphan is tolerable)
  const thumbKey = photo.thumbnail_url.split(STORAGE_MARKER)[1];
  const fullKey = photo.full_url.split(STORAGE_MARKER)[1];

  if (thumbKey && fullKey) {
    const { error: storageErr } = await supabaseAdmin.storage
      .from("Photos")
      .remove([thumbKey, fullKey]);

    if (storageErr) {
      console.error("Storage removal failed — orphaned keys:", thumbKey, fullKey, storageErr.message);
    }
  } else {
    console.error("Could not derive storage keys from URLs — orphaned files may remain:", photo.thumbnail_url, photo.full_url);
  }

  return NextResponse.json({ ok: true });
}
