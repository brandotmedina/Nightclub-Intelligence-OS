import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getClientBySlug } from "@/lib/get-client";

// Accepts JSON describing files the browser is about to upload directly.
// Returns signed upload URLs + tokens for each blob — browser never sends
// file bytes through this function, bypassing Vercel's 4.5 MB body cap.
export async function POST(request: Request) {
  const { passcode, albumId, files, clientSlug } = await request.json();

  if (!passcode || passcode !== process.env.STAFF_PASSCODE) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!albumId || !Array.isArray(files) || files.length === 0) {
    return NextResponse.json({ error: "albumId and files[] required" }, { status: 400 });
  }

  const client = await getClientBySlug(clientSlug ?? "midnight-club");
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const uploads: {
    thumbKey: string;
    thumbSignedUrl: string;
    thumbToken: string;
    fullKey: string;
    fullSignedUrl: string;
    fullToken: string;
  }[] = [];

  for (const f of files as { thumbKey: string; fullKey: string }[]) {
    const { data: thumbSigned, error: thumbErr } = await supabaseAdmin.storage
      .from("Photos")
      .createSignedUploadUrl(f.thumbKey);

    if (thumbErr || !thumbSigned) {
      return NextResponse.json(
        { error: `Signed URL failed for thumb ${f.thumbKey}: ${thumbErr?.message}` },
        { status: 500 }
      );
    }

    const { data: fullSigned, error: fullErr } = await supabaseAdmin.storage
      .from("Photos")
      .createSignedUploadUrl(f.fullKey);

    if (fullErr || !fullSigned) {
      return NextResponse.json(
        { error: `Signed URL failed for full ${f.fullKey}: ${fullErr?.message}` },
        { status: 500 }
      );
    }

    uploads.push({
      thumbKey: f.thumbKey,
      thumbSignedUrl: thumbSigned.signedUrl,
      thumbToken: thumbSigned.token,
      fullKey: f.fullKey,
      fullSignedUrl: fullSigned.signedUrl,
      fullToken: fullSigned.token,
    });
  }

  return NextResponse.json({ ok: true, uploads });
}
