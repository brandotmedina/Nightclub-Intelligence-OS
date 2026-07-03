import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getClientBySlug } from "@/lib/get-client";

export async function POST(request: Request) {
  const formData = await request.formData();

  const passcode = formData.get("passcode") as string | null;
  if (!passcode || passcode !== process.env.STAFF_PASSCODE) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientSlug = (formData.get("clientSlug") as string | null) ?? "midnight-club";
  const albumId = formData.get("albumId") as string | null;
  const sortOrder = parseInt((formData.get("sortOrder") as string | null) ?? "0", 10);
  const thumbnailBlob = formData.get("thumbnail") as Blob | null;
  const fullBlob = formData.get("full") as Blob | null;
  const originalName = (formData.get("originalName") as string | null) ?? "photo.jpg";

  if (!albumId) return NextResponse.json({ error: "albumId required" }, { status: 400 });
  if (!thumbnailBlob || !fullBlob)
    return NextResponse.json({ error: "Both thumbnail and full blobs required" }, { status: 400 });

  const client = await getClientBySlug(clientSlug);
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const uuid = crypto.randomUUID();
  const ext = originalName.split(".").pop()?.toLowerCase() ?? "jpg";

  const thumbPath = `${client.id}/${albumId}/${uuid}_thumb.jpg`;
  const fullPath = `${client.id}/${albumId}/${uuid}.${ext}`;

  const thumbBytes = await thumbnailBlob.arrayBuffer();
  const fullBytes = await fullBlob.arrayBuffer();

  const { error: thumbErr } = await supabaseAdmin.storage
    .from("Photos")
    .upload(thumbPath, thumbBytes, {
      contentType: "image/jpeg",
      upsert: false,
    });

  if (thumbErr) {
    return NextResponse.json({ error: `Thumbnail upload failed: ${thumbErr.message}` }, { status: 500 });
  }

  const { error: fullErr } = await supabaseAdmin.storage
    .from("Photos")
    .upload(fullPath, fullBytes, {
      contentType: fullBlob.type || "image/jpeg",
      upsert: false,
    });

  if (fullErr) {
    // Clean up the already-uploaded thumbnail before returning error
    await supabaseAdmin.storage.from("Photos").remove([thumbPath]);
    return NextResponse.json({ error: `Full image upload failed: ${fullErr.message}` }, { status: 500 });
  }

  const { data: thumbUrlData } = supabaseAdmin.storage.from("Photos").getPublicUrl(thumbPath);
  const { data: fullUrlData } = supabaseAdmin.storage.from("Photos").getPublicUrl(fullPath);

  const thumbnailUrl = thumbUrlData.publicUrl;
  const fullUrl = fullUrlData.publicUrl;

  const { data: photo, error: insertErr } = await supabaseAdmin
    .from("photos")
    .insert({
      client_id: client.id,
      album_id: albumId,
      thumbnail_url: thumbnailUrl,
      full_url: fullUrl,
      sort_order: sortOrder,
    })
    .select("id")
    .single();

  if (insertErr || !photo) {
    return NextResponse.json(
      { error: `DB insert failed: ${insertErr?.message ?? "unknown"}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, photoId: photo.id, thumbnailUrl, fullUrl });
}
