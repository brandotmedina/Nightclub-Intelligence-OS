import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getClientBySlug } from "@/lib/get-client";

export async function POST(request: Request) {
  const { passcode, albumId, isPublished, clientSlug } = await request.json();

  if (!passcode || passcode !== process.env.STAFF_PASSCODE) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await getClientBySlug(clientSlug ?? "midnight-club");
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const { error } = await supabaseAdmin
    .from("photo_albums")
    .update({ is_published: !!isPublished })
    .eq("id", albumId)
    .eq("client_id", client.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, isPublished: !!isPublished });
}
