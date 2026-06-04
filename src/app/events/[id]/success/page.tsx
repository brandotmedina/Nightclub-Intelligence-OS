import TicketConfirmation from "./TicketConfirmation";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { session_id, order_id } = await searchParams;
  return (
    <TicketConfirmation
      sessionId={typeof session_id === "string" ? session_id : undefined}
      orderId={typeof order_id === "string" ? order_id : undefined}
    />
  );
}
