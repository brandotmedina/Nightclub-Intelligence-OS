import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getClientBySlug } from "@/lib/get-client";
import AlbumPreview from "./AlbumPreview";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminAlbumPage({
  params,
}: {
  params: Promise<{ albumId: string }>;
}) {
  const { albumId } = await params;

  const client = await getClientBySlug("midnight-club");
  if (!client) notFound();

  const { data: album } = await supabaseAdmin
    .from("photo_albums")
    .select("id, title, shoot_date, is_published, event_id")
    .eq("id", albumId)
    .eq("client_id", client.id)
    .single();

  if (!album) notFound();

  const { data: photos } = await supabaseAdmin
    .from("photos")
    .select("id, thumbnail_url, full_url")
    .eq("album_id", albumId)
    .order("sort_order", { ascending: true });

  return (
    <AlbumPreview
      album={album as { id: string; title: string; shoot_date: string | null; is_published: boolean; event_id: string }}
      photos={(photos ?? []) as { id: string; thumbnail_url: string; full_url: string }[]}
    />
  );
}
