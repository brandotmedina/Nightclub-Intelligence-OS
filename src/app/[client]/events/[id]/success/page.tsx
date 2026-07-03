import TicketConfirmation from "@/app/events/[id]/success/TicketConfirmation";

export default async function SuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ client: string; id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { client: clientSlug } = await params;
  const { session_id, order_id } = await searchParams;
  return (
    <TicketConfirmation
      sessionId={typeof session_id === "string" ? session_id : undefined}
      orderId={typeof order_id === "string" ? order_id : undefined}
      clientSlug={clientSlug}
    />
  );
}
