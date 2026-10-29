import Link from "next/link";

export default function HostedEventCTAs({
  eventId,
  clientSlug,
  vipEnabled,
  hostedUrl,
  bottleMinimum = 1,
}: {
  eventId: string;
  clientSlug: string;
  vipEnabled: boolean;
  hostedUrl: string | null;
  bottleMinimum?: number;
}) {
  if (!vipEnabled && !hostedUrl) return null;

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        {/* Get Tickets — external host link, styled like Door Tickets */}
        {hostedUrl && (
          <a
            href={hostedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex flex-col items-center justify-center gap-1 bg-plum/10 border border-plum/60 shadow-[0_0_22px_rgba(176,31,144,0.18)] rounded-2xl py-4 px-3 transition-colors text-center hover:bg-plum/15 hover:border-plum/80"
          >
            <span className="text-sm font-medium text-text leading-tight">
              Get Tickets
            </span>
          </a>
        )}

        {/* VIP Reservation — gold accent */}
        {vipEnabled && (
          <Link
            href={clientSlug ? `/${clientSlug}/events/${eventId}/vip` : `/events/${eventId}/vip`}
            className="flex-1 flex flex-col items-center justify-center gap-1 bg-surface border border-gold/40 hover:border-gold/60 rounded-2xl py-4 px-3 transition-colors text-center"
          >
            <span className="text-sm font-medium text-gold leading-tight">
              VIP Reservation · $50
            </span>
            <span className="text-[12px] font-normal leading-tight text-gold/65">
              Includes 8 entries • {bottleMinimum}-bottle minimum
            </span>
          </Link>
        )}
      </div>
    </div>
  );
}
