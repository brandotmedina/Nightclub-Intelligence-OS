import { notFound } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getClientBySlug } from "@/lib/get-client";
import { formatEventDate } from "@/lib/formatEvent";
import PhotoGrid from "./PhotoGrid";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PhotoAlbumPage({
  params,
}: {
  params: Promise<{ client: string; id: string }>;
}) {
  const { client: slug, id: eventId } = await params;

  const client = await getClientBySlug(slug);
  if (!client) notFound();

  // Fetch published album for this event (public client — RLS allows public read)
  const { data: albums } = await supabase
    .from("photo_albums")
    .select("id, title, shoot_date")
    .eq("client_id", client.id)
    .eq("event_id", eventId)
    .eq("is_published", true)
    .order("shoot_date", { ascending: false })
    .limit(1);

  const album = albums?.[0] ?? null;

  let photos: { id: string; thumbnail_url: string; full_url: string }[] = [];

  if (album) {
    const { data } = await supabase
      .from("photos")
      .select("id, thumbnail_url, full_url")
      .eq("album_id", album.id)
      .order("sort_order", { ascending: true });
    photos = data ?? [];
  }

  return (
    <main className="min-h-screen bg-bg text-text">
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-16">
        <Link
          href={`/${slug}/events/${eventId}`}
          className="inline-flex items-center gap-1 text-text-dim hover:text-text-muted text-sm mb-6 transition-colors"
        >
          ← Back to Event
        </Link>

        {album ? (
          <>
            <div className="mb-8">
              <h1 className="font-display text-3xl font-bold text-text leading-tight mb-2">
                {album.title}
              </h1>
              {album.shoot_date && (
                <p className="text-text-dim text-xs tracking-[0.2em] uppercase">
                  {formatEventDate(album.shoot_date)}
                </p>
              )}
            </div>

            {photos.length > 0 ? (
              <PhotoGrid photos={photos} />
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <span className="text-5xl opacity-20 mb-4">📷</span>
                <p className="text-text-muted text-base">No photos yet from this night.</p>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <span className="text-5xl opacity-20 mb-4">📷</span>
            <p className="text-text-muted text-base">No photos yet from this night.</p>
          </div>
        )}
      </div>
    </main>
  );
}
