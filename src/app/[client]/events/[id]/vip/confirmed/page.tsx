import VipConfirmation from "@/app/events/[id]/vip/confirmed/VipConfirmation";

export default async function VipConfirmedPage({
  params,
  searchParams,
}: {
  params: Promise<{ client: string; id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { client: clientSlug } = await params;
  const { session_id } = await searchParams;
  return (
    <VipConfirmation
      sessionId={typeof session_id === "string" ? session_id : undefined}
      clientSlug={clientSlug}
    />
  );
}
