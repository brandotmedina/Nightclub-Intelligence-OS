import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getClientBySlug } from "@/lib/get-client";

// Called after the browser has confirmed both blobs uploaded successfully.
// Inserts one photos row. Row is only created when the file is safely in Storage.
export async function POST(request: Request) {
  const { passcode, albumId, thumbnailUrl, fullUrl, sortOrder, clientSlug } =
    await request.json();

  if (!passcode || passcode !== process.env.STAFF_PASSCODE) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!albumId || !thumbnailUrl || !fullUrl) {
    return NextResponse.json(
      { error: "albumId, thumbnailUrl, and fullUrl required" },
      { status: 400 }
    );
  }

  const client = await getClientBySlug(clientSlug ?? "midnight-club");
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const { data: photo, error } = await supabaseAdmin
    .from("photos")
    .insert({
      client_id: client.id,
      album_id: albumId,
      thumbnail_url: thumbnailUrl,
      full_url: fullUrl,
      sort_order: sortOrder ?? 0,
    })
    .select("id")
    .single();

  if (error || !photo) {
    return NextResponse.json(
      { error: `DB insert failed: ${error?.message ?? "unknown"}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, photoId: photo.id });
}
